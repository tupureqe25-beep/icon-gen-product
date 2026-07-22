import type { BatchFigmaWriteItem, FigmaTarget } from "@/lib/icon-contract/types";
import { getIconSpecContractError } from "@/lib/icon-contract/validate";
import { createFigmaWriteJob, getLatestFigmaWriteJob, listFigmaWriteJobs } from "@/lib/figma-write-jobs/store";

type CreateFigmaWriteJobRequest = {
  batchRunId?: string;
  target?: FigmaTarget;
  items?: BatchFigmaWriteItem[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function withCors(payload: unknown, init?: ResponseInit) {
  return Response.json(payload, {
    ...init,
    headers: {
      ...corsHeaders,
      ...init?.headers,
    },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latest = url.searchParams.get("latest") === "1";
  const latestQueued = url.searchParams.get("latestQueued") === "1";

  if (latestQueued) {
    const job = listFigmaWriteJobs().find((item) => item.status === "queued");
    if (!job) return withCors({ job: null, message: "当前没有等待写入的 Figma 任务。" }, { status: 404 });
    return withCors({ job });
  }

  if (latest) {
    const job = getLatestFigmaWriteJob();
    if (!job) return withCors({ job: null, message: "还没有网页端投递的 Figma 写入任务。" }, { status: 404 });
    return withCors({ job });
  }

  return withCors({
    jobs: listFigmaWriteJobs().map((job) => ({
      id: job.id,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      status: job.status,
      itemCount: job.itemCount,
      target: job.target,
      pluginPullUrl: job.pluginPullUrl,
      result: job.result,
      error: job.error,
    })),
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as CreateFigmaWriteJobRequest;
  const items = body.items ?? [];
  const warnings: string[] = [];

  const validItems = items.filter((item) => {
    const contractError = getIconSpecContractError(item.spec);
    if (contractError) warnings.push(`${item.name || item.id}：${contractError}`);
    if (!contractError && item.spec.validation.status !== "pass") warnings.push(`${item.name || item.id} 仍有规范警告`);
    return !contractError;
  });

  if (!validItems.length) {
    return withCors(
      {
        status: "blocked",
        message: warnings[0] ?? "没有可写入的 icon。请先把通过规范的图标放入画布。",
        warnings,
      },
      { status: 422 },
    );
  }

  if (warnings.length) {
    return withCors(
      {
        status: "blocked",
        message: `写入任务被规范门禁阻断：${warnings[0]}`,
        warnings,
      },
      { status: 409 },
    );
  }

  const origin = new URL(request.url).origin;
  const job = createFigmaWriteJob({
    origin,
    target: body.target,
    items: validItems,
    batchRunId: body.batchRunId,
  });

  return withCors({
    status: "queued",
    message: `已投递 ${job.itemCount} 个 icon 的 JSON 写入任务。打开 Figma 插件后点击“拉取最新任务并写入”。`,
    job,
  });
}

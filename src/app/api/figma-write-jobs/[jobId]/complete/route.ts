import type { FigmaWriteJobResult } from "@/lib/icon-contract/types";
import { updateFigmaWriteJob } from "@/lib/figma-write-jobs/store";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const body = (await request.json().catch(() => ({}))) as { result?: FigmaWriteJobResult; error?: string };
  const success = Boolean(body.result?.success) && !body.error;
  const job = updateFigmaWriteJob(jobId, {
    status: success ? "completed" : "failed",
    result: body.result,
    error: body.error ?? body.result?.errors?.[0]?.message,
  });

  if (!job) {
    return withCors({ message: "没有找到这个 Figma 写入任务。" }, { status: 404 });
  }

  return withCors({ job });
}

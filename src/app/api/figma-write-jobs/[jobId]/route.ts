import { getFigmaWriteJob, updateFigmaWriteJob } from "@/lib/figma-write-jobs/store";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
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

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = getFigmaWriteJob(jobId);

  if (!job) {
    return withCors({ message: "没有找到这个 Figma 写入任务。" }, { status: 404 });
  }

  return withCors({ job });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const body = (await request.json().catch(() => ({}))) as { status?: "claimed" | "drawing" | "failed"; error?: string };
  const job = updateFigmaWriteJob(jobId, {
    status: body.status ?? "claimed",
    error: body.error,
  });

  if (!job) {
    return withCors({ message: "没有找到这个 Figma 写入任务。" }, { status: 404 });
  }

  return withCors({ job });
}

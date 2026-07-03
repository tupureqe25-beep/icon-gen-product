import { getFigmaBridgeStatus, updateFigmaBridgeStatus } from "@/lib/figma-write-jobs/store";

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

export async function GET() {
  return withCors({ bridge: getFigmaBridgeStatus() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    serverUrl?: string;
    fileName?: string;
    pageName?: string;
    listening?: boolean;
  };

  return withCors({
    bridge: updateFigmaBridgeStatus({
      serverUrl: body.serverUrl,
      fileName: body.fileName,
      pageName: body.pageName,
      listening: body.listening,
    }),
  });
}

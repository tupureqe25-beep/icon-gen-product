import { parseIconfontSymbols } from "@/lib/icons/iconfont";

function isAllowedIconfontUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return ["http:", "https:"].includes(url.protocol) && /(^|\.)alicdn\.com$/.test(url.hostname);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as { url?: string; content?: string };
  const rawUrl = body.url?.trim();
  const content = body.content?.trim();

  if (content) {
    const assets = parseIconfontSymbols(content, "iconfont");
    return Response.json({ source: "iconfont-symbol", assets });
  }

  if (!rawUrl || !isAllowedIconfontUrl(rawUrl)) {
    return Response.json(
      {
        source: "iconfont-symbol",
        assets: [],
        message: "请提供 at.alicdn.com 的 Iconfont Symbol JS 链接。",
      },
      { status: 400 },
    );
  }

  const response = await fetch(rawUrl, { cache: "no-store" });
  if (!response.ok) {
    return Response.json(
      {
        source: "iconfont-symbol",
        assets: [],
        message: `Iconfont 链接返回 ${response.status}`,
      },
      { status: 502 },
    );
  }

  const text = await response.text();
  const assets = parseIconfontSymbols(text, "iconfont");

  return Response.json({
    source: "iconfont-symbol",
    url: rawUrl,
    assets,
  });
}

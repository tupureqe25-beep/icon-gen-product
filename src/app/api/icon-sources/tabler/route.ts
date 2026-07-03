import { searchTablerAssets } from "@/lib/icons/sources/tabler";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const limit = Number(url.searchParams.get("limit") ?? 36);

  return Response.json({
    source: "tabler-icons",
    query,
    assets: searchTablerAssets(query, Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 60) : 36),
  });
}

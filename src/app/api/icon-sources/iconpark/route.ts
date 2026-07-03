import { searchIconParkAssets } from "@/lib/icons/sources/iconpark";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const limit = Number(url.searchParams.get("limit") ?? 36);

  return Response.json({
    source: "iconpark-official",
    query,
    assets: searchIconParkAssets(query, Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 60) : 36),
  });
}

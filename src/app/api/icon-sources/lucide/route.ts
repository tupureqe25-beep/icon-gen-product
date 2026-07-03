import { searchLucideAssets } from "@/lib/icons/sources/lucide";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const limit = Number(url.searchParams.get("limit") ?? 36);

  return Response.json({
    source: "lucide-static",
    query,
    assets: searchLucideAssets(query, Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 60) : 36),
  });
}

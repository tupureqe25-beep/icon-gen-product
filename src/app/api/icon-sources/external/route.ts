import { searchIconParkAssets } from "@/lib/icons/sources/iconpark";
import { searchLucideAssets } from "@/lib/icons/sources/lucide";
import { searchPhosphorAssets } from "@/lib/icons/sources/phosphor";
import { searchTablerAssets } from "@/lib/icons/sources/tabler";
import { filesystemSourceIds, searchFilesystemSourceAssets, type FilesystemSourceId } from "@/lib/icons/sources/filesystem-package";
import type { IconAsset } from "@/lib/icons/types";
import { expandQuery } from "@/lib/icons/search";

const allSourceIds = ["lucide", "fluent", "material", "tabler", "antd", "tdesign", "iconpark", "carbon", "phosphor", "remix"] as const;
type ExternalSourceId = (typeof allSourceIds)[number];

function searchSource(sourceId: ExternalSourceId, query: string, limit: number) {
  if (sourceId === "lucide") return searchLucideAssets(query, limit);
  if (sourceId === "tabler") return searchTablerAssets(query, limit);
  if (sourceId === "iconpark") return searchIconParkAssets(query, limit);
  if (sourceId === "phosphor") return searchPhosphorAssets(query, limit);
  return searchFilesystemSourceAssets(sourceId as FilesystemSourceId, query, limit);
}

function svgSignature(svg: string) {
  return svg
    .replace(/\s+/g, " ")
    .replace(/#[0-9a-f]{3,8}/gi, "#COLOR")
    .replace(/\d+(?:\.\d+)?/g, "N")
    .slice(0, 900);
}

function sourceRisk(asset: IconAsset) {
  if (/phosphor|material|remix/.test(asset.source)) return "medium";
  return "low";
}

function shapeCount(svg: string) {
  return (svg.match(/<(path|circle|rect|line|polyline|polygon|ellipse)\b/gi) ?? []).length;
}

function semanticScore(asset: IconAsset, query: string) {
  const name = asset.name.toLowerCase();
  const compactName = name.replace(/[-_\s]+/g, "");
  const tags = asset.tags.map((tag) => tag.toLowerCase());
  return expandQuery(query).reduce((score, rawTerm) => {
    const term = rawTerm.toLowerCase().trim();
    const compactTerm = term.replace(/[-_\s]+/g, "");
    if (!term) return score;
    if (name === term || compactName === compactTerm) return score + 100;
    if (term.length >= 3 && (name.includes(term) || compactName.includes(compactTerm))) return score + 30;
    if (tags.includes(term)) return score + 12;
    return score;
  }, 0);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const requestedSources = (url.searchParams.get("sources") ?? "all")
    .split(",")
    .map((source) => source.trim().toLowerCase())
    .filter(Boolean);
  const sourceIds = requestedSources.includes("all")
    ? [...allSourceIds]
    : allSourceIds.filter((source) => requestedSources.includes(source));
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 24), 1), 48);
  const perSourceLimit = Math.max(2, Math.ceil(limit / Math.max(sourceIds.length, 1)) + 1);

  const settled = await Promise.allSettled(sourceIds.map(async (sourceId) => ({ sourceId, assets: searchSource(sourceId, query, perSourceLimit) })));
  const failures = settled.flatMap((result, index) =>
    result.status === "rejected" ? [{ source: sourceIds[index], message: result.reason instanceof Error ? result.reason.message : "source unavailable" }] : [],
  );
  const candidates = settled.flatMap((result) => (result.status === "fulfilled" ? result.value.assets : []));
  const seen = new Set<string>();
  const assets = candidates
    .filter((asset) => {
      const complexity = shapeCount(asset.svg);
      if (!complexity || complexity > 18) return false;
      const signature = svgSignature(asset.svg);
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    })
    .sort((a, b) => {
      const semanticOrder = semanticScore(b, query) - semanticScore(a, query);
      if (semanticOrder) return semanticOrder;
      const riskOrder = sourceRisk(a) === sourceRisk(b) ? 0 : sourceRisk(a) === "low" ? -1 : 1;
      return riskOrder || shapeCount(a.svg) - shapeCount(b.svg) || a.name.localeCompare(b.name);
    })
    .slice(0, limit);

  return Response.json({
    source: "external-approved-libraries",
    query,
    libraries: sourceIds,
    resultCount: assets.length,
    assets,
    failures,
  });
}

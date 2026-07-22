import { buildFigmaSourceUrl, lookupBaijiahaoMatureIcons, selectRuntimeMode } from "@/lib/source-routing/baijiahao";

type SourceDecisionRequest = {
  query?: string;
  semanticQuery?: string;
  skillId?: string;
  asksForVariants?: boolean;
  asksForProduction?: boolean;
  asksForExactReuse?: boolean;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as SourceDecisionRequest;
  const query = body.query?.trim() ?? "";
  const semanticQuery = body.semanticQuery?.trim() || query;
  if (!query) return Response.json({ message: "缺少 icon 查询语义。" }, { status: 400 });

  if (body.skillId !== "baijiahao") {
    return Response.json({
      skillId: body.skillId ?? "manju",
      query,
      mode: body.asksForProduction ? "strict" : body.asksForVariants ? "explore" : "fast",
      route: "generation-first",
      exactMatch: null,
      adjacentMatches: [],
      message: "当前组件库使用自身生成流程，不启用百家号成熟库索引。",
    });
  }

  const mature = await lookupBaijiahaoMatureIcons(semanticQuery);
  const mode = selectRuntimeMode({
    exactMatch: mature.exactMatch,
    asksForVariants: body.asksForVariants,
    asksForProduction: body.asksForProduction,
    asksForExactReuse: body.asksForExactReuse,
  });
  const sourceUrl = buildFigmaSourceUrl(mature.source?.fileKey, mature.exactMatch?.nodeId);

  return Response.json({
    skillId: "baijiahao",
    query,
    semanticQuery,
    mode,
    route: mature.exactMatch
      ? "team-reuse-needs-verification"
      : mature.adjacentMatches.length
        ? "team-adjacent-reference"
        : "external-source-search",
    exactMatch: mature.exactMatch ?? null,
    adjacentMatches: mature.adjacentMatches,
    source: mature.source,
    sourceUrl,
    requiresSourceVerification: Boolean(mature.exactMatch),
    message: mature.exactMatch
      ? `成熟库精确命中“${mature.exactMatch.label ?? mature.exactMatch.name}”；必须先读取 Figma 源节点或源截图，再显示标准版预览。`
      : mature.adjacentMatches.length
        ? `成熟库仅相近命中“${mature.adjacentMatches[0].label ?? mature.adjacentMatches[0].name}”；它只作为约束，下一步继续检索外部来源。`
        : "成熟库未精确命中；下一步检索高质量外部来源。",
  });
}

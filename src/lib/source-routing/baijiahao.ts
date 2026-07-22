import { readFile } from "node:fs/promises";
import path from "node:path";

export type SourceRuntimeMode = "fast" | "strict" | "explore" | "maintenance";

export type MatureIconMatch = {
  label?: string;
  name?: string;
  nodeId?: string;
  matchType?: string;
  family?: string;
  semanticDirection?: string;
  visualElements?: string[];
  shapeSummary?: string;
  needsSourceVerificationForPixelMatch?: boolean;
  route: "team-reuse-needs-verification" | "team-adjacent-reference";
  score: {
    tier: number;
    specificity: number;
    matchedValue: string;
    matchKind: "equal" | "query-contains" | "value-contains";
  };
  guardrails?: {
    geometrySummary?: string;
    mustKeep: string[];
    forbidden: string[];
  };
};

type TeamIconIndex = {
  meta?: {
    source?: {
      fileKey?: string;
      frameId?: string;
      name?: string;
    };
  };
  icons?: Array<Record<string, unknown>>;
};

type ShapeSpecRegistry = {
  specs?: Array<Record<string, unknown>>;
};

const skillRoot = path.join(process.cwd(), "skills", "icon-gen-baijiahao");
const indexPath = path.join(skillRoot, "references", "team-icon-index.json");
const shapeSpecsPath = path.join(skillRoot, "references", "team-icon-shape-specs.json");

function normalize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\s\-_/:：]+/g, "")
    .trim();
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function fieldValues(item: Record<string, unknown>) {
  return [
    ["name", item.name],
    ["label", item.label],
    ["nodeId", item.nodeId],
    ...stringArray(item.aliases).map((alias) => ["alias", alias]),
  ] as Array<[string, unknown]>;
}

function scoreMatch(query: string, item: Record<string, unknown>) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return undefined;

  let best: MatureIconMatch["score"] | undefined;
  for (const [, rawValue] of fieldValues(item)) {
    const normalizedValue = normalize(rawValue);
    if (!normalizedValue) continue;

    const matchKind: MatureIconMatch["score"]["matchKind"] | undefined =
      normalizedValue === normalizedQuery
        ? "equal"
        : normalizedQuery.includes(normalizedValue)
          ? "query-contains"
          : normalizedValue.includes(normalizedQuery)
            ? "value-contains"
            : undefined;
    if (!matchKind) continue;
    const tier = matchKind === "equal" ? 110 : matchKind === "query-contains" ? 90 : matchKind === "value-contains" ? 60 : 0;

    const matchType = String(item.matchType ?? "");
    const exactBonus = matchType === "exact" || matchType === "canonical-status" ? 10 : 0;
    const candidate: MatureIconMatch["score"] = {
      tier: tier + exactBonus,
      specificity: normalizedValue.length,
      matchedValue: String(rawValue),
      matchKind,
    };
    if (!best || candidate.tier > best.tier || (candidate.tier === best.tier && candidate.specificity > best.specificity)) {
      best = candidate;
    }
  }
  return best;
}

function isExactMatch(item: Record<string, unknown>, score: MatureIconMatch["score"]) {
  const matchType = String(item.matchType ?? "");
  return score.matchKind === "equal" && ["exact", "canonical-status", "exact-or-adjacent", "exact-or-base"].includes(matchType);
}

function findGuardrails(icon: Record<string, unknown>, specs: Array<Record<string, unknown>>) {
  const iconValues = new Set(fieldValues(icon).map(([, value]) => normalize(value)).filter(Boolean));
  const match = specs.find((spec) => fieldValues(spec).some(([, value]) => iconValues.has(normalize(value))));
  if (!match) return undefined;

  const signature = (match.geometrySignature ?? {}) as Record<string, unknown>;
  return {
    geometrySummary: typeof signature.summary === "string" ? signature.summary : undefined,
    mustKeep: stringArray(signature.mustKeep),
    forbidden: stringArray(signature.forbidden),
  };
}

export async function lookupBaijiahaoMatureIcons(query: string, limit = 5) {
  const [indexRaw, shapeRaw] = await Promise.all([readFile(indexPath, "utf8"), readFile(shapeSpecsPath, "utf8")]);
  const index = JSON.parse(indexRaw) as TeamIconIndex;
  const shapeRegistry = JSON.parse(shapeRaw) as ShapeSpecRegistry;
  const specs = shapeRegistry.specs ?? [];

  const matches = (index.icons ?? [])
    .map((icon) => ({ icon, score: scoreMatch(query, icon) }))
    .filter((item): item is { icon: Record<string, unknown>; score: MatureIconMatch["score"] } => Boolean(item.score))
    .sort((a, b) => b.score.tier - a.score.tier || b.score.specificity - a.score.specificity)
    .slice(0, limit)
    .map(({ icon, score }) => {
      const exact = isExactMatch(icon, score);
      return {
        label: typeof icon.label === "string" ? icon.label : undefined,
        name: typeof icon.name === "string" ? icon.name : undefined,
        nodeId: typeof icon.nodeId === "string" ? icon.nodeId : undefined,
        matchType: typeof icon.matchType === "string" ? icon.matchType : undefined,
        family: typeof icon.family === "string" ? icon.family : undefined,
        semanticDirection: typeof icon.semanticDirection === "string" ? icon.semanticDirection : undefined,
        visualElements: stringArray(icon.visualElements),
        shapeSummary: typeof icon.shapeSummary === "string" ? icon.shapeSummary : undefined,
        needsSourceVerificationForPixelMatch: Boolean(
          icon.needsSourceVerificationForPixelMatch ||
            ((icon.styleAttributes ?? {}) as Record<string, unknown>).needsSourceVerificationForPixelMatch,
        ),
        route: exact ? "team-reuse-needs-verification" : "team-adjacent-reference",
        score,
        guardrails: findGuardrails(icon, specs),
      } satisfies MatureIconMatch;
    });

  return {
    source: index.meta?.source,
    matches,
    exactMatch: matches.find((match) => match.route === "team-reuse-needs-verification"),
    adjacentMatches: matches.filter((match) => match.route === "team-adjacent-reference"),
  };
}

export function selectRuntimeMode(input: {
  exactMatch?: MatureIconMatch;
  asksForVariants?: boolean;
  asksForProduction?: boolean;
  asksForExactReuse?: boolean;
}): SourceRuntimeMode {
  if (input.asksForProduction || input.asksForExactReuse || input.exactMatch) return "strict";
  if (input.asksForVariants) return "explore";
  return "fast";
}

export function buildFigmaSourceUrl(fileKey?: string, nodeId?: string) {
  if (!fileKey || !nodeId) return undefined;
  return `https://www.figma.com/design/${fileKey}/icon?node-id=${nodeId.replace(/:/g, "-")}`;
}

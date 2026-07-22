import type { IconAsset } from "@/lib/icons/types";
import { expandQuery } from "@/lib/icons/search";

export type PackageIconMeta = {
  name: string;
  category: string;
  tags: string[];
  svg: string;
};

export type PackageIconSourceConfig = {
  source: string;
  categoryPrefix: string;
  license: string;
  semanticAliases?: Record<string, string[]>;
  minScore?: number;
  limit?: number;
  styleTags?: string[];
};

const commonAliases: Record<string, string[]> = {
  filter: ["filter", "filters", "funnel", "sliders", "adjustments", "sort", "筛选", "过滤", "分类"],
  search: ["search", "find", "magnifier", "magnifying", "zoom", "inspect", "搜索", "查找"],
  share: ["share", "send", "forward", "nodes", "network", "分享", "转发"],
  bookmark: ["bookmark", "favorite", "save", "star", "收藏", "书签"],
  download: ["download", "export", "arrow-down", "下载", "导出"],
  upload: ["upload", "import", "arrow-up", "上传", "导入"],
  comment: ["comment", "message", "chat", "bubble", "reply", "评论", "消息"],
  like: ["like", "heart", "thumb", "favorite", "点赞", "喜欢"],
};

function cleanupSvg(svg: string) {
  return svg
    .replace(/^<!--[\s\S]*?-->\s*/g, "")
    .replace(/^<\?xml[^>]*>\s*/i, "")
    .replace(/\sclass="[^"]*"/g, "")
    .replace(/\saria-hidden="[^"]*"/g, "")
    .replace(/\srole="[^"]*"/g, "")
    .replace(/\sdata-[a-z-]+="[^"]*"/g, "")
    .replace(/currentColor/g, "#0F1218")
    .trim();
}

function buildQueryTerms(query: string, aliases: Record<string, string[]> = {}) {
  const lower = query.toLowerCase();
  const expanded = expandQuery(query);
  const aliasTerms = Object.entries({ ...commonAliases, ...aliases }).flatMap(([key, values]) =>
    lower.includes(key) || values.some((value) => lower.includes(value.toLowerCase())) ? values : [],
  );

  return Array.from(
    new Set(
      [...expanded, ...aliasTerms]
        .flatMap((term) => {
          const normalized = String(term).toLowerCase().trim();
          if (!normalized) return [];
          return /[\s/_]+/.test(normalized) ? [normalized, ...normalized.split(/[\s/_]+/)] : [normalized];
        })
        .map((term) => term.trim())
        .filter(Boolean),
    ),
  );
}

function iconHaystack(icon: PackageIconMeta, styleTags: string[]) {
  return [icon.name, icon.category, ...icon.tags, ...icon.name.split("-"), ...styleTags].join(" ").toLowerCase();
}

function scoreIcon(icon: PackageIconMeta, queryTerms: string[], styleTags: string[]) {
  const name = icon.name.toLowerCase();
  const compactName = name.replace(/-/g, "");
  const haystack = iconHaystack(icon, styleTags);
  const matched = queryTerms.filter((term) => haystack.includes(term));
  const exact = queryTerms.some((term) => name === term || compactName === term.replace(/-/g, "")) ? 8 : 0;
  const prefix = queryTerms.some((term) => name.startsWith(term) || compactName.startsWith(term.replace(/-/g, ""))) ? 3 : 0;
  const tagBoost = matched.some((term) => icon.tags.map((tag) => tag.toLowerCase()).includes(term)) ? 2 : 0;
  const negative = /^(arrow|chevron|caret|corner|align|letter|number|brand|logo)(-|$)/.test(name) ? -1 : 0;

  return {
    score: matched.length + exact + prefix + tagBoost + negative,
    matched,
  };
}

function visualComplexity(svg: string) {
  const shapeCount = (svg.match(/<(path|circle|rect|line|polyline|polygon|ellipse)\b/g) ?? []).length;
  const pathCount = (svg.match(/<path\b/g) ?? []).length;
  return { shapeCount, pathCount };
}

export function searchPackageIconAssets(query: string, icons: PackageIconMeta[], config: PackageIconSourceConfig): IconAsset[] {
  const terms = buildQueryTerms(query, config.semanticAliases);
  const limit = config.limit ?? 36;
  const minScore = query.trim() ? (config.minScore ?? 2) : 0;
  const styleTags = config.styleTags ?? [];

  return icons
    .map((icon) => {
      const { score, matched } = scoreIcon(icon, terms, styleTags);
      const svg = cleanupSvg(icon.svg);
      const complexity = visualComplexity(svg);

      return {
        asset: {
          id: `${config.source}-${icon.name}`,
          name: icon.name,
          category: `${config.categoryPrefix}-${icon.category.toLowerCase().replace(/\s+/g, "-")}`,
          tags: Array.from(new Set([icon.name, icon.category, ...icon.name.split("-"), ...icon.tags, ...matched, ...styleTags])).filter(Boolean),
          source: config.source,
          license: config.license,
          svg,
        } satisfies IconAsset,
        score,
        complexity,
      };
    })
    .filter((item) => item.score >= minScore && item.complexity.shapeCount > 0)
    .sort((a, b) => b.score - a.score || a.complexity.pathCount - b.complexity.pathCount || a.asset.name.localeCompare(b.asset.name))
    .slice(0, limit)
    .map((item) => item.asset);
}

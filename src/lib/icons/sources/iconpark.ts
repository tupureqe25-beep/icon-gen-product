import * as rawIconParkMap from "@icon-park/svg/lib/map.js";
import { expandQuery } from "@/lib/icons/search";
import type { IconAsset } from "@/lib/icons/types";

type IconParkRenderer = (props: { size: number; strokeWidth: number; theme: "outline"; fill: string }) => string;

const iconParkMap = rawIconParkMap as unknown as Record<string, IconParkRenderer>;

const aliases: Record<string, string[]> = {
  filter: ["filter", "filters", "sort", "setting", "settings", "adjustment", "筛选", "过滤", "分类"],
  search: ["search", "zoom", "find", "magnifier", "搜索", "查找"],
  share: ["share", "send", "forward", "transfer", "分享", "转发"],
  bookmark: ["bookmark", "book", "save", "favorite", "收藏", "书签", "章节"],
  download: ["download", "down", "export", "下载", "导出"],
  upload: ["upload", "up", "import", "上传", "导入"],
  comment: ["comment", "message", "reply", "chat", "评论", "消息", "回复"],
  like: ["like", "heart", "thumb", "favorite", "点赞", "喜欢"],
};

function kebabCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

function cleanupSvg(svg: string) {
  return svg.replace(/^<\?xml[^>]*>\s*/i, "").replace(/currentColor/g, "#0F1218");
}

function scoreIcon(name: string, queryTerms: string[]) {
  const kebab = kebabCase(name);
  const compact = name.toLowerCase();
  const haystack = `${kebab} ${compact}`;
  const matched = queryTerms.filter((term) => haystack.includes(term.toLowerCase()));
  const exact = queryTerms.some((term) => kebab === term || compact === term.replace(/-/g, "")) ? 6 : 0;
  const prefix = queryTerms.some((term) => kebab.startsWith(term) || compact.startsWith(term.replace(/-/g, ""))) ? 3 : 0;
  const compound = kebab.includes("-") ? 1.5 : 0;
  const weakDirectionOnly = /^(up|down|left|right|back|next|previous)(-[a-z0-9]+)?$/.test(kebab) ? -4 : 0;

  return {
    score: matched.length + exact + prefix + compound + weakDirectionOnly,
    matched,
  };
}

function visualComplexity(svg: string) {
  const pathCount = (svg.match(/<path/g) ?? []).length;
  const shapeCount = pathCount + (svg.match(/<(circle|rect|line|polyline|polygon)\b/g) ?? []).length;
  return { pathCount, shapeCount };
}

function buildQueryTerms(query: string) {
  const expanded = expandQuery(query);
  const aliasTerms = Object.entries(aliases).flatMap(([key, values]) => {
    const lower = query.toLowerCase();
    return lower.includes(key) || values.some((value) => lower.includes(value.toLowerCase())) ? values : [];
  });

  return Array.from(new Set([...expanded, ...aliasTerms].map((term) => term.toLowerCase()).filter(Boolean)));
}

export function searchIconParkAssets(query: string, limit = 36): IconAsset[] {
  const terms = buildQueryTerms(query);
  const entries = Object.entries(iconParkMap).filter(([, render]) => typeof render === "function");
  const minScore = query.trim() ? 3 : 0;

  return entries
    .map(([componentName, render]) => {
      const { score, matched } = scoreIcon(componentName, terms);
      const name = kebabCase(componentName);
      const svg = cleanupSvg(render({ size: 24, strokeWidth: 2, theme: "outline", fill: "#0F1218" }));
      const complexity = visualComplexity(svg);

      return {
        asset: {
          id: `iconpark-${name}`,
          name,
          category: "iconpark-official",
          tags: Array.from(new Set([name, ...name.split("-"), ...matched])).filter(Boolean),
          source: "iconpark-official",
          license: "Apache-2.0",
          svg,
        } satisfies IconAsset,
        score,
        complexity,
      };
    })
    .filter((item) => item.score >= minScore && item.complexity.shapeCount >= 2)
    .sort((a, b) => b.score - a.score || b.complexity.shapeCount - a.complexity.shapeCount || a.asset.name.localeCompare(b.asset.name))
    .slice(0, limit)
    .map((item) => item.asset);
}

import { demoIcons } from "@/data/demo-icons";
import type { IconAsset } from "@/lib/icons/types";

const expansions: Record<string, string[]> = {
  ai: ["ai", "智能", "generate", "scan", "magic"],
  审核: ["review", "moderation", "check", "shield", "scan", "审核"],
  风险: ["risk", "warning", "alert", "shield", "风险", "预警"],
  预警: ["warning", "alert", "risk", "预警", "告警"],
  内容: ["content", "document", "manage", "内容", "文档"],
  数据: ["data", "dashboard", "chart", "analytics", "数据"],
  导出: ["export", "download", "file", "导出"],
  标签: ["tag", "label", "badge", "标签"],
  收藏: ["bookmark", "favorite", "save", "收藏", "书签"],
  书签: ["bookmark", "favorite", "save", "收藏", "书签"],
  分享: ["share", "forward", "send", "传播", "分享", "转发"],
  转发: ["share", "forward", "send", "传播", "分享", "转发"],
  搜索: ["search", "find", "magnifier", "搜索", "查找"],
  筛选: ["filter", "sort", "settings", "筛选", "过滤"],
  下载: ["download", "export", "file", "下载", "导出"],
  上传: ["upload", "import", "file", "上传", "导入"],
  播放: ["play", "video", "triangle", "播放", "视频"],
  评论: ["comment", "message", "bubble", "评论", "消息"],
  点赞: ["like", "heart", "thumb", "喜欢", "点赞"],
};

export function expandQuery(query: string) {
  const lower = query.toLowerCase();
  const terms = new Set<string>();

  lower
    .split(/[\s,，。/]+/)
    .map((term) => term.trim())
    .filter(Boolean)
    .forEach((term) => terms.add(term));

  Object.entries(expansions).forEach(([key, values]) => {
    if (lower.includes(key.toLowerCase())) {
      values.forEach((value) => terms.add(value.toLowerCase()));
    }
  });

  return Array.from(terms);
}

export type SearchResult = IconAsset & {
  score: number;
  matchReason: string;
};

export function searchIcons(query: string, icons: IconAsset[] = demoIcons, limit = 8): SearchResult[] {
  const terms = expandQuery(query);

  return icons
    .map((icon) => {
      const haystack = [icon.name, icon.category, ...icon.tags].join(" ").toLowerCase();
      const matched = terms.filter((term) => haystack.includes(term.toLowerCase()));
      const exactNameBoost = icon.name.includes(query.toLowerCase()) ? 3 : 0;
      const score = matched.length + exactNameBoost;

      return {
        ...icon,
        score,
        matchReason: matched.length
          ? `匹配：${matched.slice(0, 4).join(" / ")}`
          : "语义弱相关，作为备选展示",
      };
    })
    .filter((icon) => icon.score > 0 || query.trim().length === 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit);
}

import type { IconSpecContract } from "./types";

const SUPPORTED_COLORS = new Set(["#0F1218", "#242529"]);

export function getIconSpecContractError(spec: unknown): string | undefined {
  if (!spec || typeof spec !== "object") return "规格不是对象。";

  const candidate = spec as Partial<IconSpecContract>;
  const size = candidate.meta?.size;
  const color = candidate.strokes?.color;
  const width = candidate.strokes?.width;
  const platform = candidate.meta?.platform;

  if (!candidate.meta?.name) return "缺少图标名称。";
  if (![24, 48].includes(size ?? 0)) return `画布尺寸 ${String(size ?? "未填写")}px 不受支持，仅支持 24px 或 48px。`;
  if (candidate.meta.style !== "outline") return "图标样式必须是 outline。";
  if (candidate.meta.color_mode !== "monochrome") return "图标颜色模式必须是 monochrome。";
  if (!SUPPORTED_COLORS.has(color ?? "")) return `描边颜色 ${String(color ?? "未填写")} 不符合团队规格。`;
  if (![2, 4].includes(width ?? 0)) return `描边宽度 ${String(width ?? "未填写")}px 不符合团队规格，仅支持 2px 或 4px。`;
  if (candidate.strokes?.cap !== "round" || candidate.strokes?.join !== "round") return "描边端点和连接必须是 round。";

  const isBaijiahao = platform === "baijiahao" || size === 48 || color === "#242529" || width === 4;
  if (isBaijiahao && (size !== 48 || color !== "#242529" || width !== 4)) {
    return "百家号规格必须同时使用 48px、#242529、4px 描边。";
  }
  if (isBaijiahao && candidate.meta.runtime_mode !== "strict") {
    return "百家号成熟库正式写入必须使用 strict 模式。";
  }
  if (!isBaijiahao && (size !== 24 || color !== "#0F1218" || width !== 2)) {
    return "漫剧/默认规格必须同时使用 24px、#0F1218、2px 描边。";
  }
  if (!Array.isArray(candidate.shapes) || candidate.shapes.length === 0) return "没有可写入的 native shapes。";

  return undefined;
}

export function validateIconSpecContract(spec: unknown): spec is IconSpecContract {
  return !getIconSpecContractError(spec);
}

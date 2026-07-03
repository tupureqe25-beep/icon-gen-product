import { defaultIconSpec } from "@/lib/spec/default-icon-spec";
import type { NormalizedIcon } from "@/lib/icons/types";

function ensureSvgShell(svg: string) {
  let next = svg.trim();
  if (!next.includes("xmlns=")) {
    next = next.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return next;
}

function parseViewBox(svg: string) {
  const match = svg.match(/viewBox="([^"]*)"/);
  if (!match) return undefined;
  const [minX, minY, width, height] = match[1].trim().split(/[\s,]+/).map(Number);
  if (![minX, minY, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return undefined;
  return { raw: match[1], minX, minY, width, height };
}

function stripOuterSvgTag(svg: string) {
  return svg
    .replace(/^<svg\b[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "")
    .trim();
}

function normalizeViewBoxTo24(svg: string, changes: string[], warnings: string[]) {
  const viewBox = parseViewBox(svg);
  if (!viewBox) {
    changes.push("补充 viewBox=0 0 24 24");
    return svg.replace("<svg", '<svg viewBox="0 0 24 24"');
  }

  if (viewBox.raw === defaultIconSpec.viewBox) return svg;

  const scale = Math.min(20 / viewBox.width, 20 / viewBox.height);
  const translatedX = (24 - viewBox.width * scale) / 2;
  const translatedY = (24 - viewBox.height * scale) / 2;
  const inner = stripOuterSvgTag(svg);
  const wrappedInner = `<g transform="translate(${translatedX.toFixed(3)} ${translatedY.toFixed(3)}) scale(${scale.toFixed(6)}) translate(${-viewBox.minX} ${-viewBox.minY})">${inner}</g>`;
  const next = svg
    .replace(/viewBox="[^"]*"/, 'viewBox="0 0 24 24"')
    .replace(/^<svg\b([^>]*)>[\s\S]*<\/svg>\s*$/i, `<svg$1>${wrappedInner}</svg>`);

  changes.push(`等比包裹源 viewBox ${viewBox.raw} 到 24×24，保留原始比例`);
  warnings.push("来源图标已等比适配到 20×20 live area；如视觉过小/过重，需要人工审核。");
  return next;
}

export function normalizeSvg(svg: string): NormalizedIcon {
  let next = ensureSvgShell(svg);
  const changes: string[] = [];
  const warnings: string[] = [];
  const hasStrokeBeforeNormalize = /stroke="(?!none)[^"]*"/.test(next);
  const hasVisibleFillBeforeNormalize = /fill="(?!none)[^"]*"/.test(next);

  if (/width="[^"]*"/.test(next)) {
    next = next.replace(/width="[^"]*"/, 'width="24"');
    changes.push("统一 width 为 24");
  } else {
    next = next.replace("<svg", '<svg width="24"');
    changes.push("补充 width=24");
  }

  if (/height="[^"]*"/.test(next)) {
    next = next.replace(/height="[^"]*"/, 'height="24"');
    changes.push("统一 height 为 24");
  } else {
    next = next.replace("<svg", '<svg height="24"');
    changes.push("补充 height=24");
  }

  next = normalizeViewBoxTo24(next, changes, warnings);

  next = next.replace(/stroke="(?!none)[^"]*"/g, () => {
    changes.push("替换 stroke 为 #0F1218");
    return 'stroke="#0F1218"';
  });

  if (!/stroke=/.test(next) && /<path/.test(next)) {
    warnings.push("未检测到 stroke，可能是填充图标，MVP 不强制改为线性");
  }

  next = next.replace(/stroke-width="[^"]*"/g, () => {
    changes.push("统一 stroke-width 为 2");
    return 'stroke-width="2"';
  });

  next = next.replace(/stroke-linecap="[^"]*"/g, 'stroke-linecap="round"');
  next = next.replace(/stroke-linejoin="[^"]*"/g, 'stroke-linejoin="round"');
  next = next.replace(/\svector-effect="[^"]*"/g, "");

  if (hasStrokeBeforeNormalize || !hasVisibleFillBeforeNormalize) {
    next = next.replace(/fill="(?!none)[^"]*"/g, () => {
      changes.push("将 SVG fill 改为 none");
      return 'fill="none"';
    });
  } else {
    next = next.replace(/fill="(?!none)[^"]*"/g, () => {
      warnings.push("源图标是填充路径，当前仅保留为可见参考；最终需要转成团队线性 native 节点。");
      return 'fill="#0F1218"';
    });
  }

  if (!next.includes("fill=")) {
    next = next.replace("<svg", '<svg fill="none"');
    changes.push("补充 fill=none");
  }

  if (!next.includes("stroke-linecap") && /stroke=/.test(next)) {
    next = next.replace(/<path /g, '<path stroke-linecap="round" ');
    changes.push("补充 round linecap");
  }

  if (!next.includes("stroke-linejoin") && /stroke=/.test(next)) {
    next = next.replace(/<path /g, '<path stroke-linejoin="round" ');
    changes.push("补充 round linejoin");
  }

  if (/stroke=/.test(next)) {
    next = next.replace(/<(path|line|polyline|polygon|circle|ellipse|rect)\b(?![^>]*vector-effect=)/g, '<$1 vector-effect="non-scaling-stroke"');
    changes.push("补充 non-scaling-stroke，防止适配 viewBox 后线宽变形");
  }

  next = next.replace(/\sdata-name="[^"]*"/g, "").replace(/\sid="[^"]*"/g, "");

  return {
    svg: next,
    changes: Array.from(new Set(changes)),
    warnings: Array.from(new Set(warnings)),
  };
}

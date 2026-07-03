import type { ReviewIssue, ReviewReport } from "@/lib/icons/types";

function issue(id: string, label: string, severity: ReviewIssue["severity"], detail: string): ReviewIssue {
  return { id, label, severity, detail };
}

function scoreIssues(issues: ReviewIssue[]) {
  return issues.reduce((score, item) => {
    if (item.severity === "fail") return score - 18;
    if (item.severity === "warning") return score - 8;
    return score;
  }, 100);
}

export function reviewSvg(svg: string, name: string, query: string): ReviewReport {
  const system: ReviewIssue[] = [];
  const visual: ReviewIssue[] = [];
  const semantic: ReviewIssue[] = [];
  const pathCount = (svg.match(/<path/g) ?? []).length;
  const circleCount = (svg.match(/<(circle|ellipse)\b/g) ?? []).length;
  const moveCount = (svg.match(/\sd="[^"]*M/g) ?? []).length;

  system.push(
    /viewBox="0 0 24 24"/.test(svg)
      ? issue("viewbox", "ViewBox", "pass", "使用标准 24x24 viewBox。")
      : issue("viewbox", "ViewBox", "fail", "未使用 0 0 24 24 viewBox。"),
  );

  system.push(
    /#0F1218/i.test(svg)
      ? issue("color", "Platform color", "pass", "使用漫画平台固定单色 #0F1218。")
      : issue("color", "Platform color", "fail", "未检测到 #0F1218；icon-gen-promax 不使用 currentColor 作为固定平台预览色。"),
  );

  system.push(
    /stroke-width="2"/.test(svg) || !/stroke=/.test(svg)
      ? issue("stroke", "Stroke width", "pass", "线宽符合 2px 默认规范或为填充图标。")
      : issue("stroke", "Stroke width", "warning", "线宽不是默认 2px，需要人工确认视觉重量。"),
  );

  system.push(
    /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)
      ? issue("name", "Naming", "warning", "当前仍是来源名；最终 Figma component 应使用 AijBasic{SemanticName}。")
      : issue("name", "Naming", "warning", "最终 Figma component 应使用 AijBasic{SemanticName}。"),
  );

  visual.push(
    pathCount <= 5
      ? issue("complexity", "Path complexity", "pass", `路径数为 ${pathCount}，适合小尺寸识别。`)
      : issue("complexity", "Path complexity", "warning", `路径数为 ${pathCount}，24px 下可能偏复杂，需人工检查是否有重叠或黑团。`),
  );

  visual.push(
    circleCount <= 3
      ? issue("node-density", "Node density", "pass", "节点数量可控。")
      : issue("node-density", "Node density", "warning", "节点数量偏多，容易出现连线重叠或负空间塌陷。"),
  );

  visual.push(
    moveCount <= Math.max(1, pathCount + 2)
      ? issue("fragmentation", "Path fragmentation", "pass", "未检测到明显碎片化路径。")
      : issue("fragmentation", "Path fragmentation", "warning", "单个 SVG 中存在较多独立移动段，可能出现断裂/碎线感。"),
  );

  visual.push(
    /<polygon\b|<polyline\b|Z"[^>]*(arrow|triangle|play)/i.test(svg)
      ? issue("filled-triangle", "Filled triangle risk", "warning", "检测到可能形成填充三角的结构，需确认是否符合 outline-first。")
      : issue("filled-triangle", "Filled triangle risk", "pass", "未检测到明显填充三角风险。"),
  );

  visual.push(
    /stroke-linecap="round"/.test(svg) || !/stroke=/.test(svg)
      ? issue("cap", "Endpoint style", "pass", "端点风格为 round，符合默认线性图标规范。")
      : issue("cap", "Endpoint style", "warning", "未检测到 round linecap。"),
  );

  const lower = `${name} ${query}`.toLowerCase();
  semantic.push(
    lower.includes("ai") || lower.includes("审核") || lower.includes("review") || query.length > 0
      ? issue("meaning", "Semantic match", "pass", "图标名称或用户需求包含明确语义线索。")
      : issue("meaning", "Semantic match", "warning", "语义线索较弱，建议补充业务描述。"),
  );

  const all = [...system, ...visual, ...semantic];
  const score = Math.max(0, Math.min(100, scoreIssues(all)));

  return {
    score,
    semantic,
    visual,
    system,
    summary:
      score >= 90
      ? "可作为团队规范图标候选入库。"
      : score >= 72
          ? "可作为 SVG Preview 草稿，但进入 Figma 前仍需设计师批准。"
          : "暂不建议进入 Spec & Draw，需要先修订语义或预览。",
  };
}

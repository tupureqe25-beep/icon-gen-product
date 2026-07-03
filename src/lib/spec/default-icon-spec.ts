import type { TeamIconSpec } from "@/lib/icons/types";

export const defaultIconSpec: TeamIconSpec = {
  canvas: 24,
  viewBox: "0 0 24 24",
  color: "#0F1218",
  style: "outline",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  fill: "none",
  padding: 2,
  frameBevel: 4,
  shapeCornerRadius: 4,
  opticalCorrection: true,
  gridSnap: false,
  naming: "AijBasicPascalCase",
  output: "editable-figma-native-icon",
};

export const teamSpecPrinciples = [
  "这是漫画平台固定风格，不让用户选择样式、颜色或画布尺寸",
  "必须先给 2–3 个语义方向，再生成 SVG Preview",
  "SVG 只是批准预览，最终 Figma 交付必须是可编辑 native nodes",
  "Preview 批准后才生成 Icon Spec JSON，并通过截图门禁比对",
];

export const teamSpecReviewDimensions = [
  {
    name: "Semantic",
    description: "隐喻清晰，符合漫画平台上下文，不与分享、收藏、下载等常见概念混淆。",
  },
  {
    name: "Visual",
    description: "24px outline 可读，主体占据 keyline，负空间不塌陷，没有视觉填充感。",
  },
  {
    name: "System",
    description: "符合 24px、#0F1218、2px stroke、round cap/join、4px 圆角和 2px padding。",
  },
  {
    name: "Engineering",
    description: "最终为 Figma 原生可编辑节点，非粘贴 SVG，并通过截图与预览一致性检查。",
  },
];

export const teamSpecSources = [
  "Brief: concept / location / meaning emphasis",
  "Semantic Plan: 2–3 visual directions",
  "SVG Preview: approval-only artifact",
  "Icon Spec JSON: native-node contract",
  "Figma Native Nodes + Screenshot Gate",
];

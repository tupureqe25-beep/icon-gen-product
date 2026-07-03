export type IconAsset = {
  id: string;
  name: string;
  category: string;
  tags: string[];
  source: string;
  license: string;
  svg: string;
};

export type TeamIconSpec = {
  canvas: 24;
  viewBox: "0 0 24 24";
  color: "#0F1218";
  style: "outline";
  strokeWidth: 2;
  strokeLinecap: "round";
  strokeLinejoin: "round";
  fill: "none";
  padding: 2;
  frameBevel: 4;
  shapeCornerRadius: 4;
  opticalCorrection: true;
  gridSnap: false;
  naming: "AijBasicPascalCase";
  output: "editable-figma-native-icon";
};

export type NormalizedIcon = {
  svg: string;
  changes: string[];
  warnings: string[];
};

export type ReviewSeverity = "pass" | "warning" | "fail";

export type ReviewIssue = {
  id: string;
  label: string;
  severity: ReviewSeverity;
  detail: string;
};

export type ReviewReport = {
  score: number;
  semantic: ReviewIssue[];
  visual: ReviewIssue[];
  system: ReviewIssue[];
  summary: string;
};

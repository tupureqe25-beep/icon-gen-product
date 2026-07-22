"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentAction, AgentDecision, AgentMode } from "@/lib/agent/types";
import { buildFigmaNativeScript, scaleNativeShapes } from "@/lib/icon-contract/generate";
import type {
  BatchFigmaWriteItem,
  BatchFigmaWriteRun,
  DeliveryPackage,
  FigmaWriteJob,
  IconSpecContract,
  NativeShapeContract,
  ProductionRun,
} from "@/lib/icon-contract/types";
import { parseIconfontSymbols, parseSvgAssets } from "@/lib/icons/iconfont";
import { normalizeSvg } from "@/lib/icons/normalize";
import { isFigmaSafePathData, normalizeSvgPathForFigma } from "@/lib/icons/path-normalize";
import { reviewSvg } from "@/lib/icons/review";
import { searchIcons, type SearchResult } from "@/lib/icons/search";
import type { IconAsset, ReviewReport } from "@/lib/icons/types";
import { teamSpecSkillRegistry, type TeamSpecOutputProfile, type TeamSpecSkillId } from "@/lib/team-spec-skills";

const starterMessage = "做一个书签图标，用在章节卡片操作区，强调收藏动作";
const sourceCandidateDragType = "application/x-iconops-source-candidate";
const canvasSurfaceWidth = 1600;
const canvasSurfaceHeight = 1200;
const canvasInstanceBaseSize = 120;
const registeredFigmaCanvasLibraryUrl = "https://www.figma.com/design/ChWPGs0aoqUovUMVC4W373/icon?node-id=0-1";
const defaultCanvasLayerId = "canvas-layer-1";
const defaultTeamIconColor = "#0F1218";
const colorSwatches = ["#0F1218", "#111827", "#1F2937", "#374151", "#2563EB", "#16A34A", "#F59E0B", "#EF4444"];

type ChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  actions?: AgentAction[];
  confidence?: number;
  mode?: AgentMode;
  modeReason?: string;
  suggestions?: string[];
  quickActions?: Array<{
    label: string;
    value: string;
  }>;
  semanticOptions?: SemanticOption[];
  semanticBrief?: IconBrief;
  previewVariants?: PreviewVariant[];
  sourceCandidates?: SourceCandidate[];
};

type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
};

type FigmaCredentialStatus = {
  hasToken: boolean;
  maskedToken?: string;
};

type AgentHandleResult = "handled" | "continue";

type WorkflowPhase = "brief" | "semantic" | "preview" | "draw";
type InspectorTab = "properties" | "spec" | "quality" | "layers";
type SourceLibraryTab = "all" | "figma" | "curated" | "iconfont" | "iconpark" | "lucide" | "tabler" | "phosphor" | "ai";
type WorkbenchMode = "chat" | "batch";
type ManualReviewStatus = "pending" | "approved" | "rejected" | "library";
type SourceRuntimeMode = "fast" | "strict" | "explore" | "maintenance";

type IconQualityIssue = {
  id: string;
  title: string;
  message: string;
  severity: "warning" | "blocker";
  stage: "source" | "geometry" | "team-spec" | "figma-native";
  actionLabel: string;
  elementId?: CanvasElementId;
};

type MatureSourceMatch = {
  label?: string;
  name?: string;
  nodeId?: string;
  route: "team-reuse-needs-verification" | "team-adjacent-reference";
  semanticDirection?: string;
  visualElements?: string[];
  shapeSummary?: string;
  guardrails?: {
    geometrySummary?: string;
    mustKeep: string[];
    forbidden: string[];
  };
};

type SourceDecision = {
  skillId: string;
  query: string;
  mode: SourceRuntimeMode;
  route: "team-reuse-needs-verification" | "team-adjacent-reference" | "external-source-search" | "generation-first";
  exactMatch: MatureSourceMatch | null;
  adjacentMatches: MatureSourceMatch[];
  sourceUrl?: string;
  requiresSourceVerification?: boolean;
  message: string;
};

type CanvasElementId = string;

type CanvasElement = {
  id: CanvasElementId;
  name: string;
  type: "frame" | "rect" | "path" | "line" | "ellipse" | "preview";
  x: number;
  y: number;
  width: number;
  height: number;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  fill?: string;
  pathData?: string;
  lineSlope?: "down" | "up";
  nativeRole?: string;
  locked?: boolean;
  visible?: boolean;
};

type SemanticOption = {
  id: "A" | "B" | "C" | "D" | "E" | "F";
  title: string;
  elements: string;
  meaning: string;
  risk: string;
  previewGlyphKind?: IconGlyphKind;
};

type PreviewVariantId = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10";
const aiPreviewGridSourcePrefix = "AI 方案 /";

type PreviewVariant = {
  id: PreviewVariantId;
  optionId: SemanticOption["id"];
  title: string;
  subtitle: string;
  description: string;
  risk: string;
  previewSvg: string;
  qualityStatus: "pass" | "warning" | "blocked";
  qualitySummary: string;
};

type IconGlyphKind =
  | "bookmark"
  | "share"
  | "search"
  | "filter"
  | "download"
  | "upload"
  | "play"
  | "comment"
  | "like"
  | "read"
  | "settings"
  | "arrowsUpDown"
  | "arrowsIn"
  | "arrowsOut"
  | "contentExpand"
  | "user"
  | "game"
  | "network"
  | "generic";

type IconBrief = {
  sourceText: string;
  concept: string;
  label: string;
  semanticName: string;
  context: string;
  emphasis: string;
  glyphKind: IconGlyphKind;
};

const iconGlyphKinds = [
  "bookmark",
  "share",
  "search",
  "filter",
  "download",
  "upload",
  "play",
  "comment",
  "like",
  "read",
  "settings",
  "arrowsUpDown",
  "arrowsIn",
  "arrowsOut",
  "contentExpand",
  "user",
  "game",
  "network",
  "generic",
] as const satisfies readonly IconGlyphKind[];

function normalizeGlyphKind(value: unknown, fallback: IconGlyphKind = "generic"): IconGlyphKind {
  return typeof value === "string" && (iconGlyphKinds as readonly string[]).includes(value) ? (value as IconGlyphKind) : fallback;
}

type SourceCandidate = SearchResult & {
  normalizedSvg: string;
  normalizedChanges: string[];
  normalizedWarnings: string[];
  review: ReviewReport;
};

type TeamLibraryAsset = IconAsset & {
  libraryId: string;
  aliases: string[];
  contexts: string[];
  semanticDescription: string;
  visualElements: string[];
  trainingSource: "figma-canvas" | "iconfont-symbol" | "pasted-svg" | "canvas-review" | "manual";
  originalSource: string;
  status: "trained" | "reviewed" | "approved";
  qualityScore?: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
};

type TeamLibrarySummary = {
  count: number;
  updatedAt?: string;
  created?: number;
  updated?: number;
};

type IconCanvasInstance = {
  id: string;
  name: string;
  x: number;
  y: number;
  scale: number;
  previewPadding?: number;
  previewStrokeWidth?: number;
  glyphKind: IconGlyphKind;
  elements: CanvasElement[];
  optionId?: SemanticOption["id"];
  sourceName?: string;
  previewSvg?: string;
  sourcePreviewSvg?: string;
  previewShapes?: NativeShapeContract[];
  sourceCandidateId?: string;
  sourceConversionStatus?: "team_normalized" | "needs_review" | "reference_only";
  previewColor?: string;
  reviewStatus?: ManualReviewStatus;
  reviewNote?: string;
  qualityApprovedIssueIds?: string[];
  previewVariantId?: PreviewVariantId;
};

type CanvasLayer = {
  id: string;
  name: string;
  instances: IconCanvasInstance[];
};

type BatchManifestItem = {
  id: string;
  name: string;
  sourceName: string;
  optionId: string;
  position: { x: number; y: number };
  scale: number;
  status: "queued_for_review";
};

type BatchInputKind = "names" | "figma" | "document" | "mixed";

type BatchTask = {
  id: string;
  name: string;
  prompt: string;
  sourceKind: BatchInputKind;
  context: string;
  status: "parsed" | "matched" | "queued" | "needs_review";
  candidateCount: number;
  bestScore: number;
};

type FigmaBridgeStatus = {
  online: boolean;
  bridgeVersion?: string;
  lastSeenAt?: string;
  serverUrl?: string;
  fileName?: string;
  pageName?: string;
  listening?: boolean;
};

const teamSpecRules = [
  { label: "画板", value: "24×24", description: "统一主图标尺寸" },
  { label: "安全区", value: "2px", description: "可绘制区域 20×20" },
  { label: "线宽", value: "2px", description: "中心描边" },
  { label: "颜色", value: "#0F1218", description: "单色扁平" },
  { label: "端点", value: "圆角", description: "round cap / join" },
  { label: "输出", value: "可编辑", description: "Figma native nodes" },
];

const glyphProfiles: Record<
  IconGlyphKind,
  {
    label: string;
    semanticName: string;
    concept: string;
    objectDirection: string;
    objectElements: string;
    objectMeaning: string;
    actionDirection: string;
    actionElements: string;
    actionMeaning: string;
    statusDirection: string;
    statusElements: string;
    statusMeaning: string;
  }
> = {
  bookmark: {
    label: "Bookmark",
    semanticName: "Bookmark",
    concept: "收藏",
    objectDirection: "对象优先 · 书签轮廓",
    objectElements: "一个大书签外轮廓，底部 V 形切口，结构极简。",
    objectMeaning: "直接表达收藏内容，适合章节或卡片操作区。",
    actionDirection: "动作优先 · 书签 + 小加号",
    actionElements: "书签轮廓 + 右上角 2px 间距的加号标记。",
    actionMeaning: "强调“添加收藏”，比单纯书签更像一次操作。",
    statusDirection: "状态优先 · 书签 + 小圆点",
    statusElements: "书签轮廓 + 3px 局部填充状态点。",
    statusMeaning: "表达已收藏或状态反馈，适合切换态。",
  },
  share: {
    label: "Share",
    semanticName: "Share",
    concept: "分享",
    objectDirection: "动作优先 · 外发箭头",
    objectElements: "一条 45° 外发线 + 开口箭头，结构极简。",
    objectMeaning: "在章节卡片这种紧凑场景里，比三点网络更快读成“分享/转发”。",
    actionDirection: "发送隐喻 · 外发箭头加强",
    actionElements: "开放式 45° 外发箭头 + 轻量起点短线，不做纸飞机填充三角。",
    actionMeaning: "强调把内容发送出去，同时保持 24px 下的线性可读性。",
    statusDirection: "社交关系 · 三点连线",
    statusElements: "三个 6px 节点 + 两条连接线，节点空间保持可读。",
    statusMeaning: "表达社交分发网络，但在 24px 下复杂度更高，需要谨慎使用。",
  },
  search: {
    label: "Search",
    semanticName: "Search",
    concept: "搜索",
    objectDirection: "对象优先 · 放大镜",
    objectElements: "圆形镜片 + 45° 手柄。",
    objectMeaning: "检索含义最稳定，适合工具栏或输入入口。",
    actionDirection: "动作优先 · 放大镜 + 小加号",
    actionElements: "放大镜主体 + 右上角小加号。",
    actionMeaning: "强调添加搜索条件或创建搜索。",
    statusDirection: "状态优先 · 放大镜 + 状态点",
    statusElements: "放大镜主体 + 小型状态点。",
    statusMeaning: "表达搜索结果、已命中或状态提醒。",
  },
  filter: {
    label: "Filter",
    semanticName: "Filter",
    concept: "筛选",
    objectDirection: "对象优先 · 三段筛选滑杆",
    objectElements: "三条水平线和错位圆角节点。",
    objectMeaning: "表达筛选条件和参数调整。",
    actionDirection: "动作优先 · 筛选滑杆 + 小加号",
    actionElements: "筛选滑杆主体 + 右上角小加号。",
    actionMeaning: "强调新增筛选条件。",
    statusDirection: "状态优先 · 筛选滑杆 + 状态点",
    statusElements: "筛选滑杆主体 + 小型状态点。",
    statusMeaning: "表达筛选已生效或存在筛选状态。",
  },
  download: {
    label: "Download",
    semanticName: "Download",
    concept: "下载",
    objectDirection: "对象优先 · 下箭头入托盘",
    objectElements: "向下箭头 + 底部开口托盘。",
    objectMeaning: "表达把内容保存到本地或导出。",
    actionDirection: "动作优先 · 下载 + 小加号",
    actionElements: "下载箭头主体 + 右上角小加号。",
    actionMeaning: "强调新增下载任务。",
    statusDirection: "状态优先 · 下载 + 状态点",
    statusElements: "下载箭头主体 + 小型状态点。",
    statusMeaning: "表达下载完成或任务状态。",
  },
  upload: {
    label: "Upload",
    semanticName: "Upload",
    concept: "上传",
    objectDirection: "对象优先 · 上箭头出托盘",
    objectElements: "向上箭头 + 底部开口托盘。",
    objectMeaning: "表达把内容提交到平台或云端。",
    actionDirection: "动作优先 · 上传 + 小加号",
    actionElements: "上传箭头主体 + 右上角小加号。",
    actionMeaning: "强调新增上传任务。",
    statusDirection: "状态优先 · 上传 + 状态点",
    statusElements: "上传箭头主体 + 小型状态点。",
    statusMeaning: "表达上传完成或任务状态。",
  },
  play: {
    label: "Play",
    semanticName: "Play",
    concept: "播放",
    objectDirection: "对象优先 · 圆角播放键",
    objectElements: "圆角外框 + 三角播放符号。",
    objectMeaning: "表达开始播放，适合媒体或章节朗读入口。",
    actionDirection: "动作优先 · 播放键 + 小加号",
    actionElements: "播放主体 + 右上角小加号。",
    actionMeaning: "强调添加到播放或创建播放任务。",
    statusDirection: "状态优先 · 播放键 + 状态点",
    statusElements: "播放主体 + 小型状态点。",
    statusMeaning: "表达播放中或已加入播放状态。",
  },
  comment: {
    label: "Comment",
    semanticName: "Comment",
    concept: "评论",
    objectDirection: "对象优先 · 对话气泡",
    objectElements: "圆角气泡轮廓 + 底部小尾巴。",
    objectMeaning: "表达评论、回复或讨论。",
    actionDirection: "动作优先 · 气泡 + 小加号",
    actionElements: "评论气泡主体 + 右上角小加号。",
    actionMeaning: "强调新增评论。",
    statusDirection: "状态优先 · 气泡 + 状态点",
    statusElements: "评论气泡主体 + 小型状态点。",
    statusMeaning: "表达有新评论或评论状态。",
  },
  like: {
    label: "Like",
    semanticName: "Like",
    concept: "点赞",
    objectDirection: "对象优先 · 圆角爱心",
    objectElements: "对称爱心轮廓，控制顶部负空间。",
    objectMeaning: "表达喜欢、点赞或偏好。",
    actionDirection: "动作优先 · 爱心 + 小加号",
    actionElements: "爱心主体 + 右上角小加号。",
    actionMeaning: "强调添加喜欢或收藏到偏好。",
    statusDirection: "状态优先 · 爱心 + 状态点",
    statusElements: "爱心主体 + 小型状态点。",
    statusMeaning: "表达已点赞或偏好状态。",
  },
  read: {
    label: "Read",
    semanticName: "Read",
    concept: "阅读",
    objectDirection: "对象优先 · 打开的漫画页",
    objectElements: "左右两页打开的书页轮廓，中间留出书脊负空间。",
    objectMeaning: "直接表达阅读/打开内容，比单页文档更适合漫画平台。",
    actionDirection: "动作优先 · 打开书页 + 进入线",
    actionElements: "打开书页主体 + 右侧短进入线，表达进入阅读。",
    actionMeaning: "强调从入口进入阅读动作。",
    statusDirection: "状态优先 · 书页 + 阅读进度点",
    statusElements: "打开书页主体 + 小型阅读进度点。",
    statusMeaning: "表达阅读中或继续阅读状态。",
  },
  settings: {
    label: "Settings",
    semanticName: "Settings",
    concept: "设置",
    objectDirection: "对象优先 · 简化齿轮",
    objectElements: "圆形中心 + 4 个短齿，避免复杂 8 齿造成黑团。",
    objectMeaning: "表达配置、偏好和工具设置，适合底部工具栏。",
    actionDirection: "参数优先 · 滑杆设置",
    actionElements: "两条水平滑杆 + 错位控制点，表达可调整。",
    actionMeaning: "更偏参数调整，适合工具设置入口。",
    statusDirection: "状态优先 · 齿轮 + 小圆点",
    statusElements: "简化齿轮主体 + 小型状态点。",
    statusMeaning: "表达设置项有更新或状态提醒。",
  },
  arrowsUpDown: {
    label: "Sort",
    semanticName: "Sort",
    concept: "排序",
    objectDirection: "对象优先 · 上下排序箭头",
    objectElements: "一上一下两条开放箭头，保持 2px 线宽和中心对称。",
    objectMeaning: "表达列表排序、升降序切换或上下调整。",
    actionDirection: "动作优先 · 排序 + 小加号",
    actionElements: "上下排序箭头 + 右上角 2px 间距的小加号。",
    actionMeaning: "强调新增排序条件或添加排序规则。",
    statusDirection: "状态优先 · 排序 + 状态点",
    statusElements: "上下排序箭头 + 极小状态点。",
    statusMeaning: "表达排序已生效或存在排序状态。",
  },
  arrowsIn: {
    label: "Collapse",
    semanticName: "Collapse",
    concept: "收起",
    objectDirection: "对象优先 · 向内收起箭头",
    objectElements: "两组向中心聚拢的开放箭头，避免四角细节过密。",
    objectMeaning: "表达收起、缩小、聚合或退出全屏。",
    actionDirection: "动作优先 · 收起 + 小加号",
    actionElements: "向内箭头主体 + 右上角小加号。",
    actionMeaning: "强调新增一个收起/聚合动作。",
    statusDirection: "状态优先 · 收起 + 状态点",
    statusElements: "向内箭头主体 + 极小状态点。",
    statusMeaning: "表达当前处于收起或压缩状态。",
  },
  arrowsOut: {
    label: "Expand",
    semanticName: "Expand",
    concept: "展开",
    objectDirection: "对象优先 · 向外展开箭头",
    objectElements: "两组向外扩展的开放箭头，保持大负空间。",
    objectMeaning: "表达展开、放大、全屏或扩散。",
    actionDirection: "动作优先 · 展开 + 小加号",
    actionElements: "向外箭头主体 + 右上角小加号。",
    actionMeaning: "强调新增一个展开/扩展动作。",
    statusDirection: "状态优先 · 展开 + 状态点",
    statusElements: "向外箭头主体 + 极小状态点。",
    statusMeaning: "表达当前处于展开或全屏状态。",
  },
  contentExpand: {
    label: "ContentExpand",
    semanticName: "ContentExpand",
    concept: "智能扩写",
    objectDirection: "文本延展 · 行文变长",
    objectElements: "左侧三条短文本线 + 右侧独立延展箭头，二者保持 3px 间距。",
    objectMeaning: "强调已有文本被扩展成更完整的内容。",
    actionDirection: "内容补全 · 文档加段落",
    actionElements: "开放文档轮廓 + 右下角独立短文本线，不叠加加号。",
    actionMeaning: "强调为文章或段落补充缺失内容。",
    statusDirection: "写作辅助 · 文本加笔",
    statusElements: "两条文本线 + 右侧独立笔尖轮廓，保持清晰分区。",
    statusMeaning: "强调智能写作助手参与扩写过程。",
  },
  user: {
    label: "User",
    semanticName: "User",
    concept: "个人中心",
    objectDirection: "身份对象 · 头像轮廓",
    objectElements: "圆形头像 + 半圆肩线，保持大负空间。",
    objectMeaning: "直接表达个人、账号、用户中心。",
    actionDirection: "入口容器 · 头像置于圆角卡片",
    actionElements: "轻量头像符号 + 圆角容器暗示个人中心入口。",
    actionMeaning: "更像点击进入个人主页或账号区域。",
    statusDirection: "状态反馈 · 头像 + 小圆点",
    statusElements: "头像主体 + 右上角极小状态点。",
    statusMeaning: "表达账号状态、登录态或个人中心提醒。",
  },
  game: {
    label: "Game",
    semanticName: "Game",
    concept: "游戏",
    objectDirection: "对象直读 · 游戏手柄",
    objectElements: "圆角手柄轮廓 + 十字方向键 + 单个按键点，控制在 4 个路径内。",
    objectMeaning: "直接表达游戏/小游戏入口，比网络信号更贴近“网络游戏”。",
    actionDirection: "玩法入口 · 手柄 + 开始键",
    actionElements: "手柄主体 + 中央短线作为开始/进入提示，不叠加额外徽标。",
    actionMeaning: "强调进入游戏或开始游玩，适合操作区入口。",
    statusDirection: "在线游戏 · 手柄 + 连接弧线",
    statusElements: "手柄主体 + 顶部一条开放连接弧，表达联网但不使用 Wi‑Fi 黑团。",
    statusMeaning: "表达网络游戏/联机玩法，但仍以游戏对象为主语。",
  },
  network: {
    label: "Network",
    semanticName: "Network",
    concept: "网络",
    objectDirection: "连接对象 · 三点网络",
    objectElements: "三个圆点节点 + 两条连接线。",
    objectMeaning: "直接表达网络连接、节点关系或分发链路。",
    actionDirection: "信号动作 · 弧线扩散",
    actionElements: "中心节点 + 两层开放弧线，表达网络信号。",
    actionMeaning: "更像网络状态、联网或信号传播。",
    statusDirection: "路径结构 · 节点路由",
    statusElements: "三个节点组成轻量路径，突出连接路径。",
    statusMeaning: "表达路由、链路或网络拓扑关系。",
  },
  generic: {
    label: "Icon",
    semanticName: "Icon",
    concept: "通用图标",
    objectDirection: "对象优先 · 圆角容器符号",
    objectElements: "圆角方形主体 + 简洁内线。",
    objectMeaning: "在语义未完全明确时先建立可读主体。",
    actionDirection: "动作优先 · 通用符号 + 小加号",
    actionElements: "圆角主体 + 右上角小加号。",
    actionMeaning: "表达新增或创建动作。",
    statusDirection: "状态优先 · 通用符号 + 状态点",
    statusElements: "圆角主体 + 小型状态点。",
    statusMeaning: "表达已生效或状态反馈。",
  },
};

const defaultBrief: IconBrief = {
  sourceText: starterMessage,
  concept: glyphProfiles.bookmark.concept,
  label: glyphProfiles.bookmark.label,
  semanticName: glyphProfiles.bookmark.semanticName,
  context: "章节卡片操作区",
  emphasis: "收藏动作",
  glyphKind: "bookmark",
};


function inferGlyphKind(message: string): IconGlyphKind {
  const lower = message.toLowerCase();

  if (/离线|offline|本地保存|保存到本地|缓存/.test(lower)) return "download";
  if (/收藏|书签|bookmark|favorite|save/.test(lower)) return "bookmark";
  if (/分享|转发|share|forward/.test(lower)) return "share";
  if (/搜索|查找|检索|search|find/.test(lower)) return "search";
  if (/筛选|过滤|filter/.test(lower)) return "filter";
  if (/下载|导出|download|export/.test(lower)) return "download";
  if (/上传|提交|upload|submit/.test(lower)) return "upload";
  if (/播放|play|listen|朗读/.test(lower)) return "play";
  if (/评论|回复|留言|comment|reply/.test(lower)) return "comment";
  if (/点赞|喜欢|like|heart/.test(lower)) return "like";
  if (/阅读|读|漫画书|章节|read|book|reader/.test(lower)) return "read";
  if (/设置|配置|偏好|齿轮|setting|settings|gear/.test(lower)) return "settings";
  if (/排序|升序|降序|上下排序|上下调整|sort|order|arrows?-?up-?down|up-?down|arrow-?down-?up|sliders?/.test(lower)) return "arrowsUpDown";
  if (/收起|缩小|聚拢|退出全屏|collapse|compress|arrows?-?in|arrows?-?in-?simple|minimize|shrink/.test(lower)) return "arrowsIn";
  if (/智能扩写|文本扩写|内容扩写|续写|补写|内容补全|写作辅助|rewrite|writing assist|text expand/.test(lower)) return "contentExpand";
  if (/展开|放大|扩展|全屏|expand|arrows?-?out|maximize|fullscreen|enlarge/.test(lower)) return "arrowsOut";
  if (/个人中心|个人|我的|账户|账号|用户|头像|profile|account|user|person|me\b/.test(lower)) return "user";
  if (/网络游戏|联机游戏|小游戏|游戏|game|gaming|playable|controller/.test(lower)) return "game";
  if (/网络|联网|节点|连接|链路|拓扑|network|connected|connection|node|signal|wifi|globe/.test(lower)) return "network";
  return "generic";
}

function inferContext(message: string, fallback: string) {
  const contextMatch =
    message.match(/用在([^，。,.；;]+)/) ??
    message.match(/用于([^，。,.；;]+)/) ??
    message.match(/出现在([^，。,.；;]+)/) ??
    message.match(/放在([^，。,.；;]+)/) ??
    message.match(/出现(?:在)?([^，。,.；;]+)/);
  const context = contextMatch?.[1]?.replace(/^(哪个|哪个页面|页面|位置)/, "").trim();
  if (context) return context;

  const directContext = message.match(/^(首页|详情页|分类页|阅读页|顶部|底部|导航|工具栏|卡片|抽屉|空状态|列表|操作区)$/);
  return directContext?.[1] || fallback;
}

function inferEmphasis(message: string, fallback: string) {
  const emphasisMatch = message.match(/强调([^，。,.；;]+)/) ?? message.match(/表达([^，。,.；;]+)/) ?? message.match(/突出([^，。,.；;]+)/);
  const emphasis = emphasisMatch?.[1]?.trim();
  if (emphasis) return emphasis;

  const directEmphasis = message.match(/^(对象|动作|状态|转发|新增|保存|下载|上传|查找|筛选|收藏|顶部|底部)$/);
  return directEmphasis?.[1] || fallback;
}

function buildBriefFromMessage(message: string, fallback = defaultBrief): IconBrief {
  const glyphKind = inferGlyphKind(message);
  const profile = glyphProfiles[glyphKind];

  return {
    sourceText: message,
    concept: profile.concept,
    label: profile.label,
    semanticName: profile.semanticName,
    context: inferContext(message, fallback.context),
    emphasis: inferEmphasis(message, profile.concept),
    glyphKind,
  };
}

function resolveSourceSemanticOptionId(candidate: SourceCandidate, candidateBrief: IconBrief): SemanticOption["id"] {
  const text = `${candidate.name} ${candidate.category} ${candidate.tags.join(" ")} ${candidate.matchReason}`.toLowerCase();

  if (candidateBrief.glyphKind === "share") {
    if (/nodes?|network|share-?2|share-?3|connected|connection|分发|三点|节点|连接/.test(text)) return "C";
    if (/send|sent|plane|message|paper|发送/.test(text)) return "B";
    return "A";
  }

  if (candidateBrief.glyphKind === "download" || candidateBrief.glyphKind === "upload") {
    if (/file|document|doc|paper|文件|文档/.test(text)) return "B";
    if (/cloud|tray|inbox|box|archive|云|托盘|收纳/.test(text)) return "C";
    return "A";
  }

  if (candidateBrief.glyphKind === "filter") {
    if (/funnel|filter|漏斗/.test(text)) return "B";
    if (/panel|drawer|list|menu|分类|抽屉|面板/.test(text)) return "C";
    return "A";
  }

  if (candidateBrief.glyphKind === "search" && /scan|focus|target|框选|扫描/.test(text)) return "B";
  if (candidateBrief.glyphKind === "network" && /wifi|signal|broadcast|online|信号|联网/.test(text)) return "B";
  if (candidateBrief.glyphKind === "arrowsUpDown" && /list|reorder|sort|排序|列表/.test(text)) return "C";

  return "A";
}

const semanticOptionPresets: Partial<Record<IconGlyphKind, SemanticOption[]>> = {
  game: [
    {
      id: "A",
      title: "游戏对象 · 手柄轮廓",
      elements: "圆角手柄主体 + 十字方向键 + 单个按键短线。",
      meaning: "直接表达游戏/小游戏入口，适合“网络游戏”这种概念先读成游戏本体。",
      risk: "内部按钮必须克制，避免 24px 下变成黑团。",
      previewGlyphKind: "game",
    },
    {
      id: "B",
      title: "联机状态 · 手柄 + 连接弧",
      elements: "手柄主体 + 顶部一条开放连接弧，不叠加 Wi-Fi 小加号。",
      meaning: "强调在线/联机游戏，但主语仍是游戏，不会误读成普通网络信号。",
      risk: "连接弧需要与手柄保持 2px 以上距离。",
      previewGlyphKind: "game",
    },
    {
      id: "C",
      title: "开始入口 · 手柄 + 开始键",
      elements: "手柄主体 + 中央开放播放/开始符号。",
      meaning: "强调点击进入或开始游玩，适合作为入口操作图标。",
      risk: "开始符号不能做成填充三角，只能用开放线。",
      previewGlyphKind: "game",
    },
  ],
  network: [
    {
      id: "A",
      title: "连接关系 · 三点网络",
      elements: "三个节点 + 两条连接线，保持节点间 2px 以上负空间。",
      meaning: "表达网络连接、关系节点或分发链路。",
      risk: "路径数量达到 5，需要确认 24px 下不会显得过密。",
      previewGlyphKind: "network",
    },
    {
      id: "B",
      title: "在线状态 · 开放信号弧",
      elements: "一个小核心点 + 两层开放弧线，不添加右上角徽标。",
      meaning: "表达联网、信号传播或网络状态。",
      risk: "核心点使用局部小填充，弧线之间必须留出清晰间距。",
      previewGlyphKind: "network",
    },
    {
      id: "C",
      title: "路由路径 · 折线路由",
      elements: "一条折线路径 + 三个路径节点。",
      meaning: "表达路由、链路或路径结构，区别于普通三点关系。",
      risk: "折线角度必须保持 90°，避免变成装饰曲线。",
      previewGlyphKind: "network",
    },
  ],
  bookmark: [
    {
      id: "A",
      title: "对象直读 · 书签轮廓",
      elements: "独立书签外轮廓 + 底部 V 形切口。",
      meaning: "最像“收藏/书签”本体，用户识别成本最低。",
      risk: "动作感较弱，更像状态入口。",
      previewGlyphKind: "bookmark",
    },
    {
      id: "B",
      title: "动作补充 · 加入收藏",
      elements: "书签主体 + 右上角独立加号，保持 2px 间距。",
      meaning: "强调“添加到收藏”的操作行为。",
      risk: "小加号会增加右上角密度，需要检查 24px 可读性。",
      previewGlyphKind: "bookmark",
    },
    {
      id: "C",
      title: "结果反馈 · 已收藏标记",
      elements: "书签主体 + 极小状态点，表达已保存结果。",
      meaning: "适合切换态或已收藏状态。",
      risk: "状态点只能作为 3px 局部填充例外，不能扩大成装饰。",
      previewGlyphKind: "bookmark",
    },
  ],
  download: [
    {
      id: "A",
      title: "任务动作 · 下箭头入托盘",
      elements: "向下开放箭头 + 底部开口托盘。",
      meaning: "直接表达下载动作，适合按钮、工具栏和列表操作。",
      risk: "动作结果不强调文件对象，但 24px 识别最稳。",
      previewGlyphKind: "download",
    },
    {
      id: "B",
      title: "内容对象 · 文件导出",
      elements: "圆角文档轮廓 + 右下角导出箭头。",
      meaning: "强调把一个文件/内容保存出去，比纯箭头更像“导出文件”。",
      risk: "文档折角和箭头不能同时太复杂，否则会变成黑团。",
      previewGlyphKind: "download",
    },
    {
      id: "C",
      title: "本地保存 · 收纳盒",
      elements: "独立收纳盒主体 + 顶部盒盖 + 向下落入线。",
      meaning: "强调下载后的本地保存/收纳结果，与标准下载箭头拉开差异。",
      risk: "盒盖和落入线必须保持足够留白，避免与托盘下载混淆。",
      previewGlyphKind: "download",
    },
  ],
  upload: [
    {
      id: "A",
      title: "任务动作 · 上箭头出托盘",
      elements: "向上开放箭头 + 底部开口托盘。",
      meaning: "直接表达上传/提交动作，识别效率最高。",
      risk: "偏标准工具图标，品牌感较弱。",
      previewGlyphKind: "upload",
    },
    {
      id: "B",
      title: "内容对象 · 文件提交",
      elements: "圆角文档轮廓 + 向上提交箭头。",
      meaning: "强调上传的是内容文件，适合投稿、资料提交场景。",
      risk: "文档与箭头同框时负空间要控制。",
      previewGlyphKind: "upload",
    },
    {
      id: "C",
      title: "过程隐喻 · 云端发送",
      elements: "开放云形轮廓 + 上箭头，表达发送到云端。",
      meaning: "适合云同步或平台上传，而不是普通表单提交。",
      risk: "云形在漫画平台里未必是默认隐喻，需确认业务语境。",
      previewGlyphKind: "upload",
    },
  ],
  search: [
    {
      id: "A",
      title: "对象直读 · 放大镜",
      elements: "圆形镜片 + 45° 手柄。",
      meaning: "搜索识别最稳定，适合大多数入口。",
      risk: "只表达查找，不强调结果或筛选。",
      previewGlyphKind: "search",
    },
    {
      id: "B",
      title: "范围聚焦 · 框选扫描",
      elements: "四角扫描框 + 中央短线。",
      meaning: "更像在内容中定位、识别或扫描。",
      risk: "可能被读成识别/扫码，而不是通用搜索。",
      previewGlyphKind: "search",
    },
    {
      id: "C",
      title: "结果命中 · 放大镜加点",
      elements: "放大镜主体 + 极小命中点。",
      meaning: "适合表达已找到结果或搜索状态。",
      risk: "状态点要非常克制，避免装饰化。",
      previewGlyphKind: "search",
    },
  ],
  filter: [
    {
      id: "A",
      title: "参数调节 · 三段滑杆",
      elements: "三条水平线 + 错位控制点。",
      meaning: "强调条件调节，适合筛选面板入口。",
      risk: "可能与设置/参数调整接近。",
      previewGlyphKind: "filter",
    },
    {
      id: "B",
      title: "漏斗隐喻 · 条件收束",
      elements: "上宽下窄的开放漏斗 + 底部短线。",
      meaning: "表达从大量内容中筛出结果。",
      risk: "漏斗形需要足够开阔，否则 24px 下容易粘连。",
      previewGlyphKind: "filter",
    },
    {
      id: "C",
      title: "入口容器 · 分类抽屉",
      elements: "圆角抽屉面板 + 两条分类筛选项。",
      meaning: "适合表达分类抽屉入口，而不是单纯筛选动作。",
      risk: "面板内部线条必须克制，避免像普通列表。",
      previewGlyphKind: "filter",
    },
  ],
  share: [
    {
      id: "A",
      title: "方向动作 · 外发箭头",
      elements: "45° 外发线 + 开放箭头。",
      meaning: "强调把内容发出去，适合卡片操作区。",
      risk: "可能接近打开新页面，需要结合位置判断。",
      previewGlyphKind: "share",
    },
    {
      id: "B",
      title: "发送动作 · 起点到目标",
      elements: "短起点线 + 外发箭头，动作路径更完整。",
      meaning: "比单箭头更像发送/转发过程。",
      risk: "线条略多，需保持 24px 下负空间。",
      previewGlyphKind: "share",
    },
    {
      id: "C",
      title: "社交分发 · 三点连接",
      elements: "三个节点 + 两条连接线。",
      meaning: "强调分发网络或多端传播。",
      risk: "复杂度最高，可能读成关系/节点而非分享。",
      previewGlyphKind: "share",
    },
  ],
  settings: [
    {
      id: "A",
      title: "工具对象 · 简化齿轮",
      elements: "中心圆 + 四向短齿，减少传统 8 齿复杂度。",
      meaning: "最接近设置入口的通用认知。",
      risk: "齿轮仍有密度风险，需要避免黑团。",
      previewGlyphKind: "settings",
    },
    {
      id: "B",
      title: "参数调节 · 双滑杆",
      elements: "两条滑杆 + 错位控制点。",
      meaning: "更像调参数/偏好设置，适合工具属性面板。",
      risk: "可能与筛选图标接近，需要上下文区分。",
      previewGlyphKind: "settings",
    },
    {
      id: "C",
      title: "状态提醒 · 设置有更新",
      elements: "简化齿轮 + 极小状态点。",
      meaning: "表达设置项存在提醒或更新状态。",
      risk: "状态点必须很小，不应变成通知装饰。",
      previewGlyphKind: "settings",
    },
  ],
  arrowsUpDown: [
    {
      id: "A",
      title: "排序切换 · 上下箭头",
      elements: "一上一下两条开放箭头，中心对称。",
      meaning: "表达升降序、排序切换。",
      risk: "不表达拖拽排序，只表达排序方向。",
      previewGlyphKind: "arrowsUpDown",
    },
    {
      id: "B",
      title: "调整参数 · 滑杆排序",
      elements: "两条滑杆 + 上下方向提示。",
      meaning: "更像改变排序规则或筛选顺序。",
      risk: "会靠近筛选/设置语义。",
      previewGlyphKind: "arrowsUpDown",
    },
    {
      id: "C",
      title: "列表重排 · 层级移动",
      elements: "两条列表线 + 上下移动箭头。",
      meaning: "强调条目在列表中重新排列。",
      risk: "信息量稍多，适合有列表上下文时使用。",
      previewGlyphKind: "arrowsUpDown",
    },
  ],
};

function buildSemanticOptions(brief: IconBrief): SemanticOption[] {
  const preset = semanticOptionPresets[brief.glyphKind];
  if (preset) {
    return preset.map((option) => ({
      ...option,
      meaning: `${option.meaning} 当前上下文：${brief.context}。`,
    }));
  }

  const profile = glyphProfiles[brief.glyphKind];

  return [
    {
      id: "A",
      title: profile.objectDirection,
      elements: profile.objectElements,
      meaning: `${profile.objectMeaning} 当前上下文：${brief.context}。`,
      risk: brief.glyphKind === "generic" ? "语义仍偏泛，需要用户再确认概念。" : "动作感相对弱，但 24px 可读性最好。",
    },
    {
      id: "B",
      title: profile.actionDirection,
      elements: profile.actionElements,
      meaning: `${profile.actionMeaning} 强调点：${brief.emphasis}。`,
      risk: "右上角标记过密时需要控制 24px 可读性。",
    },
    {
      id: "C",
      title: profile.statusDirection,
      elements: profile.statusElements,
      meaning: profile.statusMeaning,
      risk: "局部 fill 需要说明原因，避免看起来像装饰。",
    },
  ];
}

function buildModelBrief(decision: AgentDecision, userContent: string, fallback: IconBrief): IconBrief {
  const localBrief = buildBriefFromMessage(decision.query || userContent, fallback);
  const modelBrief = decision.brief;
  if (!modelBrief) return localBrief;

  const modelGlyphKind = normalizeGlyphKind(modelBrief.glyphKind, localBrief.glyphKind);
  const glyphKind =
    localBrief.glyphKind === "game" && modelGlyphKind === "network"
      ? "game"
      : modelGlyphKind;
  const profile = glyphProfiles[glyphKind];

  return {
    sourceText: decision.query || userContent,
    concept: modelBrief.concept?.trim() || localBrief.concept,
    label: modelBrief.label?.trim() || profile.label,
    semanticName: modelBrief.semanticName?.trim() || profile.semanticName,
    context: modelBrief.context?.trim() || localBrief.context,
    emphasis: modelBrief.emphasis?.trim() || localBrief.emphasis,
    glyphKind,
  };
}

function buildSemanticOptionsFromDecision(decision: AgentDecision | undefined, brief: IconBrief) {
  if (semanticOptionPresets[brief.glyphKind]) return buildSemanticOptions(brief);

  const modelOptions = decision?.semanticOptions
    ?.filter((option) => option.title && (option.elements || option.meaning))
    .slice(0, 3)
    .map((option, index) => ({
      id: (index === 0 ? "A" : index === 1 ? "B" : "C") as SemanticOption["id"],
      title: option.title,
      elements: option.elements || option.meaning || `${option.title} 的低保真语义示意。`,
      meaning: option.meaning || `适用于${brief.context}。`,
      risk: option.risk || "需要检查 24px 下是否足够清晰。",
      previewGlyphKind: normalizeGlyphKind(option.previewGlyphKind, brief.glyphKind),
    }));

  return modelOptions && modelOptions.length >= 2 ? modelOptions : buildSemanticOptions(brief);
}

function pathShape(id: string, name: string, role: string, data: string): NativeShapeContract {
  return {
    id,
    name,
    type: "path",
    role,
    data,
    strokeWeight: 2,
  };
}

function fillCircleShape(id: string, name: string, role: string, x: number, y: number, size = 3): NativeShapeContract {
  return {
    id,
    name,
    type: "circle",
    role,
    x,
    y,
    width: size,
    height: size,
    fill: "#0F1218",
    fillExceptionReason: "Tiny 3px status marker uses local fill so a 2px stroked circle does not collapse at 24px.",
  };
}

function circlePath(cx: number, cy: number, radius: number) {
  return `M${cx} ${cy - radius}A${radius} ${radius} 0 1 1 ${cx} ${cy + radius}A${radius} ${radius} 0 1 1 ${cx} ${cy - radius}`;
}

function roundedRectPath(x: number, y: number, width: number, height: number, radius = 4) {
  const right = x + width;
  const bottom = y + height;

  return `M${x + radius} ${y}H${right - radius}C${right - radius / 2} ${y} ${right} ${y + radius / 2} ${right} ${y + radius}V${bottom - radius}C${right} ${bottom - radius / 2} ${right - radius / 2} ${bottom} ${right - radius} ${bottom}H${x + radius}C${x + radius / 2} ${bottom} ${x} ${bottom - radius / 2} ${x} ${bottom - radius}V${y + radius}C${x} ${y + radius / 2} ${x + radius / 2} ${y} ${x + radius} ${y}`;
}

function buildBookmarkShapes() {
  return [
    pathShape(
      "bookmark_outline",
      "Bookmark outline",
      "bookmark-outline",
      "M7 6C7 5 8 4 9 4H15C16 4 17 5 17 6V20L12 16L7 20V6Z",
    ),
  ];
}

function buildShareShapes(optionId: SemanticOption["id"]) {
  if (optionId === "B") {
    return [
      pathShape(
        "send_arrow",
        "Continuous send arrow",
        "share-send-arrow",
        "M6 18H10L18 10M18 10V15M18 10H13",
      ),
    ];
  }

  if (optionId === "C") {
    return buildShareClassicDistributionShapes();
  }

  return [
    pathShape("share_forward_arrow", "Continuous forward share arrow", "share-forward-arrow", "M7 17L17 7M17 7V12M17 7H12"),
  ];
}

function buildSearchShapes() {
  return [
    pathShape("search_lens", "Search lens", "search-lens", circlePath(10, 10, 7)),
    pathShape("search_handle", "Search handle", "search-handle", "M15 15L20 20"),
  ];
}

function buildFilterShapes() {
  return [
    pathShape("filter_tracks", "Filter tracks", "filter-tracks", "M4 7H20M4 12H20M4 17H20"),
    pathShape("filter_knobs", "Filter knobs", "filter-knobs", "M8 5V9M15 10V14M11 15V19"),
  ];
}

function buildFilterDrawerShapes() {
  return [
    pathShape("filter_drawer_panel", "Filter drawer panel", "filter-drawer-panel", roundedRectPath(5, 4, 14, 16, 4)),
    pathShape("filter_drawer_tracks", "Filter drawer tracks", "filter-drawer-tracks", "M8 9H16M8 14H16"),
    pathShape("filter_drawer_knobs", "Filter drawer knobs", "filter-drawer-knobs", "M11 7V11M14 12V16"),
  ];
}

function buildTransferShapes(direction: "download" | "upload") {
  const arrow =
    direction === "download"
      ? "M12 4V14M8 10L12 14L16 10"
      : "M12 14V4M8 8L12 4L16 8";

  return [
    pathShape(`${direction}_arrow`, `${direction} arrow`, `${direction}-arrow`, arrow),
    pathShape(
      `${direction}_tray`,
      `${direction} open tray`,
      `${direction}-tray`,
      "M5 15V18C5 19 6 20 7 20H17C18 20 19 19 19 18V15",
    ),
  ];
}

function buildFileTransferShapes(direction: "download" | "upload") {
  const arrow =
    direction === "download"
      ? "M16 11V18M13 15L16 18L19 15"
      : "M16 18V11M13 14L16 11L19 14";

  return [
    pathShape("file_body", "File body", "file-transfer-body", "M6 4H13L17 8V10M6 4V20H12M13 4V8H17"),
    pathShape("file_transfer_arrow", "File transfer arrow", "file-transfer-arrow", arrow),
  ];
}

function buildFileSaveDownShapes() {
  return [
    pathShape("file_save_body", "File save body", "file-save-body", "M6 4H13L17 8V20H6V4M13 4V8H17"),
    pathShape("file_save_drop", "File save down action", "file-save-down", "M12 9V15M9 12L12 15L15 12"),
    pathShape("file_save_base", "File save baseline", "file-save-base", "M9 18H15"),
  ];
}

function buildInboxDownloadShapes() {
  return buildOfflineStorageBoxShapes();
}

function buildOfflineCardSaveShapes() {
  return [
    pathShape("offline_card_outline", "Offline card outline", "offline-card-outline", roundedRectPath(5, 5, 14, 16, 4)),
    pathShape("offline_card_drop", "Offline save drop", "offline-save-drop", "M12 8V15M9 12L12 15L15 12"),
    pathShape("offline_card_base", "Offline saved base", "offline-saved-base", "M9 18H15"),
  ];
}

function buildOfflineBookmarkSaveShapes() {
  return [
    pathShape("offline_bookmark_body", "Offline bookmark body", "offline-bookmark-body", "M7 5C7 4 8 4 9 4H15C16 4 17 5 17 6V20L12 17L7 20V5Z"),
    pathShape("offline_bookmark_down", "Offline bookmark down action", "offline-bookmark-down", "M12 7V13M9 10L12 13L15 10"),
  ];
}

function buildOfflineTrayCheckShapes() {
  return [
    pathShape("offline_check_tray", "Offline saved tray", "offline-check-tray", "M5 12V18C5 19 6 20 7 20H17C18 20 19 19 19 18V12"),
    pathShape("offline_check_drop", "Offline saved drop", "offline-check-drop", "M12 4V11"),
    pathShape("offline_check_mark", "Offline saved check", "offline-check-mark", "M9 15L11 17L16 12"),
  ];
}

function buildOfflineStorageBoxShapes() {
  return [
    pathShape("offline_storage_box", "Offline storage box", "offline-storage-box", roundedRectPath(5, 9, 14, 10, 3)),
    pathShape("offline_storage_lid", "Offline storage lid", "offline-storage-lid", "M7 9L8 6H16L17 9"),
    pathShape("offline_storage_down", "Offline storage down action", "offline-storage-down", "M12 5V13M9 10L12 13L15 10"),
  ];
}

function buildOfflineArchiveShapes() {
  return [
    pathShape("offline_archive_body", "Offline archive body", "offline-archive-body", roundedRectPath(5, 8, 14, 11, 3)),
    pathShape("offline_archive_slot", "Offline archive slot", "offline-archive-slot", "M9 12H15"),
    pathShape("offline_archive_down", "Offline archive down action", "offline-archive-down", "M12 4V10M9 7L12 10L15 7"),
  ];
}

function buildCloudUploadShapes() {
  return [
    pathShape("cloud_outline", "Cloud outline", "upload-cloud", "M7 17H17C19 17 20 16 20 14C20 12 18 11 16 11C15 8 13 6 10 7C8 7 7 9 7 11C5 11 4 12 4 14C4 16 5 17 7 17Z"),
    pathShape("cloud_upload_arrow", "Cloud upload arrow", "upload-cloud-arrow", "M12 15V9M9 12L12 9L15 12"),
  ];
}

function buildScanSearchShapes() {
  return [
    pathShape("scan_corners", "Search scan corners", "search-scan-frame", "M8 5H5V8M16 5H19V8M19 16V19H16M8 19H5V16"),
    pathShape("scan_line", "Scan focus line", "search-scan-line", "M8 12H16"),
  ];
}

function buildFunnelFilterShapes() {
  return [
    pathShape("filter_funnel", "Filter funnel", "filter-funnel", "M5 6H19L14 12V18L10 20V12L5 6Z"),
  ];
}

function buildFilterPresetShapes(optionId: SemanticOption["id"]) {
  if (optionId === "A") return buildFilterShapes();
  if (optionId === "B") return buildFunnelFilterShapes();
  if (optionId === "C") return buildFilterDrawerShapes();
  return buildFilterShapes();
}

function buildListReorderShapes() {
  return [
    pathShape("reorder_lines", "List reorder lines", "reorder-list-lines", "M5 8H12M5 16H12"),
    pathShape("reorder_arrows", "List reorder arrows", "reorder-up-down-arrows", "M17 5V19M14 8L17 5L20 8M14 16L17 19L20 16"),
  ];
}

function buildPlayShapes() {
  return [
    pathShape("play_ring", "Play rounded container", "play-container", circlePath(12, 12, 9)),
    pathShape("play_symbol", "Open play symbol", "play-symbol", "M10 8L17 12L10 16"),
  ];
}

function buildCommentShapes() {
  return [
    pathShape(
      "comment_bubble",
      "Comment bubble",
      "comment-bubble",
      "M7 5H17C18 5 19 6 19 7V14C19 15 18 16 17 16H12L7 20V16H7C6 16 5 15 5 14V7C5 6 6 5 7 5Z",
    ),
  ];
}

function buildLikeShapes() {
  return [
    pathShape(
      "like_heart",
      "Like heart outline",
      "like-heart",
      "M12 19L5 12C3 10 4 7 7 7C9 7 11 9 12 10C13 9 15 7 17 7C20 7 21 10 19 12L12 19Z",
    ),
  ];
}

function buildReadShapes() {
  return [
    pathShape("read_spread", "Open comic pages", "read-spread", "M12 6V19M12 7C10 5.5 7 5.5 5 7V18C7 16.5 10 16.5 12 19M12 7C14 5.5 17 5.5 19 7V18C17 16.5 14 16.5 12 19"),
  ];
}

function buildSettingsShapes() {
  return [
    pathShape("settings_core", "Simplified gear", "settings-gear", "M12 5V8M12 16V19M5 12H8M16 12H19M7 7L9 9M17 17L15 15M17 7L15 9M7 17L9 15M12 8A4 4 0 1 1 12 16A4 4 0 1 1 12 8"),
  ];
}

function buildArrowsUpDownShapes() {
  return [
    pathShape("sort_up", "Sort upward arrow", "sort-up-arrow", "M9 19V6M6 9L9 6L12 9"),
    pathShape("sort_down", "Sort downward arrow", "sort-down-arrow", "M15 5V18M12 15L15 18L18 15"),
  ];
}

function buildArrowsInShapes() {
  return [
    pathShape("collapse_top_left", "Collapse inward top-left", "collapse-inward-arrow", "M5 5L10 10M10 6V10H6"),
    pathShape("collapse_bottom_right", "Collapse inward bottom-right", "collapse-inward-arrow", "M19 19L14 14M14 18V14H18"),
  ];
}

function buildArrowsOutShapes() {
  return [
    pathShape("expand_top_left", "Expand outward top-left", "expand-outward-arrow", "M10 10L5 5M5 9V5H9"),
    pathShape("expand_bottom_right", "Expand outward bottom-right", "expand-outward-arrow", "M14 14L19 19M15 19H19V15"),
  ];
}

function buildContentExpandShapes(optionId: SemanticOption["id"]) {
  if (optionId === "B") {
    return [
      pathShape("content_expand_document", "Content document", "content-document", "M6 4H15L18 7V19H6Z"),
      pathShape("content_expand_fold", "Document fold", "content-fold", "M15 4V7H18"),
      pathShape("content_expand_lines", "Added content lines", "content-lines", "M9 11H15M9 15H16"),
    ];
  }
  if (optionId === "C") {
    return [
      pathShape("content_expand_text", "Writing text", "content-lines", "M4 8H12M4 12H11M4 16H9"),
      pathShape("content_expand_pen", "Writing assistant pen", "writing-pen", "M15 7L19 11L14 16L11 17L12 14Z"),
    ];
  }
  return [
    pathShape("content_expand_lines", "Growing text lines", "content-lines", "M4 7H11M4 12H13M4 17H15"),
    pathShape("content_expand_arrow_stem", "Content extension arrow stem", "content-extension-arrow", "M16 12H20"),
    pathShape("content_expand_arrow_tip", "Content extension arrow tip", "content-extension-arrow-tip", "M18 10L20 12L18 14"),
  ];
}

function buildUserShapes() {
  return [
    pathShape("user_head", "User avatar head", "user-head", circlePath(12, 8, 4)),
    pathShape("user_shoulders", "User avatar shoulders", "user-shoulders", "M5 20C6 15.5 9 14 12 14C15 14 18 15.5 19 20"),
  ];
}

function buildGameShapes(optionId: SemanticOption["id"]) {
  const base = [
    pathShape(
      "game_controller_body",
      "Game controller body",
      "game-controller-body",
      "M7 10H17C19 10 20 12 20 15C20 18 18 20 16 18L14 16H10L8 18C6 20 4 18 4 15C4 12 5 10 7 10Z",
    ),
    pathShape("game_dpad", "Game direction key", "game-dpad", "M8 13V17M6 15H10"),
    pathShape("game_button", "Game action button", "game-button", "M15 15H17"),
  ];

  if (optionId === "B") {
    return [
      pathShape("game_online_signal", "Online game signal", "game-online-signal", "M8 7C10 5 14 5 16 7"),
      ...base,
    ];
  }

  if (optionId === "C") {
    return [
      base[0],
      base[1],
      pathShape("game_start_mark", "Game start mark", "game-start-mark", "M15 13L18 15L15 17"),
    ];
  }

  return base;
}

function buildNetworkShapes(optionId: SemanticOption["id"]) {
  if (optionId === "B") {
    return [
      fillCircleShape("network_signal_core", "Network signal core", "network-signal-core", 11, 17, 3),
      pathShape("network_signal_inner", "Network signal inner arc", "network-signal-arc", "M8 13C10 11 14 11 16 13"),
      pathShape("network_signal_outer", "Network signal outer arc", "network-signal-arc", "M5 10C9 6 15 6 19 10"),
    ];
  }

  if (optionId === "C") {
    return [
      pathShape("network_route_path", "Network route path", "network-route-path", "M8 7H13V15H16"),
      pathShape("network_route_start", "Network route start node", "network-node", circlePath(6, 7, 2)),
      pathShape("network_route_middle", "Network route middle node", "network-node", circlePath(13, 17, 2)),
      pathShape("network_route_end", "Network route end node", "network-node", circlePath(18, 17, 2)),
    ];
  }

  return [
    pathShape("network_link_top", "Network top link", "network-link", "M9 11L14 8"),
    pathShape("network_link_bottom", "Network bottom link", "network-link", "M9 13L14 16"),
    pathShape("network_node_left", "Network left node", "network-node", circlePath(6, 12, 3)),
    pathShape("network_node_top", "Network top node", "network-node", circlePath(17, 6, 3)),
    pathShape("network_node_bottom", "Network bottom node", "network-node", circlePath(17, 18, 3)),
  ];
}

function buildGenericShapes() {
  return [
    pathShape("generic_container", "Rounded icon container", "generic-container", roundedRectPath(5, 5, 14, 14, 4)),
    pathShape("generic_mark", "Semantic mark", "generic-mark", "M8 12H16"),
  ];
}

function buildBasePreviewShapes(glyphKind: IconGlyphKind, optionId: SemanticOption["id"]): NativeShapeContract[] {
  if (glyphKind === "share") return buildShareShapes(optionId);
  if (glyphKind === "game") return buildGameShapes(optionId);
  if (glyphKind === "network") return buildNetworkShapes(optionId);
  if (glyphKind === "download" && optionId === "B") return buildFileSaveDownShapes();
  if (glyphKind === "download" && optionId === "C") return buildOfflineStorageBoxShapes();
  if (glyphKind === "upload" && optionId === "B") return buildFileTransferShapes("upload");
  if (glyphKind === "upload" && optionId === "C") return buildCloudUploadShapes();
  if (glyphKind === "search" && optionId === "B") return buildScanSearchShapes();
  if (glyphKind === "filter") return buildFilterPresetShapes(optionId);
  if (glyphKind === "contentExpand") return buildContentExpandShapes(optionId);
  if (glyphKind === "settings" && optionId === "B") return buildFilterShapes();
  if (glyphKind === "arrowsUpDown" && optionId === "B") return buildFilterShapes();
  if (glyphKind === "arrowsUpDown" && optionId === "C") return buildListReorderShapes();

  const baseByKind: Record<Exclude<IconGlyphKind, "share">, () => NativeShapeContract[]> = {
    bookmark: buildBookmarkShapes,
    search: buildSearchShapes,
    filter: buildFilterShapes,
    download: () => buildTransferShapes("download"),
    upload: () => buildTransferShapes("upload"),
    play: buildPlayShapes,
    comment: buildCommentShapes,
    like: buildLikeShapes,
    read: buildReadShapes,
    settings: buildSettingsShapes,
    arrowsUpDown: buildArrowsUpDownShapes,
    arrowsIn: buildArrowsInShapes,
    arrowsOut: buildArrowsOutShapes,
    contentExpand: () => buildContentExpandShapes(optionId),
    user: buildUserShapes,
    game: () => buildGameShapes(optionId),
    network: () => buildNetworkShapes(optionId),
    generic: buildGenericShapes,
  };

  return baseByKind[glyphKind]();
}

function resolveShapeOptionId(brief: IconBrief, option: SemanticOption): SemanticOption["id"] {
  const visualText = `${option.title} ${option.elements}`.toLowerCase();
  const text = `${visualText} ${option.meaning}`.toLowerCase();

  if (brief.glyphKind === "share") {
    if (/三点|节点|連接|连接|社交|分发|网络|network|node/.test(text)) return "C";
    if (/发送|send|路径|起点|目标|过程/.test(text)) return "B";
    if (/外发|外传|转发|分享|arrow|箭头|打开|跳转|forward/.test(text)) return "A";
  }

  if (brief.glyphKind === "download" || brief.glyphKind === "upload") {
    if (/文件|file|文档/.test(text)) return "B";
    if (/托盘|本地|inbox|tray|云|cloud/.test(text)) return "C";
  }

  if (brief.glyphKind === "search" && /扫描|框选|scan/.test(text)) return "B";
  if (brief.glyphKind === "filter") {
    if (/漏斗|收束|funnel/.test(visualText)) return "B";
    if (/抽屉|面板|容器|入口|drawer|panel/.test(visualText)) return "C";
    if (/滑杆|调节|参数|slider|track|knob/.test(visualText)) return "A";
    if (/状态|结果|已筛选|生效|active|status|dot|点/.test(visualText)) return "C";
  }
  if (brief.glyphKind === "settings" && /滑杆|参数|调节|slider/.test(text)) return "B";
  if (brief.glyphKind === "arrowsUpDown" && /列表|重排|层级|list/.test(text)) return "C";

  return option.id;
}

function buildSemanticPreviewShapes(brief: IconBrief, optionId: SemanticOption["id"]): NativeShapeContract[] {
  const shapes = buildBasePreviewShapes(brief.glyphKind, optionId);

  const usesPreset = Boolean(semanticOptionPresets[brief.glyphKind]);

  if (brief.glyphKind === "share" || brief.glyphKind === "contentExpand" || usesPreset) return shapes;

  if (optionId === "B") {
    return [
      ...shapes,
      pathShape("action_plus", "Detached action plus", "plus-badge", "M17 6H21M19 4V8"),
    ].slice(0, 5);
  }

  if (optionId === "C") {
    return [...shapes, fillCircleShape("status_dot", "Local status dot", "local-status-dot", 18, 5)].slice(0, 5);
  }

  return shapes;
}

function cloneShapeWithId(shape: NativeShapeContract, suffix: string): NativeShapeContract {
  return {
    ...shape,
    id: `${shape.id}_${suffix}`,
    name: `${shape.name} ${suffix}`,
  };
}

function buildShareClassicDistributionShapes() {
  return [
    pathShape("share_distribution_link_top", "Share distribution top link", "share-connection", "M9 11L14 8"),
    pathShape("share_distribution_link_bottom", "Share distribution bottom link", "share-connection", "M9 13L14 16"),
    pathShape("share_distribution_node_origin", "Share origin node", "share-node", circlePath(6, 12, 3)),
    pathShape("share_distribution_node_top", "Share top target node", "share-node", circlePath(17, 7, 3)),
    pathShape("share_distribution_node_bottom", "Share bottom target node", "share-node", circlePath(17, 17, 3)),
  ];
}

function buildShareConvergingDistributionShapes() {
  return [
    pathShape("share_converge_link_top", "Share upper source link", "share-connection", "M9 8L14 11"),
    pathShape("share_converge_link_bottom", "Share lower source link", "share-connection", "M9 16L14 13"),
    pathShape("share_converge_node_top", "Share upper source node", "share-node", circlePath(6, 7, 3)),
    pathShape("share_converge_node_bottom", "Share lower source node", "share-node", circlePath(6, 17, 3)),
    pathShape("share_converge_node_target", "Share target node", "share-node", circlePath(17, 12, 3)),
  ];
}

function buildShareSplitFlowShapes() {
  return [
    pathShape("share_split_flow", "Share split flow", "share-distribution-flow", "M9 12H12M12 12L15 9M12 12L15 15"),
    pathShape("share_split_origin", "Share split origin node", "share-node", circlePath(6, 12, 3)),
    pathShape("share_split_target_top", "Share split top target", "share-node", circlePath(18, 8, 3)),
    pathShape("share_split_target_bottom", "Share split bottom target", "share-node", circlePath(18, 16, 3)),
  ];
}

function buildCoherentTwoNodeNetworkShapes() {
  return [
    pathShape("network_route_lean", "Coherent route link", "network-route-path", "M8 8H14V16H16"),
    pathShape("network_node_start_lean", "Route start node", "network-node", circlePath(6, 8, 2.5)),
    pathShape("network_node_end_lean", "Route end node", "network-node", circlePath(18, 16, 2.5)),
  ];
}

function buildCardShareOutShapes() {
  return [
    pathShape("chapter_card_outline", "Chapter card outline", "chapter-card-outline", roundedRectPath(5, 8, 10, 10, 3)),
    pathShape("chapter_card_out_arrow", "Chapter card outward arrow", "share-forward-arrow", "M12 12L19 5M15 5H19V9"),
  ];
}

function buildContainedActionVariantShapes(brief: IconBrief, optionId: SemanticOption["id"]) {
  if (brief.glyphKind === "bookmark") {
    return [
      pathShape("contained_bookmark_card", "Chapter card container", "context-container", roundedRectPath(5, 4, 14, 16, 4)),
      pathShape("contained_bookmark_mark", "Contained bookmark mark", "bookmark-outline", "M9 8H15V17L12 14.5L9 17V8Z"),
    ];
  }

  if (brief.glyphKind === "search") {
    return [
      pathShape("contained_search_panel", "Search panel container", "context-container", roundedRectPath(5, 5, 14, 14, 4)),
      pathShape("contained_search_lens", "Contained search lens", "search-lens", circlePath(11, 11, 4)),
      pathShape("contained_search_handle", "Contained search handle", "search-handle", "M14 14L17 17"),
    ];
  }

  if (brief.glyphKind === "filter") return buildFilterDrawerShapes().map((shape) => cloneShapeWithId(shape, "contained"));
  if (brief.glyphKind === "share") return buildCardShareOutShapes().map((shape) => cloneShapeWithId(shape, "contained"));
  if (brief.glyphKind === "download") return buildOfflineCardSaveShapes().map((shape) => cloneShapeWithId(shape, "contained"));
  if (brief.glyphKind === "upload") return buildFileTransferShapes("upload").map((shape) => cloneShapeWithId(shape, "contained"));

  return [
    pathShape("contained_icon_frame", "Context container", "context-container", roundedRectPath(5, 5, 14, 14, 4)),
    ...buildLeanVariantShapes(brief, optionId, buildSemanticPreviewShapes(brief, optionId)).slice(0, 3),
  ].slice(0, 4);
}

function buildDetachedMarkVariantShapes(brief: IconBrief, optionId: SemanticOption["id"]) {
  const baseShapes = buildLeanVariantShapes(brief, optionId, buildSemanticPreviewShapes(brief, optionId));
  if (brief.glyphKind === "share") return buildShareShapes("A").map((shape) => cloneShapeWithId(shape, "detached_mark"));
  if (brief.glyphKind === "download") return buildTransferShapes("download").map((shape) => cloneShapeWithId(shape, "detached_mark"));
  if (brief.glyphKind === "upload") return buildTransferShapes("upload").map((shape) => cloneShapeWithId(shape, "detached_mark"));
  if (brief.glyphKind === "network") return buildNetworkShapes("B").map((shape) => cloneShapeWithId(shape, "detached_mark"));

  return [
    ...baseShapes.map((shape) => cloneShapeWithId(shape, "detached_mark")),
    pathShape("detached_corner_mark", "Detached semantic corner mark", "corner-mark", "M17 7H20M20 7V10"),
  ].slice(0, 5);
}

function buildResultStateVariantShapes(brief: IconBrief, optionId: SemanticOption["id"]) {
  if (brief.glyphKind === "download") return buildOfflineTrayCheckShapes().map((shape) => cloneShapeWithId(shape, "result_state"));
  if (brief.glyphKind === "upload") {
    return [
      ...buildTransferShapes("upload"),
      pathShape("upload_result_base", "Upload result baseline", "result-anchor", "M8 20H16"),
    ].map((shape) => cloneShapeWithId(shape, "result_state"));
  }

  const baseShapes = buildLeanVariantShapes(brief, optionId, buildSemanticPreviewShapes(brief, optionId));
  return [
    ...baseShapes.map((shape) => cloneShapeWithId(shape, "result_state")),
    fillCircleShape("result_state_dot", "Tiny result state dot", "local-status-dot", 18, 5),
  ].slice(0, 5);
}

function buildLinearMotionVariantShapes(brief: IconBrief, optionId: SemanticOption["id"]) {
  if (brief.glyphKind === "share") return buildShareShapes("B").map((shape) => cloneShapeWithId(shape, "linear_motion"));
  if (brief.glyphKind === "download") return buildInboxDownloadShapes().map((shape) => cloneShapeWithId(shape, "linear_motion"));
  if (brief.glyphKind === "upload") return buildTransferShapes("upload").map((shape) => cloneShapeWithId(shape, "linear_motion"));
  if (brief.glyphKind === "arrowsUpDown") return buildListReorderShapes().map((shape) => cloneShapeWithId(shape, "linear_motion"));
  if (brief.glyphKind === "network") return buildCoherentTwoNodeNetworkShapes().map((shape) => cloneShapeWithId(shape, "linear_motion"));

  return [
    ...buildLeanVariantShapes(brief, optionId, buildSemanticPreviewShapes(brief, optionId)).map((shape) => cloneShapeWithId(shape, "linear_motion")),
    pathShape("linear_motion_hint", "Linear action hint", "motion-hint", "M16 12H20M18 10L20 12L18 14"),
  ].slice(0, 5);
}

function buildLeanVariantShapes(brief: IconBrief, optionId: SemanticOption["id"], baseShapes: NativeShapeContract[]) {
  if (brief.glyphKind === "share" && optionId === "C") return buildShareSplitFlowShapes().map((shape) => cloneShapeWithId(shape, "lean"));
  if (brief.glyphKind === "network" && optionId === "C") return buildCoherentTwoNodeNetworkShapes().map((shape) => cloneShapeWithId(shape, "lean"));

  const preferred = baseShapes.filter((shape) => !/badge|dot|status|mark|signal|button|node/i.test(`${shape.id} ${shape.role}`));
  const leanShapes = (preferred.length ? preferred : baseShapes).slice(0, 3).map((shape) => cloneShapeWithId(shape, "lean"));
  return hasOrphanConnectorFragments(leanShapes) ? baseShapes.map((shape) => cloneShapeWithId(shape, "lean")) : leanShapes;
}

function buildAnchoredVariantShapes(brief: IconBrief, optionId: SemanticOption["id"], baseShapes: NativeShapeContract[]) {
  if (brief.glyphKind === "download") return buildInboxDownloadShapes().map((shape) => cloneShapeWithId(shape, "anchored"));
  if (brief.glyphKind === "upload") return buildCloudUploadShapes().map((shape) => cloneShapeWithId(shape, "anchored"));
  if (brief.glyphKind === "search") return buildScanSearchShapes().map((shape) => cloneShapeWithId(shape, "anchored"));
  if (brief.glyphKind === "filter") return buildFunnelFilterShapes().map((shape) => cloneShapeWithId(shape, "anchored"));
  if (brief.glyphKind === "settings") return buildFilterShapes().map((shape) => cloneShapeWithId(shape, "anchored"));
  if (brief.glyphKind === "arrowsUpDown") return buildListReorderShapes().map((shape) => cloneShapeWithId(shape, "anchored"));
  if (brief.glyphKind === "share") {
    if (optionId === "A") return buildCardShareOutShapes().map((shape) => cloneShapeWithId(shape, "anchored"));
    if (optionId === "C") return buildShareConvergingDistributionShapes().map((shape) => cloneShapeWithId(shape, "anchored"));
    return buildShareShapes(optionId).map((shape) => cloneShapeWithId(shape, "anchored"));
  }

  return [
    ...baseShapes.map((shape) => cloneShapeWithId(shape, "anchored")),
    pathShape("context_floor_anchored", "Context anchor floor", "context-anchor", "M7 20H17"),
  ].slice(0, 4);
}

function buildExpressiveVariantShapes(brief: IconBrief, optionId: SemanticOption["id"], baseShapes: NativeShapeContract[]) {
  if (brief.glyphKind === "game") return buildGameShapes(optionId === "A" ? "B" : optionId).map((shape) => cloneShapeWithId(shape, "expressive"));
  if (brief.glyphKind === "network") return buildNetworkShapes(optionId === "A" ? "B" : optionId).map((shape) => cloneShapeWithId(shape, "expressive"));
  if (brief.glyphKind === "share") {
    if (optionId === "A") return buildShareShapes("B").map((shape) => cloneShapeWithId(shape, "expressive"));
    if (optionId === "C") return buildShareClassicDistributionShapes().map((shape) => cloneShapeWithId(shape, "expressive"));
    return buildShareShapes(optionId).map((shape) => cloneShapeWithId(shape, "expressive"));
  }
  if (optionId === "C") return buildSemanticPreviewShapes(brief, "C").map((shape) => cloneShapeWithId(shape, "expressive"));

  return [
    ...baseShapes.map((shape) => cloneShapeWithId(shape, "expressive")),
    fillCircleShape("micro_state_expressive", "Tiny semantic state", "local-status-dot", 18, 5),
  ].slice(0, 5);
}

function buildPreviewVariantShapes(brief: IconBrief, optionId: SemanticOption["id"], variantId: PreviewVariantId) {
  const baseShapes = buildSemanticPreviewShapes(brief, optionId);
  if (brief.glyphKind === "download") {
    const downloadVariants: Record<PreviewVariantId, NativeShapeContract[]> = {
      "1": buildInboxDownloadShapes(),
      "2": buildOfflineCardSaveShapes(),
      "3": buildOfflineBookmarkSaveShapes(),
      "4": buildOfflineTrayCheckShapes(),
      "5": buildOfflineStorageBoxShapes(),
      "6": buildOfflineArchiveShapes(),
      "7": buildFileTransferShapes("download"),
      "8": buildTransferShapes("download"),
      "9": buildContainedActionVariantShapes(brief, optionId),
      "10": buildResultStateVariantShapes(brief, optionId),
    };
    return downloadVariants[variantId].map((shape) => cloneShapeWithId(shape, `variant_${variantId}`));
  }

  if (brief.glyphKind === "upload") {
    const uploadVariants: Record<PreviewVariantId, NativeShapeContract[]> = {
      "1": buildTransferShapes("upload"),
      "2": buildFileTransferShapes("upload"),
      "3": buildCloudUploadShapes(),
      "4": buildTransferShapes("upload"),
      "5": buildFileTransferShapes("upload"),
      "6": buildCloudUploadShapes(),
      "7": buildContainedActionVariantShapes(brief, optionId),
      "8": buildResultStateVariantShapes(brief, optionId),
      "9": buildLinearMotionVariantShapes(brief, optionId),
      "10": buildAnchoredVariantShapes(brief, optionId, baseShapes),
    };
    return uploadVariants[variantId].map((shape) => cloneShapeWithId(shape, `variant_${variantId}`));
  }

  if (variantId === "4") return buildSemanticPreviewShapes(brief, "A").map((shape) => cloneShapeWithId(shape, "alternate_a"));
  if (variantId === "5") return buildSemanticPreviewShapes(brief, "B").map((shape) => cloneShapeWithId(shape, "alternate_b"));
  if (variantId === "6") return buildSemanticPreviewShapes(brief, "C").map((shape) => cloneShapeWithId(shape, "alternate_c"));
  if (variantId === "7") return buildContainedActionVariantShapes(brief, optionId).map((shape) => cloneShapeWithId(shape, "contained"));
  if (variantId === "8") return buildDetachedMarkVariantShapes(brief, optionId).map((shape) => cloneShapeWithId(shape, "detached"));
  if (variantId === "9") return buildResultStateVariantShapes(brief, optionId).map((shape) => cloneShapeWithId(shape, "result"));
  if (variantId === "10") return buildLinearMotionVariantShapes(brief, optionId).map((shape) => cloneShapeWithId(shape, "motion"));
  if (variantId === "1") return buildLeanVariantShapes(brief, optionId, baseShapes);
  if (variantId === "2") return buildAnchoredVariantShapes(brief, optionId, baseShapes);
  return buildExpressiveVariantShapes(brief, optionId, baseShapes);
}

function buildQualityAssuredPreviewShapes(brief: IconBrief, optionId: SemanticOption["id"], variantId: PreviewVariantId) {
  const candidateSets = [
    buildPreviewVariantShapes(brief, optionId, variantId),
    buildSemanticPreviewShapes(brief, optionId),
    buildBasePreviewShapes(brief.glyphKind, optionId),
    buildBasePreviewShapes(brief.glyphKind, "A"),
  ];

  return candidateSets.find((shapes) => !reviewGeneratedPreview(brief, optionId, shapes).blockers.length) ?? candidateSets[0];
}

function buildPreviewVariants(brief: IconBrief, option: SemanticOption): PreviewVariant[] {
  const shapeOptionId = resolveShapeOptionId(brief, option);
  const variantMeta: Array<Pick<PreviewVariant, "id" | "title" | "subtitle" | "description" | "risk">> =
    brief.glyphKind === "download"
      ? [
          {
            id: "1",
            title: "托盘下载",
            subtitle: "最通用",
            description: "下箭头进入开口托盘，标准表达“保存到本地/离线”。",
            risk: "通用性强，但业务个性较弱。",
          },
          {
            id: "2",
            title: "卡片离线",
            subtitle: "贴近章节",
            description: "圆角内容卡片内置下载动作，更像把章节卡片保存离线。",
            risk: "容器更明显，需要避免误读成文件。",
          },
          {
            id: "3",
            title: "书签保存",
            subtitle: "偏收藏",
            description: "书签主体叠加下载动作，表达“标记并离线保存”。",
            risk: "可能接近收藏，需要场景文案辅助。",
          },
          {
            id: "4",
            title: "完成落点",
            subtitle: "有结果感",
            description: "托盘 + 对勾，强调已经保存完成或可离线使用。",
            risk: "更适合状态反馈，不一定适合触发按钮。",
          },
          {
            id: "5",
            title: "收纳盒",
            subtitle: "资产感强",
            description: "盒体承载下载动作，表达内容被收纳到本地空间。",
            risk: "比标准下载更抽象，但和资产库/缓存更贴近。",
          },
          {
            id: "6",
            title: "归档保存",
            subtitle: "稳重克制",
            description: "归档盒 + 下载入口，适合批量保存、离线包或资料归档。",
            risk: "可能偏“归档”，需要确认产品语境。",
          },
          {
            id: "7",
            title: "文件保存",
            subtitle: "文档明确",
            description: "文件轮廓叠加下载动作，更适合资料、章节文件或离线文档。",
            risk: "如果入口不是文件语境，可能偏文档而非章节内容。",
          },
          {
            id: "8",
            title: "标准下载",
            subtitle: "低学习成本",
            description: "箭头 + 开口托盘，使用最通用的下载隐喻，便于快速识别。",
            risk: "个性最弱，但稳定性和可读性最好。",
          },
          {
            id: "9",
            title: "容器承载",
            subtitle: "场景更强",
            description: "把下载动作放入轻量内容容器里，表达“当前内容被保存”。",
            risk: "容器和箭头需要保持 2px 以上负空间，避免发黑。",
          },
          {
            id: "10",
            title: "结果确认",
            subtitle: "完成态",
            description: "强调下载后的完成状态，适合已保存、可离线等反馈。",
            risk: "更像状态图标，触发按钮场景需要谨慎。",
          },
        ]
      : brief.glyphKind === "share" && shapeOptionId === "C"
      ? [
          {
            id: "1",
            title: "分叉动线版",
            subtitle: "三点清晰",
            description: "一个起点分流到两个目标节点，保留“三点连接”，但把连接线合并为一条分叉动线，减少碎片感。",
            risk: "节点统一为 6px 描边圆，24px 下仍需保持连接线不穿心、不粘连。",
          },
          {
            id: "2",
            title: "聚合关系版",
            subtitle: "结构均衡",
            description: "两个来源节点汇入右侧目标节点，更像社交关系里的转发/分发路径，左右重心更稳。",
            risk: "三个节点必须保持足够间距，否则会误读成普通网络拓扑。",
          },
          {
            id: "3",
            title: "标准三点版",
            subtitle: "语义最强",
            description: "左侧来源连接到右侧两个目标，使用完整三节点结构，最直观表达多端分发。",
            risk: "路径数量达到 5 条上限，必须优先保证负空间和节点圆度。",
          },
          {
            id: "4",
            title: "动作外发版",
            subtitle: "更像分享",
            description: "保留外发动作，降低关系网络感，适合更像按钮的分享入口。",
            risk: "会弱化三点连接方向，但在紧凑场景里识别更稳。",
          },
          {
            id: "5",
            title: "发送路径版",
            subtitle: "过程清楚",
            description: "用起点短线 + 外发箭头表达从当前内容发送出去的路径。",
            risk: "更接近发送，而不是社交网络。",
          },
          {
            id: "6",
            title: "关系对照版",
            subtitle: "备选参考",
            description: "回到标准三点关系，用作和其它分发结构的视觉对照。",
            risk: "路径数量较多，仍需确认不会读成普通网络。",
          },
          {
            id: "7",
            title: "卡片外发版",
            subtitle: "贴近章节",
            description: "章节卡片 + 外发箭头，表达把当前章节分享出去。",
            risk: "卡片语义更强，三点关系会被弱化。",
          },
          {
            id: "8",
            title: "角标提示版",
            subtitle: "轻量动作",
            description: "在主语义旁保留独立角标动作，减少节点连线密度。",
            risk: "如果间距不足，会和主形态粘连，需要看 24px 预览。",
          },
          {
            id: "9",
            title: "结果状态版",
            subtitle: "分享完成",
            description: "用小状态点表达分享后的结果或已同步状态。",
            risk: "更适合状态，不一定适合默认分享入口。",
          },
          {
            id: "10",
            title: "路径动线版",
            subtitle: "方向明确",
            description: "用连续动线表达从当前内容向外传递，减少孤立线段。",
            risk: "可能更接近发送，需要结合文案判断。",
          },
        ]
      : [
          {
            id: "1",
            title: "极简识别版",
            subtitle: "优先清晰",
            description: `保留“${splitSemanticTitle(option.title).visual}”的主图形，减少小标记，适合高频操作入口。`,
            risk: "动作/状态表达会更克制，但 24px 可读性最好。",
          },
          {
            id: "2",
            title: "场景锚定版",
            subtitle: "更贴近使用位置",
            description: `在主语义外增加轻量容器、承载线或场景提示，让它更像用于${brief.context}。`,
            risk: "比极简版多一层信息，需要检查负空间。",
          },
          {
            id: "3",
            title: "语义强化版",
            subtitle: "表达更明确",
            description: `强化“${brief.emphasis}”，用小状态点、动作线或方向提示提高辨识度。`,
            risk: "最容易变密，必须通过黑团和安全区门禁。",
          },
          {
            id: "4",
            title: "对象基准版",
            subtitle: "稳妥参考",
            description: "回到对象本体，作为当前语义方向的低风险对照方案。",
            risk: "动作感较弱，但最不容易出错。",
          },
          {
            id: "5",
            title: "动作表达版",
            subtitle: "操作更强",
            description: "强化动作路径或操作结果，让图标更像可点击功能。",
            risk: "可能接近其它操作图标，需要结合上下文判断。",
          },
          {
            id: "6",
            title: "状态反馈版",
            subtitle: "结果明确",
            description: "加入克制的状态/结果提示，用于已完成、已生效等反馈场景。",
            risk: "不适合所有触发型按钮，需要确认使用状态。",
          },
          {
            id: "7",
            title: "容器承载版",
            subtitle: "场景清楚",
            description: "用轻量容器承载主语义，让图标更像当前业务模块里的入口。",
            risk: "容器会增加信息量，需要确认不会抢走主语义。",
          },
          {
            id: "8",
            title: "角标动作版",
            subtitle: "轻量提示",
            description: "保留主图形，同时用右上独立角标补充动作含义。",
            risk: "角标必须保持可见 2px 间距，否则会变成黑团。",
          },
          {
            id: "9",
            title: "结果状态版",
            subtitle: "反馈更强",
            description: "加入极小状态点，表达已生效、已选择或完成态。",
            risk: "更偏状态图标，不一定适合默认触发入口。",
          },
          {
            id: "10",
            title: "动线表达版",
            subtitle: "操作明确",
            description: "用连续方向线表达操作路径，适合强调跳转、展开、传递或移动。",
            risk: "动作线不能断裂或悬浮，需要以质量门禁为准。",
          },
        ];

  return variantMeta.map((meta) => {
    const shapes = buildQualityAssuredPreviewShapes(brief, shapeOptionId, meta.id);
    const review = reviewGeneratedPreview(brief, shapeOptionId, shapes);
    return {
      ...meta,
      optionId: option.id,
      previewSvg: buildPreviewSvgFromShapes(shapes),
      qualityStatus: review.blockers.length ? "blocked" : review.warnings.length ? "warning" : "pass",
      qualitySummary: review.summary,
    };
  });
}

function escapeSvgAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildPreviewSvgFromShapes(shapes: NativeShapeContract[]) {
  const body = shapes
    .map((shape) => {
      if (shape.type === "path") {
        return `<path d="${escapeSvgAttribute(shape.data)}" fill="none" stroke="#0F1218" stroke-width="${shape.strokeWeight}" stroke-linecap="round" stroke-linejoin="round"/>`;
      }

      if (shape.type === "line") {
        return `<line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" stroke="#0F1218" stroke-width="${shape.strokeWeight}" stroke-linecap="round" stroke-linejoin="round"/>`;
      }

      if (shape.type === "rect") {
        return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" rx="${shape.radius ?? 4}" fill="none" stroke="#0F1218" stroke-width="${shape.strokeWeight}" stroke-linecap="round" stroke-linejoin="round"/>`;
      }

      if (shape.fill && shape.fillExceptionReason) {
        return `<ellipse cx="${shape.x + shape.width / 2}" cy="${shape.y + shape.height / 2}" rx="${shape.width / 2}" ry="${shape.height / 2}" fill="${shape.fill}"/>`;
      }

      return `<ellipse cx="${shape.x + shape.width / 2}" cy="${shape.y + shape.height / 2}" rx="${shape.width / 2}" ry="${shape.height / 2}" fill="none" stroke="#0F1218" stroke-width="${shape.strokeWeight ?? 2}" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join("\n  ");

  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\n  ${body}\n</svg>`;
}

function normalizeHexColor(value: string | undefined, fallback = defaultTeamIconColor) {
  const trimmed = (value || "").trim();

  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed
      .slice(1)
      .split("")
      .map((character) => `${character}${character}`)
      .join("")
      .toUpperCase()}`;
  }

  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return fallback;
}

function applyPreviewSvgColor(svg: string, color = defaultTeamIconColor) {
  const normalizedColor = normalizeHexColor(color);

  return svg
    .replace(/stroke="(?!none)[^"]*"/g, `stroke="${normalizedColor}"`)
    .replace(/fill="(?!none)[^"]*"/g, `fill="${normalizedColor}"`);
}

function applyPreviewSvgStrokeWidth(svg: string, strokeWidth = 2) {
  const safeStrokeWidth = clampNumber(strokeWidth, 1, 3);
  if (/stroke-width="[^"]*"/.test(svg)) {
    return svg.replace(/stroke-width="[^"]*"/g, `stroke-width="${safeStrokeWidth}"`);
  }

  return svg.replace(/<(path|line|circle|ellipse|rect|polyline|polygon)\b(?![^>]*stroke-width=)/g, `<$1 stroke-width="${safeStrokeWidth}"`);
}

function shapeLooksLikePaperPlane(shape: NativeShapeContract) {
  if (shape.type !== "path") return false;
  const data = shape.data.replace(/\s+/g, "");
  return /M4(?:\.0)?12(?:\.0)?L19(?:\.0)?5(?:\.0)?L14(?:\.0)?19(?:\.0)?L11(?:\.0)?13/i.test(data);
}

function shapeHasRiskyFilledTriangleEffect(shape: NativeShapeContract) {
  if (shape.type !== "path") return false;
  const data = shape.data.toUpperCase();
  const closeCount = (data.match(/Z/g) ?? []).length;
  const lineCount = (data.match(/L/g) ?? []).length;
  return closeCount > 0 && lineCount >= 2 && /ARROW|PLANE|TRIANGLE|PLAY/.test(`${shape.id} ${shape.name} ${shape.role}`.toUpperCase());
}

function countPathCommands(shape: NativeShapeContract) {
  if (shape.type !== "path") return 0;
  return (shape.data.match(/[MLHVCSQTAZ]/gi) ?? []).length;
}

function hasTinyStrokedCircle(shape: NativeShapeContract) {
  if (shape.type !== "path") return false;
  const match = shape.data.match(/^M(?:\d+(?:\.\d+)?) (?:\d+(?:\.\d+)?)A(\d+(?:\.\d+)?) \1 /);
  if (!match) return false;
  return Number(match[1]) < 3;
}

function hasDenseTopRightMark(shape: NativeShapeContract) {
  if (shape.type !== "path") return false;
  if (!/plus|badge|signal|button|mark/.test(shape.role)) return false;
  const numbers = Array.from(shape.data.matchAll(/-?\d+(?:\.\d+)?/g)).map((match) => Number(match[0]));
  const xValues = numbers.filter((_, index) => index % 2 === 0);
  const yValues = numbers.filter((_, index) => index % 2 === 1);
  if (!xValues.length || !yValues.length) return false;
  return Math.max(...xValues) > 19 || Math.min(...yValues) < 4;
}

function hasOrphanConnectorFragments(shapes: NativeShapeContract[]) {
  const connectors = shapes.filter((shape) => shape.type === "path" && /connection|link|route|stem|tail/i.test(`${shape.id} ${shape.role}`));
  if (!connectors.length) return false;

  const anchors = shapes.filter((shape) => /node|circle|container|body|outline|tray|arrow|tip|mark/i.test(`${shape.id} ${shape.role}`));
  return anchors.length === 0 || connectors.length === shapes.length;
}

function lacksPrimarySemanticShape(brief: IconBrief, shapes: NativeShapeContract[]) {
  const roles = shapes.map((shape) => `${shape.id} ${shape.role}`).join(" ").toLowerCase();

  if (brief.glyphKind === "share") return !/(share|send).*(arrow|node|tip)|node|arrow|tip/.test(roles);
  if (brief.glyphKind === "network") return !/(node|signal|route|arc)/.test(roles);
  if (brief.glyphKind === "download" || brief.glyphKind === "upload") return !/(arrow|tray|file|cloud)/.test(roles);
  if (brief.glyphKind === "filter") return !/(filter|funnel|track|knob)/.test(roles);
  if (brief.glyphKind === "search") return !/(search|lens|scan)/.test(roles);

  return false;
}

function countSemanticRoles(shapes: NativeShapeContract[], pattern: RegExp) {
  return shapes.filter((shape) => pattern.test(`${shape.id} ${shape.name} ${shape.role}`)).length;
}

function parsePathMoveLinePoints(shape: NativeShapeContract) {
  if (shape.type !== "path") return [];

  return Array.from(shape.data.matchAll(/[ML](-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)).map((match) => ({
    command: match[0][0],
    x: Number(match[1]),
    y: Number(match[2]),
  }));
}

function parseCirclePathCenter(shape: NativeShapeContract) {
  if (shape.type !== "path") return undefined;

  const match = shape.data.match(/^M(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)A(\d+(?:\.\d+)?) \3 /);
  if (!match) return undefined;

  const radius = Number(match[3]);
  return {
    x: Number(match[1]),
    y: Number(match[2]) + radius,
    radius,
  };
}

function pointDistance(start: { x: number; y: number }, end: { x: number; y: number }) {
  return Math.hypot(start.x - end.x, start.y - end.y);
}

function hasDetachedShareArrowFragments(shapes: NativeShapeContract[]) {
  const roles = shapes.map((shape) => `${shape.id} ${shape.role}`).join(" ").toLowerCase();
  if (/share-send-tail|share-forward-stem|share-forward-tip/.test(roles)) return true;

  return shapes.some((shape) => {
    if (shape.type !== "path" || !/share.*arrow|send.*arrow/i.test(`${shape.id} ${shape.role}`)) return false;
    const points = parsePathMoveLinePoints(shape);
    const moves = points.filter((point) => point.command === "M");
    if (moves.length <= 1) return false;

    return moves.slice(1).some((movePoint) => !points.some((point) => point.command === "L" && pointDistance(movePoint, point) < 0.1));
  });
}

function hasConnectorInsideNode(shapes: NativeShapeContract[]) {
  const nodes = shapes
    .map((shape) => parseCirclePathCenter(shape))
    .filter((center): center is { x: number; y: number; radius: number } => Boolean(center));

  if (!nodes.length) return false;

  const connectionPoints = shapes
    .filter((shape) => shape.type === "path" && /connection|distribution|route|link|flow/i.test(`${shape.id} ${shape.role}`))
    .flatMap(parsePathMoveLinePoints);

  return connectionPoints.some((point) => nodes.some((node) => pointDistance(point, node) < node.radius - 0.25));
}

function hasGenericDetachedArrowFragments(shapes: NativeShapeContract[]) {
  return shapes.some((shape) => {
    if (shape.type !== "path" || !/arrow|send|forward|upload|download|transfer|collapse|expand|sort/i.test(`${shape.id} ${shape.role}`)) return false;
    const points = parsePathMoveLinePoints(shape);
    const moves = points.filter((point) => point.command === "M");
    if (moves.length <= 1) return false;

    return moves.slice(1).some((movePoint) => !points.some((point) => point.command === "L" && pointDistance(movePoint, point) < 0.1));
  });
}

function shareDistributionMismatch(brief: IconBrief, optionId: SemanticOption["id"] | undefined, shapes: NativeShapeContract[]) {
  if (brief.glyphKind !== "share" || optionId !== "C") return undefined;

  const nodeCount = countSemanticRoles(shapes, /share.*node|share-node/i);
  const connectionCount = countSemanticRoles(shapes, /connection|distribution-flow|split-flow|converge-link/i);
  const arrowCount = countSemanticRoles(shapes, /arrow|tip|send/i);

  if (nodeCount < 3) return "已选择“三点连接”方向，但预览少于 3 个节点，会显得像残缺方案。";
  if (connectionCount < 1) return "已选择“三点连接”方向，但缺少连接关系，语义不成立。";
  if (arrowCount > 0 && nodeCount < 3) return "三点分发方向不能退化成单个发送箭头。";

  return undefined;
}

function reviewGeneratedPreview(brief: IconBrief, optionId: SemanticOption["id"] | undefined, shapes: NativeShapeContract[]) {
  const blockers = [
    shapes.length === 0 ? "没有生成可审核的 SVG 预览形状。" : undefined,
    shapes.length > 5 ? "路径数量超过 5，24px 下会变得拥挤。" : undefined,
    hasOrphanConnectorFragments(shapes) ? "预览只剩连接线/碎片，缺少主图形锚点；这会看起来像生成 bug。" : undefined,
    lacksPrimarySemanticShape(brief, shapes) ? "预览缺少可识别的核心语义形状，不能进入 SVG 审核。" : undefined,
    shareDistributionMismatch(brief, optionId, shapes),
    brief.glyphKind === "share" && hasDetachedShareArrowFragments(shapes)
      ? "分享箭头出现孤立短线拼接，视觉上像突然断掉；必须改为连续开放箭头路径。"
      : undefined,
    brief.glyphKind !== "share" && hasGenericDetachedArrowFragments(shapes)
      ? "箭头结构存在孤立短线拼接，视觉上像突然断掉；必须改成连续开放路径。"
      : undefined,
    hasConnectorInsideNode(shapes)
      ? "连接线/路由线压进节点内部，造成重叠粘连；线段必须停在节点外沿。"
      : undefined,
    shapes.some(hasDenseTopRightMark) ? "右上角小标记过于贴边，违反 2px 安全间距，容易堆成黑团。" : undefined,
    shapes.some(shapeLooksLikePaperPlane)
      ? "纸飞机轮廓在 24px 下容易形成填充三角和尖锐异形，不符合 outline-first 质量门。"
      : undefined,
    shapes.some(shapeHasRiskyFilledTriangleEffect)
      ? "检测到可能读成填充三角的闭合路径；箭头必须使用开放 V-tip 线条。"
      : undefined,
  ].filter((item): item is string => Boolean(item));
  const warnings = [
    brief.glyphKind === "share" && optionId === "C"
      ? "三点连线是可用隐喻，但在章节卡片场景下更容易读成“关系/网络”，建议优先用外发箭头。"
      : undefined,
    shapes.some((shape) => countPathCommands(shape) > 8)
      ? "存在复杂路径，需人工检查是否在 24px 下出现黑团或细节粘连。"
      : undefined,
    shapes.some(hasTinyStrokedCircle) ? "存在小于 6px 的描边圆，可能导致负空间塌陷；必要时用 3px 局部填充点。" : undefined,
    shapes.length === 5 ? "路径数量达到上限，需要人工重点检查 24px 负空间。" : undefined,
  ].filter((item): item is string => Boolean(item));

  return {
    blockers,
    warnings,
    summary: blockers.length
      ? blockers[0]
      : warnings.length
        ? warnings[0]
        : "预览通过 V1/V2/V4 快速检查：无黑团、无填充箭头、负空间可读。",
  };
}

function buildInitialCanvasElements(brief: IconBrief): CanvasElement[] {
  const primaryBounds: Record<IconGlyphKind, Pick<CanvasElement, "x" | "y" | "width" | "height">> = {
    bookmark: { x: 7, y: 3, width: 10, height: 17 },
    share: { x: 4, y: 4, width: 16, height: 16 },
    search: { x: 4, y: 4, width: 16, height: 16 },
    filter: { x: 4, y: 5, width: 16, height: 14 },
    download: { x: 5, y: 4, width: 14, height: 16 },
    upload: { x: 5, y: 4, width: 14, height: 16 },
    play: { x: 4, y: 4, width: 16, height: 16 },
    comment: { x: 4, y: 4, width: 16, height: 16 },
    like: { x: 4, y: 5, width: 16, height: 14 },
    read: { x: 4, y: 5, width: 16, height: 14 },
    settings: { x: 4, y: 4, width: 16, height: 16 },
    arrowsUpDown: { x: 5, y: 5, width: 14, height: 14 },
    arrowsIn: { x: 5, y: 5, width: 14, height: 14 },
    arrowsOut: { x: 5, y: 5, width: 14, height: 14 },
    contentExpand: { x: 4, y: 4, width: 16, height: 16 },
    user: { x: 5, y: 4, width: 14, height: 16 },
    game: { x: 4, y: 6, width: 16, height: 13 },
    network: { x: 4, y: 4, width: 16, height: 16 },
    generic: { x: 4, y: 4, width: 16, height: 16 },
  };
  const primary = primaryBounds[brief.glyphKind];

  return [
    {
      id: "frame",
      name: "24px master frame",
      type: "frame",
      x: 0,
      y: 0,
      width: 24,
      height: 24,
      radius: 4,
      locked: true,
    },
    {
      id: "bookmark",
      name: `${brief.label} primary path`,
      type: "path",
      x: primary.x,
      y: primary.y,
      width: primary.width,
      height: primary.height,
      stroke: "#0F1218",
      strokeWidth: 2,
      radius: 4,
      visible: true,
    },
    {
      id: "plus",
      name: "Add action badge",
      type: "line",
      x: 16.5,
      y: 3.5,
      width: 4,
      height: 4,
      stroke: "#0F1218",
      strokeWidth: 2,
      visible: false,
    },
    {
      id: "dot",
      name: "Saved status dot",
      type: "ellipse",
      x: 16,
      y: 4,
      width: 3,
      height: 3,
      fill: "#0F1218",
      stroke: "#0F1218",
      strokeWidth: 0,
      visible: false,
    },
    {
      id: "preview",
      name: "SVG 预览 artifact",
      type: "preview",
      x: 0,
      y: 0,
      width: 24,
      height: 24,
      stroke: "#0F1218",
      strokeWidth: 2,
      locked: true,
      visible: true,
    },
  ];
}

function buildSourceCandidate(asset: IconAsset, query: string, score = 1, matchReason = "来源库候选"): SourceCandidate {
  const normalized = normalizeSvg(asset.svg);
  const review = reviewSvg(normalized.svg, asset.name, query);

  return {
    ...asset,
    score,
    matchReason,
    normalizedSvg: normalized.svg,
    normalizedChanges: normalized.changes,
    normalizedWarnings: normalized.warnings,
    review,
  };
}

function assetToSearchResult(asset: IconAsset, score = 8, matchReason = "真实来源检索") {
  return {
    ...asset,
    score,
    matchReason,
  } satisfies SearchResult;
}

function buildSourceCandidates(query: string, tab: SourceLibraryTab, importedIcons: IconAsset[]) {
  if (tab === "all") {
    return buildSessionImportedSourceCandidates(query, importedIcons);
  }

  if (tab === "iconfont") {
    const iconfontIcons = importedIcons.filter((asset) => asset.source === "iconfont-symbol" || asset.category === "iconfont");
    if (!iconfontIcons.length) return [];

    return searchIcons(query, iconfontIcons, 36).map((asset, index) =>
      buildSourceCandidate(
        asset,
        query,
        asset.score + 3 - index / 100,
        `Iconfont 项目匹配：${asset.matchReason}`,
      ),
    );
  }

  if (tab === "iconpark" || tab === "lucide" || tab === "tabler" || tab === "phosphor") {
    return [];
  }

  if (tab === "figma") {
    const figmaIcons = importedIcons.filter((asset) => asset.source === "figma-canvas" || asset.source === "team-library");
    if (!figmaIcons.length) return [];

    return searchIcons(query, figmaIcons).map((asset) =>
      buildSourceCandidate(asset, query, asset.source === "team-library" ? asset.score + 6 : asset.score + 3, `${asset.source === "team-library" ? "已训练团队库" : "Figma 团队库"}匹配：${asset.matchReason}`),
    );
  }

  if (tab === "ai") {
    return [];
  }

  return searchIcons(query).map((asset) => buildSourceCandidate(asset, query, asset.score, asset.matchReason));
}

function sourceLibraryLabel(tab: SourceLibraryTab) {
  return {
    all: "全部",
    figma: "Figma 团队库",
    iconpark: "IconPark",
    lucide: "Lucide",
    tabler: "Tabler",
    phosphor: "Phosphor",
    iconfont: "Iconfont",
    curated: "团队库",
    ai: "AI 生成",
  }[tab];
}

function sourceLibraryTruthLabel(
  tab: SourceLibraryTab,
  importedState: {
    figma: boolean;
    iconfont: boolean;
    any: boolean;
  },
) {
  if (tab === "all") return importedState.any ? "真实包索引 + 会话导入" : "真实包索引";
  if (tab === "figma") return importedState.figma ? "画布已收录" : "读取 Figma 画布";
  if (tab === "iconpark") return "官方包索引";
  if (tab === "lucide") return "官方包索引";
  if (tab === "tabler") return "官方包索引";
  if (tab === "phosphor") return "官方包索引 · 需转线性";
  if (tab === "iconfont") return importedState.iconfont ? "项目真实导入" : "需导入 Symbol JS";
  if (tab === "curated") return "内置团队库";
  return "AI 生成";
}

function searchableSourceTabs(): SourceLibraryTab[] {
  return ["all", "figma", "lucide", "iconpark", "tabler", "phosphor", "iconfont", "curated"];
}

function realPackageSourceTabs(): Array<Extract<SourceLibraryTab, "lucide" | "iconpark" | "tabler" | "phosphor">> {
  return ["lucide", "iconpark", "tabler", "phosphor"];
}

function buildSessionImportedSourceCandidates(query: string, importedIcons: IconAsset[]) {
  const figmaIcons = importedIcons.filter((asset) => asset.source === "figma-canvas");
  const iconfontIcons = importedIcons.filter((asset) => asset.source === "iconfont-symbol" || asset.category === "iconfont");
  const pastedIcons = importedIcons.filter((asset) => asset.source === "pasted-svg");
  const trainedTeamIcons = importedIcons.filter((asset) => asset.source === "team-library");

  return [
    ...searchIcons(query, trainedTeamIcons, 36).map((asset) =>
      buildSourceCandidate(asset, query, asset.score + 6, `已训练团队库匹配：${asset.matchReason}`),
    ),
    ...searchIcons(query, figmaIcons, 24).map((asset) =>
      buildSourceCandidate(asset, query, asset.score + 4, `Figma 团队库匹配：${asset.matchReason}`),
    ),
    ...searchIcons(query, iconfontIcons, 24).map((asset) =>
      buildSourceCandidate(asset, query, asset.score + 3, `Iconfont 项目匹配：${asset.matchReason}`),
    ),
    ...searchIcons(query, pastedIcons, 12).map((asset) =>
      buildSourceCandidate(asset, query, asset.score + 2, `粘贴 SVG 匹配：${asset.matchReason}`),
    ),
  ];
}

function buildSourceLibraryCandidates(query: string, importedIcons: IconAsset[]) {
  return ["figma", "iconfont", "curated"].flatMap((tab) => buildSourceCandidates(query, tab as SourceLibraryTab, importedIcons));
}

function buildTrainingAssetFromSource(asset: IconAsset, query: string, trainingSource?: TeamLibraryAsset["trainingSource"]): Partial<TeamLibraryAsset> & IconAsset {
  const source = trainingSource ?? (asset.source === "figma-canvas" ? "figma-canvas" : asset.source === "iconfont-symbol" ? "iconfont-symbol" : "pasted-svg");
  const tags = Array.from(new Set([...asset.tags, query, asset.category, asset.name, "团队库", "训练入库"].filter(Boolean)));

  return {
    ...asset,
    tags,
    aliases: tags.slice(0, 16),
    contexts: [asset.category, query].filter(Boolean),
    semanticDescription: `从${asset.source}导入的团队成熟图标：${asset.name}。用于优先召回、语义复用和 icon-gen-promax 规范化输出。`,
    visualElements: [],
    trainingSource: source,
    status: "trained",
    qualityScore: reviewSvg(normalizeSvg(asset.svg).svg, asset.name, query).score,
  };
}

async function fetchTeamLibraryAssets() {
  const response = await fetch("/api/team-library", { cache: "no-store" });
  const payload = (await response.json()) as { assets?: TeamLibraryAsset[]; count?: number; updatedAt?: string; message?: string };

  if (!response.ok) {
    throw new Error(payload.message || `Team library load failed: ${response.status}`);
  }

  return {
    assets: payload.assets ?? [],
    summary: {
      count: payload.count ?? payload.assets?.length ?? 0,
      updatedAt: payload.updatedAt,
    } satisfies TeamLibrarySummary,
  };
}

async function trainTeamLibraryAssets(assets: Array<Partial<TeamLibraryAsset> & IconAsset>) {
  const response = await fetch("/api/team-library", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ assets }),
  });
  const payload = (await response.json()) as {
    assets?: TeamLibraryAsset[];
    count?: number;
    created?: number;
    updated?: number;
    updatedAt?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(payload.message || `Team library training failed: ${response.status}`);
  }

  return {
    assets: payload.assets ?? [],
    summary: {
      count: payload.count ?? payload.assets?.length ?? 0,
      created: payload.created,
      updated: payload.updated,
      updatedAt: payload.updatedAt,
    } satisfies TeamLibrarySummary,
  };
}

async function fetchPackageSourceAssets(tab: SourceLibraryTab, query: string) {
  if (tab !== "iconpark" && tab !== "lucide" && tab !== "tabler" && tab !== "phosphor") return [];

  const endpointMap: Record<"iconpark" | "lucide" | "tabler" | "phosphor", string> = {
    iconpark: "/api/icon-sources/iconpark",
    lucide: "/api/icon-sources/lucide",
    tabler: "/api/icon-sources/tabler",
    phosphor: "/api/icon-sources/phosphor",
  };
  const response = await fetch(`${endpointMap[tab]}?q=${encodeURIComponent(query)}&limit=36`);
  if (!response.ok) throw new Error(`${sourceLibraryLabel(tab)} search failed: ${response.status}`);
  const payload = (await response.json()) as { assets?: IconAsset[] };
  return payload.assets ?? [];
}

async function fetchApprovedExternalAssets(query: string, limit = 36) {
  const response = await fetch(`/api/icon-sources/external?q=${encodeURIComponent(query)}&sources=all&limit=${limit}`);
  if (!response.ok) throw new Error(`Approved external source search failed: ${response.status}`);
  const payload = (await response.json()) as { assets?: IconAsset[]; libraries?: string[]; failures?: Array<{ source: string; message: string }> };
  return {
    assets: payload.assets ?? [],
    libraries: payload.libraries ?? [],
    failures: payload.failures ?? [],
  };
}

function recommendedSourceCandidates(candidates: SourceCandidate[], limit = 3) {
  const signatures = new Set<string>();
  return candidates
    .filter((candidate) => candidate.review.score >= 82 && !sourceSvgConversionBlocker(candidate.normalizedSvg))
    .filter((candidate) => {
      const signature = candidate.normalizedSvg
        .replace(/\s+/g, " ")
        .replace(/#[0-9a-f]{3,8}/gi, "#COLOR")
        .replace(/\d+(?:\.\d+)?/g, "N")
        .slice(0, 700);
      if (signatures.has(signature)) return false;
      signatures.add(signature);
      return true;
    })
    .slice(0, limit);
}

function candidateDedupeKey(candidate: SourceCandidate) {
  return `${candidate.source}:${candidate.id || candidate.name}`.toLowerCase();
}

function mergeSourceCandidates(candidates: SourceCandidate[], limit = 60) {
  const candidateMap = new Map<string, SourceCandidate>();

  candidates.forEach((candidate) => {
    const key = candidateDedupeKey(candidate);
    const current = candidateMap.get(key);
    if (!current || candidate.score + candidate.review.score / 100 > current.score + current.review.score / 100) {
      candidateMap.set(key, candidate);
    }
  });

  return Array.from(candidateMap.values())
    .sort((a, b) => b.score - a.score || b.review.score - a.review.score || a.name.localeCompare(b.name))
    .slice(0, limit);
}

async function fetchFigmaCanvasAssets(url: string, query: string, token?: string) {
  const response = await fetch("/api/icon-sources/figma", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, query, token }),
  });
  const payload = (await response.json()) as { assets?: IconAsset[]; message?: string; requiresToken?: boolean };

  if (!response.ok) {
    throw new Error(payload.message || `Figma canvas import failed: ${response.status}`);
  }

  return {
    assets: payload.assets ?? [],
    message: payload.message ?? "",
  };
}

function detectBatchInputKind(input: string): BatchInputKind {
  const lower = input.toLowerCase();
  const hasFigma = /figma\.com|node-id|filekey|画布|组件库/.test(lower);
  const hasDocument = /prd|需求|文档|页面|功能|导航|toolbar|tab|卡片|入口/.test(lower);
  const hasManyLines = input
    .split(/\n|,|，|、|;/)
    .map((item) => item.trim())
    .filter(Boolean).length > 2;

  if (hasFigma && hasDocument) return "mixed";
  if (hasFigma) return "figma";
  if (hasDocument && !hasManyLines) return "document";
  return hasDocument ? "mixed" : "names";
}

function normalizeBatchName(rawName: string) {
  return rawName
    .replace(/^(icon|图标|组件|按钮|入口)[:：\-\s]*/i, "")
    .replace(/^(重点表达|表达|包含|包括|需要|补齐|新增|生成|做|用于|放在|出现在)[:：\-\s]*/i, "")
    .replace(/^(阅读|收藏|评论|下载|设置|搜索|筛选|分享|返回|关闭|更多|点赞|播放|上传)(功能|入口|按钮)$/i, "$1")
    .replace(/[，。；;,.]+$/g, "")
    .trim();
}

const knownBatchIconNames = [
  "阅读",
  "收藏",
  "评论",
  "下载",
  "设置",
  "搜索",
  "筛选",
  "分享",
  "返回",
  "关闭",
  "更多",
  "点赞",
  "播放",
  "上传",
];

function extractBatchIconNames(input: string) {
  const explicit = input
    .split(/\n|,|，|、|;|；/)
    .map(normalizeBatchName)
    .filter((item) => item.length >= 2 && item.length <= 24 && !/^https?:\/\//.test(item));
  const semanticMatches = Array.from(
    input.matchAll(/(?:做|生成|需要|包含|补齐|新增|导入|整理)?([^，。；;\n]{1,12}?)(?:图标|icon)/gi),
  )
    .map((match) => normalizeBatchName(match[1] ?? ""))
    .filter(Boolean);
  const knownMatches = knownBatchIconNames.filter((name) => input.includes(name));
  const source = knownMatches.length > 1 ? knownMatches : explicit.length > 1 ? explicit : semanticMatches.length > 1 ? semanticMatches : knownMatches;
  const fallbackNames = detectBatchInputKind(input) === "figma" ? ["返回", "搜索", "筛选", "分享", "收藏", "下载"] : [];

  return Array.from(new Set((source.length ? source : fallbackNames).map(normalizeBatchName).filter(Boolean))).slice(0, 24);
}

function isBatchIconRequest(input: string) {
  const lower = input.toLowerCase();
  const names = extractBatchIconNames(input);
  const hasSetSignal = /一批|批量|多个|一组|整套|图标集|icon set|icons|这批|这些|清单/.test(lower);
  const hasManyIconNames = names.length >= 2;

  return hasSetSignal && hasManyIconNames;
}

function buildBatchTasksFromInput(input: string, fallbackContext = "团队产品界面"): BatchTask[] {
  const sourceKind = detectBatchInputKind(input);
  const names = extractBatchIconNames(input);

  return names.map((name, index) => {
    const prompt = `做一个${name}图标，用在${fallbackContext}，强调${name}语义。`;
    const candidates = buildAutoSourceCandidates(`${name} ${input}`);

    return {
      id: `batch-${Date.now()}-${index}`,
      name,
      prompt,
      sourceKind,
      context: fallbackContext,
      status: candidates.length ? "matched" : "parsed",
      candidateCount: candidates.length,
      bestScore: candidates[0]?.review.score ?? 0,
    };
  });
}

function buildAutoSourceCandidates(query: string) {
  const iconParkCandidates = buildSourceCandidates(query, "iconpark", []);
  const iconfontCandidates = buildSourceCandidates(query, "iconfont", []);
  const curatedCandidates = buildSourceCandidates(query, "curated", []);

  return [...iconParkCandidates.slice(0, 2), ...iconfontCandidates.slice(0, 2), ...curatedCandidates.slice(0, 2)]
    .filter((candidate, index, candidates) => candidates.findIndex((item) => item.id === candidate.id) === index)
    .sort((a, b) => b.review.score - a.review.score || b.score - a.score)
    .slice(0, 6);
}


function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampPanelWidth(value: number) {
  return Math.round(Math.min(560, Math.max(320, value)));
}

function clampInspectorWidth(value: number) {
  return Math.round(Math.min(520, Math.max(300, value)));
}

function clampCanvasZoom(value: number) {
  return Math.round(Math.min(2.4, Math.max(0.55, value)) * 100) / 100;
}

function clampCanvasPanValue(value: number) {
  return Math.round(value);
}

function cloneCanvasElements(elements: CanvasElement[]) {
  return elements.map((element) => ({ ...element }));
}

function linePath(x1: number, y1: number, x2: number, y2: number) {
  return `M${x1} ${y1}L${x2} ${y2}`;
}

function sourceSvgConversionBlocker(svg: string) {
  const hasShape = /<(path|circle|rect|line|polyline|polygon|ellipse)\b/i.test(svg);
  const hasVisibleStroke = /\sstroke=["'](?!none["'])[^"']+["']/i.test(svg);
  const hasVisibleFill = /\sfill=["'](?!none["'])[^"']+["']/i.test(svg);
  const usesImplicitFill = hasShape && !/\sstroke=/i.test(svg) && !/\sfill=["']none["']/i.test(svg);
  if (!hasVisibleStroke && (hasVisibleFill || usesImplicitFill)) {
    return "来源是填充轮廓，当前不能机械描边后冒充高质量线性成品；仅作为构图参考，需受控重绘。";
  }
  const transforms = Array.from(svg.matchAll(/\stransform=["']([^"']+)["']/gi)).map((match) => match[1]);
  const isNormalizerTransform = (value: string) =>
    /^translate\(\s*[-+]?\d*\.?\d+\s+[-+]?\d*\.?\d+\s*\)\s*scale\(\s*[-+]?\d*\.?\d+\s*\)\s*translate\(\s*[-+]?\d*\.?\d+\s+[-+]?\d*\.?\d+\s*\)$/i.test(
      value.trim(),
    );
  if (transforms.some((value) => !isNormalizerTransform(value))) {
    return "来源 SVG 含旋转、矩阵或嵌套 transform，当前转换器无法可靠展开。";
  }
  if (/<(use|defs|clipPath|mask|filter|linearGradient|radialGradient)\b/i.test(svg)) return "来源 SVG 含 use/defs/mask/filter 等间接结构，不能安全转成 native path。";
  return undefined;
}

function readNormalizerTransform(svg: string) {
  const value = svg.match(/<g\b[^>]*\stransform=["']([^"']+)["']/i)?.[1];
  if (!value) return { scale: 1, x: 0, y: 0 };
  const match = value
    .trim()
    .match(
      /^translate\(\s*([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s*\)\s*scale\(\s*([-+]?\d*\.?\d+)\s*\)\s*translate\(\s*([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s*\)$/i,
    );
  if (!match) return { scale: 1, x: 0, y: 0 };
  const scale = Number(match[3]);
  return {
    scale,
    x: Number(match[1]) + Number(match[4]) * scale,
    y: Number(match[2]) + Number(match[5]) * scale,
  };
}

function transformFigmaPathData(data: string, transform: { scale: number; x: number; y: number }) {
  if (transform.scale === 1 && transform.x === 0 && transform.y === 0) return data;
  let coordinateIndex = 0;
  return data.replace(/[-+]?(?:(?:\d*\.\d+)|(?:\d+\.?))(?:[eE][-+]?\d+)?/g, (value) => {
    const axisOffset = coordinateIndex % 2 === 0 ? transform.x : transform.y;
    coordinateIndex += 1;
    return String(Math.round((Number(value) * transform.scale + axisOffset) * 1000) / 1000);
  });
}

function readSvgTagAttributes(tag: string) {
  const attributes: Record<string, string> = {};
  Array.from(tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)=["']([^"']*)["']/g)).forEach((match) => {
    attributes[match[1]] = match[2];
  });
  return attributes;
}

function numberAttribute(attributes: Record<string, string>, name: string, fallback = 0) {
  const value = Number.parseFloat(attributes[name] ?? "");
  return Number.isFinite(value) ? value : fallback;
}

function parsePointsAttribute(value: string | undefined) {
  if (!value) return [];
  const numbers = value
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter(Number.isFinite);
  const points: Array<{ x: number; y: number }> = [];

  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push({ x: numbers[index], y: numbers[index + 1] });
  }

  return points;
}

function pointsToPathData(points: Array<{ x: number; y: number }>, close = false) {
  if (!points.length) return "";
  return `${points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join("")}${close ? "Z" : ""}`;
}

function normalizePathDataForFigma(data: string, warnings: string[], label: string) {
  const normalizedPath = normalizeSvgPathForFigma(data);
  if (!normalizedPath.data) {
    warnings.push(`${label} 的路径无法安全转成 Figma native path：${normalizedPath.warnings.join(" ") || "未知原因"}`);
    return undefined;
  }

  normalizedPath.warnings.forEach((warning) => warnings.push(`${label} 路径转换提示：${warning}`));
  return normalizedPath.data;
}

function isHiddenSvgShape(attributes: Record<string, string>) {
  return attributes.stroke === "none" || attributes.fill === "none" && !attributes.stroke || attributes.opacity === "0";
}

function isSvgPlaceholderPath(data: string) {
  return /^M0\s+0h24v24H0z$/i.test(data.replace(/\s+/g, " ").trim());
}

function buildCanvasElementsFromSourceSvg(svg: string, label: string): { elements: CanvasElement[]; shapes: NativeShapeContract[]; warnings: string[] } {
  const warnings: string[] = [];
  const shapes: NativeShapeContract[] = [];
  const body = svg.replace(/^<svg\b[^>]*>/i, "").replace(/<\/svg>\s*$/i, "");
  const sourceTransform = readNormalizerTransform(svg);
  const tags = Array.from(body.matchAll(/<(path|line|polyline|polygon|circle|ellipse|rect)\b[^>]*>/gi));

  tags.forEach((match, index) => {
    const tagName = match[1].toLowerCase();
    const attributes = readSvgTagAttributes(match[0]);
    const strokeWeight = 2;
    const baseId = `${label.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g, "_") || "source"}_${tagName}_${index + 1}`;
    const role = `source-${tagName}`;

    if (tagName === "path") {
      const data = attributes.d?.trim();
      if (!data) return;
      if (isHiddenSvgShape(attributes) || isSvgPlaceholderPath(data)) return;
      const normalizedData = normalizePathDataForFigma(data, warnings, `${label} path ${index + 1}`);
      if (!normalizedData) return;
      shapes.push(pathShape(baseId, `${label} source path ${index + 1}`, role, transformFigmaPathData(normalizedData, sourceTransform)));
      return;
    }

    if (tagName === "line") {
      if (isHiddenSvgShape(attributes)) return;
      shapes.push({
        id: baseId,
        name: `${label} source line ${index + 1}`,
        type: "line",
        role,
        x1: numberAttribute(attributes, "x1") * sourceTransform.scale + sourceTransform.x,
        y1: numberAttribute(attributes, "y1") * sourceTransform.scale + sourceTransform.y,
        x2: numberAttribute(attributes, "x2") * sourceTransform.scale + sourceTransform.x,
        y2: numberAttribute(attributes, "y2") * sourceTransform.scale + sourceTransform.y,
        strokeWeight,
      });
      return;
    }

    if (tagName === "rect") {
      if (isHiddenSvgShape(attributes)) return;
      shapes.push({
        id: baseId,
        name: `${label} source rect ${index + 1}`,
        type: "rect",
        role,
        x: numberAttribute(attributes, "x") * sourceTransform.scale + sourceTransform.x,
        y: numberAttribute(attributes, "y") * sourceTransform.scale + sourceTransform.y,
        width: numberAttribute(attributes, "width") * sourceTransform.scale,
        height: numberAttribute(attributes, "height") * sourceTransform.scale,
        radius: Math.min(4, numberAttribute(attributes, "rx", numberAttribute(attributes, "ry", 4)) * sourceTransform.scale),
        strokeWeight,
      });
      return;
    }

    if (tagName === "circle") {
      if (isHiddenSvgShape(attributes)) return;
      const radius = numberAttribute(attributes, "r");
      shapes.push({
        id: baseId,
        name: `${label} source circle ${index + 1}`,
        type: "circle",
        role,
        x: (numberAttribute(attributes, "cx") - radius) * sourceTransform.scale + sourceTransform.x,
        y: (numberAttribute(attributes, "cy") - radius) * sourceTransform.scale + sourceTransform.y,
        width: radius * 2 * sourceTransform.scale,
        height: radius * 2 * sourceTransform.scale,
        strokeWeight,
      });
      return;
    }

    if (tagName === "ellipse") {
      if (isHiddenSvgShape(attributes)) return;
      const rx = numberAttribute(attributes, "rx");
      const ry = numberAttribute(attributes, "ry");
      shapes.push({
        id: baseId,
        name: `${label} source ellipse ${index + 1}`,
        type: "circle",
        role,
        x: (numberAttribute(attributes, "cx") - rx) * sourceTransform.scale + sourceTransform.x,
        y: (numberAttribute(attributes, "cy") - ry) * sourceTransform.scale + sourceTransform.y,
        width: rx * 2 * sourceTransform.scale,
        height: ry * 2 * sourceTransform.scale,
        strokeWeight,
      });
      return;
    }

    const points = parsePointsAttribute(attributes.points).map((point) => ({
      x: point.x * sourceTransform.scale + sourceTransform.x,
      y: point.y * sourceTransform.scale + sourceTransform.y,
    }));
    const data = pointsToPathData(points, tagName === "polygon");
    if (data) {
      const normalizedData = normalizePathDataForFigma(data, warnings, `${label} ${tagName} ${index + 1}`);
      if (normalizedData) shapes.push(pathShape(baseId, `${label} source ${tagName} ${index + 1}`, role, normalizedData));
    }
  });

  if (!shapes.length) {
    warnings.push("当前来源 SVG 没有可安全提取的 path/line/circle/rect 节点，只能作为参考预览。");
  }

  const oversized = shapes.length > 10;
  if (oversized) {
    warnings.push(`来源 SVG 提取出 ${shapes.length} 个节点，超过 MVP 安全上限；画布保留预览，但写入前建议人工简化。`);
  }

  return {
    elements: buildCanvasElementsFromNativeShapes(shapes.slice(0, 10), label),
    shapes: shapes.slice(0, 10),
    warnings,
  };
}

function buildCanvasElementsFromNativeShapes(shapes: NativeShapeContract[], label: string): CanvasElement[] {
  return [
    {
      id: "frame",
      name: "24px master frame",
      type: "frame",
      x: 0,
      y: 0,
      width: 24,
      height: 24,
      radius: 4,
      locked: true,
    },
    ...shapes.map((shape, index): CanvasElement => {
      if (shape.type === "circle") {
        return {
          id: shape.id,
          name: shape.name,
          type: "ellipse",
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
          stroke: defaultTeamIconColor,
          strokeWidth: shape.strokeWeight ?? 2,
          fill: shape.fill,
          nativeRole: shape.role,
          visible: true,
        };
      }

      if (shape.type === "line") {
        const deltaX = shape.x2 - shape.x1;
        const deltaY = shape.y2 - shape.y1;
        return {
          id: shape.id,
          name: shape.name,
          type: "line",
          x: Math.min(shape.x1, shape.x2),
          y: Math.min(shape.y1, shape.y2),
          width: Math.abs(deltaX),
          height: Math.abs(deltaY),
          stroke: defaultTeamIconColor,
          strokeWidth: shape.strokeWeight,
          lineSlope: deltaX * deltaY < 0 ? "up" : "down",
          nativeRole: shape.role,
          locked: true,
          visible: true,
        };
      }

      if (shape.type === "rect") {
        return {
          id: shape.id,
          name: shape.name,
          type: "rect",
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
          stroke: defaultTeamIconColor,
          strokeWidth: shape.strokeWeight,
          radius: shape.radius ?? 4,
          nativeRole: shape.role,
          locked: true,
          visible: true,
        };
      }

      return {
        id: shape.id || `source_path_${index + 1}`,
        name: shape.name || `${label} path ${index + 1}`,
        type: "path",
        x: 2,
        y: 2,
        width: 20,
        height: 20,
        stroke: defaultTeamIconColor,
        strokeWidth: shape.strokeWeight,
        radius: 4,
        pathData: shape.data,
        nativeRole: shape.role,
        locked: true,
        visible: true,
      };
    }),
    {
      id: "preview",
      name: "Source SVG reference artifact",
      type: "preview",
      x: 0,
      y: 0,
      width: 24,
      height: 24,
      stroke: defaultTeamIconColor,
      strokeWidth: 2,
      locked: true,
      visible: true,
    },
  ];
}

function buildSourceCandidateCanvasPayload(candidate: SourceCandidate, fallbackBrief: IconBrief): {
  elements: CanvasElement[];
  previewSvg?: string;
  previewShapes: NativeShapeContract[];
  sourceConversionStatus: NonNullable<IconCanvasInstance["sourceConversionStatus"]>;
  reviewNote: string;
  normalizedBrief: IconBrief;
  normalizedOptionId: SemanticOption["id"];
} {
  const normalizedBrief = buildBriefFromMessage(`${candidate.name} ${candidate.category} ${candidate.tags.join(" ")}`, fallbackBrief);
  const normalizedOptionId = resolveSourceSemanticOptionId(candidate, normalizedBrief);
  const blocker = sourceSvgConversionBlocker(candidate.normalizedSvg) ?? sourceSvgConversionBlocker(candidate.svg);
  const sourceGeometry = blocker
    ? { elements: buildInitialCanvasElements(normalizedBrief), shapes: [] as NativeShapeContract[], warnings: [blocker] }
    : buildCanvasElementsFromSourceSvg(candidate.normalizedSvg, candidate.name);
  const previewShapes = sourceGeometry.shapes;
  const geometryWarnings = [
    ...sourceGeometry.warnings,
    previewShapes.length > 5 ? `来源图标包含 ${previewShapes.length} 个可编辑节点，超过当前团队规范建议上限 5；形态已保留，但写入前建议人工审核。` : undefined,
  ].filter((warning): warning is string => Boolean(warning));
  const sourceWarnings = [
    candidate.review.score < 82 ? `来源原图评审分 ${candidate.review.score}/100，仅作为语义参考。` : undefined,
    ...geometryWarnings,
  ].filter((warning): warning is string => Boolean(warning));
  const canUseSourceGeometry = previewShapes.length > 0 && !blocker;

  return {
    elements: canUseSourceGeometry ? sourceGeometry.elements : buildCanvasElementsFromNativeShapes([], candidate.name),
    previewSvg: canUseSourceGeometry ? buildPreviewSvgFromShapes(previewShapes) : candidate.normalizedSvg,
    previewShapes,
    sourceConversionStatus: canUseSourceGeometry ? (sourceWarnings.length ? "needs_review" : "team_normalized") : "reference_only",
    normalizedBrief,
    normalizedOptionId,
    reviewNote: !canUseSourceGeometry
      ? [
          "已保留来源库原图作为画布预览，但当前 SVG 结构不能安全转为可编辑 native 节点。",
          "我不会再用 AI 模板冒充来源图标；需要进入人工简化或更换来源图标后再生产写入。",
          sourceWarnings.join(" "),
        ]
          .filter(Boolean)
          .join(" ")
      : [
          "已保留来源库图标的原始形态，并套用当前团队规范。",
          "内部使用 24px 逻辑网格，最终尺寸、颜色和线宽由所选组件库配置决定；来源图形不再被 AI 模板替换。",
          sourceWarnings.join(" "),
        ]
          .filter(Boolean)
          .join(" "),
  };
}

function createCanvasInstance(params: {
  brief: IconBrief;
  elements: CanvasElement[];
  optionId?: SemanticOption["id"];
  sourceName?: string;
  index: number;
  position?: { x: number; y: number };
  previewSvg?: string;
  sourcePreviewSvg?: string;
  previewShapes?: NativeShapeContract[];
  sourceCandidateId?: string;
  sourceConversionStatus?: IconCanvasInstance["sourceConversionStatus"];
  reviewNote?: string;
  name?: string;
  previewVariantId?: PreviewVariantId;
  componentPrefix?: string;
  previewColor?: string;
}): IconCanvasInstance {
  const column = params.index % 3;
  const row = Math.floor(params.index / 3);
  const x = params.position?.x ?? 120 + column * 180;
  const y = params.position?.y ?? 110 + row * 180;

  return {
    id: `icon-${Date.now()}-${params.index}`,
    name: params.name ?? `${params.componentPrefix ?? "AijBasic"}${params.brief.semanticName}`,
    x,
    y,
    scale: 1,
    previewPadding: 28,
    previewStrokeWidth: 2,
    previewColor: params.previewColor ?? defaultTeamIconColor,
    glyphKind: params.brief.glyphKind,
    elements: cloneCanvasElements(params.elements),
    optionId: params.optionId,
    sourceName: params.sourceName,
    previewSvg: params.previewSvg,
    sourcePreviewSvg: params.sourcePreviewSvg,
    previewShapes: params.previewShapes,
    sourceCandidateId: params.sourceCandidateId,
    sourceConversionStatus: params.sourceConversionStatus,
    reviewNote: params.reviewNote,
    previewVariantId: params.previewVariantId,
  };
}

function buildAiPreviewGridInstances(params: {
  brief: IconBrief;
  option: SemanticOption;
  variants: PreviewVariant[];
  startIndex: number;
  componentPrefix?: string;
  previewColor?: string;
}): IconCanvasInstance[] {
  const shapeOptionId = resolveShapeOptionId(params.brief, params.option);
  const startX = 120;
  const startY = 120;
  const gapX = 170;
  const gapY = 180;

  return params.variants.slice(0, 10).map((variant, index) => {
    const shapes = buildQualityAssuredPreviewShapes(params.brief, shapeOptionId, variant.id);
    const review = reviewGeneratedPreview(params.brief, shapeOptionId, shapes);
    const column = index % 5;
    const row = Math.floor(index / 5);

    return createCanvasInstance({
      brief: params.brief,
      elements: buildCanvasElementsFromNativeShapes(shapes, variant.title),
      optionId: params.option.id,
      sourceName: `${aiPreviewGridSourcePrefix} ${params.option.id}-${variant.id} ${variant.title}`,
      index: params.startIndex + index,
      position: {
        x: startX + column * gapX,
        y: startY + row * gapY,
      },
      previewSvg: buildPreviewSvgFromShapes(shapes),
      previewShapes: shapes,
      previewVariantId: variant.id,
      name: `${params.componentPrefix ?? "AijBasic"}${params.brief.semanticName}V${variant.id}`,
      componentPrefix: params.componentPrefix,
      previewColor: params.previewColor,
      reviewNote: review.blockers.length
        ? `该方案没有进入推荐交付：${review.blockers.join(" ")}`
        : `${variant.title}：${variant.description} ${review.summary}`,
    });
  });
}

function buildBatchManifest(instances: IconCanvasInstance[]): BatchManifestItem[] {
  return instances.map((instance) => ({
    id: instance.id,
    name: instance.name,
    sourceName: instance.sourceName ?? "AI semantic",
    optionId: instance.optionId ?? "A",
    position: { x: Math.round(instance.x), y: Math.round(instance.y) },
    scale: instance.scale,
    status: "queued_for_review",
  }));
}

function getCanvasInstanceQualityIssues(instance: IconCanvasInstance, profile: TeamSpecOutputProfile): IconQualityIssue[] {
  const drawableElements = instance.elements.filter(isDrawableElement);
  const logicalStrokeWidth = profile.strokeWidth / profile.scale;
  const logicalPadding = profile.padding / profile.scale;
  const logicalSize = profile.masterSize / profile.scale;
  const issues: IconQualityIssue[] = [];

  if (instance.reviewStatus === "rejected") {
    issues.push({
      id: "manual-rejected",
      title: "人工审核已打回",
      message: "该图标被人工打回，需重新调整语义或视觉细节。",
      severity: "blocker",
      stage: "source",
      actionLabel: "打开编辑",
    });
  }

  if (instance.sourceConversionStatus === "reference_only") {
    issues.push({
      id: "source-reference-only",
      title: "来源仅作参考",
      message: "来源 SVG 没有安全转换成可编辑 native nodes，不能靠人工批准直接写入。请更换来源或重绘为安全图层。",
      severity: "blocker",
      stage: "source",
      actionLabel: "查看来源",
    });
  } else if (instance.sourceConversionStatus === "needs_review") {
    issues.push({
      id: "source-needs-review",
      title: "来源形态需复核",
      message: instance.reviewNote || "来源形态已保留并套用团队规范，需要确认复杂度、构图和业务语义。",
      severity: "warning",
      stage: "source",
      actionLabel: "查看来源",
    });
  }

  if (!drawableElements.length) {
    issues.push({
      id: "native-shapes-empty",
      title: "没有可编辑图层",
      message: "当前图标没有可写入的 native shapes，不能靠人工批准创建空组件。",
      severity: "blocker",
      stage: "figma-native",
      actionLabel: "更换或重绘",
    });
  }

  if (drawableElements.length > 5) {
    issues.push({
      id: "geometry-too-complex",
      title: "图层复杂度偏高",
      message: `当前有 ${drawableElements.length} 个可编辑图层，超过团队建议上限 5；确认细节没有堆叠后可以人工批准。`,
      severity: "warning",
      stage: "geometry",
      actionLabel: "检查图层",
    });
  }

  drawableElements.forEach((element) => {
    const elementStrokeWidth = element.type === "ellipse" && (element.strokeWidth ?? 0) === 0 ? 0 : element.strokeWidth ?? logicalStrokeWidth;
    if (elementStrokeWidth > 0 && Math.abs(elementStrokeWidth - logicalStrokeWidth) > 0.01) {
      issues.push({
        id: `stroke-width:${element.id}`,
        title: "线宽偏离团队规范",
        message: `${element.name} 当前为 ${elementStrokeWidth}px，逻辑网格应为 ${logicalStrokeWidth}px；可以编辑或一键恢复团队默认。`,
        severity: "warning",
        stage: "team-spec",
        actionLabel: "编辑线宽",
        elementId: element.id,
      });
    }

    if (
      element.x < logicalPadding ||
      element.y < logicalPadding ||
      element.x + element.width > logicalSize - logicalPadding ||
      element.y + element.height > logicalSize - logicalPadding
    ) {
      issues.push({
        id: `safe-zone:${element.id}`,
        title: "图形超出安全区",
        message: `${element.name} 超出 ${logicalPadding}px 安全区，需要调整位置/尺寸；如果是有意光学偏移，可以人工批准。`,
        severity: "warning",
        stage: "team-spec",
        actionLabel: "编辑位置",
        elementId: element.id,
      });
    }

    if (element.type === "ellipse" && (element.strokeWidth ?? 0) === 0 && (element.width > 4 || element.height > 4)) {
      issues.push({
        id: `fill-density:${element.id}`,
        title: "局部填充过大",
        message: `${element.name} 的填充区域超过 4px，可能破坏 outline-first 结构；需要缩小或人工确认。`,
        severity: "warning",
        stage: "team-spec",
        actionLabel: "编辑尺寸",
        elementId: element.id,
      });
    }

    if (element.type === "path") {
      const pathData = element.pathData ?? buildPrimaryPath(element, instance.glyphKind).d;
      const normalizedPath = normalizeSvgPathForFigma(pathData);
      if (!normalizedPath.data || !isFigmaSafePathData(normalizedPath.data)) {
        issues.push({
          id: `unsafe-path:${element.id}`,
          title: "路径无法安全写入",
          message: `${element.name} 含 Figma 不兼容的路径命令，必须转换或替换，不能人工批准绕过。`,
          severity: "blocker",
          stage: "figma-native",
          actionLabel: "替换路径",
          elementId: element.id,
        });
      }
    }
  });

  return issues;
}

function buildIconSpecFromCanvasInstance(
  instance: IconCanvasInstance,
  context = "batch figma write",
  profile: TeamSpecOutputProfile = teamSpecSkillRegistry[1].outputProfile,
  skillId: TeamSpecSkillId = "manju",
): IconSpecContract {
  const semanticName = instance.name.replace(/^(?:AijBasic|BjhBasic)+/, "") || "Icon";
  const logicalShapes = instance.elements
    .map((element) => buildNativeShapeContract(element, instance.glyphKind))
    .map((shape) => sanitizeNativeShapeForFigma(shape))
    .filter((shape): shape is NativeShapeContract => Boolean(shape));
  const shapes = scaleNativeShapes(logicalShapes, profile.scale);
  const qualityIssues = getCanvasInstanceQualityIssues(instance, profile);
  const approvedIssueIds = new Set(instance.qualityApprovedIssueIds ?? []);
  const pendingIssues = qualityIssues.filter((issue) => issue.severity === "blocker" || !approvedIssueIds.has(issue.id));
  const blockers = qualityIssues.filter((issue) => issue.severity === "blocker");
  const warnings = qualityIssues.map((issue) => `${issue.title}：${issue.message}`);
  const manualApprovedWarnings = qualityIssues
    .filter((issue) => issue.severity === "warning" && approvedIssueIds.has(issue.id))
    .map((issue) => issue.id);

  return {
    meta: {
      name: instance.name.startsWith(profile.componentPrefix) ? instance.name : `${profile.componentPrefix}${semanticName}`,
      label: semanticName,
      size: profile.masterSize,
      grid: profile.masterSize,
      context,
      style: "outline",
      color_mode: "monochrome",
      corner_radius: "rounded",
      selected_direction: instance.optionId ? `Batch ${instance.optionId}` : "Batch canvas item",
      preview_status: "approved",
      skill_id: skillId,
      platform: profile.platform,
      logical_size: profile.logicalSize,
      runtime_mode: "strict",
      source: {
        type: instance.sourceName ?? "canvas-instance",
        name: instance.name,
        license: "internal-generation",
        processor: "team-spec-normalizer",
        note: "Batch Figma write uses editable native nodes generated from the canvas instance.",
      },
    },
    canvas: {
      padding: profile.padding,
      live_area: profile.liveArea,
      optical_center: true,
    },
    shapes,
    strokes: {
      color: profile.color,
      width: profile.strokeWidth,
      cap: "round",
      join: "round",
    },
    validation: {
      status: blockers.length ? "blocked" : pendingIssues.length ? "needs_review" : "pass",
      warnings: shapes.length ? warnings : ["该画布图标没有可写入的 native shapes"],
      manual_approved_warnings: manualApprovedWarnings,
      output: "Figma native nodes, not pasted SVG",
    },
  };
}

function buildPrimaryPath(element: CanvasElement, glyphKind: IconGlyphKind) {
  const x = element.x;
  const y = element.y;
  const width = element.width;
  const height = element.height;
  const radius = element.radius ?? 4;
  const stroke = element.stroke ?? "#0F1218";
  const strokeWidth = element.strokeWidth ?? 2;
  const right = x + width;
  const bottom = y + height;
  const center = x + width / 2;
  const notchY = bottom - Math.max(3, height * 0.18);
  const centerY = y + height / 2;

  const dataByKind: Record<IconGlyphKind, string> = {
    bookmark: `M${x} ${y + radius}C${x} ${y + radius / 2} ${x + radius / 2} ${y} ${x + radius} ${y}H${right - radius}C${right - radius / 2} ${y} ${right} ${y + radius / 2} ${right} ${y + radius}V${bottom}L${center} ${notchY}L${x} ${bottom}V${y + radius}Z`,
    share: `M${x + 2} ${bottom - 2}L${right - 3} ${y + 3}M${right - 8} ${y + 3}H${right - 3}V${y + 8}`,
    search: `M${x + 1} ${y + 7}C${x + 1} ${y + 2.5} ${x + 4.5} ${y - 1} ${x + 9} ${y - 1}C${x + 13.5} ${y - 1} ${x + 17} ${y + 2.5} ${x + 17} ${y + 7}C${x + 17} ${y + 11.5} ${x + 13.5} ${y + 15} ${x + 9} ${y + 15}C${x + 4.5} ${y + 15} ${x + 1} ${y + 11.5} ${x + 1} ${y + 7}ZM${x + 15} ${y + 13}L${right} ${bottom}`,
    filter: `M${x + 1} ${y + 3}H${right - 1}M${x + 3} ${centerY}H${right - 3}M${x + 1} ${bottom - 3}H${right - 1}M${x + 6} ${y + 1}V${y + 5}M${right - 6} ${centerY - 2}V${centerY + 2}M${center} ${bottom - 5}V${bottom - 1}`,
    download: `M${center} ${y}V${bottom - 6}M${center} ${bottom - 6}L${x + 5} ${bottom - 11}M${center} ${bottom - 6}L${right - 5} ${bottom - 11}M${x + 2} ${bottom - 2}H${right - 2}`,
    upload: `M${center} ${bottom - 2}V${y + 4}M${center} ${y + 4}L${x + 5} ${y + 9}M${center} ${y + 4}L${right - 5} ${y + 9}M${x + 2} ${bottom - 2}H${right - 2}`,
    play: `M${x + 1} ${y + radius}C${x + 1} ${y + 1.5} ${x + 2.5} ${y} ${x + radius} ${y}H${right - radius}C${right - 2.5} ${y} ${right - 1} ${y + 1.5} ${right - 1} ${y + radius}V${bottom - radius}C${right - 1} ${bottom - 1.5} ${right - 2.5} ${bottom} ${right - radius} ${bottom}H${x + radius}C${x + 2.5} ${bottom} ${x + 1} ${bottom - 1.5} ${x + 1} ${bottom - radius}V${y + radius}ZM${x + 8} ${y + 5}L${x + 8} ${bottom - 5}L${right - 6} ${centerY}Z`,
    comment: `M${x + radius} ${y}H${right - radius}C${right - 2} ${y} ${right} ${y + 2} ${right} ${y + radius}V${bottom - 7}C${right} ${bottom - 5} ${right - 2} ${bottom - 3} ${right - radius} ${bottom - 3}H${x + 8}L${x + 3} ${bottom}V${bottom - 3}C${x + 1} ${bottom - 3} ${x} ${bottom - 5} ${x} ${bottom - 7}V${y + radius}C${x} ${y + 2} ${x + 2} ${y} ${x + radius} ${y}Z`,
    like: `M${center} ${bottom - 1}L${x + 3} ${y + 8}C${x - 1} ${y + 3} ${x + 5} ${y - 1} ${center} ${y + 4}C${right - 5} ${y - 1} ${right + 1} ${y + 3} ${right - 3} ${y + 8}L${center} ${bottom - 1}Z`,
    read: `M${center} ${y + 3}V${bottom - 1}M${center} ${y + 4}C${x + 7} ${y + 1.5} ${x + 3} ${y + 1.5} ${x} ${y + 4}V${bottom - 2}C${x + 3} ${bottom - 4} ${x + 7} ${bottom - 4} ${center} ${bottom - 1}M${center} ${y + 4}C${right - 7} ${y + 1.5} ${right - 3} ${y + 1.5} ${right} ${y + 4}V${bottom - 2}C${right - 3} ${bottom - 4} ${right - 7} ${bottom - 4} ${center} ${bottom - 1}`,
    settings: `M${center} ${y + 1}V${y + 4}M${center} ${bottom - 1}V${bottom - 4}M${x + 1} ${centerY}H${x + 4}M${right - 1} ${centerY}H${right - 4}M${x + 4} ${y + 4}L${x + 6.5} ${y + 6.5}M${right - 4} ${bottom - 4}L${right - 6.5} ${bottom - 6.5}M${right - 4} ${y + 4}L${right - 6.5} ${y + 6.5}M${x + 4} ${bottom - 4}L${x + 6.5} ${bottom - 6.5}M${center} ${centerY - 4}A4 4 0 1 1 ${center} ${centerY + 4}A4 4 0 1 1 ${center} ${centerY - 4}`,
    arrowsUpDown: `M${x + 4} ${bottom}V${y + 1}M${x + 1} ${y + 4}L${x + 4} ${y + 1}L${x + 7} ${y + 4}M${right - 4} ${y}V${bottom - 1}M${right - 7} ${bottom - 4}L${right - 4} ${bottom - 1}L${right - 1} ${bottom - 4}`,
    arrowsIn: `M${x} ${y}L${center} ${centerY}M${center} ${y + 1}V${centerY}H${x + 1}M${right} ${bottom}L${center} ${centerY}M${center} ${bottom - 1}V${centerY}H${right - 1}`,
    arrowsOut: `M${center} ${centerY}L${x} ${y}M${x} ${y + 4}V${y}H${x + 4}M${center} ${centerY}L${right} ${bottom}M${right - 4} ${bottom}H${right}V${bottom - 4}`,
    contentExpand: `M${x} ${y + 3}H${center}M${x} ${centerY}H${center + 2}M${x} ${bottom - 3}H${center + 4}M${right - 4} ${centerY - 3}V${centerY + 3}M${right - 7} ${centerY}H${right - 1}`,
    user: `M${center} ${y + 1}A4 4 0 1 1 ${center} ${y + 9}A4 4 0 1 1 ${center} ${y + 1}M${x} ${bottom}C${x + 1} ${bottom - 5} ${x + 5} ${bottom - 7} ${center} ${bottom - 7}C${right - 5} ${bottom - 7} ${right - 1} ${bottom - 5} ${right} ${bottom}`,
    game: `M${x + 3} ${y + 5}H${right - 3}C${right - 1} ${y + 5} ${right} ${y + 7} ${right} ${y + 10}C${right} ${bottom} ${right - 2} ${bottom + 1} ${right - 4} ${bottom - 1}L${right - 6} ${bottom - 3}H${x + 6}L${x + 4} ${bottom - 1}C${x + 2} ${bottom + 1} ${x} ${bottom} ${x} ${y + 10}C${x} ${y + 7} ${x + 1} ${y + 5} ${x + 3} ${y + 5}ZM${x + 4} ${centerY}V${centerY + 4}M${x + 2} ${centerY + 2}H${x + 6}M${right - 5} ${centerY + 2}H${right - 3}`,
    network: `M${x + 5} ${centerY - 2}L${right - 4} ${y + 2}M${x + 5} ${centerY + 2}L${right - 4} ${bottom - 2}M${x + 2} ${centerY}A3 3 0 1 1 ${x + 8} ${centerY}A3 3 0 1 1 ${x + 2} ${centerY}M${right - 6} ${y + 2}A3 3 0 1 1 ${right} ${y + 2}A3 3 0 1 1 ${right - 6} ${y + 2}M${right - 6} ${bottom - 2}A3 3 0 1 1 ${right} ${bottom - 2}A3 3 0 1 1 ${right - 6} ${bottom - 2}`,
    generic: `M${x + radius} ${y}H${right - radius}C${right - 2} ${y} ${right} ${y + 2} ${right} ${y + radius}V${bottom - radius}C${right} ${bottom - 2} ${right - 2} ${bottom} ${right - radius} ${bottom}H${x + radius}C${x + 2} ${bottom} ${x} ${bottom - 2} ${x} ${bottom - radius}V${y + radius}C${x} ${y + 2} ${x + 2} ${y} ${x + radius} ${y}ZM${x + 5} ${centerY}H${right - 5}`,
  };

  return {
    d: dataByKind[glyphKind],
    stroke,
    strokeWidth,
  };
}

function isDrawableElement(element: CanvasElement) {
  return element.visible !== false && (element.type === "rect" || element.type === "path" || element.type === "line" || element.type === "ellipse");
}

function getPropertyBounds(element: CanvasElement) {
  if (element.type === "frame" || element.type === "preview") {
    return {
      x: [0, 0],
      y: [0, 0],
      width: [24, 24],
      height: [24, 24],
      strokeWidth: [0, 3],
      radius: [0, 4],
    } as const;
  }

  const sizeBounds = {
    rect: [2, 20],
    path: [6, 20],
    line: element.nativeRole === "plus-badge" || !element.nativeRole ? [3, 8] : [0, 20],
    ellipse: [2, 6],
  }[element.type];

  return {
    x: [2, Math.max(2, 22 - element.width)],
    y: [2, Math.max(2, 22 - element.height)],
    width: sizeBounds,
    height: sizeBounds,
    strokeWidth: [element.type === "ellipse" ? 0 : 1, 3],
    radius: [element.type === "path" || element.type === "rect" ? 1 : 0, 4],
  } as const;
}

function buildNativeShapeContract(element: CanvasElement, glyphKind: IconGlyphKind): NativeShapeContract | undefined {
  if (!isDrawableElement(element)) return undefined;

  if (element.type === "rect") {
    return {
      id: element.id,
      name: element.name,
      type: "rect",
      role: element.nativeRole ?? `${glyphKind}-rect`,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      radius: element.radius ?? 4,
      strokeWeight: element.strokeWidth ?? 2,
    };
  }

  if (element.type === "path" && element.nativeRole === "source-rect") {
    return {
      id: element.id,
      name: element.name,
      type: "rect",
      role: element.nativeRole,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      radius: element.radius ?? 4,
      strokeWeight: element.strokeWidth ?? 2,
    };
  }

  if (element.type === "path") {
    const pathData = element.pathData ?? buildPrimaryPath(element, glyphKind).d;

    return {
      id: element.id,
      name: element.name,
      type: "path",
      role: element.nativeRole ?? `${glyphKind}-outline`,
      data: pathData,
      strokeWeight: element.strokeWidth ?? 2,
    };
  }

  if (element.type === "line") {
    const role = element.nativeRole ?? "plus-badge";
    if (role !== "plus-badge") {
      return {
        id: element.id,
        name: element.name,
        type: "line",
        role,
        x1: element.x,
        y1: element.lineSlope === "up" ? element.y + element.height : element.y,
        x2: element.x + element.width,
        y2: element.lineSlope === "up" ? element.y : element.y + element.height,
        strokeWeight: element.strokeWidth ?? 2,
      };
    }
    const centerY = element.y + element.height / 2;

    return {
      id: element.id,
      name: element.name,
      type: "line",
      role,
      x1: element.x,
      y1: centerY,
      x2: element.x + element.width,
      y2: centerY,
      strokeWeight: element.strokeWidth ?? 2,
    };
  }

  return {
    id: element.id,
    name: element.name,
    type: "circle",
    role: element.nativeRole ?? ((element.strokeWidth ?? 0) > 0 ? `${glyphKind}-outline-circle` : "local-status-dot"),
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    strokeWeight: (element.strokeWidth ?? 0) > 0 ? element.strokeWidth : undefined,
    fill: (element.strokeWidth ?? 0) > 0 ? undefined : element.fill ?? "#0F1218",
    fillExceptionReason:
      (element.strokeWidth ?? 0) > 0
        ? undefined
        : "3px 局部填充 keeps the status dot readable at 24px; 2px outline would collapse.",
  };
}

function buildPreviewSvgFromElements(elements: CanvasElement[], glyphKind: IconGlyphKind) {
  const shapes = elements
    .map((element) => sanitizeNativeShapeForFigma(buildNativeShapeContract(element, glyphKind)))
    .filter((shape): shape is NativeShapeContract => Boolean(shape));

  return buildPreviewSvgFromShapes(shapes);
}

function sanitizeNativeShapeForFigma(shape: NativeShapeContract | undefined): NativeShapeContract | undefined {
  if (!shape || shape.type !== "path") return shape;

  const normalizedPath = normalizeSvgPathForFigma(shape.data);
  if (!normalizedPath.data || !isFigmaSafePathData(normalizedPath.data)) return undefined;

  return {
    ...shape,
    data: normalizedPath.data,
  };
}

function IconCanvasSvg({
  elements,
  glyphKind,
  previewSvg,
  previewPadding = 28,
  previewStrokeWidth = 2,
  previewColor = defaultTeamIconColor,
  selectedElementId,
  onSelect,
}: {
  elements: CanvasElement[];
  glyphKind: IconGlyphKind;
  previewSvg?: string;
  previewPadding?: number;
  previewStrokeWidth?: number;
  previewColor?: string;
  selectedElementId: CanvasElementId;
  onSelect: (id: CanvasElementId) => void;
}) {
  const drawableElements = elements.filter(isDrawableElement);
  const normalizedPreviewSvg = previewSvg ? applyPreviewSvgColor(applyPreviewSvgStrokeWidth(previewSvg, previewStrokeWidth), previewColor) : undefined;

  if (normalizedPreviewSvg) {
    return (
      <div
        className="relative h-full w-full overflow-hidden rounded-lg bg-white"
        role="img"
        aria-label="SVG preview artifact"
        onClick={() => onSelect("frame")}
      >
        <div className="absolute inset-0 rounded-lg border border-zinc-100" />
        <div className="absolute inset-[18%] rounded border border-dashed border-zinc-300" />
        <div
          className="flex h-full w-full items-center justify-center [&_svg]:h-full [&_svg]:w-full"
          style={{ padding: previewPadding }}
          dangerouslySetInnerHTML={{ __html: normalizedPreviewSvg }}
        />
      </div>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-full w-full overflow-visible text-[#0F1218]"
      role="img"
      aria-label="可编辑 24px icon preview"
      onClick={() => onSelect("frame")}
    >
      <rect x="0" y="0" width="24" height="24" rx="4" fill="white" />
      <rect x="2" y="2" width="20" height="20" rx="2" fill="none" stroke="#d4d4d8" strokeDasharray="0.8 0.8" strokeWidth="0.25" />
      {drawableElements.map((element) => {
        const isSelected = selectedElementId === element.id;
        const selectionRect = isSelected ? (
          <rect
            x={element.x - 0.75}
            y={element.y - 0.75}
            width={element.width + 1.5}
            height={element.height + 1.5}
            rx="0.75"
            fill="none"
            stroke="#3B82F6"
            strokeDasharray="0.8 0.5"
            strokeWidth="0.35"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        ) : null;

        if (element.type === "rect") {
          return (
            <g key={element.id} className="cursor-pointer" onClick={(event) => {
              event.stopPropagation();
              onSelect(element.id);
            }}>
              <rect
                x={element.x}
                y={element.y}
                width={element.width}
                height={element.height}
                rx={element.radius ?? 4}
                fill="none"
                stroke={element.stroke ?? defaultTeamIconColor}
                strokeWidth={element.strokeWidth ?? 2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {selectionRect}
            </g>
          );
        }

        if (element.type === "path") {
          const path = element.pathData
            ? {
                d: element.pathData,
                stroke: element.stroke ?? defaultTeamIconColor,
                strokeWidth: element.strokeWidth ?? 2,
              }
            : buildPrimaryPath(element, glyphKind);
          return (
            <g key={element.id} className="cursor-pointer" onClick={(event) => {
              event.stopPropagation();
              onSelect(element.id);
            }}>
              <path
                d={path.d}
                fill="none"
                stroke={path.stroke}
                strokeWidth={path.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {selectionRect}
            </g>
          );
        }

        if (element.type === "line") {
          const centerX = element.x + element.width / 2;
          const centerY = element.y + element.height / 2;
          const isPlusBadge = element.nativeRole === "plus-badge" || !element.nativeRole;
          const lineY1 = element.lineSlope === "up" ? element.y + element.height : element.y;
          const lineY2 = element.lineSlope === "up" ? element.y : element.y + element.height;
          return (
            <g key={element.id} className="cursor-pointer" onClick={(event) => {
              event.stopPropagation();
              onSelect(element.id);
            }}>
              <line
                x1={element.x}
                y1={isPlusBadge ? centerY : lineY1}
                x2={element.x + element.width}
                y2={isPlusBadge ? centerY : lineY2}
                stroke={element.stroke ?? "#0F1218"}
                strokeWidth={element.strokeWidth ?? 2}
                strokeLinecap="round"
              />
              {isPlusBadge ? (
                <line
                  x1={centerX}
                  y1={element.y}
                  x2={centerX}
                  y2={element.y + element.height}
                  stroke={element.stroke ?? "#0F1218"}
                  strokeWidth={element.strokeWidth ?? 2}
                  strokeLinecap="round"
                />
              ) : null}
              {selectionRect}
            </g>
          );
        }

        return (
          <g key={element.id} className="cursor-pointer" onClick={(event) => {
            event.stopPropagation();
            onSelect(element.id);
          }}>
            <ellipse
              cx={element.x + element.width / 2}
              cy={element.y + element.height / 2}
              rx={element.width / 2}
              ry={element.height / 2}
              fill={element.fill && (element.strokeWidth ?? 0) <= 0 ? element.fill : "none"}
              stroke={element.fill && (element.strokeWidth ?? 0) <= 0 ? "none" : element.stroke ?? defaultTeamIconColor}
              strokeWidth={element.fill && (element.strokeWidth ?? 0) <= 0 ? 0 : element.strokeWidth ?? 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {selectionRect}
          </g>
        );
      })}
    </svg>
  );
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "amber" | "red" | "blue";
}) {
  const toneClass = {
    neutral: "border-white/10 bg-white/[0.055] text-white/58",
    green: "border-emerald-400/24 bg-emerald-400/10 text-emerald-200",
    amber: "border-amber-400/24 bg-amber-400/10 text-amber-200",
    red: "border-red-400/24 bg-red-400/10 text-red-200",
    blue: "border-indigo-300/24 bg-indigo-400/10 text-indigo-100",
  }[tone];

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}>{children}</span>;
}

function phaseLabel(phase: WorkflowPhase) {
  return {
    brief: "说清需求",
    semantic: "选择画法",
    preview: "确认样子",
    draw: "准备交付",
  }[phase];
}

function inspectorLabel(tab: InspectorTab) {
  return {
    properties: "属性",
    spec: "交付",
    quality: "检查",
    layers: "列表",
  }[tab];
}

function batchInputKindLabel(kind: BatchInputKind) {
  return {
    names: "图标清单",
    figma: "Figma 链接",
    document: "需求文档",
    mixed: "混合资料",
  }[kind];
}

function taskStatusLabel(status: BatchTask["status"]) {
  return {
    parsed: "已识别",
    matched: "有参考",
    queued: "已放入",
    needs_review: "需确认",
  }[status];
}

function runStatusLabel(status: ProductionRun["status"] | "idle" | "building" | "ready" | "blocked" | "failed") {
  return {
    idle: "未开始",
    building: "准备中",
    ready: "已准备",
    blocked: "需确认",
    failed: "失败",
    ready_for_figma: "可写入",
  }[status] ?? status;
}

function gateStatusLabel(status: AgentAction["status"] | ProductionRun["gates"][number]["status"]) {
  return {
    planned: "计划中",
    waiting: "等待",
    running: "进行中",
    done: "完成",
    blocked: "阻塞",
  }[status];
}

function sourceLabel(sourceName?: string) {
  return sourceName?.replace("AI semantic", "AI 生成").replace("semantic-plan", "AI 画法") ?? "AI 生成";
}

function instanceSourceModeLabel(instance?: IconCanvasInstance) {
  if (!instance) return "未选中";
  if (instance.previewVariantId && instance.sourceName?.startsWith(aiPreviewGridSourcePrefix)) return `AI 方案 ${instance.optionId ?? ""}-${instance.previewVariantId}`;
  if (instance.sourceConversionStatus === "team_normalized") return "来源形态 → 团队规范";
  if (instance.sourceConversionStatus === "needs_review") return "来源形态 → 待确认";
  if (instance.sourceConversionStatus === "reference_only") return "仅来源参考";
  if (instance.previewSvg && !instance.sourcePreviewSvg) return "AI SVG 预览";
  if (instance.sourcePreviewSvg) return "来源参考 → 团队草稿";
  return "AI native 草稿";
}

function instanceSourceModeTone(instance?: IconCanvasInstance): "neutral" | "green" | "amber" | "red" | "blue" {
  if (instance?.previewVariantId && instance.sourceName?.startsWith(aiPreviewGridSourcePrefix)) return "blue";
  if (instance?.sourceConversionStatus === "team_normalized") return "green";
  if (instance?.sourceConversionStatus === "needs_review") return "amber";
  if (instance?.sourceConversionStatus === "reference_only") return "red";
  return "amber";
}

function toIconComponentName(name: string, fallback = "Icon", prefix = "AijBasic") {
  const words = name
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const pascal = words
    .map((word) => {
      if (/^[a-zA-Z0-9]+$/.test(word)) return word.charAt(0).toUpperCase() + word.slice(1);
      return word;
    })
    .join("");

  return `${prefix}${pascal || fallback}`;
}

function manualReviewLabel(status: ManualReviewStatus = "pending") {
  return {
    pending: "待人工审核",
    approved: "人工已通过",
    rejected: "已打回",
    library: "已入资产库",
  }[status];
}

function manualReviewTone(status: ManualReviewStatus = "pending"): "neutral" | "green" | "amber" | "red" | "blue" {
  return {
    pending: "amber",
    approved: "green",
    rejected: "red",
    library: "blue",
  }[status] as "neutral" | "green" | "amber" | "red" | "blue";
}

function qualityStageLabel(stage: IconQualityIssue["stage"]) {
  return {
    source: "来源转换",
    geometry: "图层结构",
    "team-spec": "团队规范",
    "figma-native": "Figma 写入",
  }[stage];
}

function canvasInstanceQualityState(instance: IconCanvasInstance, profile: TeamSpecOutputProfile) {
  const issues = getCanvasInstanceQualityIssues(instance, profile);
  const approvedIssueIds = new Set(instance.qualityApprovedIssueIds ?? []);
  if (issues.some((issue) => issue.severity === "blocker")) return { label: "需修复", tone: "red" as const };
  if (issues.some((issue) => !approvedIssueIds.has(issue.id))) return { label: "待处理", tone: "amber" as const };
  if (issues.length) return { label: "人工已批", tone: "green" as const };
  return { label: "可写入", tone: "green" as const };
}

function buildVisualReviewItems(params: {
  hasPreview: boolean;
  approvedPreview: boolean;
  canGenerateFigmaPayload: boolean;
  productionRun?: ProductionRun;
  specWarnings: string[];
  previewReview: ReturnType<typeof reviewGeneratedPreview>;
  drawableCount: number;
  selectedInstance?: IconCanvasInstance;
}) {
  const screenshotWaiting = params.productionRun?.screenshotGate.status === "waiting_for_figma_node";
  const isLibrary = params.selectedInstance?.reviewStatus === "library";
  const isApproved = params.selectedInstance?.reviewStatus === "approved" || isLibrary;

  return [
    {
      label: "团队硬规范",
      status: params.specWarnings.length || params.previewReview.blockers.length ? "warning" : "pass",
      detail: params.specWarnings.length || params.previewReview.blockers.length
        ? `${params.specWarnings.length + params.previewReview.blockers.length} 条偏差需要处理`
        : "24×24、2px 安全区、#0F1218、2px 圆角描边已通过。",
    },
    {
      label: "SVG 预览质量",
      status: params.previewReview.blockers.length ? "blocked" : params.previewReview.warnings.length ? "warning" : "pass",
      detail: params.previewReview.summary,
    },
    {
      label: "结构可交付",
      status: params.drawableCount <= 5 ? "pass" : "warning",
      detail: params.drawableCount <= 5 ? `${params.drawableCount} 个可编辑图层，复杂度可控。` : `${params.drawableCount} 个可编辑图层，建议减少细节密度。`,
    },
    {
      label: "预览确认",
      status: params.hasPreview ? (params.approvedPreview ? "pass" : "warning") : "blocked",
      detail: params.hasPreview ? (params.approvedPreview ? "SVG 预览已被人工确认。" : "已有预览，但还没人工确认。") : "还没有生成 SVG 预览。",
    },
    {
      label: "Figma 截图核对",
      status: params.productionRun?.status === "ready_for_figma" ? (screenshotWaiting ? "warning" : "pass") : params.canGenerateFigmaPayload ? "warning" : "blocked",
      detail: params.productionRun?.status === "ready_for_figma"
        ? "写入任务已准备，下一步需要截图比对预览和语义。"
        : params.canGenerateFigmaPayload
          ? "交付条件已满足，准备写入 Figma 后进入截图核对门禁。"
          : "准备写入 Figma 后，系统会进入截图核对门禁。",
    },
    {
      label: "人工入库决策",
      status: isLibrary ? "pass" : isApproved ? "warning" : "blocked",
      detail: isLibrary ? "已加入团队资产库，可被后续检索复用。" : isApproved ? "已人工通过，尚未加入资产库。" : "需要设计师确认语义、业务语境和是否可入库。",
    },
  ];
}

function inferPhase(intent: AgentDecision["intent"]): WorkflowPhase {
  if (intent === "generate_svg_preview" || intent === "revise_preview") return "preview";
  if (intent === "draw_figma_native" || intent === "approve_preview") return "draw";
  if (intent === "plan_semantics") return "semantic";
  return "brief";
}

function normalizeSuggestionText(suggestion: string) {
  return suggestion
    .replace(/^可直接发(?:图标清单)?[：:]\s*/u, "")
    .replace(/^建议(?:回复|发送)?[：:]\s*/u, "")
    .trim();
}

function extractClickableSuggestions(content: string, suggestions: string[] = []) {
  const extracted = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^(可直接发|可直接发图标清单|建议回复|建议发送)[：:]/u.test(line))
    .map(normalizeSuggestionText)
    .filter(Boolean);

  return Array.from(new Set([...suggestions.map(normalizeSuggestionText), ...extracted])).filter(Boolean);
}

function semanticOptionStrategyLabel(option: SemanticOption) {
  const title = splitSemanticTitle(option.title);
  if (title.strategy && title.strategy !== option.title) return title.strategy;

  return {
    A: "对象识别",
    B: "动作表达",
    C: "状态/结果",
    D: "容器隐喻",
    E: "极简线稿",
    F: "来源参考",
  }[option.id];
}

function optionActionValue(optionId: SemanticOption["id"]) {
  return `option-${optionId.toLowerCase()}`;
}

function splitSemanticTitle(title: string) {
  const [strategy, visual] = title.split("·").map((item) => item.trim());
  return {
    strategy: strategy || title,
    visual: visual || title,
  };
}

function inferGlyphKindFromOption(option: SemanticOption): IconGlyphKind {
  return inferGlyphKind(`${option.title} ${option.elements} ${option.meaning}`);
}

const sourceQueryTermsByGlyphKind: Record<IconGlyphKind, string[]> = {
  bookmark: ["bookmark", "save", "favorite"],
  share: ["share", "send", "forward", "external-link"],
  search: ["search", "magnifier", "scan"],
  filter: ["filter", "sliders", "funnel"],
  download: ["download", "arrow-down", "inbox", "save"],
  upload: ["upload", "arrow-up", "cloud", "submit"],
  play: ["play", "start", "media"],
  comment: ["comment", "message", "reply"],
  like: ["heart", "like", "thumbs-up"],
  read: ["book", "read", "reader"],
  settings: ["settings", "sliders", "gear"],
  arrowsUpDown: ["sort", "arrow-up-down", "reorder"],
  arrowsIn: ["collapse", "minimize", "arrows-in"],
    arrowsOut: ["expand", "fullscreen", "arrows-out"],
  contentExpand: ["text-expand", "file-plus", "text-plus", "writing", "pen-line"],
  user: ["user", "person", "profile"],
  game: ["gamepad", "game", "controller"],
  network: ["network", "nodes", "signal", "route"],
  generic: ["icon", "shape", "interface"],
};

function buildSemanticSourceQuery(brief: IconBrief, option?: SemanticOption, fallbackText = "") {
  const optionGlyphKind = option?.previewGlyphKind ?? (option ? inferGlyphKindFromOption(option) : brief.glyphKind);
  const glyphKind = normalizeGlyphKind(optionGlyphKind, brief.glyphKind);
  const optionTitle = option ? splitSemanticTitle(option.title) : undefined;
  const optionText = option ? `${optionTitle?.strategy ?? ""} ${optionTitle?.visual ?? ""} ${option.elements} ${option.meaning}` : "";

  const focusedQuery = Array.from(
    new Set(
      [
        brief.concept,
        brief.emphasis,
        optionTitle?.strategy,
        optionTitle?.visual,
        ...sourceQueryTermsByGlyphKind[glyphKind],
        ...optionText.split(/[\s，。；;、+·/]+/).filter((term) => /扩|补|写|文本|内容|文档|笔|text|content|document|file|writing|pen/i.test(term)),
      ]
        .map((term) => String(term || "").trim())
        .filter((term) => term.length >= 2 && term.length <= 32),
    ),
  ).join(" ");

  return focusedQuery || fallbackText || brief.concept;
}

function buildSemanticOptionThumbnailShapes(brief: IconBrief, option: SemanticOption) {
  const thumbnailBrief: IconBrief = {
    ...brief,
    glyphKind: option.previewGlyphKind ?? brief.glyphKind ?? inferGlyphKindFromOption(option),
  };
  const shapeOptionId = resolveShapeOptionId(thumbnailBrief, option);
  const shapes = buildSemanticPreviewShapes(thumbnailBrief, shapeOptionId);
  const review = reviewGeneratedPreview(thumbnailBrief, shapeOptionId, shapes);

  if (!review.blockers.length) return { shapes, review };

  const fallbackShapes = buildSemanticPreviewShapes(thumbnailBrief, shapeOptionId);
  return {
    shapes: fallbackShapes,
    review: reviewGeneratedPreview(thumbnailBrief, shapeOptionId, fallbackShapes),
  };
}

function SemanticOptionThumbnail({ brief, option }: { brief: IconBrief; option: SemanticOption }) {
  const { shapes, review } = buildSemanticOptionThumbnailShapes(brief, option);
  const svg = buildPreviewSvgFromShapes(shapes);
  const blocked = review.blockers.length > 0;

  return (
    <div
      className={`semantic-option-thumb relative flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-2xl border ${
        blocked ? "border-amber-300/60" : "border-white/10"
      }`}
      title={blocked ? review.blockers[0] : review.summary}
    >
      <div className="absolute inset-2.5 rounded-xl border border-dashed border-white/22" />
      <div className="relative z-10 h-10 w-10 text-[#10131a] [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      {blocked ? (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-slate-950">
          !
        </span>
      ) : null}
    </div>
  );
}

function SemanticOptionCards({
  brief,
  options,
  onQuickAction,
}: {
  brief: IconBrief;
  options: SemanticOption[];
  onQuickAction: (value: string) => void;
}) {
  return (
    <div className="semantic-option-panel mt-3 rounded-[24px] border border-white/10 bg-white/[0.025] p-3">
      <div className="mb-3 flex items-center justify-between px-0.5">
        <span className="text-xs font-semibold text-white/78">选一个视觉方向</span>
        <span className="text-xs text-white/30">低保真草图 · 点击后检索来源</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {options.slice(0, 3).map((option) => {
          const title = splitSemanticTitle(option.title);

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onQuickAction(optionActionValue(option.id))}
              className="semantic-option-card group min-w-0 rounded-[18px] border border-white/8 bg-white/[0.035] p-2.5 text-left transition hover:border-indigo-300/40 hover:bg-white/[0.06]"
            >
              <SemanticOptionThumbnail brief={brief} option={option} />
              <div className="mt-3 flex items-center gap-1.5">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white shadow-sm shadow-indigo-500/30">
                  {option.id}
                </span>
                <span className="truncate text-xs font-semibold text-white/86">{title.visual}</span>
              </div>
              <p className="mt-1 truncate text-xs text-white/36">{semanticOptionStrategyLabel(option)}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SourceRecommendationCards({ candidates, onQuickAction }: { candidates: SourceCandidate[]; onQuickAction: (value: string) => void }) {
  if (!candidates.length) return null;

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-semibold text-white/72">来源检索推荐</span>
        <span className="text-white/30">只展示通过门槛的 {candidates.length} 个</span>
      </div>
      <div className={`grid gap-2 ${candidates.length === 1 ? "grid-cols-1" : candidates.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
        {candidates.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            onClick={() => onQuickAction(`choose-source:${encodeURIComponent(candidate.id)}`)}
            className="min-w-0 rounded-2xl border border-white/9 bg-white/[0.035] p-2.5 text-left transition hover:border-indigo-300/35 hover:bg-white/[0.065]"
          >
            <div className="flex h-16 items-center justify-center rounded-xl bg-[#eef0f4] p-3 text-[#0f1218] [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: candidate.normalizedSvg }} />
            <div className="mt-2 truncate text-xs font-semibold text-white/80">{candidate.name}</div>
            <div className="mt-0.5 truncate text-[11px] text-white/34">{candidate.source} · {candidate.review.score}</div>
            <div className="mt-2 text-[11px] font-semibold text-indigo-200/72">点击放入画布</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatBubble({
  message,
  onQuickAction,
}: {
  message: ChatMessage;
  onQuickAction: (value: string) => void;
}) {
  const isUser = message.role === "user";
  const clickableSuggestions = !isUser ? extractClickableSuggestions(message.content, message.suggestions) : [];
  const semanticBrief = message.semanticBrief ?? defaultBrief;

  return (
    <div
      className={`rounded-[20px] border px-4 py-3 text-sm leading-6 shadow-sm shadow-black/20 ${
        isUser
          ? "ml-8 border-indigo-300/18 bg-indigo-400/10 text-white/86"
          : "mr-8 border-white/10 bg-white/[0.045] text-white/72"
      }`}
    >
      <div className="whitespace-pre-line">
        {message.content}
        {message.isStreaming ? <span className="ml-0.5 inline-block h-4 w-1 translate-y-0.5 animate-pulse rounded bg-blue-300" /> : null}
      </div>
      {!isUser && clickableSuggestions.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {clickableSuggestions.slice(0, 4).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onQuickAction(`send:${suggestion}`)}
              className="rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2 text-left text-xs leading-5 text-white/58 transition hover:bg-white/[0.08] hover:text-white"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
      {!isUser && message.semanticOptions?.length ? (
        <SemanticOptionCards brief={semanticBrief} options={message.semanticOptions} onQuickAction={onQuickAction} />
      ) : null}
      {!isUser && message.sourceCandidates?.length ? (
        <SourceRecommendationCards candidates={message.sourceCandidates} onQuickAction={onQuickAction} />
      ) : null}
      {!isUser && message.quickActions?.length ? (
        <div className="mt-3 grid gap-2">
          {message.quickActions.map((action) => (
            <button
              key={action.value}
              onClick={() => onQuickAction(action.value)}
              className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-left text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EmptyChatState({
  mode,
  onUsePrompt,
}: {
  mode: WorkbenchMode;
  onUsePrompt: (prompt: string) => void;
}) {
  const prompts =
    mode === "chat"
      ? [
          "做一个分享章节图标，用在章节卡片操作区，强调转发动作",
          "从 Figma 团队库里找已有分享图标，套成我们的规范",
          "从 IconPark 找一个筛选图标参考，用在分类抽屉入口",
          "做一个下载图标，用在章节更多操作里",
        ]
      : [
          "搜索、筛选、分享、收藏、下载",
          "从 Figma 画布链接里收录已有 icon，再批量套规范",
          "章节卡片需要支持分享、收藏、下载和评论入口",
          "从 Figma 链接或 PRD 里识别需要补齐的图标",
        ];

  return (
    <div className="flex min-h-full items-end px-1 pb-3">
      <div className="w-full rounded-[24px] border border-white/10 bg-white/[0.035] p-4 shadow-none backdrop-blur">
        <div className="mb-4 rounded-[20px] border border-white/8 bg-white/[0.045] p-4">
          <p className="text-sm font-semibold text-white/82">{mode === "chat" ? "说一句需求，我来变成团队图标" : "粘贴一批资料，我来批量整理"}</p>
          <p className="mt-2 text-xs leading-5 text-white/42">
            {mode === "chat" ? "理解语义 → 找参考 / AI 生成 → 套团队规范。" : "识别图标名、文档或 Figma 链接，批量放到画布。"}
          </p>
        </div>
        <p className="text-xs font-semibold tracking-[0.14em] text-white/32">可以这样开始</p>
        <div className="mt-3 space-y-2">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onUsePrompt(prompt)}
              className="w-full rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3 text-left text-sm leading-5 text-white/58 transition hover:border-indigo-300/22 hover:bg-white/[0.07] hover:text-white"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FigmaNativeSetupBar({
  targetUrl,
  token,
  tokenPlaceholder,
  status,
  message,
  itemCount,
  hasJsonSpec,
  hasScript,
  writeJob,
  bridgeStatus,
  jsonCopyStatus,
  scriptCopyStatus,
  onTargetUrlChange,
  onTokenChange,
  onTokenBlur,
  onPrepare,
  onCopyJson,
  onCopyScript,
}: {
  targetUrl: string;
  token: string;
  tokenPlaceholder: string;
  status: "idle" | "building" | "ready" | "blocked" | "failed";
  message: string;
  itemCount: number;
  hasJsonSpec: boolean;
  hasScript: boolean;
  writeJob?: FigmaWriteJob;
  bridgeStatus?: FigmaBridgeStatus;
  jsonCopyStatus: "idle" | "copied" | "failed";
  scriptCopyStatus: "idle" | "copied" | "failed";
  onTargetUrlChange: (value: string) => void;
  onTokenChange: (value: string) => void;
  onTokenBlur: () => void;
  onPrepare: () => void;
  onCopyJson: () => void;
  onCopyScript: () => void;
}) {
  const hasTarget = Boolean(targetUrl.trim());
  const jobStatus = writeJob?.status;
  const isBridgeOnline = Boolean(bridgeStatus?.online);
  const isBridgeCurrent = isBridgeOnline && bridgeStatus?.bridgeVersion === "2.0";
  const bridgeNeedsReload = isBridgeOnline && !isBridgeCurrent;
  const statusTone =
    jobStatus === "completed"
      ? "green"
      : jobStatus === "failed" || status === "failed"
        ? "red"
        : status === "blocked"
          ? "amber"
          : status === "building" || jobStatus === "queued" || jobStatus === "drawing" || jobStatus === "claimed"
            ? "blue"
            : status === "ready"
              ? "green"
              : hasTarget
                ? "blue"
                : "neutral";
  const statusLabel = jobStatus
    ? {
        queued: "已投递",
        claimed: "插件已拉取",
        drawing: "写入中",
        completed: "已写入",
        failed: "写入失败",
      }[jobStatus]
    : status === "idle"
      ? hasTarget
        ? "目标已填"
        : "先连接"
      : runStatusLabel(status);

  return (
    <section className="shrink-0 border-b border-slate-200/80 bg-white/88 px-5 py-3 shadow-sm shadow-slate-200/60 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="w-64 shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-sm text-emerald-600 ring-1 ring-emerald-100">↗</span>
            <div>
              <h2 className="text-sm font-semibold text-white/86">Figma 交付连接</h2>
              <p className="mt-0.5 text-xs text-white/42">
                {isBridgeOnline && bridgeStatus?.fileName ? `${bridgeStatus.fileName} · ${bridgeStatus.pageName ?? "当前页"}` : "可先生成，最后统一写入。"}
              </p>
            </div>
          </div>
        </div>
        <label className="min-w-[280px] flex-1">
          <span className="sr-only">目标 Figma 链接</span>
          <input
            value={targetUrl}
            onChange={(event) => onTargetUrlChange(event.target.value)}
            placeholder="目标 Figma 文件或画布链接（可稍后填写）"
            className="h-10 w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 text-sm text-white/86 outline-none placeholder:text-white/32 focus:border-indigo-300/45 focus:bg-white/[0.075]"
          />
        </label>
        <label className="w-56 shrink-0">
          <span className="sr-only">Figma Token</span>
          <input
            value={token}
            onChange={(event) => onTokenChange(event.target.value)}
            onBlur={onTokenBlur}
            type="password"
            placeholder={tokenPlaceholder}
            className="h-10 w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 text-sm text-white/86 outline-none placeholder:text-white/32 focus:border-indigo-300/45 focus:bg-white/[0.075]"
          />
        </label>
        <button
          type="button"
          onClick={onPrepare}
          disabled={!itemCount || status === "building" || bridgeNeedsReload}
          className="h-10 shrink-0 rounded-2xl bg-emerald-500 px-4 text-sm font-semibold text-white shadow-lg shadow-emerald-100/70 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/28"
        >
          {bridgeNeedsReload ? "先重载插件" : status === "building" ? "写入中" : itemCount ? `写入 Figma · ${itemCount}` : "先生成图标"}
        </button>
        <div className="flex shrink-0 items-center gap-2 text-xs">
          <Badge tone={isBridgeCurrent ? "green" : "amber"}>{isBridgeCurrent ? "插件在线" : bridgeNeedsReload ? "插件需重载" : "插件未连接"}</Badge>
          <Badge tone={statusTone}>{statusLabel}</Badge>
          <button
            type="button"
            onClick={onCopyJson}
            disabled={!hasJsonSpec}
            className="h-10 rounded-2xl border border-white/10 bg-white/[0.055] px-3 font-semibold text-white/58 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:hidden"
          >
            {jsonCopyStatus === "copied" ? "已复制" : "JSON"}
          </button>
          <button
            type="button"
            onClick={onCopyScript}
            disabled={!hasScript}
            className="h-10 rounded-2xl border border-white/10 bg-white/[0.055] px-3 font-semibold text-white/58 transition hover:border-slate-300 hover:bg-slate-100 hover:text-white/86 disabled:hidden"
          >
            {scriptCopyStatus === "copied" ? "已复制" : "执行器"}
          </button>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs leading-5">
        <p className="truncate text-white/42">
          {message || "交付方式：画布图标 → Icon Spec JSON → Figma 插件创建可编辑 native nodes。"}
        </p>
        <p className="shrink-0 text-white/32">
          {writeJob
            ? `任务 ${writeJob.id}`
            : bridgeNeedsReload
              ? "检测到旧版插件；请关闭后重新运行开发插件，再创建写入任务。"
              : isBridgeCurrent
              ? "插件桥已连接；网页投递后会自动写入当前 Figma 文件。"
              : "没连接插件也能先预览和整理图标。"}
        </p>
      </div>
    </section>
  );
}

function AccountTrigger({ user, hasSavedToken, onClick }: { user?: AuthUser | null; hasSavedToken: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 text-xs text-white/68 transition hover:border-indigo-300/35 hover:bg-white/[0.09] hover:text-white"
      title={user ? "账户与 Figma 凭据" : "登录账户"}
    >
      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${user ? "bg-indigo-400/80 text-white" : "bg-white/10 text-white/60"}`}>
        {user ? user.email.slice(0, 1).toUpperCase() : "·"}
      </span>
      <span className="max-w-[150px] truncate">{user ? user.email : "登录"}</span>
      {user && hasSavedToken ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="Figma Token 已加密保存" /> : null}
    </button>
  );
}

function AccountDialog({
  open,
  user,
  figma,
  onClose,
  onAuthenticated,
  onLogout,
  onDeleteToken,
}: {
  open: boolean;
  user?: AuthUser | null;
  figma: FigmaCredentialStatus;
  onClose: () => void;
  onAuthenticated: (user: AuthUser, figma: FigmaCredentialStatus) => Promise<void>;
  onLogout: () => Promise<void>;
  onDeleteToken: () => Promise<void>;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, mode }),
      });
      const payload = (await response.json().catch(() => ({}))) as { user?: AuthUser; message?: string };
      if (!response.ok || !payload.user) throw new Error(payload.message || "登录失败。");
      const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
      const session = (await sessionResponse.json().catch(() => ({}))) as { figma?: FigmaCredentialStatus };
      await onAuthenticated(payload.user, session.figma ?? { hasToken: false });
      setPassword("");
      setMessage(payload.message || "已登录。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "登录失败。");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteToken() {
    setIsSubmitting(true);
    try {
      await onDeleteToken();
      setMessage("已删除后端保存的 Figma Token。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-5 backdrop-blur-md" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="w-full max-w-md rounded-[28px] border border-white/12 bg-[#202124] p-6 text-white shadow-2xl shadow-black/50">
        {user ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200/60">Account</p>
                <h2 className="mt-2 text-xl font-semibold">{user.email}</h2>
              </div>
              <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/7 text-white/55 hover:bg-white/12 hover:text-white" aria-label="关闭">×</button>
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-white/76">Figma 访问令牌</span>
                <span className={`rounded-full px-2 py-1 text-[11px] ${figma.hasToken ? "bg-emerald-400/12 text-emerald-200" : "bg-white/8 text-white/45"}`}>
                  {figma.hasToken ? "已加密保存" : "未保存"}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-white/42">
                {figma.hasToken ? `${figma.maskedToken} · 仅后端可解密使用` : "填写 Figma Token 后，系统会在登录账户下自动加密保存。"}
              </p>
              {figma.hasToken ? (
                <button type="button" onClick={() => void deleteToken()} disabled={isSubmitting} className="mt-4 text-xs font-semibold text-red-200/75 hover:text-red-100 disabled:opacity-40">
                  删除已保存 Token
                </button>
              ) : null}
            </div>
            {message ? <p className="mt-4 text-xs leading-5 text-emerald-200/80">{message}</p> : null}
            <button type="button" onClick={() => void onLogout()} className="mt-6 h-10 w-full rounded-2xl border border-white/10 bg-white/[0.055] text-sm font-semibold text-white/68 transition hover:bg-white/10 hover:text-white">退出登录</button>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200/60">IconOps account</p>
                <h2 className="mt-2 text-xl font-semibold">登录后保存 Figma 连接</h2>
                <p className="mt-2 text-sm leading-6 text-white/45">Token 会加密保存在服务端，刷新和重新打开网站后可继续使用。</p>
              </div>
              <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/7 text-white/55 hover:bg-white/12 hover:text-white" aria-label="关闭">×</button>
            </div>
            <div className="mt-6 flex rounded-xl border border-white/8 bg-white/[0.035] p-1 text-xs">
              <button type="button" onClick={() => setMode("login")} className={`flex-1 rounded-lg py-2 transition ${mode === "login" ? "bg-white/10 text-white" : "text-white/45 hover:text-white/70"}`}>登录</button>
              <button type="button" onClick={() => setMode("register")} className={`flex-1 rounded-lg py-2 transition ${mode === "register" ? "bg-white/10 text-white" : "text-white/45 hover:text-white/70"}`}>创建账户</button>
            </div>
            <form className="mt-5 space-y-3" onSubmit={(event) => void submitAuth(event)}>
              <label className="block">
                <span className="mb-1.5 block text-xs text-white/48">邮箱</span>
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required placeholder="you@company.com" className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-indigo-300/45" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-white/48">密码</span>
                <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} placeholder="至少 8 位" className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-indigo-300/45" />
              </label>
              {message ? <p className="text-xs leading-5 text-red-200/80">{message}</p> : null}
              <button type="submit" disabled={isSubmitting} className="h-11 w-full rounded-2xl bg-indigo-500 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:opacity-45">
                {isSubmitting ? "处理中…" : mode === "login" ? "登录并继续" : "创建并登录"}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

function NumberSlider({
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const safeValue = clampNumber(Number.isFinite(value) ? value : min, min, max);

  return (
    <label className="rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-sm shadow-slate-200/50">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs text-white/42">{label}</span>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          value={safeValue}
          onChange={(event) => onChange(clampNumber(Number(event.target.value), min, max))}
          className="w-16 rounded-lg border border-white/10 bg-white/[0.055] px-2 py-1 text-right font-mono text-xs text-white/70 outline-none disabled:cursor-not-allowed disabled:text-white/32"
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={safeValue}
        onChange={(event) => onChange(clampNumber(Number(event.target.value), min, max))}
        className="h-1.5 w-full cursor-pointer accent-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
      />
      <div className="mt-1 flex justify-between font-mono text-xs text-white/32">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </label>
  );
}

function ColorPickerField({
  label,
  value,
  disabled,
  helperText,
  onChange,
}: {
  label: string;
  value?: string;
  disabled?: boolean;
  helperText?: string;
  onChange: (value: string) => void;
}) {
  const safeValue = normalizeHexColor(value);
  const [draftState, setDraftState] = useState({ sourceValue: safeValue, value: safeValue });
  const draftValue = draftState.sourceValue === safeValue ? draftState.value : safeValue;

  function commitColor(nextValue: string) {
    const normalizedValue = normalizeHexColor(nextValue);
    setDraftState({ sourceValue: normalizedValue, value: normalizedValue });
    onChange(normalizedValue);
  }

  return (
    <label className="block rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-sm shadow-slate-200/50">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs text-white/42">{label}</span>
        <span className="font-mono text-xs text-white/42">{safeValue === defaultTeamIconColor ? "团队默认" : "自定义"}</span>
      </div>
      <div className="grid grid-cols-[36px_1fr] gap-2">
        <input
          type="color"
          disabled={disabled}
          value={safeValue}
          onChange={(event) => commitColor(event.target.value)}
          className="h-9 w-9 cursor-pointer rounded-xl border border-slate-200 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`${label}取色器`}
        />
        <input
          disabled={disabled}
          value={draftValue}
          onBlur={() => commitColor(draftValue)}
          onChange={(event) => {
            const nextValue = event.target.value.trim();
            setDraftState({ sourceValue: safeValue, value: nextValue });
            if (/^#[0-9a-fA-F]{3}$/.test(nextValue) || /^#[0-9a-fA-F]{6}$/.test(nextValue)) {
              onChange(normalizeHexColor(nextValue));
            }
          }}
          className="h-9 w-full rounded-xl border border-white/10 bg-white/[0.055] px-2 font-mono text-xs text-white/70 outline-none disabled:cursor-not-allowed disabled:text-white/32"
          aria-label={`${label}色值`}
        />
      </div>
      <div className="mt-3 grid grid-cols-8 gap-1.5">
        {colorSwatches.map((color) => {
          const isSelected = safeValue === color;

          return (
            <button
              key={color}
              type="button"
              disabled={disabled}
              onClick={() => commitColor(color)}
              className={`h-6 rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-40 ${
                isSelected ? "border-blue-300 ring-2 ring-blue-500/20" : "border-slate-200 hover:border-slate-400"
              }`}
              style={{ backgroundColor: color }}
              title={color === defaultTeamIconColor ? `${color} · 团队规范色` : color}
              aria-label={`选择颜色 ${color}`}
            />
          );
        })}
      </div>
      {helperText ? <p className="mt-2 text-xs leading-5 text-white/42">{helperText}</p> : null}
    </label>
  );
}

function SourceLibraryPanel({
  candidates,
  activeTab,
  collapsed,
  loading,
  message,
  teamLibrarySummary,
  teamLibraryStatus,
  teamLibraryMessage,
  selectedSource,
  selectedCandidateIds,
  query,
  importedState,
  onToggleCollapsed,
  onTabChange,
  onQueryChange,
  onChooseSource,
  onCandidateDragStart,
  onToggleCandidate,
  onSelectVisibleCandidates,
  onAddSelectedCandidates,
  onClearSelectedCandidates,
  onSearchCurrentQuery,
  onLoadTeamLibrary,
}: {
  candidates: SourceCandidate[];
  activeTab: SourceLibraryTab;
  collapsed: boolean;
  loading: boolean;
  message: string;
  teamLibrarySummary: TeamLibrarySummary;
  teamLibraryStatus: "idle" | "loading" | "training" | "ready" | "failed";
  teamLibraryMessage: string;
  selectedSource?: SourceCandidate;
  selectedCandidateIds: string[];
  query: string;
  importedState: {
    figma: boolean;
    iconfont: boolean;
    any: boolean;
  };
  onToggleCollapsed: () => void;
  onTabChange: (tab: SourceLibraryTab) => void;
  onQueryChange: (value: string) => void;
  onChooseSource: (candidate: SourceCandidate) => void;
  onCandidateDragStart: (event: React.DragEvent<HTMLButtonElement>, candidate: SourceCandidate) => void;
  onToggleCandidate: (candidateId: string) => void;
  onSelectVisibleCandidates: () => void;
  onAddSelectedCandidates: () => void;
  onClearSelectedCandidates: () => void;
  onSearchCurrentQuery: (query?: string) => void;
  onLoadTeamLibrary: () => void;
}) {
  const visibleCandidates = candidates.slice(0, 12);

  if (!candidates.length && !loading && !message) {
    return (
      <div className="iconops-source-drawer iconops-source-drawer-empty mx-4 mt-3 flex min-h-[60px] items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#252525]/92 px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white/86">来源图标库</span>
            <Badge tone="neutral">按需求出现</Badge>
          </div>
          <p className="mt-0.5 truncate text-xs text-white/42">
            说出图标需求后，我会自动按当前语义检索；也可以手动找参考。
          </p>
        </div>
        <div className="flex min-w-[360px] shrink-0 items-center gap-2">
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                onSearchCurrentQuery(event.currentTarget.value);
              }
            }}
            placeholder="直接搜索图标，如：筛选 / download / share"
            className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.055] px-3 text-sm text-white/86 outline-none transition placeholder:text-white/32 focus:border-indigo-300/45 focus:bg-white/[0.075]"
          />
          <button
            type="button"
            onClick={() => onSearchCurrentQuery(query)}
            className="rounded-xl bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
          >
            按当前需求找
          </button>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2 text-sm text-white/58 transition hover:bg-white/[0.08] hover:text-white"
          >
            展开面板
          </button>
        </div>
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="iconops-source-drawer iconops-source-drawer-collapsed mx-4 mt-3 flex min-h-[52px] items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#252525]/92 px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white/86">来源图标库</span>
            <Badge tone="blue">{sourceLibraryLabel(activeTab)} · {loading ? "检索中" : `${candidates.length} 个`}</Badge>
            <Badge tone="green">训练库 {teamLibrarySummary.count}</Badge>
            {selectedCandidateIds.length ? (
              <Badge tone="green">已选 {selectedCandidateIds.length}</Badge>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-white/42">{message || `已按“${query || "当前需求"}”同步参考；AI 预览仍在画布中。`}</p>
        </div>
        <div className="flex min-w-[520px] shrink-0 items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  onSearchCurrentQuery(event.currentTarget.value);
                }
              }}
              placeholder={`搜索${sourceLibraryLabel(activeTab)}，如：分享 / filter / download`}
              className="h-9 w-full rounded-xl border border-white/10 bg-white/[0.055] px-3 pr-16 text-sm text-white/86 outline-none transition placeholder:text-white/32 focus:border-indigo-300/45 focus:bg-white/[0.075]"
            />
            <button
              type="button"
              onClick={() => onSearchCurrentQuery(query)}
              disabled={loading}
              className="absolute right-1 top-1 h-7 rounded-lg bg-indigo-500 px-2.5 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/28"
            >
              搜索
            </button>
          </div>
          <button
            type="button"
            onClick={onAddSelectedCandidates}
            disabled={!selectedCandidateIds.length || loading}
            className="rounded-xl bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/28"
          >
            批量放入 {selectedCandidateIds.length || ""}
          </button>
          {selectedCandidateIds.length ? (
            <button
              type="button"
              onClick={onClearSelectedCandidates}
              className="rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2 text-sm text-white/58 transition hover:bg-red-500/12 hover:text-red-200"
            >
              清空选择
            </button>
          ) : null}
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2 text-sm text-white/58 transition hover:bg-white/[0.08] hover:text-white"
          >
            展开选择
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="iconops-source-drawer border border-white/10 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white/86">参考图标</h3>
            <Badge tone="blue">{visibleCandidates.length} results</Badge>
          </div>
          <p className="mt-1 text-xs text-white/38">
            {message || `按“${query || "当前需求"}”检索，拖入画布后自动套团队规范。`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onLoadTeamLibrary}
            disabled={teamLibraryStatus === "loading" || teamLibraryStatus === "training"}
            className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-white/50 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:text-white/24"
          >
            {teamLibraryStatus === "loading" ? "加载中" : teamLibraryStatus === "training" ? "训练中" : "查团队库"}
          </button>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-white/50 transition hover:bg-white/[0.07] hover:text-white"
          >
            收起面板
          </button>
          <button
            type="button"
            onClick={onSelectVisibleCandidates}
            className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-white/50 transition hover:bg-white/[0.07] hover:text-white"
          >
            全选当前结果
          </button>
          {selectedCandidateIds.length ? (
            <button
              type="button"
              onClick={onClearSelectedCandidates}
              className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-white/50 transition hover:bg-red-500/12 hover:text-red-200"
            >
              清空选择
            </button>
          ) : null}
          <button
            type="button"
            onClick={onAddSelectedCandidates}
            disabled={!selectedCandidateIds.length || loading}
            className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-white/85 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/28"
          >
            批量放到画布 {selectedCandidateIds.length ? `(${selectedCandidateIds.length})` : ""}
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[280px] flex-1">
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                onSearchCurrentQuery(event.currentTarget.value);
              }
            }}
            placeholder={`在${sourceLibraryLabel(activeTab)}中搜索，例如：筛选、下载、share`}
            className="h-10 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-3 pr-20 text-sm text-white outline-none transition placeholder:text-white/26 focus:border-white/24 focus:bg-white/[0.055]"
          />
          <button
            type="button"
            onClick={() => onSearchCurrentQuery(query)}
            disabled={loading}
            className="absolute right-1 top-1 h-8 rounded-xl bg-white px-3 text-xs font-semibold text-black transition hover:bg-white/85 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/28"
          >
            搜索
          </button>
        </div>
        <span className="text-xs text-white/30">全部会跨外部库与团队库检索。</span>
        {teamLibraryMessage ? <span className="text-xs text-white/26">{teamLibraryMessage}</span> : null}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {searchableSourceTabs().map((tab) => {
          const isActive = activeTab === tab;

          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                isActive
                  ? "border-white/22 bg-white/[0.10] text-white"
                  : "border-white/10 bg-white/[0.025] text-white/42 hover:border-white/18 hover:text-white/78"
              }`}
            >
              {sourceLibraryLabel(tab)}
            </button>
          );
        })}
        <span className="text-xs text-white/30">
          {loading ? "检索中…" : `${visibleCandidates.length} results`}
          {selectedCandidateIds.length ? ` · selected ${selectedCandidateIds.length}` : ""}
        </span>
      </div>

      <div className="max-h-[244px] overflow-y-auto pr-1">
        {loading ? (
          <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.035] p-6 text-sm text-white/42">
            正在连接 {sourceLibraryLabel(activeTab)} 来源并套团队规范预处理…
          </div>
        ) : null}
        {!loading && !visibleCandidates.length ? (
          <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.035] p-6 text-sm leading-6 text-white/42">
            还没有候选。Figma 团队库需要先粘贴画布/节点链接；IconPark / Lucide / Tabler / Phosphor 使用官方 npm 包索引；Iconfont 需要先粘贴项目 Symbol JS 链接。
          </div>
        ) : null}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2.5">
          {visibleCandidates.map((candidate) => {
            const isSelected = selectedSource?.id === candidate.id;
            const isBatchSelected = selectedCandidateIds.includes(candidate.id);

            return (
              <button
                key={candidate.id}
                draggable
                onClick={() => {
                  onChooseSource(candidate);
                  onToggleCandidate(candidate.id);
                }}
                onDragStart={(event) => onCandidateDragStart(event, candidate)}
                className={`group relative flex min-h-[132px] flex-col items-center justify-center rounded-2xl border px-3 py-3 text-center transition duration-200 ${
                  isSelected || isBatchSelected
                    ? "border-indigo-300/60 bg-indigo-400/[0.10] ring-1 ring-indigo-200/20"
                    : "border-white/8 bg-white/[0.025] hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.055]"
                }`}
                title="点击卡片即可选择；也可以拖到中间画布，直接套团队规范后放置"
              >
                <span
                  role="checkbox"
                  aria-checked={isBatchSelected}
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleCandidate(candidate.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      onToggleCandidate(candidate.id);
                    }
                  }}
                  className={`absolute right-2 top-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] transition ${
                    isBatchSelected ? "border-indigo-300 bg-indigo-300 text-black" : "border-white/12 bg-white/5 text-transparent group-hover:border-white/26"
                  }`}
                >
                  ✓
                </span>
                <div className="mb-3 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-black/28 text-white/84 transition group-hover:border-white/18 group-hover:bg-white/[0.045]">
                  <div className="[&_svg]:h-8 [&_svg]:w-8 [&_svg]:text-current" dangerouslySetInnerHTML={{ __html: candidate.normalizedSvg }} />
                </div>
                <div className="max-w-full truncate text-xs font-medium text-white/82">{candidate.name}</div>
                <div className="mt-1 max-w-full truncate text-[11px] text-white/32">
                  {candidate.source} · {candidate.review.score}
                </div>
                <div className="pointer-events-none absolute inset-x-2 bottom-2 translate-y-1 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                  <div className="truncate rounded-full bg-black/60 px-2 py-1 text-[10px] text-white/46">
                    {candidate.source === "phosphor-icons" ? "参考后转线性" : "套团队样式"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TeamSpecProcessorBar({
  sourceLabel,
  hasCandidates,
  hasPreview,
  warnings,
}: {
  sourceLabel: string;
  hasCandidates: boolean;
  hasPreview: boolean;
  warnings: string[];
}) {
  const inputLabel = hasCandidates ? sourceLabel : "AI / 图标库 / SVG";
  const outputLabel = hasPreview ? "已生成团队样式预览" : "等待输入后处理";

  return (
    <div className="flex h-full w-full items-center gap-4 bg-white px-4">
      <div className="min-w-[180px]">
        <div className="text-xs text-white/42">团队规范处理器</div>
        <div className="mt-1 text-sm font-semibold text-white/86">{inputLabel}</div>
        <div className="mt-0.5 text-xs text-white/32">统一成可交付团队图标</div>
      </div>
      <div className="flex min-w-0 flex-1 gap-2 overflow-hidden">
        {teamSpecRules.slice(0, 5).map((rule) => (
          <div key={rule.label} title={`${rule.label}：${rule.description}`} className="min-w-[76px] rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2">
            <div className="text-xs text-white/42">{rule.label}</div>
            <div className="mt-0.5 truncate text-xs font-semibold text-white/86">{rule.value}</div>
          </div>
        ))}
      </div>
      <Badge tone={warnings.length ? "amber" : hasPreview ? "green" : "blue"}>{warnings.length ? "需修正" : outputLabel}</Badge>
    </div>
  );
}

function BatchProductionPanel({
  input,
  tasks,
  active,
  onInputChange,
  onParse,
  onQueue,
  onClear,
}: {
  input: string;
  tasks: BatchTask[];
  active: boolean;
  onInputChange: (value: string) => void;
  onParse: () => void;
  onQueue: () => void;
  onClear: () => void;
}) {
  if (!active) return null;

  const inputKind = input.trim() ? detectBatchInputKind(input) : "names";
  const matchedCount = tasks.filter((task) => task.status === "matched" || task.status === "queued").length;
  const queuedCount = tasks.filter((task) => task.status === "queued").length;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xl shadow-slate-200/70">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white/86">批量任务资料</div>
            <div className="mt-1 text-xs leading-5 text-white/42">
              粘贴图标名、Figma 链接或需求文档，先识别清单，再批量进画布。
            </div>
          </div>
          <Badge tone="blue">{batchInputKindLabel(inputKind)}</Badge>
        </div>
        <textarea
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          className="h-28 w-full resize-none rounded-xl border border-white/10 bg-white/[0.055] p-3 text-sm leading-5 text-slate-800 outline-none placeholder:text-slate-300 focus:border-blue-500"
          placeholder={"例如：搜索、筛选、分享、收藏、下载\n也可以粘贴 Figma 画布链接、PRD 片段或 icon 清单"}
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={onParse} className="rounded bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400">
            识别清单
          </button>
          <button
            onClick={onQueue}
            disabled={!tasks.length}
            className="rounded bg-emerald-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/28"
          >
            放入画布
          </button>
        </div>
        <button
          onClick={onClear}
          className="mt-2 w-full rounded border border-slate-200 px-3 py-2 text-xs font-semibold text-white/70 transition hover:border-slate-300"
        >
          清空批量资料
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-white/86">识别结果</div>
            <div className="mt-1 text-xs text-white/42">
              {tasks.length ? `已识别 ${tasks.length} 个，${matchedCount} 个有参考，${queuedCount} 个已进画布。` : "识别后这里会出现待生成图标清单。"}
            </div>
          </div>
          <Badge tone={tasks.length ? "green" : "neutral"}>{tasks.length ? `${tasks.length} 个` : "未识别"}</Badge>
        </div>
        {tasks.length ? (
          <div className="max-h-64 space-y-2 overflow-auto pr-1">
            {tasks.map((task, index) => (
              <div key={task.id} className="rounded-xl border border-white/10 bg-white/[0.055] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white/86">
                      {index + 1}. {task.name}
                    </div>
                    <div className="mt-1 text-xs text-white/42">
                      {batchInputKindLabel(task.sourceKind)} · {task.candidateCount} 个参考
                    </div>
                  </div>
                  <Badge tone={task.status === "queued" ? "green" : task.bestScore >= 70 ? "blue" : "amber"}>
                    {taskStatusLabel(task.status)}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, task.bestScore)}%` }} />
                  </div>
                  <span className="w-8 text-right font-mono text-xs text-white/42">{task.bestScore || "-"}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.055] p-4 text-xs leading-5 text-white/42">
            批量模式不是聊天对话：这里负责“收集资料 → 识别清单 → 批量放入画布”。如果想逐个讨论语义，切回单个生成。
          </div>
        )}
      </div>
    </div>
  );
}

function IconInstanceNode({
  instance,
  selected,
  onSelect,
  onDragStart,
}: {
  instance: IconCanvasInstance;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const renderedPreviewSvg = instance.previewSvg;
  const statusLabel = instance.previewVariantId
    ? "AI"
    : instance.sourcePreviewSvg
      ? instance.sourceConversionStatus === "team_normalized"
        ? "规范"
        : instance.sourceConversionStatus === "reference_only"
          ? "参考"
          : "确认"
      : undefined;

  return (
    <div
      className={`iconops-canvas-icon-card absolute cursor-grab select-none rounded-2xl border p-4 transition active:cursor-grabbing ${
        selected ? "border-blue-400 ring-4 ring-blue-500/20" : "border-slate-200 hover:border-blue-400"
      }`}
      style={{
        left: instance.x,
        top: instance.y,
        width: 120 * instance.scale,
        height: 120 * instance.scale,
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onPointerDown={onDragStart}
    >
      <IconCanvasSvg
        elements={instance.elements}
        glyphKind={instance.glyphKind}
        previewSvg={renderedPreviewSvg}
        previewPadding={instance.previewPadding}
        previewStrokeWidth={instance.previewStrokeWidth}
        previewColor={instance.previewColor}
        selectedElementId="frame"
        onSelect={() => onSelect()}
      />
      <div className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] max-w-[118px] -translate-x-1/2 truncate rounded-lg border border-white/8 bg-black/28 px-2 py-1 text-center text-[11px] text-white/46 backdrop-blur-sm">
        {instance.name}
      </div>
      {instance.previewVariantId ? (
        <div className="pointer-events-none absolute -left-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full border border-white/10 bg-indigo-500 px-2 text-xs font-bold text-white shadow-lg shadow-blue-950/20">
          {instance.optionId}-{instance.previewVariantId}
        </div>
      ) : null}
      {statusLabel ? (
        <div className="pointer-events-none absolute -right-2 -top-2 rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[11px] font-semibold text-white/58 backdrop-blur-sm">
          {statusLabel}
        </div>
      ) : null}
    </div>
  );
}

function buildAssistantSummary(params: { decision: AgentDecision; phase: WorkflowPhase; optionId?: string; sourceCandidateCount?: number }) {
  if (params.decision.needsClarification && params.decision.clarifyingQuestion) {
    return `${params.decision.response}\n\n我还需要确认：${params.decision.clarifyingQuestion}`;
  }

  if (params.decision.intent === "plan_semantics") {
    return "我给你 3 个视觉方向，选一个后我再生成大预览。";
  }

  if (params.decision.intent === "generate_svg_preview") {
    return `我按 ${params.optionId ?? "选定方向"} 生成预览。满意后再进入交付。`;
  }

  if (params.decision.intent === "draw_figma_native" || params.decision.intent === "approve_preview") {
    return `${params.decision.response}\n\n下一步应生成 Icon Spec JSON，再用 figma-use 写入 Figma native nodes；没有预览批准时不能直接绘制。`;
  }

  if (params.decision.intent === "revise_preview") {
    return `${params.decision.response}\n\n我会停在 SVG 预览 阶段修订，不会跳过批准进入 Figma。`;
  }

  return params.decision.response;
}

function isNewBriefMessage(message: string) {
  return /做一个|要一个|生成|给我|需要|create|generate|icon|图标|收藏|分享|搜索|筛选|下载|上传|播放|评论|点赞|投稿|朗读|互动/.test(message.toLowerCase());
}

function isBriefContinuationMessage(message: string) {
  return /用于|用在|出现在|放在|位置|工具栏|内容列表|数据报表|批量操作|强调|表达|突出|普通下载|下载文件|导出数据/.test(message);
}

function mergeBriefContinuation(message: string, fallback: IconBrief): IconBrief {
  const inferredGlyphKind = inferGlyphKind(message);
  const glyphKind = inferredGlyphKind === "generic" ? fallback.glyphKind : inferredGlyphKind;
  const profile = glyphProfiles[glyphKind];

  return {
    sourceText: `${fallback.sourceText}；${message}`,
    concept: profile.concept,
    label: profile.label,
    semanticName: profile.semanticName,
    context: inferContext(message, fallback.context),
    emphasis: inferEmphasis(message, fallback.emphasis),
    glyphKind,
  };
}

function isClearlyNonIconMessage(message: string) {
  return /吃饭|天气|你好|早上好|晚上好|谢谢|再见|讲个笑话|你是谁/i.test(message);
}

function isApprovalMessage(message: string) {
  return /可以|确认|通过|批准|就这个|ok|已确认|继续|进入交付|下一步/.test(message.toLowerCase());
}

function isDeliveryMessage(message: string) {
  return /交付包|生产交付|生产包|输出文件|package|delivery|handoff/.test(message.toLowerCase());
}

function isProductionRunMessage(message: string) {
  return /写入\s*figma|figma\s*写入|native\s*draw|执行任务|生产执行|画布写入|准备\s*figma|use_figma|figma-use/.test(message.toLowerCase());
}

function extractIconfontUrl(message: string) {
  return message.match(/https?:\/\/[^\s"'<>]+alicdn\.com\/[^\s"'<>]+/i)?.[0];
}

function extractFigmaUrl(message: string) {
  return message.match(/https?:\/\/[^\s"'<>]+figma\.com\/[^\s"'<>]+/i)?.[0];
}

function extractFigmaToken(message: string) {
  return message.match(/\bfigd_[A-Za-z0-9_-]{20,}\b/)?.[0];
}

function detectSourceTab(message: string): SourceLibraryTab | undefined {
  const lower = message.toLowerCase();
  if (/全部来源|全部库|所有库|全库|跨库|all sources|all libraries/.test(lower)) return "all";
  if (/figma|figma\s*团队库|figma\s*画布|画布库|已有图标|已有 icon|内部来源|内部库|团队内部|团队已有|团队库|公司库/.test(lower)) return "figma";
  if (/icon\s*font|iconfont|阿里图标/.test(lower)) return "iconfont";
  if (/icon\s*park|iconpark/.test(lower)) return "iconpark";
  if (/lucide/.test(lower)) return "lucide";
  if (/tabler/.test(lower)) return "tabler";
  if (/phosphor/.test(lower)) return "phosphor";
  if (/外部来源|外部库|外部图标|开源库|公开库|第三方库|参考库|图标库/.test(lower)) return "lucide";
  if (/内置库|现成库|来源库/.test(lower)) return "curated";
  if (/ai生成|从零生成|不用库|不用现成库/.test(lower)) return "ai";
  return undefined;
}

function shouldOpenReferenceLibraryForBrief(brief: IconBrief) {
  return brief.glyphKind !== "generic";
}

function searchableSourceTab(tab: SourceLibraryTab): SourceLibraryTab {
  if (tab === "all" || tab === "iconpark" || tab === "lucide" || tab === "tabler" || tab === "phosphor") return tab;
  if (tab === "figma" || tab === "iconfont" || tab === "curated") return tab;
  return "lucide";
}

function splitTypewriterText(text: string) {
  return Array.from(text);
}

export function IconWorkbench() {
  const [brief, setBrief] = useState<IconBrief>(defaultBrief);
  const [hasEnteredWorkbench, setHasEnteredWorkbench] = useState(false);
  const [workbenchMode, setWorkbenchMode] = useState<WorkbenchMode>("chat");
  const [input, setInput] = useState("");
  const [selectedTeamSpecLibraryId, setSelectedTeamSpecLibraryId] = useState<TeamSpecSkillId>("baijiahao");
  const [landingPointer, setLandingPointer] = useState({ x: 50, y: 50 });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [phase, setPhase] = useState<WorkflowPhase>("brief");
  const [activeTab, setActiveTab] = useState<InspectorTab>("properties");
  const [agentMode, setAgentMode] = useState<AgentMode>("fallback");
  const [isThinking, setIsThinking] = useState(false);
  const [approvedPreview, setApprovedPreview] = useState(false);
  const [approvedPreviewWarningIds, setApprovedPreviewWarningIds] = useState<string[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<SemanticOption["id"] | undefined>();
  const [selectedPreviewVariantId, setSelectedPreviewVariantId] = useState<PreviewVariantId | undefined>();
  const [activeSemanticOptions, setActiveSemanticOptions] = useState<SemanticOption[]>(() => buildSemanticOptions(defaultBrief));
  const [showPreview, setShowPreview] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<CanvasElement["id"]>("bookmark");
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>(() => buildInitialCanvasElements(defaultBrief));
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [deliveryPackage, setDeliveryPackage] = useState<DeliveryPackage | undefined>();
  const [deliveryStatus, setDeliveryStatus] = useState<"idle" | "building" | "ready" | "blocked" | "failed">("idle");
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [productionRun, setProductionRun] = useState<ProductionRun | undefined>();
  const [productionStatus, setProductionStatus] = useState<"idle" | "building" | "ready" | "blocked" | "failed">("idle");
  const [productionMessage, setProductionMessage] = useState("");
  const [figmaTargetUrl, setFigmaTargetUrl] = useState("");
  const [figmaWriteToken, setFigmaWriteToken] = useState("");
  const [batchFigmaWriteRun, setBatchFigmaWriteRun] = useState<BatchFigmaWriteRun | undefined>();
  const [figmaWriteJob, setFigmaWriteJob] = useState<FigmaWriteJob | undefined>();
  const [figmaBridgeStatus, setFigmaBridgeStatus] = useState<FigmaBridgeStatus>({ online: false });
  const [batchFigmaWriteStatus, setBatchFigmaWriteStatus] = useState<"idle" | "building" | "ready" | "blocked" | "failed">("idle");
  const [batchFigmaWriteMessage, setBatchFigmaWriteMessage] = useState("");
  const [batchFigmaCopyStatus, setBatchFigmaCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [batchFigmaJsonCopyStatus, setBatchFigmaJsonCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [chatWidth, setChatWidth] = useState(420);
  const [inspectorWidth, setInspectorWidth] = useState(360);
  const [isResizingChat, setIsResizingChat] = useState(false);
  const [isResizingInspector, setIsResizingInspector] = useState(false);
  const [sourceQuery, setSourceQuery] = useState("");
  const [importedIconfontIcons, setImportedIconfontIcons] = useState<IconAsset[]>([]);
  const [selectedSource, setSelectedSource] = useState<SourceCandidate | undefined>();
  const [canvasSourceCandidates, setCanvasSourceCandidates] = useState<SourceCandidate[]>([]);
  const [sourceLibraryTab, setSourceLibraryTab] = useState<SourceLibraryTab>("lucide");
  const [isSourcePanelCollapsed, setIsSourcePanelCollapsed] = useState(true);
  const [isFigmaSetupExpanded, setIsFigmaSetupExpanded] = useState(false);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceMessage, setSourceMessage] = useState("");
  const [sourceDecision, setSourceDecision] = useState<SourceDecision | undefined>();
  const [selectedSourceCandidates, setSelectedSourceCandidates] = useState<SourceCandidate[]>([]);
  const [teamLibraryAssets, setTeamLibraryAssets] = useState<TeamLibraryAsset[]>([]);
  const [teamLibrarySummary, setTeamLibrarySummary] = useState<TeamLibrarySummary>({ count: 0 });
  const [teamLibraryTrainingStatus, setTeamLibraryTrainingStatus] = useState<"idle" | "loading" | "training" | "ready" | "failed">("idle");
  const [teamLibraryTrainingMessage, setTeamLibraryTrainingMessage] = useState("");
  const [isChatPinnedToLatest, setIsChatPinnedToLatest] = useState(true);
  const [figmaSessionToken, setFigmaSessionToken] = useState("");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [figmaCredentialStatus, setFigmaCredentialStatus] = useState<FigmaCredentialStatus>({ hasToken: false });
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [pendingFigmaUrl, setPendingFigmaUrl] = useState("");
  const [pendingFigmaQuery, setPendingFigmaQuery] = useState("");
  const [isSpecCardCollapsed, setIsSpecCardCollapsed] = useState(true);
  const [canvasLayers, setCanvasLayers] = useState<CanvasLayer[]>([{ id: defaultCanvasLayerId, name: "画布 1", instances: [] }]);
  const [activeCanvasLayerId, setActiveCanvasLayerId] = useState(defaultCanvasLayerId);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | undefined>();
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [isCanvasDropActive, setIsCanvasDropActive] = useState(false);
  const [batchInput, setBatchInput] = useState("");
  const [batchTasks, setBatchTasks] = useState<BatchTask[]>([]);
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const canvasSurfaceRef = useRef<HTMLDivElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatLatestRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToLatestRef = useRef(true);
  const conversationIdRef = useRef(0);
  const typewriterTimersRef = useRef<number[]>([]);
  const messageIdCounterRef = useRef(0);

  async function persistFigmaToken(token: string, allowWithoutKnownUser = false) {
    if (!token.trim() || (!authUser && !allowWithoutKnownUser)) return false;
    const response = await fetch("/api/account/figma-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token.trim() }),
    });
    const payload = (await response.json().catch(() => ({}))) as { figma?: FigmaCredentialStatus };
    if (!response.ok) return false;
    setFigmaCredentialStatus(payload.figma ?? { hasToken: true });
    return true;
  }

  async function handleAuthenticated(user: AuthUser, figma: FigmaCredentialStatus) {
    setAuthUser(user);
    setFigmaCredentialStatus(figma);
    const pendingToken = figmaSessionToken.trim() || figmaWriteToken.trim();
    if (pendingToken) await persistFigmaToken(pendingToken, true);
    setIsAuthDialogOpen(false);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthUser(null);
    setFigmaCredentialStatus({ hasToken: false });
    setFigmaSessionToken("");
    setFigmaWriteToken("");
    setIsAuthDialogOpen(false);
  }

  async function handleDeleteFigmaToken() {
    const response = await fetch("/api/account/figma-token", { method: "DELETE" });
    if (response.ok) setFigmaCredentialStatus({ hasToken: false });
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { authenticated?: boolean; user?: AuthUser; figma?: FigmaCredentialStatus }) => {
        if (!active) return;
        setAuthUser(payload.authenticated && payload.user ? payload.user : null);
        setFigmaCredentialStatus(payload.figma ?? { hasToken: false });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const semanticOptions = activeSemanticOptions.length ? activeSemanticOptions : buildSemanticOptions(brief);
  const selectedOption = semanticOptions.find((option) => option.id === selectedOptionId);
  const selectedShapeOptionId = selectedOption ? resolveShapeOptionId(brief, selectedOption) : selectedOptionId;
  const previewShapes = selectedOptionId
    ? selectedPreviewVariantId
      ? buildQualityAssuredPreviewShapes(brief, selectedShapeOptionId ?? selectedOptionId, selectedPreviewVariantId)
      : buildSemanticPreviewShapes(brief, selectedShapeOptionId ?? selectedOptionId)
    : [];
  const previewSvg = previewShapes.length ? buildPreviewSvgFromShapes(previewShapes) : undefined;
  const previewReview = reviewGeneratedPreview(brief, selectedOptionId, previewShapes);
  const selectedElement = canvasElements.find((element) => element.id === selectedElementId) ?? canvasElements[0];
  const activeCanvasLayer = canvasLayers.find((layer) => layer.id === activeCanvasLayerId) ?? canvasLayers[0];
  const canvasInstances = activeCanvasLayer?.instances ?? [];
  const totalCanvasInstanceCount = canvasLayers.reduce((count, layer) => count + layer.instances.length, 0);
  const selectedCandidateIds = selectedSourceCandidates.map((candidate) => candidate.id);
  const importedSourceState = {
    figma: importedIconfontIcons.some((asset) => asset.source === "figma-canvas" || asset.source === "team-library"),
    iconfont: importedIconfontIcons.some((asset) => asset.source === "iconfont-symbol" || asset.category === "iconfont"),
    any: importedIconfontIcons.length > 0,
  };
  const selectedTeamSpecLibrary =
    teamSpecSkillRegistry.find((library) => library.id === selectedTeamSpecLibraryId) ?? teamSpecSkillRegistry[0];
  const activeOutputProfile = selectedTeamSpecLibrary.outputProfile;
  const visibleTeamLibrarySummary = {
    ...teamLibrarySummary,
    count: teamLibraryAssets.length || teamLibrarySummary.count,
  };
  const selectedInstance = canvasInstances.find((instance) => instance.id === selectedInstanceId);
  const selectedInstanceQualityIssues = selectedInstance ? getCanvasInstanceQualityIssues(selectedInstance, activeOutputProfile) : [];
  const selectedInstanceApprovedIssueIds = new Set(selectedInstance?.qualityApprovedIssueIds ?? []);
  const selectedInstancePendingQualityIssues = selectedInstanceQualityIssues.filter(
    (issue) => issue.severity === "blocker" || !selectedInstanceApprovedIssueIds.has(issue.id),
  );
  const selectedInstanceBlockers = selectedInstanceQualityIssues.filter((issue) => issue.severity === "blocker");
  const selectedInstanceElement =
    selectedInstance?.elements.find((element) => element.id === selectedElementId) ??
    selectedInstance?.elements.find((element) => element.type !== "frame" && element.type !== "preview");
  const selectedInstanceUsesSvgPreview = Boolean(selectedInstance?.previewSvg && !selectedInstance.sourcePreviewSvg);
  const defaultCanvasElements = buildInitialCanvasElements(brief);
  const bookmarkElement = canvasElements.find((element) => element.id === "bookmark") ?? defaultCanvasElements[1];
  const plusElement = canvasElements.find((element) => element.id === "plus") ?? defaultCanvasElements[2];
  const dotElement = canvasElements.find((element) => element.id === "dot") ?? defaultCanvasElements[3];
  const propertyBounds = getPropertyBounds(selectedElement);
  const instanceElementBounds = selectedInstanceElement ? getPropertyBounds(selectedInstanceElement) : undefined;
  const drawableElements = canvasElements.filter(isDrawableElement);
  const userEditableLayers = canvasElements.filter((element) => element.type !== "frame" && element.type !== "preview");
  const usesGeneratedPreview = showPreview && Boolean(selectedOptionId);
  const previewHasQualityIssues = showPreview && previewReview.blockers.length > 0;
  const logicalProfileColor = activeOutputProfile.color;
  const logicalProfileStrokeWidth = activeOutputProfile.strokeWidth / activeOutputProfile.scale;
  const logicalProfilePadding = activeOutputProfile.padding / activeOutputProfile.scale;
  const logicalProfileLiveArea = activeOutputProfile.masterSize / activeOutputProfile.scale - logicalProfilePadding * 2;
  const previewQualityIssues = ([
    !usesGeneratedPreview && ![defaultTeamIconColor, logicalProfileColor].includes(bookmarkElement.stroke ?? "")
      ? {
          id: "preview-color",
          title: "颜色偏离团队规范",
          message: `颜色应使用当前团队规范 ${logicalProfileColor}。`,
          severity: "warning" as const,
          stage: "team-spec" as const,
          actionLabel: "编辑颜色",
          elementId: bookmarkElement.id,
        }
      : undefined,
    !usesGeneratedPreview && bookmarkElement.strokeWidth !== logicalProfileStrokeWidth
      ? {
          id: "preview-stroke-width",
          title: "线宽偏离团队规范",
          message: `线宽应为逻辑网格 ${logicalProfileStrokeWidth}px，写入主组件后为 ${activeOutputProfile.strokeWidth}px。`,
          severity: "warning" as const,
          stage: "team-spec" as const,
          actionLabel: "编辑线宽",
          elementId: bookmarkElement.id,
        }
      : undefined,
    !usesGeneratedPreview && (bookmarkElement.radius ?? 4) !== 4
      ? {
          id: "preview-radius",
          title: "圆角需要视觉依据",
          message: "默认圆角为 4px；当前圆角偏离默认值，可以编辑或人工批准。",
          severity: "warning" as const,
          stage: "team-spec" as const,
          actionLabel: "编辑圆角",
          elementId: bookmarkElement.id,
        }
      : undefined,
    !usesGeneratedPreview && (bookmarkElement.x < logicalProfilePadding || bookmarkElement.y < logicalProfilePadding)
      ? {
          id: "preview-safe-zone",
          title: "图形触碰安全区",
          message: `图形触碰 ${logicalProfilePadding}px 安全区，需要调整位置或人工确认光学偏移。`,
          severity: "warning" as const,
          stage: "team-spec" as const,
          actionLabel: "编辑位置",
          elementId: bookmarkElement.id,
        }
      : undefined,
    !usesGeneratedPreview && (bookmarkElement.width > logicalProfileLiveArea || bookmarkElement.height > logicalProfileLiveArea)
      ? {
          id: "preview-live-area",
          title: "图形超出 live area",
          message: `图形超出 ${logicalProfileLiveArea}px 逻辑 live area，需要调整尺寸或人工确认。`,
          severity: "warning" as const,
          stage: "team-spec" as const,
          actionLabel: "编辑尺寸",
          elementId: bookmarkElement.id,
        }
      : undefined,
    !usesGeneratedPreview && plusElement.visible && plusElement.x - (bookmarkElement.x + bookmarkElement.width) < 1.5
      ? {
          id: "preview-badge-gap",
          title: "状态标记间距过近",
          message: "plus badge is too close to bookmark outline; keep at least ~2px visual gap。",
          severity: "warning" as const,
          stage: "geometry" as const,
          actionLabel: "检查图层",
          elementId: plusElement.id,
        }
      : undefined,
    !usesGeneratedPreview && dotElement.visible && ![defaultTeamIconColor, logicalProfileColor].includes(dotElement.fill ?? "")
      ? {
          id: "preview-dot-color",
          title: "状态点颜色偏离规范",
          message: `局部状态点应使用当前团队规范色 ${logicalProfileColor}。`,
          severity: "warning" as const,
          stage: "team-spec" as const,
          actionLabel: "编辑颜色",
          elementId: dotElement.id,
        }
      : undefined,
    !usesGeneratedPreview && dotElement.visible && (dotElement.width > 4 || dotElement.height > 4)
      ? {
          id: "preview-dot-density",
          title: "局部填充过大",
          message: "局部填充 dot should stay tiny; large fills break outline-first style。",
          severity: "warning" as const,
          stage: "team-spec" as const,
          actionLabel: "编辑尺寸",
          elementId: dotElement.id,
        }
      : undefined,
  ]).filter(Boolean) as IconQualityIssue[];
  const pendingPreviewQualityIssues = previewQualityIssues.filter((issue) => !approvedPreviewWarningIds.includes(issue.id));
  const approvedPreviewQualityIssues = previewQualityIssues.filter((issue) => approvedPreviewWarningIds.includes(issue.id));
  const specWarnings = [
    ...pendingPreviewQualityIssues.map((issue) => issue.message),
    previewHasQualityIssues ? previewReview.blockers[0] : undefined,
  ].filter((warning): warning is string => Boolean(warning));
  const inspectorWarnings = selectedInstance
    ? selectedInstancePendingQualityIssues.map((issue) => `${issue.title}：${issue.message}`)
    : specWarnings;
  const currentSourceLabel = selectedSource ? `${selectedSource.source} / ${selectedSource.name}` : canvasSourceCandidates.length ? "候选图标库" : "AI 语义生成";
  const appliedSpecRules = [
    `${activeOutputProfile.masterSize}×${activeOutputProfile.masterSize} 主组件，${activeOutputProfile.padding}px 安全区`,
    `${activeOutputProfile.color} 单色线性`,
    `${activeOutputProfile.strokeWidth}px 描边，圆角端点/连接`,
    `局部填充只允许极小状态点`,
    `最终输出 Figma 可编辑 native nodes`,
  ];
  const hasStreamingMessage = messages.some((message) => message.isStreaming);

  function clearTypewriterTimers() {
    typewriterTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    typewriterTimersRef.current = [];
  }

  function scrollChatToLatest(behavior: ScrollBehavior = "smooth") {
    chatLatestRef.current?.scrollIntoView({ block: "end", behavior });
  }

  function updateChatPinnedState() {
    const scrollElement = chatScrollRef.current;
    if (!scrollElement) return;

    const distanceToBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight;
    const isPinned = distanceToBottom < 80;
    shouldStickToLatestRef.current = isPinned;
    setIsChatPinnedToLatest(isPinned);
  }

  function jumpChatToLatest() {
    shouldStickToLatestRef.current = true;
    setIsChatPinnedToLatest(true);
    scrollChatToLatest();
  }

  function createChatMessageId(prefix: string) {
    messageIdCounterRef.current += 1;
    return `${prefix}-${messageIdCounterRef.current}`;
  }

  function appendAssistantTypewriterMessage(
    message: Omit<ChatMessage, "role" | "content" | "isStreaming"> & { content: string },
    options?: {
      targetId?: string;
      placeholder?: string;
      delayMs?: number;
      chunkSize?: number;
    },
  ) {
    shouldStickToLatestRef.current = true;
    setIsChatPinnedToLatest(true);

    const id = options?.targetId ?? message.id ?? createChatMessageId("assistant");
    const placeholder = options?.placeholder ?? "正在理解你的需求…";
    const delayMs = options?.delayMs ?? 18;
    const chunkSize = options?.chunkSize ?? 1;
    const finalContent = message.content;
    const tokens = splitTypewriterText(finalContent);
    const shellMessage: ChatMessage = {
      ...message,
      id,
      role: "assistant",
      content: placeholder,
      isStreaming: true,
      suggestions: undefined,
      quickActions: undefined,
      semanticOptions: undefined,
      semanticBrief: undefined,
      previewVariants: undefined,
      sourceCandidates: undefined,
    };

    setMessages((current) =>
      options?.targetId
        ? current.map((item) => (item.id === id ? shellMessage : item))
        : [...current, shellMessage],
    );

    const firstTimer = window.setTimeout(() => {
      setMessages((current) => current.map((item) => (item.id === id ? { ...item, content: "" } : item)));

      let cursor = 0;

      function tick() {
        cursor = Math.min(cursor + chunkSize, tokens.length);
        const nextContent = tokens.slice(0, cursor).join("");
        const done = cursor >= tokens.length;

        setMessages((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...message,
                  role: "assistant",
                  content: nextContent,
                  isStreaming: !done,
                  suggestions: done ? message.suggestions : undefined,
                  quickActions: done ? message.quickActions : undefined,
                  semanticOptions: done ? message.semanticOptions : undefined,
                  semanticBrief: done ? message.semanticBrief : undefined,
                  previewVariants: done ? message.previewVariants : undefined,
                  sourceCandidates: done ? message.sourceCandidates : undefined,
                }
              : item,
          ),
        );
        if (shouldStickToLatestRef.current) {
          window.requestAnimationFrame(() => scrollChatToLatest("auto"));
        }

        if (!done) {
          const timerId = window.setTimeout(tick, delayMs);
          typewriterTimersRef.current.push(timerId);
        }
      }

      tick();
    }, 120);

    typewriterTimersRef.current.push(firstTimer);
  }

  function resetProductionState() {
    setApprovedPreviewWarningIds([]);
    setDeliveryPackage(undefined);
    setDeliveryStatus("idle");
    setDeliveryMessage("");
    setProductionRun(undefined);
    setProductionStatus("idle");
    setProductionMessage("");
    setBatchFigmaWriteRun(undefined);
    setFigmaWriteJob(undefined);
    setBatchFigmaWriteStatus("idle");
    setBatchFigmaWriteMessage("");
    setBatchFigmaCopyStatus("idle");
    setBatchFigmaJsonCopyStatus("idle");
  }

  async function requestSourceDecision(
    query: string,
    options?: { variants?: boolean; production?: boolean; exactReuse?: boolean; semanticQuery?: string },
  ) {
    const response = await fetch("/api/source-decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        semanticQuery: options?.semanticQuery,
        skillId: selectedTeamSpecLibraryId,
        asksForVariants: options?.variants,
        asksForProduction: options?.production,
        asksForExactReuse: options?.exactReuse,
      }),
    });
    const payload = (await response.json()) as SourceDecision & { message?: string };
    if (!response.ok) throw new Error(payload.message || `Source decision failed: ${response.status}`);
    setSourceDecision(payload);
    return payload;
  }

  async function loadTeamLibrary(options?: { announce?: boolean; query?: string }) {
    setTeamLibraryTrainingStatus("loading");

    try {
      const payload = await fetchTeamLibraryAssets();
      setTeamLibraryAssets(payload.assets);
      setTeamLibrarySummary(payload.summary);
      setImportedIconfontIcons((current) => {
        const nonTeamAssets = current.filter((asset) => asset.source !== "team-library");
        return [...payload.assets, ...nonTeamAssets];
      });
      setTeamLibraryTrainingStatus("ready");
      setTeamLibraryTrainingMessage(
        payload.summary.count ? `已加载 ${payload.summary.count} 个已训练团队 icon。` : "团队训练库为空；导入 Figma / SVG 后可开始训练。",
      );

      if (options?.announce) {
        const query = options.query || sourceQuery || brief.sourceText;
        const candidates = searchIcons(query, payload.assets, 36).map((asset) =>
          buildSourceCandidate(asset, query, asset.score + 6, `已训练团队库匹配：${asset.matchReason}`),
        );
        setCanvasSourceCandidates(candidates);
        setSourceLibraryTab("figma");
        setSourceQuery(query);
        setIsSourcePanelCollapsed(false);
        setSourceMessage(
          candidates.length
            ? `已从训练团队库中找到 ${candidates.length} 个可复用 icon。`
            : "团队训练库已加载，但当前关键词没有匹配结果。",
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "团队训练库加载失败。";
      setTeamLibraryTrainingStatus("failed");
      setTeamLibraryTrainingMessage(message);
    }
  }

  async function trainTeamLibraryFromAssets(assets: IconAsset[], query: string, source: TeamLibraryAsset["trainingSource"]) {
    if (!assets.length) return;

    setTeamLibraryTrainingStatus("training");
    setTeamLibraryTrainingMessage(`正在训练 ${assets.length} 个团队 icon…`);

    try {
      const trainingAssets = assets.map((asset) => buildTrainingAssetFromSource(asset, query, source));
      const payload = await trainTeamLibraryAssets(trainingAssets);
      setTeamLibraryAssets(payload.assets);
      setTeamLibrarySummary(payload.summary);
      setImportedIconfontIcons((current) => {
        const nonTeamAssets = current.filter((asset) => asset.source !== "team-library");
        return [...payload.assets, ...nonTeamAssets];
      });
      setTeamLibraryTrainingStatus("ready");
      setTeamLibraryTrainingMessage(
        `训练完成：新增 ${payload.summary.created ?? 0} 个，更新 ${payload.summary.updated ?? 0} 个；团队库共 ${payload.summary.count} 个。`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "团队库训练失败。";
      setTeamLibraryTrainingStatus("failed");
      setTeamLibraryTrainingMessage(message);
    }
  }

  const setActiveCanvasInstances = useCallback(
    (updater: (current: IconCanvasInstance[]) => IconCanvasInstance[]) => {
      setCanvasLayers((currentLayers) =>
        currentLayers.map((layer) =>
          layer.id === activeCanvasLayerId ? { ...layer, instances: updater(layer.instances) } : layer,
        ),
      );
    },
    [activeCanvasLayerId],
  );

  function createCanvasLayer() {
    const nextIndex = canvasLayers.length + 1;
    const nextLayer: CanvasLayer = {
      id: `canvas-layer-${Date.now()}`,
      name: `画布 ${nextIndex}`,
      instances: [],
    };

    setCanvasLayers((current) => [...current, nextLayer]);
    setActiveCanvasLayerId(nextLayer.id);
    setSelectedInstanceId(undefined);
    setActiveTab("layers");
  }

  function switchCanvasLayer(layerId: string) {
    setActiveCanvasLayerId(layerId);
    setSelectedInstanceId(undefined);
    setActiveTab("layers");
  }

  function clearActiveCanvasLayer() {
    if (!canvasInstances.length) return;

    setActiveCanvasInstances(() => []);
    setSelectedInstanceId(undefined);
    setActiveTab("layers");
    setApprovedPreview(false);
    resetProductionState();
  }

  const deleteCanvasInstance = useCallback(
    (instanceId: string) => {
      setActiveCanvasInstances((current) => current.filter((instance) => instance.id !== instanceId));
      setSelectedInstanceId((current) => (current === instanceId ? undefined : current));
      setApprovedPreview(false);
      resetProductionState();
    },
    [setActiveCanvasInstances],
  );

  const deleteSelectedCanvasInstance = useCallback(() => {
    if (!selectedInstanceId) return;

    deleteCanvasInstance(selectedInstanceId);
  }, [deleteCanvasInstance, selectedInstanceId]);

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      const tagName = target.tagName.toLowerCase();
      return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
    }

    function onKeyDown(event: KeyboardEvent) {
      if ((event.key !== "Delete" && event.key !== "Backspace") || !selectedInstanceId || isTypingTarget(event.target)) return;
      event.preventDefault();
      deleteSelectedCanvasInstance();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelectedCanvasInstance, selectedInstanceId]);

  useEffect(
    () => () => {
      typewriterTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      typewriterTimersRef.current = [];
    },
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void loadTeamLibrary(), 0);
    return () => window.clearTimeout(timer);
    // Initial load only; manual reload is handled by the source panel action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!shouldStickToLatestRef.current) return;
    window.requestAnimationFrame(() => scrollChatToLatest("smooth"));
  }, [messages, isThinking, workbenchMode]);

  useEffect(() => {
    let cancelled = false;

    async function syncBridgeStatus() {
      try {
        const response = await fetch("/api/figma-write-jobs/bridge-status", { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as { bridge?: FigmaBridgeStatus };
        if (!cancelled && response.ok && payload.bridge) {
          setFigmaBridgeStatus(payload.bridge);
        }
      } catch {
        if (!cancelled) setFigmaBridgeStatus({ online: false });
      }
    }

    void syncBridgeStatus();
    const timer = window.setInterval(() => void syncBridgeStatus(), 2500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!figmaWriteJob || ["completed", "failed"].includes(figmaWriteJob.status)) return;

    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/figma-write-jobs/${figmaWriteJob.id}`, { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as { job?: FigmaWriteJob };
        if (!response.ok || !payload.job) return;

        setFigmaWriteJob(payload.job);

        if (payload.job.status === "completed") {
          setBatchFigmaWriteStatus("ready");
          setBatchFigmaWriteMessage(
            `Figma 已回传写入完成：${payload.job.result?.count ?? payload.job.itemCount} 个 native icon。下一步请做截图质量门禁。`,
          );
        }

        if (payload.job.status === "failed") {
          setBatchFigmaWriteStatus("failed");
          setBatchFigmaWriteMessage(payload.job.error ?? "Figma 插件写入失败。");
        }
      } catch {
        // Keep polling quietly; local dev HMR or Figma plugin startup may create short gaps.
      }
    }, 2500);

    return () => window.clearInterval(timer);
  }, [figmaWriteJob]);

  function startNewConversation() {
    conversationIdRef.current += 1;
    clearTypewriterTimers();
    setBrief(defaultBrief);
    setActiveSemanticOptions(buildSemanticOptions(defaultBrief));
    setWorkbenchMode("chat");
    setInput("");
    setMessages([]);
    setPhase("brief");
    setAgentMode("fallback");
    setIsThinking(false);
    setApprovedPreview(false);
    setSelectedOptionId(undefined);
    setSelectedPreviewVariantId(undefined);
    setShowPreview(false);
    setSelectedElementId("bookmark");
    setCanvasElements(buildInitialCanvasElements(defaultBrief));
    setSelectedSource(undefined);
    setCanvasSourceCandidates([]);
    setSourceQuery("");
    setSourceMessage("");
    setSourceLoading(false);
    setSelectedSourceCandidates([]);
    setIsSourcePanelCollapsed(true);
    setBatchInput("");
    setBatchTasks([]);
    setActiveTab(canvasInstances.length ? "layers" : "properties");
    resetProductionState();
  }

  function updateSelectedElement(patch: Partial<CanvasElement>) {
    setCanvasElements((current) =>
      current.map((element) => (element.id === selectedElementId && !element.locked ? { ...element, ...patch } : element)),
    );
    setApprovedPreview(false);
    resetProductionState();
  }

  function updateSelectedInstance(
    patch: Partial<Pick<IconCanvasInstance, "x" | "y" | "scale" | "previewPadding" | "previewStrokeWidth" | "previewColor" | "name">>,
  ) {
    if (!selectedInstanceId) return;

    const affectsQuality = Object.keys(patch).some((key) => ["previewStrokeWidth", "previewColor"].includes(key));

    setActiveCanvasInstances((current) =>
      current.map((instance) =>
        instance.id === selectedInstanceId
          ? {
              ...instance,
              ...patch,
              ...(affectsQuality
                ? {
                    qualityApprovedIssueIds: undefined,
                    reviewStatus: "pending" as const,
                    reviewNote: "预览参数已编辑，需要重新检查质量门禁。",
                  }
                : {}),
              scale: patch.scale === undefined ? instance.scale : clampCanvasZoom(patch.scale),
              previewPadding: patch.previewPadding === undefined ? instance.previewPadding : clampNumber(patch.previewPadding, 12, 44),
              previewStrokeWidth:
                patch.previewStrokeWidth === undefined ? instance.previewStrokeWidth : clampNumber(patch.previewStrokeWidth, 1, 3),
              previewColor: patch.previewColor === undefined ? instance.previewColor : normalizeHexColor(patch.previewColor),
            }
          : instance,
      ),
    );
    setApprovedPreview(false);
    resetProductionState();
  }

  function updateSelectedInstanceElement(patch: Partial<CanvasElement>) {
    if (!selectedInstanceId || !selectedInstanceElement) return;

    setActiveCanvasInstances((current) =>
      current.map((instance) =>
        instance.id === selectedInstanceId
          ? {
              ...instance,
              qualityApprovedIssueIds: undefined,
              reviewStatus: "pending",
              reviewNote: "图形属性已编辑，需要重新检查质量门禁。",
              elements: instance.elements.map((element) =>
                element.id === selectedInstanceElement.id && !element.locked ? { ...element, ...patch } : element,
              ),
            }
          : instance,
      ),
    );
    setApprovedPreview(false);
    resetProductionState();
  }

  function resetCanvasElements() {
    setCanvasElements(buildInitialCanvasElements(brief));
    setActiveCanvasInstances(() => []);
    setCanvasSourceCandidates([]);
    setSelectedSourceCandidates([]);
    setIsSourcePanelCollapsed(false);
    setSelectedInstanceId(undefined);
    setCanvasZoom(1);
    setCanvasPan({ x: 0, y: 0 });
    setSelectedElementId("bookmark");
    setSelectedPreviewVariantId(undefined);
    setActiveTab("properties");
    setApprovedPreview(false);
    resetProductionState();
  }

  function applySemanticOption(optionId: SemanticOption["id"]) {
    setSelectedOptionId(optionId);
    setSelectedPreviewVariantId(undefined);
    setCanvasElements((current) =>
      current.map((element) => {
        if (element.id === "plus") return { ...element, visible: optionId === "B" };
        if (element.id === "dot") return { ...element, visible: optionId === "C" };
        return element;
      }),
    );
    setSelectedElementId(optionId === "B" ? "plus" : optionId === "C" ? "dot" : "bookmark");
    setApprovedPreview(false);
    resetProductionState();
  }

  function applyProMaxDefaults() {
    if (selectedElement.type === "ellipse") {
      updateSelectedElement({ fill: activeOutputProfile.color, stroke: activeOutputProfile.color, strokeWidth: 0 });
      return;
    }

    updateSelectedElement({
      stroke: activeOutputProfile.color,
      strokeWidth: activeOutputProfile.strokeWidth / activeOutputProfile.scale,
      radius: selectedElement.type === "path" || selectedElement.type === "rect" ? 4 : selectedElement.radius,
    });
  }

  function normalizeSelectedInstanceToTeamSpec() {
    if (!selectedInstanceId) return;

    const logicalStrokeWidth = activeOutputProfile.strokeWidth / activeOutputProfile.scale;
    setActiveCanvasInstances((current) =>
      current.map((instance) =>
        instance.id === selectedInstanceId
          ? {
              ...instance,
              qualityApprovedIssueIds: undefined,
              reviewStatus: "pending",
              reviewNote: "已恢复团队默认线宽和颜色，请继续检查安全区与语义质量。",
              elements: instance.elements.map((element) => {
                if (element.type === "frame" || element.type === "preview") return element;
                const isFilledEllipse = element.type === "ellipse" && (element.strokeWidth ?? 0) === 0;
                return {
                  ...element,
                  stroke: activeOutputProfile.color,
                  strokeWidth: isFilledEllipse ? 0 : logicalStrokeWidth,
                  fill: element.type === "ellipse" && isFilledEllipse ? activeOutputProfile.color : element.fill,
                };
              }),
            }
          : instance,
      ),
    );
    setActiveTab("quality");
    resetProductionState();
  }

  function enableSelectedInstanceGeometryEditing() {
    if (!selectedInstanceId) return;

    setActiveCanvasInstances((current) =>
      current.map((instance) =>
        instance.id === selectedInstanceId
          ? {
              ...instance,
              sourceConversionStatus: instance.sourceConversionStatus === "reference_only" ? instance.sourceConversionStatus : "needs_review",
              reviewNote: "已开启来源几何编辑；修改后需要重新检查并批准质量警告。",
              qualityApprovedIssueIds: undefined,
              reviewStatus: "pending",
              elements: instance.elements.map((element) =>
                element.type === "frame" || element.type === "preview" ? element : { ...element, locked: false },
              ),
            }
          : instance,
      ),
    );
    setActiveTab("properties");
  }

  function toggleElementVisibility(id: CanvasElementId) {
    setCanvasElements((current) =>
      current.map((element) => (element.id === id && !element.locked ? { ...element, visible: element.visible === false } : element)),
    );
    setApprovedPreview(false);
    resetProductionState();
  }

  async function loadSourceLibrary(tab: SourceLibraryTab, query = sourceQuery, options?: { announce?: boolean }) {
    const effectiveQuery = query || brief.sourceText;
    const selectedDirectionHint = selectedOption ? `当前按「${selectedOption.title}」实时检索` : "当前需求检索";

    setSourceLibraryTab(tab);
    setIsSourcePanelCollapsed(false);
    setSourceLoading(true);
    setSourceMessage("");

    try {
      if (tab === "all") {
        const external = await fetchApprovedExternalAssets(effectiveQuery, 48);
        const packageCandidates = external.assets.map((asset, index) =>
          buildSourceCandidate(
            assetToSearchResult(asset, 14 - index / 100, `${asset.source} 官方包真实检索`),
            effectiveQuery,
            14 - index / 100,
            `${asset.source} 官方包真实检索`,
          ),
        );
        const importedCandidates = buildSessionImportedSourceCandidates(effectiveQuery, importedIconfontIcons);
        const candidates = mergeSourceCandidates([...importedCandidates, ...packageCandidates], 72);
        const failedCount = external.failures.length;

        setCanvasSourceCandidates(candidates);
        setSourceQuery(effectiveQuery);
        setSourceMessage(
          candidates.length
            ? `${selectedDirectionHint}：${external.libraries.length} 个外部库返回 ${candidates.length} 个真实候选${importedCandidates.length ? " + 会话导入库" : ""}${failedCount ? `；${failedCount} 个来源暂不可用` : ""}。`
            : "全部来源没有找到候选。可换一个关键词，或先导入 Figma / Iconfont 项目库。",
        );

        if (options?.announce) {
          setMessages((current) => [
            ...current,
            {
              role: "assistant",
              content: candidates.length
                ? `已完成真实外部来源检索。当前只把通过质量门槛的来源作为推荐方案；其余候选仍可在来源面板浏览。系统会保留选中来源的轮廓和构图，只规范化到 ${selectedTeamSpecLibrary.name}。`
                : "全部真实来源暂时没有匹配结果。可以换关键词，或粘贴 Figma / Iconfont 项目来源。",
            },
          ]);
        }
        return;
      }

      if (tab === "figma" && !importedIconfontIcons.some((asset) => asset.source === "figma-canvas" || asset.source === "team-library")) {
        setCanvasSourceCandidates([]);
        setSourceQuery(effectiveQuery);
        setSourceMessage("Figma 团队库还没有训练资产。粘贴 Figma 画布/节点链接后，我会读取现有 icon、训练入库并放到这里。");
        if (options?.announce) {
          setMessages((current) => [
            ...current,
            {
              role: "assistant",
              content: [
                `Figma 团队库是 ${selectedTeamSpecLibrary.skillName} 的内部成熟来源：只精确复用已验证源图，避免重复生成。`,
                "请粘贴 Figma 画布或 icon 区域链接；如果还没配置环境变量，也可以下一条直接粘贴 `figd_...` token，我会接着读取并训练入库。",
                "没有 Token 时，也可以从 Figma 复制/导出 SVG 粘贴进来，我会收录为团队训练库候选。",
              ].join("\n"),
            },
          ]);
        }
        return;
      }

      const isPackageSource = tab === "iconpark" || tab === "lucide" || tab === "tabler" || tab === "phosphor";
      const candidates = isPackageSource
        ? (await fetchPackageSourceAssets(tab, effectiveQuery)).map((asset, index) =>
            buildSourceCandidate(
              assetToSearchResult(asset, 12 - index / 10, `${sourceLibraryLabel(tab)} 官方包真实检索`),
              effectiveQuery,
              12 - index / 10,
              `${sourceLibraryLabel(tab)} 官方包真实检索`,
            ),
          )
        : buildSourceCandidates(effectiveQuery, tab, importedIconfontIcons);

      setCanvasSourceCandidates(candidates);
      setSourceQuery(effectiveQuery);
      setSourceMessage(
        tab === "iconfont" && !importedIconfontIcons.length
          ? "Iconfont 需要先导入项目 Symbol JS 链接；当前不展示模拟候选。"
          : candidates.length
            ? isPackageSource
              ? `${selectedDirectionHint}：${sourceLibraryLabel(tab)} 官方 npm 包索引返回 ${candidates.length} 个候选。`
              : `${selectedDirectionHint}：${sourceLibraryLabel(tab)} 已返回 ${candidates.length} 个候选。`
            : `${sourceLibraryLabel(tab)} 没有找到候选。`,
      );

      if (options?.announce) {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content:
              tab === "iconfont" && !importedIconfontIcons.length
                ? "Iconfont 需要粘贴项目 Symbol JS 链接后才能读取。"
                : `已打开 ${sourceLibraryLabel(tab)} 参考面板。可以选中或拖到画布。`,
          },
        ]);
      }
    } catch {
      const fallbackCandidates = tab === "curated" ? buildSourceCandidates(effectiveQuery, tab, importedIconfontIcons) : [];
      setCanvasSourceCandidates(fallbackCandidates);
      setSourceMessage(
        tab === "curated"
          ? "团队库检索暂不可用，已切到本地兜底候选。"
          : `${sourceLibraryLabel(tab)} 当前不可用；为避免误导，未展示模拟候选。`,
      );
    } finally {
      setSourceLoading(false);
    }
  }

  function updateSourceLibrary(tab: SourceLibraryTab, query = sourceQuery) {
    void loadSourceLibrary(tab, query);
  }

  function searchCurrentSourceLibrary(queryOverride?: string) {
    const query =
      queryOverride ||
      sourceQuery ||
      (selectedOption ? buildSemanticSourceQuery(brief, selectedOption, brief.sourceText) : brief.sourceText || brief.concept);
    const tab = searchableSourceTab(sourceLibraryTab);
    void loadSourceLibrary(tab, query, { announce: true });
  }

  function pushSourceCandidateBoard(candidates: SourceCandidate[], query: string, sourceLabel: string, tab?: SourceLibraryTab) {
    setCanvasSourceCandidates(candidates);
    setSourceQuery(query);
    if (tab) setSourceLibraryTab(tab);
    setIsSourcePanelCollapsed(false);
    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: candidates.length
	          ? `已打开 ${sourceLabel} 参考面板。可以选中或拖到画布；通过筛选后会保留来源轮廓与构图，并套用 ${selectedTeamSpecLibrary.name}。`
          : `暂时没找到合适的 ${sourceLabel} 参考。可以换个说法，或直接让 AI 生成。`,
      },
    ]);
  }

  function importInlineSourceAssets(content: string, queryOverride?: string) {
    const parsedSymbols = parseIconfontSymbols(content, "iconfont");
    const parsedSvgs = parseSvgAssets(content, "svg");
    const parsed = parsedSymbols.length ? parsedSymbols : parsedSvgs;

    if (!parsed.length) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "没有解析到可用 SVG。请粘贴完整 `<svg>...</svg>`，或 Iconfont 的 `<symbol>...</symbol>`。",
        },
      ]);
      return;
    }

    const sourceLabel = parsedSymbols.length ? "Iconfont Symbol" : "SVG";
    const query = queryOverride || sourceQuery || sourceLabel;
    const candidates = parsed.map((asset, index) =>
      buildSourceCandidate(asset, query || asset.name, 10 - index, parsedSymbols.length ? "真实 Iconfont symbol 导入" : "真实 SVG 导入"),
    );

    setImportedIconfontIcons((current) => [...current, ...parsed]);
    void trainTeamLibraryFromAssets(parsed, query, parsedSymbols.length ? "iconfont-symbol" : "pasted-svg");
    pushSourceCandidateBoard(candidates, query, sourceLabel, parsedSymbols.length ? "iconfont" : "curated");
    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: [
          `已导入 ${parsed.length} 个真实来源图标。`,
          `我已经把它们送进团队规范处理器：输出 ${activeOutputProfile.masterSize}×${activeOutputProfile.masterSize}、${activeOutputProfile.color}、${activeOutputProfile.strokeWidth}px、圆角线端。`,
          "下一步可以多选批量放到画布，或可选参考继续生成。",
        ].join("\n"),
      },
    ]);
  }

  async function importIconfontFromUrl(url: string, queryOverride?: string) {
    setSourceLoading(true);
    setSourceMessage("正在拉取 Iconfont 项目 Symbol JS…");

    try {
      const response = await fetch("/api/icon-sources/iconfont", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
      const payload = (await response.json()) as { assets?: IconAsset[]; message?: string };

      if (!response.ok) {
        throw new Error(payload.message || `Iconfont import failed: ${response.status}`);
      }

      const assets = payload.assets ?? [];
      const query = queryOverride || sourceQuery || "Iconfont 项目";
      const candidates = assets.map((asset, index) =>
        buildSourceCandidate(asset, query, 10 - index / 10, "真实 Iconfont 项目 Symbol JS 导入"),
      );

      setImportedIconfontIcons((current) => [...current, ...assets]);
      void trainTeamLibraryFromAssets(assets, query, "iconfont-symbol");
      setCanvasSourceCandidates(candidates);
      setSourceLibraryTab("iconfont");
      setSourceQuery(query);
      setIsSourcePanelCollapsed(false);
      setSourceMessage(assets.length ? `已真实导入 Iconfont 项目 ${assets.length} 个 symbol。` : "Iconfont 链接里没有解析到 symbol。");
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: assets.length
            ? [
                `已从 Iconfont 项目链接真实导入 ${assets.length} 个 symbol。`,
                "这些图标已收录到当前会话的 Iconfont 库，可以按语义检索、批量选择，并套团队规范输出。",
              ].join("\n")
            : "Iconfont 链接拉取成功，但没有解析到 `<symbol>`。请确认复制的是 Symbol JS 链接。",
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Iconfont 导入失败。";
      setSourceMessage(message);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `Iconfont 导入失败：${message}\n请粘贴 at.alicdn.com 的 Symbol JS 链接，或直接粘贴 symbol 代码。`,
        },
      ]);
    } finally {
      setSourceLoading(false);
    }
  }

  async function importFigmaCanvasFromUrl(url: string, queryOverride?: string, tokenOverride?: string) {
    const query = queryOverride || sourceQuery || brief.sourceText || "Figma 团队图标库";
    const token = tokenOverride || figmaSessionToken || undefined;

    setSourceLibraryTab("figma");
    setSourceLoading(true);
    setIsSourcePanelCollapsed(false);
    setSourceMessage("正在读取 Figma 画布里的现有 icon…");

    try {
      const payload = await fetchFigmaCanvasAssets(url, query, token);
      const assets = payload.assets;
      const candidates = assets.map((asset, index) =>
        buildSourceCandidate(asset, query, 14 - index / 10, "Figma 画布团队库真实读取"),
      );
      const recommended = recommendedSourceCandidates(candidates, 3);

      setPendingFigmaUrl("");
      setPendingFigmaQuery("");
      setImportedIconfontIcons((current) => [...current, ...assets]);
      void trainTeamLibraryFromAssets(assets, query, "figma-canvas");
      setCanvasSourceCandidates(candidates);
      setSourceQuery(query);
      setSourceMessage(assets.length ? payload.message : "Figma 画布读取完成，但没有可用 icon 候选。");
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: assets.length
            ? [
                `已从 Figma 画布读取并收录 ${assets.length} 个团队 icon 候选。`,
                recommended.length
                  ? `其中 ${recommended.length} 个通过当前语义与结构质量门槛，已作为首轮候选展示。`
                  : "当前候选没有通过质量门槛，因此不展示低质量方案凑数。",
                "选中后保留来源图标的可识别轮廓、部件关系和构图，只规范化线宽、圆角、间距、密度与可编辑节点。",
              ].join("\n")
            : "我读到了 Figma 画布，但没识别到可用 icon。建议传更具体的 icon 区域 node-id，或先从 Figma 导出 SVG 粘贴进来。",
          sourceCandidates: recommended,
          quickActions: recommended.length
            ? [{ label: "探索其他语义变体", value: "continue-ai-semantics" }]
            : assets.length
              ? [{ label: "团队候选未过门槛，继续检索外部来源", value: "search-source-library" }]
              : undefined,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Figma 画布读取失败。";
      setCanvasSourceCandidates([]);
      setSourceMessage(message);
      const needsToken = /FIGMA_ACCESS_TOKEN|Figma Token|token/i.test(message);
      if (needsToken) {
        setPendingFigmaUrl(url);
        setPendingFigmaQuery(query);
      }
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: needsToken
            ? [
                "已收到 Figma 链接，但当前还缺少 Figma 访问令牌。",
                "你可以直接在下一条消息粘贴 `figd_...` token，我会继续读取刚才这条链接；不用重新发链接。",
                "安全提醒：token 只用于当前会话请求。正式产品应放到后端密钥或用户授权里，不建议长期暴露在对话中。",
              ].join("\n")
            : [
                `Figma 画布读取暂时不可用：${message}`,
                "请确认链接是完整 Figma design/file URL，最好带 node-id，并且 token/账号有读取权限。",
                "短期演示可用替代方式：从 Figma 选中 icon 后复制/导出 SVG，粘贴到对话里，我会同样收录进团队库并套规范。",
              ].join("\n"),
        },
      ]);
    } finally {
      setSourceLoading(false);
    }
  }

  function chooseSourceCandidate(candidate: SourceCandidate) {
    setSelectedSource(candidate);
    setSourceQuery(candidate.name);
    setActiveTab("properties");
    setSourceMessage(`已选“${candidate.name}”作参考；这只影响来源选择，不会新开 A/B/C 语义分支。可拖入画布或继续在对话里选 AI 方向。`);
  }

  function placeRecommendedSourceCandidate(candidateId: string) {
    const candidate = canvasSourceCandidates.find((item) => item.id === candidateId);
    if (!candidate) return;
    const nextInstance = createInstanceFromCandidate(candidate, canvasInstances.length);
    setActiveCanvasInstances((current) => [...current, nextInstance]);
    setSelectedSource(candidate);
    setSelectedInstanceId(nextInstance.id);
    setIsSourcePanelCollapsed(true);
    setActiveTab("properties");
    window.requestAnimationFrame(() => focusCanvasInstance(nextInstance, { zoom: Math.max(canvasZoom, 0.9) }));
    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: [
          `已把 ${candidate.source} / ${candidate.name} 放入画布。`,
          `保留了来源图标的可识别轮廓、部件关系和构图；只按 ${selectedTeamSpecLibrary.name} 规范化线宽、圆角、间距、密度与可编辑节点。`,
          nextInstance.sourceConversionStatus === "reference_only"
            ? "当前来源结构无法安全转成 native shapes，已明确标记为仅参考，不会用 AI 模板冒充。"
            : "请在画布中检查后再确认预览与写入 Figma。",
        ].join("\n"),
      },
    ]);
  }

  function toggleCandidateSelection(candidateId: string) {
    const candidate = canvasSourceCandidates.find((item) => item.id === candidateId);
    if (!candidate) return;

    setSelectedSourceCandidates((current) =>
      current.some((item) => item.id === candidateId) ? current.filter((item) => item.id !== candidateId) : [...current, candidate],
    );
  }

  function selectVisibleCandidates() {
    const visibleCandidates = canvasSourceCandidates.slice(0, 12);
    setSelectedSourceCandidates((current) => {
      const nextById = new Map(current.map((candidate) => [candidate.id, candidate]));
      visibleCandidates.forEach((candidate) => nextById.set(candidate.id, candidate));
      return Array.from(nextById.values());
    });
  }

  function createInstanceFromCandidate(candidate: SourceCandidate, index: number, position?: { x: number; y: number }) {
    const sourcePayload = buildSourceCandidateCanvasPayload(candidate, brief);
    const candidateName = toIconComponentName(candidate.name, sourcePayload.normalizedBrief.semanticName, activeOutputProfile.componentPrefix);

    return createCanvasInstance({
      brief: sourcePayload.normalizedBrief,
      elements: sourcePayload.elements,
      optionId: sourcePayload.normalizedOptionId,
      sourceName: `${candidate.source} / ${candidate.name}`,
      index,
      position,
      previewSvg: sourcePayload.previewSvg,
      previewShapes: sourcePayload.previewShapes,
      sourcePreviewSvg: candidate.normalizedSvg,
      sourceCandidateId: candidate.id,
      sourceConversionStatus: sourcePayload.sourceConversionStatus,
      reviewNote: sourcePayload.reviewNote,
      name: candidateName,
      componentPrefix: activeOutputProfile.componentPrefix,
      previewColor: activeOutputProfile.color,
    });
  }

  function focusCanvasArea(area: { x: number; y: number; width: number; height: number }, options?: { zoom?: number }) {
    const viewport = canvasViewportRef.current;
    if (!viewport) return;

    const nextZoom = options?.zoom ?? canvasZoom;
    const centerX = area.x + area.width / 2;
    const centerY = area.y + area.height / 2;

    if (options?.zoom !== undefined) setCanvasZoom(nextZoom);
    setCanvasPan({
      x: clampCanvasPanValue((canvasSurfaceWidth / 2 - centerX) * nextZoom),
      y: clampCanvasPanValue((canvasSurfaceHeight / 2 - centerY) * nextZoom),
    });
  }

  function focusCanvasInstance(instance: IconCanvasInstance, options?: { zoom?: number }) {
    const size = canvasInstanceBaseSize * instance.scale;
    focusCanvasArea({ x: instance.x, y: instance.y, width: size, height: size }, options);
  }

  function focusSelectedCanvasInstance() {
    if (!selectedInstance) return;
    focusCanvasInstance(selectedInstance, { zoom: Math.max(canvasZoom, 0.9) });
  }

  function focusCanvasInstances(instances: IconCanvasInstance[]) {
    if (!instances.length) {
      if (showPreview && selectedOption) {
        focusCanvasArea({ x: 120, y: 110, width: canvasInstanceBaseSize, height: canvasInstanceBaseSize }, { zoom: 1 });
        return;
      }

      setCanvasZoom(1);
      setCanvasPan({ x: 0, y: 0 });
      return;
    }

    const bounds = instances.reduce(
      (currentBounds, instance) => {
        const size = canvasInstanceBaseSize * instance.scale;
        return {
          minX: Math.min(currentBounds.minX, instance.x),
          minY: Math.min(currentBounds.minY, instance.y),
          maxX: Math.max(currentBounds.maxX, instance.x + size),
          maxY: Math.max(currentBounds.maxY, instance.y + size),
        };
      },
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
    );
    const viewport = canvasViewportRef.current;
    const viewportRect = viewport?.getBoundingClientRect();
    const paddedWidth = Math.max(240, bounds.maxX - bounds.minX + 160);
    const paddedHeight = Math.max(240, bounds.maxY - bounds.minY + 160);
    const zoomByWidth = viewportRect ? viewportRect.width / paddedWidth : canvasZoom;
    const zoomByHeight = viewportRect ? viewportRect.height / paddedHeight : canvasZoom;
    const nextZoom = clampCanvasZoom(Math.min(1.4, zoomByWidth, zoomByHeight));

    focusCanvasArea(
      {
        x: bounds.minX - 80,
        y: bounds.minY - 80,
        width: paddedWidth,
        height: paddedHeight,
      },
      { zoom: nextZoom },
    );
  }

  function focusAllCanvasInstances() {
    focusCanvasInstances(canvasInstances);
  }

  function selectAndFocusCanvasInstance(instance: IconCanvasInstance) {
    setSelectedInstanceId(instance.id);
    setIsSourcePanelCollapsed(true);
    setActiveTab("properties");
    focusCanvasInstance(instance, { zoom: Math.max(canvasZoom, 0.9) });
  }

  function addSelectedCandidatesToCanvas() {
    const selectedCandidates = selectedSourceCandidates;
    if (!selectedCandidates.length) return;

    const baseIndex = canvasInstances.length;
    const nextInstances = selectedCandidates.map((candidate, index) => createInstanceFromCandidate(candidate, baseIndex + index));

    setActiveCanvasInstances((current) => [...current, ...nextInstances]);
    setSelectedInstanceId(nextInstances.at(-1)?.id);
    const targetInstance = nextInstances.at(-1);
    if (targetInstance) focusCanvasInstance(targetInstance);
    setSelectedSource(selectedCandidates[0]);
    setSelectedSourceCandidates([]);
    setIsSourcePanelCollapsed(false);
    setActiveTab("properties");
    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: [
          `已把 ${nextInstances.length} 个图标批量放到画布。`,
          `画布中保留来源库图标的原始形态，同时统一为 ${selectedTeamSpecLibrary.name}：${activeOutputProfile.masterSize}×${activeOutputProfile.masterSize}、${activeOutputProfile.color}、${activeOutputProfile.strokeWidth}px、圆角线端。`,
          "如果某个来源 SVG 结构太复杂，系统会明确标记为仅参考，不会再用 AI 模板冒充来源图标。",
        ].join("\n"),
      },
    ]);
  }

  function startSourceCandidateDrag(event: React.DragEvent<HTMLButtonElement>, candidate: SourceCandidate) {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(sourceCandidateDragType, candidate.id);
    event.dataTransfer.setData("text/plain", candidate.name);
  }

  function hasSourceCandidateDrag(event: React.DragEvent<HTMLElement>) {
    return Array.from(event.dataTransfer.types).includes(sourceCandidateDragType);
  }

  function getCanvasDropPosition(event: React.DragEvent<HTMLDivElement>) {
    const surface = canvasSurfaceRef.current;
    if (!surface) return undefined;

    const rect = surface.getBoundingClientRect();
    const rawX = (event.clientX - rect.left) / canvasZoom;
    const rawY = (event.clientY - rect.top) / canvasZoom;

    return {
      x: clampNumber(rawX - canvasInstanceBaseSize / 2, 24, canvasSurfaceWidth - canvasInstanceBaseSize - 24),
      y: clampNumber(rawY - canvasInstanceBaseSize / 2, 24, canvasSurfaceHeight - canvasInstanceBaseSize - 24),
    };
  }

  function handleCanvasDragOver(event: React.DragEvent<HTMLDivElement>) {
    if (!hasSourceCandidateDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setIsCanvasDropActive(true);
  }

  function handleCanvasDragLeave(event: React.DragEvent<HTMLDivElement>) {
    if (!hasSourceCandidateDrag(event)) return;
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
    setIsCanvasDropActive(false);
  }

  function handleCanvasDrop(event: React.DragEvent<HTMLDivElement>) {
    if (!hasSourceCandidateDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setIsCanvasDropActive(false);

    const candidateId = event.dataTransfer.getData(sourceCandidateDragType);
    const candidate = canvasSourceCandidates.find((item) => item.id === candidateId);
    const position = getCanvasDropPosition(event);
    if (!candidate || !position) return;

    const nextInstance = createInstanceFromCandidate(candidate, canvasInstances.length, position);

    setActiveCanvasInstances((current) => [...current, nextInstance]);
    setSelectedInstanceId(nextInstance.id);
    focusCanvasInstance(nextInstance);
    setSelectedSource(candidate);
    setActiveTab("properties");
    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: [
          `已把「${candidate.name}」拖入画布。`,
          nextInstance.sourceConversionStatus === "team_normalized"
            ? `我已保留来源库图标形态，并套用 ${selectedTeamSpecLibrary.name}：${activeOutputProfile.masterSize}×${activeOutputProfile.masterSize} / ${activeOutputProfile.strokeWidth}px / ${activeOutputProfile.color} / 圆角线端。`
            : "这个来源图标已保留形态并进入团队规范检查；复杂 SVG 会标记待确认，不会再替换成 AI 模板。",
        ].join("\n"),
      },
    ]);
  }

  function applyBatchInput(input: string, options?: { appendUserMessage?: boolean }) {
    const figmaUrl = extractFigmaUrl(input);
    if (figmaUrl) {
      void importFigmaCanvasFromUrl(figmaUrl, input);
      return;
    }

    const tasks = buildBatchTasksFromInput(input, inferContext(input, brief.context || "团队产品界面"));
    const allCandidates = tasks.flatMap((task) => buildSourceLibraryCandidates(task.prompt, importedIconfontIcons).slice(0, 1));

    setWorkbenchMode("batch");
    setBatchInput(input);
    setBatchTasks(tasks);
    setCanvasSourceCandidates(allCandidates.slice(0, 12));
    setSourceLibraryTab("lucide");
    setSelectedSourceCandidates([]);
    setIsSourcePanelCollapsed(false);
    setActiveTab("layers");
    setMessages((current) => [
      ...current,
      ...(options?.appendUserMessage ? [{ role: "user" as const, content: "我需要批量生成一组图标" }] : []),
      {
        role: "assistant",
        content: tasks.length
          ? [
              `我识别到这是批量图标任务，已拆成 ${tasks.length} 个图标：${tasks.map((task) => task.name).join("、")}。`,
              "这里不会再走单个图标的 A/B/C 语义预览；每个图标会作为独立任务进入画布。",
              "下一步：在左侧确认清单后点击“放入画布”，再逐个检查规范和视觉质量。",
            ].join("\n")
          : "我判断这是批量任务，但没拆出明确图标名。请粘贴一组名称，例如：阅读、收藏、评论、下载、设置。",
      },
    ]);
  }

  function parseBatchProductionInput() {
    applyBatchInput(batchInput);
  }

  function queueBatchTasksToCanvas() {
    if (!batchTasks.length) return;

    const baseIndex = canvasInstances.length;
    const nextInstances = batchTasks.map((task, index) => {
      const taskBrief = buildBriefFromMessage(task.prompt, brief);
      const bestCandidate = buildAutoSourceCandidates(task.prompt)[0];
      const sourcePayload = bestCandidate ? buildSourceCandidateCanvasPayload(bestCandidate, taskBrief) : undefined;

      return createCanvasInstance({
        brief: taskBrief,
        elements: sourcePayload?.elements ?? buildInitialCanvasElements(taskBrief),
        optionId: sourcePayload?.normalizedOptionId ?? "A",
        sourceName: bestCandidate ? `${bestCandidate.source} / ${bestCandidate.name}` : `${task.sourceKind} / ${task.name}`,
        index: baseIndex + index,
        previewSvg: sourcePayload?.previewSvg,
        previewShapes: sourcePayload?.previewShapes,
        sourcePreviewSvg: bestCandidate?.normalizedSvg,
        sourceCandidateId: bestCandidate?.id,
        sourceConversionStatus: sourcePayload?.sourceConversionStatus,
        reviewNote: sourcePayload?.reviewNote,
        name: toIconComponentName(
          bestCandidate?.name ?? task.name,
          sourcePayload?.normalizedBrief.semanticName ?? taskBrief.semanticName,
          activeOutputProfile.componentPrefix,
        ),
        componentPrefix: activeOutputProfile.componentPrefix,
        previewColor: activeOutputProfile.color,
      });
    });

    setActiveCanvasInstances((current) => [...current, ...nextInstances]);
    setSelectedInstanceId(nextInstances.at(-1)?.id);
    const targetInstance = nextInstances.at(-1);
    if (targetInstance) focusCanvasInstance(targetInstance);
    setBatchTasks((current) => current.map((task) => ({ ...task, status: "queued" })));
    setIsSourcePanelCollapsed(true);
    setActiveTab("properties");
    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: [
          `已把 ${nextInstances.length} 个图标批量放到画布。`,
          "画布中显示的是批量生成的团队 native 草稿；来源库结果只作为语义参考，不作为最终几何。",
          "你可以在右侧逐个确认形态、线宽和安全区；确认后再转 Icon Spec / Figma native nodes。",
        ].join("\n"),
      },
    ]);
  }

  function clearBatchProduction() {
    setBatchInput("");
    setBatchTasks([]);
    setSelectedSourceCandidates([]);
    setIsSourcePanelCollapsed(false);
  }

  function approvePreviewQualityIssue(issueId: string) {
    const issue = previewQualityIssues.find((candidate) => candidate.id === issueId);
    if (!issue || issue.severity === "blocker") return;
    setApprovedPreviewWarningIds((current) => (current.includes(issue.id) ? current : [...current, issue.id]));
  }

  function approveAllPreviewQualityWarnings() {
    setApprovedPreviewWarningIds((current) => Array.from(new Set([...current, ...previewQualityIssues.map((issue) => issue.id)])));
  }

  function approveCurrentPreview(userContent?: string) {
    if (!showPreview || !selectedOption) return;

    if (specWarnings.length) {
      setActiveTab("quality");
      setMessages((current) => [
        ...current,
        ...(userContent ? [{ role: "user" as const, content: userContent }] : []),
        {
          role: "assistant",
          content: [
            "我先不批准这个预览。",
            `原因：当前还没有通过 ${selectedTeamSpecLibrary.skillName} 的质量门禁。`,
            ...specWarnings.map((warning) => `- ${warning}`),
            "先修预览，再进入 Icon Spec / Figma native-node 交付。",
          ].join("\n"),
        },
      ]);
      return;
    }

    setApprovedPreview(true);
    setPhase("draw");
    setActiveTab("spec");
    setMessages((current) => [
      ...current,
      ...(userContent ? [{ role: "user" as const, content: userContent }] : []),
      {
        role: "assistant",
        content:
          "Preview status: 已确认\nConfirmed visual direction: " +
          selectedOption.title +
          "\nNext: 已允许生成 Icon Spec JSON，并准备 Figma native-node draw payload。最终仍需要截图门禁确认。",
        actions: [
          {
            id: "preview_approval",
            label: "Preview Approval",
            detail: "用户已确认当前预览，可以进入 Phase 4A。",
            status: "done",
          },
          {
            id: "icon_spec",
            label: "Phase 4A · Icon Spec JSON",
            detail: "把批准预览转换为 contract-first native-node 规格。",
            status: specWarnings.length ? "blocked" : "done",
            evidence: specWarnings.length ? "仍有交付警告，需先修正再写入 Figma。" : "Spec draft 已就绪。",
          },
          {
            id: "figma_native_draw",
            label: "Phase 4B · Figma Native Draw",
            detail: "生成 use_figma 脚本；运行后还需截图门禁。",
            status: specWarnings.length ? "blocked" : "planned",
          },
          {
            id: "screenshot_gate",
            label: "截图核对",
            detail: "写入 Figma 后截图比对批准预览。",
            status: "planned",
          },
        ],
        mode: agentMode,
        confidence: 1,
        quickActions: specWarnings.length
          ? undefined
          : [
              {
                label: "准备写入 Figma",
                value: "prepare-production",
              },
            ],
      },
    ]);
  }

  function selectOptionAndPreview(optionId: SemanticOption["id"], userContent?: string) {
    const option = semanticOptions.find((item) => item.id === optionId);
    if (!option) return;

    applySemanticOption(optionId);
    setShowPreview(false);
    setPhase("semantic");
    setActiveTab("layers");
    setIsSourcePanelCollapsed(false);
    const semanticSourceQuery = buildSemanticSourceQuery(brief, option, brief.sourceText);
    setSourceQuery(semanticSourceQuery);
    void loadSourceLibrary(searchableSourceTab(sourceLibraryTab), semanticSourceQuery);
    const nextElements = canvasElements.map((element) => {
      if (element.id === "plus") return { ...element, visible: optionId === "B" };
      if (element.id === "dot") return { ...element, visible: optionId === "C" };
      return element;
    });
    setCanvasElements(nextElements);
    const variants = buildPreviewVariants(brief, option);
    const nextInstances = buildAiPreviewGridInstances({
      brief,
      option,
      variants,
      startIndex: canvasInstances.length,
      componentPrefix: activeOutputProfile.componentPrefix,
      previewColor: activeOutputProfile.color,
    });
    const passingCount = variants.filter((variant) => variant.qualityStatus !== "blocked").length;

    setActiveCanvasInstances((current) => [
      ...current.filter((instance) => !instance.sourceName?.startsWith(aiPreviewGridSourcePrefix)),
      ...nextInstances,
    ]);
    setSelectedInstanceId(undefined);
    setSelectedPreviewVariantId(undefined);
    setApprovedPreview(false);
    resetProductionState();
    window.requestAnimationFrame(() => focusCanvasInstances(nextInstances));

    setMessages((current) => [
      ...current,
      {
        role: "user",
        content: userContent ?? `我选 ${optionId}，展开这个方向的 AI 方案`,
      },
      {
        role: "assistant",
        content: [
          `收到，我把方向 ${optionId}「${option.title}」细化成 10 个 AI 图标方案，并直接放到中间画布。`,
          `画布默认两排展示；其中 ${passingCount}/${variants.length} 个通过快速质量门禁。`,
          "左侧不再堆缩略图卡片。你在画布里点选某个方案后，可以继续确认预览、调整、写入 Figma。",
        ].join("\n"),
        quickActions: [
          {
            label: "定位画布里的 AI 方案",
            value: "focus-ai-variants",
          },
          {
            label: "写入 Figma 画布",
            value: "open-figma-write",
          },
        ],
      },
    ]);
  }

  async function selectOptionAndSearchSources(optionId: SemanticOption["id"], userContent?: string) {
    const option = semanticOptions.find((item) => item.id === optionId);
    if (!option) return;

    applySemanticOption(optionId);
    setShowPreview(false);
    setPhase("semantic");
    setActiveTab("layers");
    setSelectedInstanceId(undefined);
    setSelectedPreviewVariantId(undefined);
    setApprovedPreview(false);
    resetProductionState();

    const semanticSourceQuery = buildSemanticSourceQuery(brief, option, brief.sourceText);
    setSourceQuery(semanticSourceQuery);
    setSourceLibraryTab("all");
    setIsSourcePanelCollapsed(false);
    setSourceLoading(true);
    setSourceMessage("正在按选定语义检索真实外部来源…");

    try {
      const routeDecision = await requestSourceDecision(semanticSourceQuery, { variants: true, semanticQuery: brief.label });
      const external = await fetchApprovedExternalAssets(semanticSourceQuery, 36);
      const packageCandidates = external.assets.map((asset, index) =>
        buildSourceCandidate(
          assetToSearchResult(asset, 14 - index / 100, `${asset.source} 官方包真实检索`),
          semanticSourceQuery,
          14 - index / 100,
          `${asset.source} 官方包真实检索`,
        ),
      );
      const importedCandidates = buildSessionImportedSourceCandidates(semanticSourceQuery, importedIconfontIcons);
      const candidates = mergeSourceCandidates([...importedCandidates, ...packageCandidates], 72);
      const recommended = recommendedSourceCandidates(candidates, 3);

      setCanvasSourceCandidates(candidates);
      setSourceMessage(
        recommended.length
          ? `已从 ${external.libraries.length} 个真实外部库筛出 ${recommended.length} 个高质量推荐；完整候选仍可继续浏览。`
          : "真实外部来源已检索，但没有候选通过当前质量门槛；可以调整关键词或进入 AI 兜底。",
      );
      setMessages((current) => [
        ...current,
        {
          role: "user",
          content: userContent ?? `我选 ${optionId}，先从来源库检索参考`,
        },
        {
          role: "assistant",
          content: [
            `已按方向 ${optionId}「${option.title}」完成真实来源检索。`,
            routeDecision.adjacentMatches.length
              ? `成熟库相近参考：${routeDecision.adjacentMatches[0].label ?? routeDecision.adjacentMatches[0].name}，仅作为约束，不直接改画。`
              : undefined,
            recommended.length
              ? `推荐 ${recommended.length} 个来源方案。选中后会保留原始轮廓、部件关系和构图，只规范化线宽、圆角、间距、密度与可编辑节点。`
              : "没有来源通过语义/结构质量门槛，AI 生成现在才作为兜底。",
          ]
            .filter(Boolean)
            .join("\n"),
          sourceCandidates: recommended,
          quickActions: recommended.length
            ? undefined
            : [
                {
                  label: "外部来源不合适，使用 AI 兜底",
                  value: `generate-option-${optionId.toLowerCase()}`,
                },
              ],
        },
      ]);
    } catch {
      setSourceMessage("外部来源检索暂不可用；没有展示模拟候选。可以稍后重试或明确使用 AI 兜底。");
      setMessages((current) => [
        ...current,
        {
          role: "user",
          content: userContent ?? `我选 ${optionId}，先从来源库检索参考`,
        },
        {
          role: "assistant",
          content: "真实外部来源当前不可用，我没有伪造候选。你可以重试，或明确使用 AI 兜底。",
          quickActions: [{ label: "使用 AI 兜底", value: `generate-option-${optionId.toLowerCase()}` }],
        },
      ]);
    } finally {
      setSourceLoading(false);
    }
  }

  function selectPreviewVariant(optionId: SemanticOption["id"], variantId: PreviewVariantId, userContent?: string) {
    const option = semanticOptions.find((item) => item.id === optionId);
    if (!option) return;

    const shapeOptionId = resolveShapeOptionId(brief, option);
    const nextPreviewShapes = buildQualityAssuredPreviewShapes(brief, shapeOptionId, variantId);
    const nextPreviewReview = reviewGeneratedPreview(brief, shapeOptionId, nextPreviewShapes);

    setSelectedOptionId(optionId);
    setSelectedPreviewVariantId(variantId);
    setShowPreview(true);
    setPhase("preview");
    setActiveTab("quality");
    setIsSourcePanelCollapsed(true);
    setSelectedInstanceId(undefined);
    setApprovedPreview(false);
    resetProductionState();

    const previewGuidance = nextPreviewReview.blockers.length
      ? "已生成这个 AI 方案的 SVG 预览，但质量门禁发现 24px 下可能过密。我先不给交付，可以换另一个方案，或回到方向选择。"
      : "已生成这个 AI 方案的 SVG 预览，并放到画布。满意后再批准进入 Icon Spec / Figma native 交付。";

    setMessages((current) => [
      ...current,
      {
        role: "user",
        content: userContent ?? `我选方案 ${variantId}，生成 SVG 预览`,
      },
      {
        role: "assistant",
        content: previewGuidance,
        quickActions: nextPreviewReview.blockers.length
          ? [
              {
                label: "回到这个方向的其它方案",
                value: optionActionValue(optionId),
              },
            ]
          : [
              {
                label: "满意这个 AI 预览，继续交付",
                value: "approve-preview",
              },
            ],
      },
    ]);
  }

  function activateCanvasPreviewInstance(instance: IconCanvasInstance) {
    if (!instance.previewVariantId || !instance.optionId) return;

    const option = semanticOptions.find((item) => item.id === instance.optionId);
    const shapeOptionId = option ? resolveShapeOptionId(brief, option) : instance.optionId;
    const shapes = instance.previewShapes?.length
      ? instance.previewShapes
      : buildQualityAssuredPreviewShapes(brief, shapeOptionId, instance.previewVariantId);
    const previewInstanceReview = reviewGeneratedPreview(brief, shapeOptionId, shapes);

    setSelectedOptionId(instance.optionId);
    setSelectedPreviewVariantId(instance.previewVariantId);
    setCanvasElements(cloneCanvasElements(instance.elements));
    setShowPreview(true);
    setPhase("preview");
    setActiveTab(previewInstanceReview.blockers.length ? "quality" : "properties");
    setIsSourcePanelCollapsed(true);
    setApprovedPreview(false);
    resetProductionState();
  }

  const drawBlockedReasons = [
    !showPreview ? "需要先生成 SVG 预览" : undefined,
    !selectedOption ? "需要先确认 Option A/B/C 语义方向" : undefined,
    !approvedPreview ? "需要先批准当前预览" : undefined,
    specWarnings.length ? "需要先解决实时交付警告" : undefined,
  ].filter((reason): reason is string => Boolean(reason));
  const canGenerateFigmaPayload = drawBlockedReasons.length === 0;
  const logicalNativeShapes = usesGeneratedPreview
    ? previewShapes
    : drawableElements
        .map((element) => buildNativeShapeContract(element, brief.glyphKind))
        .filter((shape): shape is NativeShapeContract => Boolean(shape));
  const nativeShapes = scaleNativeShapes(logicalNativeShapes, activeOutputProfile.scale);
  const iconSpecContract: IconSpecContract = {
    meta: {
      name: `${activeOutputProfile.componentPrefix}${brief.semanticName}`,
      label: brief.label,
      size: activeOutputProfile.masterSize,
      grid: activeOutputProfile.masterSize,
      context: brief.context,
      style: "outline",
      color_mode: "monochrome",
      corner_radius: "rounded",
      selected_direction: selectedOption?.title ?? "pending semantic approval",
      preview_status: approvedPreview ? "approved" : "waiting",
      skill_id: selectedTeamSpecLibraryId,
      platform: activeOutputProfile.platform,
      logical_size: activeOutputProfile.logicalSize,
      runtime_mode: "strict",
      source: selectedSource
        ? {
            type: selectedSource.source,
            name: selectedSource.name,
            license: selectedSource.license,
            processor: "team-spec-normalizer",
            note: "Source SVG is used as semantic reference only; final Figma output is rebuilt as editable native nodes.",
          }
        : {
            type: "ai-semantic",
            name: brief.concept,
            license: "internal-generation",
            processor: "team-spec-normalizer",
            note: "Generated from brief and semantic options; final Figma output is editable native nodes.",
          },
    },
    canvas: {
      padding: activeOutputProfile.padding,
      live_area: activeOutputProfile.liveArea,
      optical_center: true,
    },
    shapes: nativeShapes,
    strokes: {
      color: activeOutputProfile.color,
      width: activeOutputProfile.strokeWidth,
      cap: "round",
      join: "round",
    },
    validation: {
      status: !showPreview || !selectedOption ? "blocked" : specWarnings.length ? "needs_review" : "pass",
      warnings: specWarnings,
      manual_approved_warnings: approvedPreviewQualityIssues.map((issue) => issue.id),
      output: "Figma native nodes, not pasted SVG",
    },
  };
  const figmaNativeScript = buildFigmaNativeScript(iconSpecContract);
  const visualReviewItems = buildVisualReviewItems({
    hasPreview: showPreview,
    approvedPreview,
    canGenerateFigmaPayload,
    productionRun,
    specWarnings,
    previewReview,
    drawableCount: drawableElements.length,
    selectedInstance,
  });
  const visualReviewPassCount = visualReviewItems.filter((item) => item.status === "pass").length;
  const visualReviewBlockedCount = visualReviewItems.filter((item) => item.status === "blocked").length;
  const selectedReviewStatus = selectedInstance?.reviewStatus ?? "pending";
  const libraryInstanceCount = canvasInstances.filter((instance) => instance.reviewStatus === "library").length;

  function updateSelectedInstanceReview(status: ManualReviewStatus, note: string) {
    if (!selectedInstanceId) return;

    setActiveCanvasInstances((current) =>
      current.map((instance) =>
        instance.id === selectedInstanceId
          ? {
              ...instance,
              reviewStatus: status,
              reviewNote: note,
            }
          : instance,
        ),
    );
  }

  function approveSelectedQualityIssue(issueId: string) {
    if (!selectedInstanceId) return;
    const issue = selectedInstanceQualityIssues.find((candidate) => candidate.id === issueId);
    if (!issue || issue.severity === "blocker") return;

    setActiveCanvasInstances((current) =>
      current.map((instance) =>
        instance.id === selectedInstanceId
          ? {
              ...instance,
              qualityApprovedIssueIds: Array.from(new Set([...(instance.qualityApprovedIssueIds ?? []), issue.id])),
              reviewStatus: "approved",
              reviewNote: `已人工批准「${issue.title}」：${issue.message}`,
            }
          : instance,
      ),
    );
  }

  function approveSelectedQualityWarnings() {
    if (!selectedInstanceId || selectedInstanceBlockers.length) return;
    const warningIds = selectedInstanceQualityIssues.filter((issue) => issue.severity === "warning").map((issue) => issue.id);
    if (!warningIds.length) return;

    setActiveCanvasInstances((current) =>
      current.map((instance) =>
        instance.id === selectedInstanceId
          ? {
              ...instance,
              qualityApprovedIssueIds: Array.from(new Set([...(instance.qualityApprovedIssueIds ?? []), ...warningIds])),
              reviewStatus: "approved",
              reviewNote: `已人工批准 ${warningIds.length} 条质量警告；硬阻断仍需修复。`,
            }
          : instance,
      ),
    );
  }

  function focusQualityIssue(issue: IconQualityIssue) {
    if (issue.elementId) setSelectedElementId(issue.elementId);
    if (issue.stage === "geometry") {
      setActiveTab("layers");
    } else {
      setActiveTab("properties");
    }
    if (issue.stage === "source") setIsSourcePanelCollapsed(false);
  }

  async function approveSelectedInstanceIntoTeamLibrary() {
    if (!selectedInstance) return;

    updateSelectedInstanceReview("library", "已加入团队资产库，可按名称、来源、语义和规范状态复用。");

    const svg = selectedInstance.previewSvg || selectedInstance.sourcePreviewSvg || buildPreviewSvgFromElements(selectedInstance.elements, selectedInstance.glyphKind);
    const asset: IconAsset = {
      id: selectedInstance.sourceCandidateId || selectedInstance.id,
      name: selectedInstance.name,
      category: selectedInstance.glyphKind,
      tags: [
        selectedInstance.name,
        selectedInstance.glyphKind,
        selectedInstance.sourceName,
        selectedInstance.optionId ? `option-${selectedInstance.optionId}` : undefined,
        selectedInstance.sourceConversionStatus,
        "人工审核通过",
      ].filter((tag): tag is string => Boolean(tag)),
      source: selectedInstance.sourceName?.includes("figma") ? "figma-canvas" : selectedInstance.sourceName?.includes("Iconfont") ? "iconfont-symbol" : "pasted-svg",
      license: "team-internal",
      svg,
    };

    await trainTeamLibraryFromAssets([asset], `${brief.concept} ${brief.context} ${selectedInstance.name}`, "canvas-review");
    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: [
          `「${selectedInstance.name}」已真实写入团队训练库。`,
          "之后在 Figma 团队库 / 全部来源中，会优先按语义召回这个成熟图标。",
        ].join("\n"),
      },
    ]);
  }

  async function copyFigmaNativeScript() {
    if (!canGenerateFigmaPayload) return;

    try {
      await navigator.clipboard.writeText(figmaNativeScript);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  function buildBatchFigmaWriteItems(): BatchFigmaWriteItem[] {
    return canvasLayers.flatMap((layer) =>
      layer.instances.map((instance, index) => {
        const spec = buildIconSpecFromCanvasInstance(
          instance,
          `${layer.name} / 批量写入`,
          activeOutputProfile,
          selectedTeamSpecLibraryId,
        );
        return {
          id: instance.id,
          name: instance.name,
          sourceName: instance.sourceName ?? "AI semantic",
          position: {
            x: 80 + index * 48,
            y: 80 + canvasLayers.findIndex((item) => item.id === layer.id) * 72,
          },
          spec,
        };
      }),
    );
  }

  async function prepareBatchFigmaWrite() {
    const targetUrl = figmaTargetUrl.trim();
    if (!targetUrl) {
      setBatchFigmaWriteStatus("blocked");
      setBatchFigmaWriteMessage("请先填写目标 Figma 文件或节点链接。");
      return;
    }

    const unresolvedInstances = canvasLayers.flatMap((layer) =>
      layer.instances.flatMap((instance) => {
        const approvedIssueIds = new Set(instance.qualityApprovedIssueIds ?? []);
        const unresolvedIssues = getCanvasInstanceQualityIssues(instance, activeOutputProfile).filter(
          (issue) => issue.severity === "blocker" || !approvedIssueIds.has(issue.id),
        );
        return unresolvedIssues.length ? [{ layerId: layer.id, instance, issues: unresolvedIssues }] : [];
      }),
    );

    if (unresolvedInstances.length) {
      const firstBlocked = unresolvedInstances[0];
      const firstIssue = firstBlocked.issues[0];
      setActiveCanvasLayerId(firstBlocked.layerId);
      setSelectedInstanceId(firstBlocked.instance.id);
      setActiveTab("quality");
      setIsFigmaSetupExpanded(true);
      setBatchFigmaWriteStatus("blocked");
      setBatchFigmaWriteMessage(
        `写入停在「${qualityStageLabel(firstIssue.stage)}」：${firstBlocked.instance.name} / ${firstIssue.title}。${firstIssue.message} 还有 ${unresolvedInstances.length} 个图标需要处理。`,
      );
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: [
            `Figma 写入没有投递，当前卡在「${qualityStageLabel(firstIssue.stage)}」。`,
            `图标：${firstBlocked.instance.name}`,
            `问题：${firstIssue.message}`,
            firstIssue.severity === "blocker"
              ? "这是硬阻断，必须修复或更换来源，不能人工绕过。"
              : "可以在质量面板编辑修复，也可以人工批准这条偏差后继续。",
          ].join("\n"),
        },
      ]);
      return;
    }

    const items = buildBatchFigmaWriteItems();
    if (!items.length) {
      setBatchFigmaWriteStatus("blocked");
      setBatchFigmaWriteMessage("画布里还没有可写入的 icon。先把生成结果或来源库图标放到中间画布。");
      return;
    }

    setActiveTab("spec");
    setBatchFigmaWriteStatus("building");
    setBatchFigmaWriteMessage("正在校验目标 Figma 文件，并生成批量 JSON 规格与 native 执行器…");
    setFigmaWriteJob(undefined);
    setBatchFigmaCopyStatus("idle");
    setBatchFigmaJsonCopyStatus("idle");

    try {
      const response = await fetch("/api/figma-batch-write", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUrl,
          token: figmaWriteToken.trim() || figmaSessionToken.trim() || undefined,
          items,
          skillId: selectedTeamSpecLibraryId,
          skillNames: activeOutputProfile.skillNames,
        }),
      });
      const payload = (await response.json()) as BatchFigmaWriteRun;

      setBatchFigmaWriteRun(payload);
      const isReady = response.ok && payload.status === "ready_for_figma";
      setBatchFigmaWriteStatus(isReady ? "ready" : "blocked");
      setBatchFigmaWriteMessage(payload.summary || "批量写入任务已生成。");

      let writeJob: FigmaWriteJob | undefined;
      if (isReady) {
        const jobResponse = await fetch("/api/figma-write-jobs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            batchRunId: payload.id,
            target: payload.target,
            items,
          }),
        });
        const jobPayload = (await jobResponse.json().catch(() => ({}))) as { job?: FigmaWriteJob; message?: string };

        if (jobResponse.ok && jobPayload.job) {
          writeJob = jobPayload.job;
          setFigmaWriteJob(jobPayload.job);
          setBatchFigmaWriteMessage(
            `${jobPayload.message ?? "已投递 Figma 插件写入任务。"} 在 Figma 里运行 figma-plugin/IconOps JSON Native Writer，点击“拉取最新任务并写入”。`,
          );
        } else {
          setFigmaWriteJob(undefined);
          setBatchFigmaWriteStatus("blocked");
          setBatchFigmaWriteMessage(jobPayload.message ? `任务未投递：${jobPayload.message}` : "JSON 已生成，但投递 Figma 插件桥失败。");
        }
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            payload.status === "ready_for_figma"
              ? [
                  `已准备并投递 ${payload.itemCount} 个图标的 Icon Spec JSON。`,
                  "网页端已经生成真实写入任务；Figma 插件会按 JSON 逐层创建 rectangle / vector / line / ellipse 等 native nodes。",
                  writeJob
                    ? `任务 ID：${writeJob.id}。在 Figma 里运行 figma-plugin/IconOps JSON Native Writer，点击“拉取最新任务并写入”。`
                    : "注意：JSON 已生成，但插件桥任务未成功创建，请看顶部状态。",
                ].join("\n")
              : payload.summary,
          actions: payload.gates?.map((gate) => ({
            id: gate.id,
            label: gate.label,
            detail: gate.detail,
            status: gate.status === "done" ? "done" : gate.status === "blocked" ? "blocked" : "waiting",
            evidence: gate.evidence,
          })),
        },
      ]);
    } catch (error) {
      setBatchFigmaWriteStatus("failed");
      setBatchFigmaWriteMessage(error instanceof Error ? `批量写入任务生成失败：${error.message}` : "批量写入任务生成失败，请检查本地服务是否正常。");
    }
  }

  async function copyBatchFigmaWriteScript() {
    const script = batchFigmaWriteRun?.figma.script;
    if (!script) return;

    try {
      await navigator.clipboard.writeText(script);
      setBatchFigmaCopyStatus("copied");
    } catch {
      setBatchFigmaCopyStatus("failed");
    }
  }

  async function copyBatchFigmaJsonSpec() {
    const jsonSpec = batchFigmaWriteRun?.figma.jsonSpec;
    if (!jsonSpec) return;

    try {
      await navigator.clipboard.writeText(jsonSpec);
      setBatchFigmaJsonCopyStatus("copied");
    } catch {
      setBatchFigmaJsonCopyStatus("failed");
    }
  }

  async function prepareProductionRun(userContent?: string) {
    if (userContent) {
      setMessages((current) => [...current, { role: "user", content: userContent }]);
    }

    if (!canGenerateFigmaPayload) {
      setActiveTab("spec");
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `还不能准备写入 Figma：\n${drawBlockedReasons.map((reason) => `- ${reason}`).join("\n")}`,
          quickActions:
            showPreview && selectedOption && !approvedPreview && !previewHasQualityIssues
              ? [{ label: "批准当前预览，进入交付", value: "approve-preview" }]
              : undefined,
        },
      ]);
      return;
    }

    setActiveTab("quality");
    setProductionStatus("building");
    setProductionMessage("正在准备 Phase 4B Figma native draw 任务…");

    const response = await fetch("/api/production-run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ spec: iconSpecContract, skillNames: activeOutputProfile.skillNames }),
    });

    const payload = (await response.json()) as ProductionRun;
    setProductionRun(payload);

    if (!response.ok) {
      setProductionStatus(payload.status === "blocked" ? "blocked" : "failed");
      setProductionMessage(payload.summary || "Figma 执行任务准备失败。");
      return;
    }

    setProductionStatus("ready");
    setProductionMessage(payload.summary);
    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content:
          "Production run: ready_for_figma\nPhase 4B 现在是可执行任务：需要通过 figma-use 调用 use_figma 写入 native nodes。写入成功后，必须进入 截图核对 对比批准预览。",
        actions: payload.gates.map((gate) => ({
          id: gate.id,
          label: gate.label,
          detail: gate.detail,
          status: gate.status === "done" ? "done" : gate.status === "blocked" ? "blocked" : "waiting",
          evidence: gate.evidence,
        })),
        mode: agentMode,
        confidence: 1,
        quickActions: [
          {
            label: "生成交付文件",
            value: "generate-delivery",
          },
        ],
      },
    ]);
  }

  async function generateDeliveryPackage(userContent?: string) {
    if (userContent) {
      setMessages((current) => [...current, { role: "user", content: userContent }]);
    }

    if (!canGenerateFigmaPayload) {
      setActiveTab("spec");
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `还不能准备交付包：\n${drawBlockedReasons.map((reason) => `- ${reason}`).join("\n")}`,
          quickActions:
            showPreview && selectedOption && !approvedPreview && !previewHasQualityIssues
              ? [{ label: "批准当前预览，进入交付", value: "approve-preview" }]
              : undefined,
        },
      ]);
      return;
    }

    setDeliveryStatus("building");
    setDeliveryMessage("正在生成交付文件…");

    const response = await fetch("/api/delivery", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ spec: iconSpecContract }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setDeliveryStatus(response.status === 409 || response.status === 422 ? "blocked" : "failed");
      setDeliveryMessage(payload.message ?? "交付包生成失败。");
      return;
    }

    setDeliveryPackage(payload as DeliveryPackage);
    setDeliveryStatus("ready");
    setDeliveryMessage(
      (payload as DeliveryPackage).persisted?.directory
        ? `${(payload as DeliveryPackage).summary} 已保存到 ${(payload as DeliveryPackage).persisted?.directory}`
        : (payload as DeliveryPackage).summary,
    );
    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content:
          "Delivery package: ready\n已生成并本地保存 Spec / SVG 预览 / React Component / Figma native draw script / handoff。下一步是真正调用 Figma 写入并执行 screenshot gate。",
        actions: [
          {
            id: "production_handoff",
            label: "Production Package",
            detail: "已生成并保存交付包，包含交付、预览、代码和 Figma native draw 脚本。",
            status: "done",
          },
          {
            id: "screenshot_gate",
            label: "截图核对",
            detail: "Figma 写入后仍需截图比对批准预览。",
            status: "waiting",
          },
        ],
        mode: agentMode,
        confidence: 1,
      },
    ]);
  }

  function downloadDeliveryFile(path: string, content: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = path.split("/").pop() ?? "icon-deliverable.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadBatchManifest() {
    downloadDeliveryFile(
      "icon-batch-manifest.json",
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          processor: "team-spec-normalizer",
          defaults: {
            size: 24,
            color: "#0F1218",
            strokeWidth: 2,
            strokeCap: "round",
            strokeJoin: "round",
            output: "editable Figma native nodes",
          },
          items: buildBatchManifest(canvasInstances),
        },
        null,
        2,
      ),
    );
  }

  async function copyDeliveryFile(content: string) {
    await navigator.clipboard.writeText(content);
  }

  function handleQuickAction(value: string) {
    shouldStickToLatestRef.current = true;
    setIsChatPinnedToLatest(true);

    if (value.startsWith("send:")) {
      const message = value.slice("send:".length).trim();
      if (!message || isThinking || hasStreamingMessage) return;
      setInput("");
      void runMessage(message);
      return;
    }

    if (value.startsWith("choose-source:")) {
      placeRecommendedSourceCandidate(decodeURIComponent(value.slice("choose-source:".length)));
      return;
    }

    const previewVariantMatch = value.match(/^preview-([a-f])-(10|[1-9])$/);
    if (previewVariantMatch) {
      selectPreviewVariant(previewVariantMatch[1].toUpperCase() as SemanticOption["id"], previewVariantMatch[2] as PreviewVariantId);
      return;
    }

    if (value === "focus-ai-variants") {
      const aiInstances = canvasInstances.filter((instance) => instance.sourceName?.startsWith(aiPreviewGridSourcePrefix));
      focusCanvasInstances(aiInstances.length ? aiInstances : canvasInstances);
      return;
    }

    const generateOptionMatch = value.match(/^generate-option-([abc])$/);
    if (generateOptionMatch) {
      selectOptionAndPreview(generateOptionMatch[1].toUpperCase() as SemanticOption["id"]);
      return;
    }

    if (value === "option-a") {
      selectOptionAndSearchSources("A");
      return;
    }

    if (value === "option-b") {
      selectOptionAndSearchSources("B");
      return;
    }

    if (value === "option-c") {
      selectOptionAndSearchSources("C");
      return;
    }

    if (value === "approve-preview") {
      approveCurrentPreview();
      return;
    }

    if (value === "prepare-production") {
      void prepareProductionRun();
      return;
    }

    if (value === "open-figma-write") {
      setIsFigmaSetupExpanded(true);
      setBatchFigmaWriteMessage(totalCanvasInstanceCount ? "填写 Figma 目标链接和 token 后，点击写入准备即可批量写入画布。" : "画布里还没有可写入的 icon。");
      return;
    }

    if (value === "generate-delivery") {
      void generateDeliveryPackage();
      return;
    }

    if (value === "continue-ai-semantics") {
      startSemanticPlan(brief, sourceQuery || brief.sourceText, undefined, undefined, { skipExactReuse: true });
      return;
    }

    if (value === "search-source-library") {
      searchCurrentSourceLibrary();
      return;
    }
  }

  async function askAgent(message: string): Promise<AgentDecision> {
    const shouldSendSemanticCandidates = phase !== "brief" || Boolean(selectedOptionId || showPreview || canvasSourceCandidates.length);
    const agentContext = {
      selectedName: showPreview ? `AijBasic${brief.semanticName} SVG 预览` : undefined,
      reportScore: approvedPreview ? 100 : undefined,
      candidates: shouldSendSemanticCandidates
        ? semanticOptions.map((option) => ({
            name: `Option ${option.id}`,
            source: "semantic-plan",
            category: "visual-direction",
            tags: [option.title],
          }))
        : undefined,
    };

    const response = await fetch("/api/agent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        activeSkillId: selectedTeamSpecLibrary.id,
        history: messages.slice(-8).map((item) => ({
          role: item.role,
          content: item.content,
        })),
        context: {
          ...agentContext,
          teamSpecLibrary: {
            id: selectedTeamSpecLibrary.id,
            name: selectedTeamSpecLibrary.name,
            skillName: selectedTeamSpecLibrary.skillName,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Agent API failed: ${response.status}`);
    }

    return (await response.json()) as AgentDecision;
  }

  function detectOption(message: string): SemanticOption["id"] | undefined {
    const upper = message.toUpperCase();
    if (upper.includes("OPTION A") || message.includes("选A") || message.includes("方向A")) return "A";
    if (upper.includes("OPTION B") || message.includes("选B") || message.includes("方向B")) return "B";
    if (upper.includes("OPTION C") || message.includes("选C") || message.includes("方向C")) return "C";
    return undefined;
  }

  async function startSemanticPlan(
    nextBrief: IconBrief,
    userContent: string,
    decision?: AgentDecision,
    targetMessageId?: string,
    behavior?: { skipExactReuse?: boolean },
  ) {
    const effectiveBrief = decision ? buildModelBrief(decision, userContent, nextBrief) : nextBrief;
    const options = buildSemanticOptionsFromDecision(decision, effectiveBrief);
    const query = userContent || effectiveBrief.sourceText;
    const isVariantExploration = Boolean(behavior?.skipExactReuse);
    let routeDecision: SourceDecision | undefined;
    try {
      routeDecision = await requestSourceDecision(query, {
        variants: isVariantExploration || /变体|更多方案|多出几个|探索|variant/i.test(userContent),
        production: /figma|写入|交付|生产|production/i.test(userContent),
        exactReuse: /复用|标准版|一比一|1:1|完全一致/i.test(userContent),
        semanticQuery: effectiveBrief.label,
      });
    } catch {
      setSourceDecision(undefined);
    }
    const explicitSourceTab = detectSourceTab(query);
    const preferredTab = explicitSourceTab && explicitSourceTab !== "ai" ? explicitSourceTab : undefined;
    const nextSourceTab = preferredTab || sourceLibraryTab || "lucide";
    const initialCandidates = preferredTab ? buildSourceCandidates(query, preferredTab, importedIconfontIcons) : [];

    setBrief(effectiveBrief);
    setActiveSemanticOptions(options);
    setSourceQuery(query);
    setSourceLibraryTab(nextSourceTab);
    setSelectedSource(undefined);
    setCanvasSourceCandidates(initialCandidates);
    setIsSourcePanelCollapsed(true);
    setSelectedSourceCandidates([]);
    setCanvasElements(buildInitialCanvasElements(effectiveBrief));
    setSelectedElementId("bookmark");
    setSelectedOptionId(undefined);
    setSelectedPreviewVariantId(undefined);
    setShowPreview(false);
    setApprovedPreview(false);
    resetProductionState();
    setPhase("semantic");
    setActiveTab("layers");
    setAgentMode(decision?.mode ?? "fallback");

    if (!isVariantExploration && routeDecision?.exactMatch && routeDecision.sourceUrl) {
      setSourceQuery(query);
      setSourceLibraryTab("figma");
      setCanvasSourceCandidates([]);
      setIsSourcePanelCollapsed(false);
      appendAssistantTypewriterMessage(
        {
          content: [
            `运行模式：严格模式（strict）`,
            `成熟库精确命中：${routeDecision.exactMatch.label ?? routeDecision.exactMatch.name}`,
            `源图校验：必须先读取成熟库 Figma 源节点或源截图；当前不会凭文字或 shape-spec 重画“标准版”。`,
            routeDecision.exactMatch.guardrails?.geometrySummary
              ? `质量约束：${routeDecision.exactMatch.guardrails.geometrySummary}`
              : undefined,
          ]
            .filter(Boolean)
            .join("\n"),
        },
        { targetId: targetMessageId },
      );
      void importFigmaCanvasFromUrl(routeDecision.sourceUrl, query);
      return;
    }

    appendAssistantTypewriterMessage(
      {
        content:
          [
            isVariantExploration
              ? "运行模式：探索模式（explore），保留成熟库标准版，同时展开其他语义方向。"
              : routeDecision
                ? `运行模式：${routeDecision.mode === "explore" ? "探索模式" : "快速模式"}（${routeDecision.mode}）`
                : undefined,
            !isVariantExploration && routeDecision?.adjacentMatches.length
              ? `成熟库仅相近命中“${routeDecision.adjacentMatches[0].label ?? routeDecision.adjacentMatches[0].name}”，只作为语义/风格约束，不直接改画。`
              : undefined,
            decision?.response || `我理解是做“${effectiveBrief.concept}”图标。先选择语义方向，再检索真实外部来源。`,
          ]
            .filter(Boolean)
            .join("\n"),
        semanticOptions: options,
        semanticBrief: effectiveBrief,
        quickActions: [
          {
            label: "优先从图标库检索参考",
            value: "search-source-library",
          },
        ],
      },
      { targetId: targetMessageId },
    );

    if (preferredTab) void loadSourceLibrary(searchableSourceTab(nextSourceTab), query);
  }

  function handleAgentSideEffects(message: string, decision: AgentDecision, targetMessageId?: string): AgentHandleResult {
    setAgentMode(decision.mode);

    if (decision.intent === "plan_semantics") {
      startSemanticPlan(buildModelBrief(decision, message, brief), decision.query || message, decision, targetMessageId);
      return "handled";
    }

    if ((decision.intent === "brief_icon" || decision.intent === "unknown") && decision.mode === "model") {
      const preferredTab = detectSourceTab(message) && detectSourceTab(message) !== "ai" ? detectSourceTab(message) : "lucide";
      if (/figma|画布库|已有图标|icon\s*font|iconfont|icon\s*park|iconpark|lucide|tabler|phosphor|外部来源|外部库|内部来源|内部库|来源库|现成库|参考|图标库/i.test(message)) {
        appendAssistantTypewriterMessage(
          {
            content: decision.response || `我会先从 ${sourceLibraryLabel(preferredTab || "lucide")} 找参考图标，再套团队规范放到画布。`,
          },
          { targetId: targetMessageId },
        );
        if (preferredTab === "figma") {
          void loadSourceLibrary("figma", decision.query || message);
          return "handled";
        }
        void loadSourceLibrary(preferredTab || "lucide", decision.query || message);
        return "handled";
      }
    }

    return "continue";
  }

  async function runMessage(message: string) {
    const conversationId = conversationIdRef.current;
    const optionId = detectOption(message);
    const iconfontUrl = extractIconfontUrl(message);
    const figmaUrl = extractFigmaUrl(message);
    const figmaToken = extractFigmaToken(message);

    if (figmaToken) {
      setFigmaSessionToken(figmaToken);
      const persisted = await persistFigmaToken(figmaToken);
      setMessages((current) => [...current, { role: "user", content: "我粘贴了 Figma 访问令牌" }]);

      if (pendingFigmaUrl) {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: persisted
              ? "收到 token，已在后端加密保存。我会继续读取刚才那条 Figma 链接，不需要你再粘一遍。"
              : "收到 token。我会继续读取刚才那条 Figma 链接，不需要你再粘一遍；登录后可将它加密保存。",
          },
        ]);
        void importFigmaCanvasFromUrl(pendingFigmaUrl, pendingFigmaQuery || message, figmaToken);
      } else {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: persisted
              ? "收到 token，已在后端加密保存。现在请粘贴完整 Figma 文件或 Frame 链接，我就能读取画布里的 icon 并收录到团队库。"
              : "收到 token。现在请粘贴完整 Figma 文件或 Frame 链接，我就能读取画布里的 icon 并收录到团队库；登录后可将它加密保存。",
          },
        ]);
      }
      return;
    }

    if (figmaUrl) {
      setMessages((current) => [...current, { role: "user", content: "我粘贴了 Figma 画布链接" }]);
      void importFigmaCanvasFromUrl(figmaUrl, message);
      return;
    }

    if (iconfontUrl) {
      setMessages((current) => [...current, { role: "user", content: "我粘贴了 Iconfont 项目 Symbol JS 链接" }]);
      void importIconfontFromUrl(iconfontUrl, message);
      return;
    }

    if ((message.includes("<symbol") && message.includes("</symbol>")) || (message.includes("<svg") && message.includes("</svg>"))) {
      setMessages((current) => [
        ...current,
        { role: "user", content: message.includes("<symbol") ? "我粘贴了一组 Iconfont symbol" : "我粘贴了一个 SVG 图标" },
      ]);
      importInlineSourceAssets(message);
      return;
    }

    if (isBatchIconRequest(message)) {
      applyBatchInput(message, { appendUserMessage: true });
      return;
    }

    if (isProductionRunMessage(message)) {
      void prepareProductionRun(message);
      return;
    }

    if (isDeliveryMessage(message)) {
      void generateDeliveryPackage(message);
      return;
    }

    if (optionId && (phase === "semantic" || phase === "brief" || !showPreview)) {
      selectOptionAndSearchSources(optionId, message);
      return;
    }

    if (showPreview && !approvedPreview && isApprovalMessage(message)) {
      approveCurrentPreview(message);
      return;
    }

    if (approvedPreview && isApprovalMessage(message)) {
      void generateDeliveryPackage(message);
      return;
    }

    const isBriefContinuation = phase === "brief" && messages.some((item) => item.role === "user") && isBriefContinuationMessage(message);
    const localBrief = isBriefContinuation ? mergeBriefContinuation(message, brief) : buildBriefFromMessage(message, brief);
    if (isNewBriefMessage(message) || isBriefContinuation) {
      setBrief(localBrief);
      setActiveSemanticOptions(buildSemanticOptions(localBrief));
      setCanvasElements(buildInitialCanvasElements(localBrief));
    }

    const streamingMessageId = createChatMessageId("assistant-stream");

    setMessages((current) => [
      ...current,
      { role: "user", content: message },
      {
        id: streamingMessageId,
        role: "assistant",
        content: "正在理解你的需求…",
        isStreaming: true,
      },
    ]);
    setIsThinking(true);

    let decision: AgentDecision;
    try {
      decision = await askAgent(message);
    } catch {
      decision = {
        mode: "fallback",
        intent: "brief_icon",
        query: message,
        confidence: 0.4,
        response: `Agent 接口暂不可用，已使用 ${selectedTeamSpecLibrary.skillName} 的本地规则 fallback。`,
        actions: [
          {
            id: "brief",
            label: "Phase 1 · Brief",
            detail: "API 不可用，停留在本地 Brief 判断。",
            status: "running",
          },
        ],
        modeReason: "Agent API 请求失败。",
      };
    } finally {
      if (conversationIdRef.current === conversationId) {
        setIsThinking(false);
      }
    }

    if (conversationIdRef.current !== conversationId) return;

    if (isBriefContinuation && localBrief.glyphKind !== "generic") {
      const continuationDecision: AgentDecision = {
        ...decision,
        intent: "plan_semantics",
        query: localBrief.sourceText,
        response: `已补齐“${localBrief.label}”图标的使用场景：${localBrief.context}。现在进入语义方向与真实来源检索。`,
        brief: {
          concept: localBrief.concept,
          label: localBrief.label,
          semanticName: localBrief.semanticName,
          context: localBrief.context,
          emphasis: localBrief.emphasis,
          glyphKind: localBrief.glyphKind,
        },
      };
      startSemanticPlan(localBrief, localBrief.sourceText, continuationDecision, streamingMessageId);
      return;
    }

    if (handleAgentSideEffects(message, decision, streamingMessageId) === "handled") {
      return;
    }

    const requestedSourceTab = detectSourceTab(message);

    if (requestedSourceTab) {
      setSourceQuery(message);
      const nextBrief = isNewBriefMessage(message) ? buildBriefFromMessage(message, brief) : brief;

      if (nextBrief !== brief) {
        setBrief(nextBrief);
        setActiveSemanticOptions(buildSemanticOptions(nextBrief));
        setCanvasElements(buildInitialCanvasElements(nextBrief));
      }
      setSelectedOptionId(undefined);
      setSelectedPreviewVariantId(undefined);
      setShowPreview(false);
      setApprovedPreview(false);

      if (requestedSourceTab === "iconfont") {
        appendAssistantTypewriterMessage(
          {
            content: `我会读取 Iconfont 项目里的真实图标，选中后统一套 ${activeOutputProfile.masterSize}×${activeOutputProfile.masterSize} / ${activeOutputProfile.strokeWidth}px / ${activeOutputProfile.color} 的团队规范。`,
          },
          { targetId: streamingMessageId },
        );
        void loadSourceLibrary("iconfont", message);
        return;
      }

      if (requestedSourceTab === "figma") {
        appendAssistantTypewriterMessage(
          {
            content: "我会从 Figma 团队画布读取已有 icon，收录为参考库后再按团队规范输出。",
          },
          { targetId: streamingMessageId },
        );
        void importFigmaCanvasFromUrl(registeredFigmaCanvasLibraryUrl, message);
        return;
      }

      if (requestedSourceTab === "ai") {
        startSemanticPlan(nextBrief, `继续按 AI 语义生成：${message}`, undefined, streamingMessageId);
        return;
      }

      appendAssistantTypewriterMessage(
        {
          content: `我会从 ${sourceLibraryLabel(requestedSourceTab)} 按你的语义找参考图标，你可以选择或拖入画布，系统会再套团队规范。`,
        },
        { targetId: streamingMessageId },
      );
      void loadSourceLibrary(requestedSourceTab, message);
      return;
    }

    if (isClearlyNonIconMessage(message)) {
      appendAssistantTypewriterMessage(
        {
          content: decision.response || "我主要帮你生成和规范化团队图标。你可以直接说：做一个分享图标，用在章节卡片，强调转发动作。",
          suggestions: decision.suggestions,
        },
        { targetId: streamingMessageId },
      );
      return;
    }

    const nextPhase = inferPhase(decision.intent);
    const shouldShowPreview = decision.intent === "generate_svg_preview" || decision.intent === "revise_preview";
    const shouldApprove = decision.intent === "draw_figma_native" || decision.intent === "approve_preview";
    const effectivePhase = shouldApprove && (!showPreview || !approvedPreview) ? (showPreview ? "preview" : "semantic") : nextPhase;
    const effectiveOptionId = optionId ?? selectedOptionId;
    const messageSemanticOptions = decision.intent === "plan_semantics" ? buildSemanticOptionsFromDecision(decision, buildModelBrief(decision, message, brief)) : undefined;

    if (optionId) {
      applySemanticOption(optionId);
      const option = semanticOptions.find((item) => item.id === optionId);
      if (option) {
        const semanticSourceQuery = buildSemanticSourceQuery(brief, option, message);
        setSourceQuery(semanticSourceQuery);
      }
    }
    if (shouldShowPreview) setShowPreview(true);

    setPhase(effectivePhase);
    setAgentMode(decision.mode);
    setActiveTab(shouldApprove ? "spec" : shouldShowPreview ? "properties" : "layers");

    const quickActions = shouldShowPreview && !previewHasQualityIssues
      ? [{ label: "批准当前预览，进入交付", value: "approve-preview" }]
      : shouldApprove && approvedPreview
        ? [{ label: "生成交付文件", value: "generate-delivery" }]
        : undefined;

    appendAssistantTypewriterMessage(
      {
        content: buildAssistantSummary({
          decision,
          phase: effectivePhase,
          optionId: effectiveOptionId,
        }),
        suggestions: decision.suggestions,
        quickActions,
        semanticOptions: messageSemanticOptions,
        semanticBrief: messageSemanticOptions?.length ? buildModelBrief(decision, message, brief) : undefined,
      },
      { targetId: streamingMessageId },
    );
  }

  function submit() {
    const rawMessage = input.trim();
    const message = rawMessage;
    if (!message) return;
    shouldStickToLatestRef.current = true;
    setIsChatPinnedToLatest(true);
    setHasEnteredWorkbench(true);
    void runMessage(message);
    setInput("");
  }

  function startLandingPrompt(nextMessage: string, nextMode: WorkbenchMode = "chat") {
    const message = nextMessage.trim();
    if (!message) return;
    setWorkbenchMode(nextMode);
    setInput(message);
  }

  function startChatResize(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = chatWidth;
    setIsResizingChat(true);

    function onPointerMove(moveEvent: PointerEvent) {
      setChatWidth(clampPanelWidth(startWidth + moveEvent.clientX - startX));
    }

    function onPointerUp() {
      setIsResizingChat(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  function startInspectorResize(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = inspectorWidth;
    setIsResizingInspector(true);

    function onPointerMove(moveEvent: PointerEvent) {
      setInspectorWidth(clampInspectorWidth(startWidth - (moveEvent.clientX - startX)));
    }

    function onPointerUp() {
      setIsResizingInspector(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  function addCurrentPreviewToCanvas() {
    if (!showPreview || !selectedOption) return;

    const nextInstance = createCanvasInstance({
      brief,
      elements: canvasElements,
      optionId: selectedOptionId,
      sourceName: selectedSource?.name,
      index: canvasInstances.length,
      previewSvg,
      previewShapes,
      componentPrefix: activeOutputProfile.componentPrefix,
      previewColor: activeOutputProfile.color,
    });

    setActiveCanvasInstances((current) => [...current, nextInstance]);
    setSelectedInstanceId(nextInstance.id);
    focusCanvasInstance(nextInstance);
  }

  function updateSelectedInstanceScale(nextScale: number) {
    if (!selectedInstanceId) return;
    setActiveCanvasInstances((current) =>
      current.map((instance) => (instance.id === selectedInstanceId ? { ...instance, scale: clampCanvasZoom(nextScale) } : instance)),
    );
  }

  function startInstanceDrag(event: React.PointerEvent<HTMLDivElement>, instanceId: string) {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const instance = canvasInstances.find((item) => item.id === instanceId);
    if (!instance) return;
    const startInstanceX = instance.x;
    const startInstanceY = instance.y;

    setSelectedInstanceId(instanceId);
    setActiveTab("properties");

    function onPointerMove(moveEvent: PointerEvent) {
      const dx = (moveEvent.clientX - startX) / canvasZoom;
      const dy = (moveEvent.clientY - startY) / canvasZoom;
      setActiveCanvasInstances((current) =>
        current.map((item) => (item.id === instanceId ? { ...item, x: startInstanceX + dx, y: startInstanceY + dy } : item)),
      );
    }

    function onPointerUp() {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  function handleCanvasWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!(event.metaKey || event.ctrlKey)) return;
    event.preventDefault();
    const zoomDelta = event.deltaY > 0 ? -0.08 : 0.08;
    setCanvasZoom((current) => clampCanvasZoom(current + zoomDelta));
  }

  function startCanvasPan(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startPan = canvasPan;

    function onPointerMove(moveEvent: PointerEvent) {
      setCanvasPan({
        x: startPan.x + moveEvent.clientX - startX,
        y: startPan.y + moveEvent.clientY - startY,
      });
    }

    function onPointerUp() {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  if (!hasEnteredWorkbench) {
    return (
      <main
        className="iconops-dark iconops-make-home relative min-h-screen overflow-hidden text-white"
        style={{ "--mx": `${landingPointer.x}%`, "--my": `${landingPointer.y}%` } as React.CSSProperties}
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setLandingPointer({
            x: ((event.clientX - rect.left) / rect.width) * 100,
            y: ((event.clientY - rect.top) / rect.height) * 100,
          });
        }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="iconops-cursor-glow" />
          <div className="iconops-make-grid" />
        </div>

        <div className="absolute right-6 top-6 z-30">
          <AccountTrigger user={authUser} hasSavedToken={figmaCredentialStatus.hasToken} onClick={() => setIsAuthDialogOpen(true)} />
        </div>

        <aside className="absolute left-0 top-0 z-20 flex h-full w-16 flex-col items-center justify-between py-7">
          <div className="flex flex-col items-center gap-6">
            <div className="text-2xl">✦</div>
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/7 text-xl text-white/72 transition hover:bg-white/12 hover:text-white" aria-label="新建">
              +
            </button>
            <button type="button" className="text-white/60 transition hover:text-white" aria-label="搜索">⌕</button>
            <button type="button" className="text-white/60 transition hover:text-white" aria-label="团队库">□</button>
          </div>
          <div className="flex flex-col items-center gap-6">
            <button type="button" className="text-white/56 transition hover:text-white" aria-label="设置">⚙</button>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm text-white/72">I</div>
          </div>
        </aside>

        <div className="absolute left-6 top-6 z-20 hidden items-center gap-3 text-xs text-white/48 sm:flex">
          <span className="font-medium tracking-[0.28em] text-cyan-200/90">ICONOPS</span>
          <span className="h-1 w-1 rounded-full bg-white/24" />
          <span>team icon generation</span>
        </div>

        <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 pb-24">
          <div className="iconops-landing-card w-full max-w-5xl text-center">
            <h1 className="iconops-landing-title text-[34px] font-medium leading-tight tracking-[-0.045em] text-white/88 sm:text-[52px]">
              今天想做什么 icon？<span className="iconops-landing-emoji" aria-hidden="true">✨</span>
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-6 text-white/42 sm:whitespace-nowrap">
              输入语义、场景或批量清单，我会按团队规范生成可编辑 icon。
            </p>

            <div className="iconops-make-prompt relative mx-auto mt-9 max-w-3xl rounded-[30px] border border-white/10 bg-[#1f1f21]/88 p-4 text-left shadow-[0_24px_90px_rgba(0,0,0,0.42)] backdrop-blur-2xl transition focus-within:border-indigo-300/28 focus-within:shadow-[0_28px_120px_rgba(99,102,241,0.22)]">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    if (!isThinking && !hasStreamingMessage) submit();
                  }
                }}
                rows={2}
                className="min-h-[54px] w-full resize-none border-0 bg-transparent px-2 pb-4 text-[15px] leading-6 text-white outline-none placeholder:text-white/32"
                placeholder="例如：做一个分享 icon，用在章节卡片右上角…"
                autoFocus
              />
              <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-3">
                <div className="flex items-center gap-2">
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-xl text-white/72 transition hover:bg-white/8" aria-label="添加来源">+</button>
                  <button type="button" className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/56 transition hover:bg-white/8 hover:text-white">Build</button>
                  <button type="button" className="rounded-full border border-indigo-300/22 bg-indigo-400/10 px-3 py-2 text-xs text-indigo-100/78 transition hover:bg-indigo-400/16 hover:text-white">
                    {selectedTeamSpecLibrary.name}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={submit}
                  disabled={!input.trim() || isThinking || hasStreamingMessage}
                  className="flex h-10 min-w-10 items-center justify-center rounded-full bg-indigo-500 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/28"
                  aria-label="开始生成"
                >
                  {isThinking || hasStreamingMessage ? "生成中" : "生成"}
                </button>
              </div>
            </div>

            <div className="mx-auto mt-10 max-w-4xl text-left">
              <div className="mb-4 flex items-center justify-between text-sm text-white/64">
                <span>团队规范 / 语义库云端库</span>
                <button type="button" className="text-indigo-200/74 transition hover:text-indigo-100">上传 skill →</button>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {teamSpecSkillRegistry.map((library) => (
                  <button
                    key={library.id}
                    type="button"
                    onClick={() => {
                      setSelectedTeamSpecLibraryId(library.id);
                      setInput(`使用「${library.name}」规范，生成一个 `);
                    }}
                    className={`group rounded-[22px] border p-4 text-left transition hover:-translate-y-1 hover:border-indigo-200/30 hover:bg-white/[0.065] ${
                      selectedTeamSpecLibraryId === library.id
                        ? "border-indigo-300/32 bg-indigo-400/10"
                        : "border-white/9 bg-white/[0.035]"
                    }`}
                  >
                    <div className={`mb-5 flex h-28 items-center justify-center rounded-2xl bg-gradient-to-br ${library.accent} text-3xl text-white/74 transition group-hover:text-indigo-100`}>
                      ◇
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-semibold text-white/84">{library.name}</div>
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[11px] text-white/40">
                        {library.status}
                      </span>
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs leading-5 text-white/38">{library.desc}</div>
                    <div className="mt-3 truncate text-[11px] text-indigo-100/48">{library.skillName}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
        <AccountDialog
          open={isAuthDialogOpen}
          user={authUser}
          figma={figmaCredentialStatus}
          onClose={() => setIsAuthDialogOpen(false)}
          onAuthenticated={handleAuthenticated}
          onLogout={handleLogout}
          onDeleteToken={handleDeleteFigmaToken}
        />
      </main>
    );
  }

  return (
    <main className="iconops-dark iconops-recraft-workbench relative h-screen overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="iconops-ambient-orb iconops-ambient-orb-a opacity-70" />
        <div className="iconops-ambient-orb iconops-ambient-orb-b opacity-60" />
        <div className="iconops-scanline absolute inset-0 opacity-35" />
      </div>
      <div className="relative z-10 flex h-screen flex-col">
        <header className="iconops-recraft-topbar flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#252525] px-3">
          <div className="flex h-full items-center gap-2">
            <button className="iconops-recraft-logo flex h-10 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-3 text-lg font-black text-white" type="button">R</button>
            <button
              type="button"
              onClick={() => setWorkbenchMode("chat")}
              className={`iconops-recraft-nav flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${workbenchMode === "chat" ? "is-active text-white" : "text-white/66 hover:bg-white/[0.06]"}`}
            >
              ✧ AI chat
            </button>
            <button
              type="button"
              onClick={() => setWorkbenchMode("batch")}
              className={`iconops-recraft-nav flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${workbenchMode === "batch" ? "is-active text-white" : "text-white/66 hover:bg-white/[0.06]"}`}
            >
              ⟲ Create
            </button>
            <button type="button" className="iconops-recraft-nav flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white/66 transition hover:bg-white/[0.06]">▦ Library</button>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-white/86">IconOps Project⌄</div>
          <div className="flex items-center gap-2">
            <AccountTrigger user={authUser} hasSavedToken={figmaCredentialStatus.hasToken} onClick={() => setIsAuthDialogOpen(true)} />
            <button type="button" className="iconops-recraft-pill rounded-xl border border-white/10 bg-white/[0.035] px-4 py-2 text-sm text-white/76">{Math.round(canvasZoom * 100)}%</button>
            <button
              type="button"
              onClick={() => {
                setIsFigmaSetupExpanded(true);
                if (figmaTargetUrl.trim()) void prepareBatchFigmaWrite();
              }}
              disabled={!totalCanvasInstanceCount || batchFigmaWriteStatus === "building"}
              className="iconops-recraft-pill rounded-xl bg-white/[0.08] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/[0.12] disabled:opacity-40"
            >
              写入 Figma
            </button>
            <button type="button" className="iconops-recraft-credit rounded-xl border border-indigo-400 bg-indigo-500/22 px-3 py-2 text-sm font-semibold text-indigo-100">✧ {totalCanvasInstanceCount}</button>
          </div>
        </header>

        <AccountDialog
          open={isAuthDialogOpen}
          user={authUser}
          figma={figmaCredentialStatus}
          onClose={() => setIsAuthDialogOpen(false)}
          onAuthenticated={handleAuthenticated}
          onLogout={handleLogout}
          onDeleteToken={handleDeleteFigmaToken}
        />

        {isFigmaSetupExpanded ? (
          <FigmaNativeSetupBar
            targetUrl={figmaTargetUrl}
            token={figmaWriteToken}
            tokenPlaceholder={figmaCredentialStatus.hasToken ? "账户已保存 Token；输入可替换" : figmaSessionToken ? "已可复用当前会话 Token；也可覆盖" : "Figma Token：figd_..."}
            status={batchFigmaWriteStatus}
            message={batchFigmaWriteMessage}
            itemCount={totalCanvasInstanceCount}
            hasJsonSpec={Boolean(batchFigmaWriteRun?.figma.jsonSpec)}
            hasScript={Boolean(batchFigmaWriteRun?.figma.script)}
            writeJob={figmaWriteJob}
            bridgeStatus={figmaBridgeStatus}
            jsonCopyStatus={batchFigmaJsonCopyStatus}
            scriptCopyStatus={batchFigmaCopyStatus}
            onTargetUrlChange={setFigmaTargetUrl}
            onTokenChange={setFigmaWriteToken}
            onTokenBlur={() => {
              if (authUser && figmaWriteToken.trim()) void persistFigmaToken(figmaWriteToken);
            }}
            onPrepare={() => void prepareBatchFigmaWrite()}
            onCopyJson={() => void copyBatchFigmaJsonSpec()}
            onCopyScript={() => void copyBatchFigmaWriteScript()}
          />
        ) : null}

        <section className="iconops-workbench-shell relative flex min-h-0 flex-1 bg-[#181818] p-0">
          <aside
            className="iconops-panel iconops-chat-panel iconops-recraft-chat relative flex min-h-0 shrink-0 flex-col rounded-none border-0 border-r border-white/10 bg-[#252525] p-4 shadow-none"
            style={{ width: Math.min(chatWidth, 420) }}
          >
            <div className="mb-3 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-white/86">{workbenchMode === "chat" ? "AI chat" : "Batch queue"}</h2>
                  <p className="mt-1 text-xs leading-5 text-white/38">
                    {workbenchMode === "chat" ? "描述需求，结果直接落到画布。" : "粘贴资料，批量生成到画布。"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={startNewConversation}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/50 transition hover:bg-white/[0.08] hover:text-white"
                  title="清空当前对话与未完成预览，保留画布里的图标"
                >
                  New
                </button>
              </div>
            </div>

            <div
              ref={chatScrollRef}
              onScroll={updateChatPinnedState}
              className="iconops-chat-scroll relative min-h-0 flex-1 space-y-3 overflow-auto pr-1"
            >
              {workbenchMode === "batch" ? (
                <BatchProductionPanel
                  input={batchInput}
                  tasks={batchTasks}
                  active
                  onInputChange={setBatchInput}
                  onParse={parseBatchProductionInput}
                  onQueue={queueBatchTasksToCanvas}
                  onClear={clearBatchProduction}
                />
              ) : (
                <>
                  {!messages.length ? (
                    <EmptyChatState mode={workbenchMode} onUsePrompt={setInput} />
                  ) : null}
                  {messages.map((message, index) => (
                    <ChatBubble
                      key={`${message.role}-${index}`}
                      message={message}
                      onQuickAction={handleQuickAction}
                    />
                  ))}
                  {isThinking && !hasStreamingMessage ? (
                    <div className="mr-8 rounded-2xl border border-indigo-400/18 bg-indigo-400/10 px-4 py-3 text-sm text-white/62">
                      正在判断下一步：补信息、找参考、出画法，还是生成预览…
                    </div>
                  ) : null}
                  <div ref={chatLatestRef} className="h-1" aria-hidden />
                </>
              )}
              {workbenchMode === "chat" && !isChatPinnedToLatest ? (
                <button
                  type="button"
                  onClick={jumpChatToLatest}
                  className="sticky bottom-3 left-1/2 z-20 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-white/10 bg-white/12 text-2xl leading-none text-white/78 shadow-xl shadow-black/30 backdrop-blur transition hover:bg-white/18 hover:text-white"
                  aria-label="返回最新消息"
                  title="返回最新消息"
                >
                  ↓
                </button>
              ) : null}
            </div>

            <div className={`iconops-recraft-composer mt-3 shrink-0 rounded-[22px] border border-white/12 bg-white/[0.035] p-3 ${workbenchMode === "batch" ? "hidden" : ""}`}>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    if (!isThinking && !hasStreamingMessage) submit();
                  }
                }}
                className="h-16 w-full resize-none border-0 bg-transparent text-sm leading-5 text-white outline-none placeholder:text-white/34"
                placeholder={workbenchMode === "chat" ? "Ask anything" : "粘贴图标清单、文档片段或 Figma 链接…"}
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-white/34">Enter 发送 · Shift + Enter 换行</span>
                <button
                  onClick={submit}
                  disabled={isThinking || hasStreamingMessage}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-semibold text-black shadow-lg shadow-black/30 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
                >
                  {isThinking || hasStreamingMessage ? "…" : "↑"}
                </button>
              </div>
            </div>
            <button
              type="button"
              aria-label="拖拽调整对话区宽度"
              onPointerDown={startChatResize}
              onDoubleClick={() => setChatWidth(420)}
              className={`absolute right-[-5px] top-0 z-20 h-full w-2 cursor-col-resize transition ${
                isResizingChat ? "bg-indigo-500/40" : "bg-transparent hover:bg-indigo-500/25"
              }`}
            >
              <span className="absolute right-0 top-1/2 h-14 w-px -translate-y-1/2 rounded bg-white/22" />
            </button>
          </aside>

          <section className="iconops-canvas-panel iconops-recraft-canvas flex min-h-0 min-w-[420px] flex-1 flex-col overflow-hidden rounded-none border-0 bg-[#181818] shadow-none">
            <div className="iconops-recraft-canvasbar flex h-12 shrink-0 items-center justify-between border-b border-white/8 bg-[#181818] px-4">
              <div>
                <span className="text-sm font-semibold text-white/64">Vector canvas</span>
                <span className="ml-3 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs text-white/46">
                  {activeCanvasLayer?.name ?? "画布"} · {canvasInstances.length} icons
                </span>
                {selectedSource ? (
                  <span className="ml-3 text-xs text-cyan-300/80">来源：{selectedSource.source} / {selectedSource.name}</span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => searchCurrentSourceLibrary()}
                  disabled={sourceLoading}
                  className="rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-semibold text-white/68 transition hover:bg-white/[0.12] disabled:cursor-wait disabled:opacity-40"
                >
                  {sourceLoading ? "检索中" : canvasSourceCandidates.length ? `参考图标 ${canvasSourceCandidates.length}` : "找参考图标"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsSourcePanelCollapsed((current) => !current)}
                  className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-white/56 transition hover:bg-white/[0.08] hover:text-white"
                >
                  {isSourcePanelCollapsed ? "展开来源" : "收起来源"}
                </button>
                {workbenchMode === "chat" ? (
                  <button
                    onClick={addCurrentPreviewToCanvas}
                    disabled={!showPreview || !selectedOption || previewHasQualityIssues}
                    className="rounded-xl bg-indigo-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:hidden"
                  >
                    放到画布
                  </button>
                ) : (
                  <button
                    onClick={queueBatchTasksToCanvas}
                    disabled={!batchTasks.length}
                    className="rounded-xl bg-indigo-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    批量放入画布
                  </button>
                )}
                <div className="ml-1 flex items-center rounded-xl border border-white/10 bg-white/[0.035] p-1">
                  <button
                    onClick={() => setCanvasZoom((current) => clampCanvasZoom(current - 0.1))}
                    className="rounded px-2 py-1 text-xs text-white/56 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    -
                  </button>
                  <span className="w-12 text-center text-xs text-white/54">{Math.round(canvasZoom * 100)}%</span>
                  <button
                    onClick={() => setCanvasZoom((current) => clampCanvasZoom(current + 0.1))}
                    className="rounded px-2 py-1 text-xs text-white/56 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            <div className={`h-10 shrink-0 items-center gap-2 overflow-x-auto border-b border-white/10 bg-black/16 px-4 backdrop-blur-xl ${canvasLayers.length > 1 || canvasInstances.length ? "flex" : "hidden"}`}>
              {canvasLayers.map((layer) => (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => switchCanvasLayer(layer.id)}
                  className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs transition ${
                    layer.id === activeCanvasLayerId
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-white/42 hover:border-slate-300 hover:text-white/86"
                  }`}
                >
                  {layer.name} · {layer.instances.length}
                </button>
              ))}
              <button
                type="button"
                onClick={focusAllCanvasInstances}
                disabled={!canvasInstances.length && !showPreview}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-white/58 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-white/32"
              >
                定位全部
              </button>
              <button
                type="button"
                onClick={focusSelectedCanvasInstance}
                disabled={!selectedInstance}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-white/58 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-white/32"
              >
                定位选中
              </button>
              <span className="shrink-0 text-xs text-white/32">{totalCanvasInstanceCount} 个可交付 · Delete 删除选中</span>
            </div>
            <div className="relative min-h-0 flex-1">
              {!isSourcePanelCollapsed ? (
                <div className="pointer-events-none absolute left-24 right-6 top-4 z-30">
                  <div className="pointer-events-auto mx-auto max-w-5xl">
                    <SourceLibraryPanel
                      candidates={canvasSourceCandidates}
                      activeTab={sourceLibraryTab}
                      collapsed={isSourcePanelCollapsed}
                      loading={sourceLoading}
                      message={sourceMessage}
                      teamLibrarySummary={visibleTeamLibrarySummary}
                      teamLibraryStatus={teamLibraryTrainingStatus}
                      teamLibraryMessage={teamLibraryTrainingMessage}
                      selectedSource={selectedSource}
                      selectedCandidateIds={selectedCandidateIds}
                      query={sourceQuery}
                      importedState={importedSourceState}
                      onToggleCollapsed={() => setIsSourcePanelCollapsed((current) => !current)}
                      onTabChange={updateSourceLibrary}
                      onQueryChange={setSourceQuery}
                      onChooseSource={chooseSourceCandidate}
                      onCandidateDragStart={startSourceCandidateDrag}
                      onToggleCandidate={toggleCandidateSelection}
                      onSelectVisibleCandidates={selectVisibleCandidates}
                      onAddSelectedCandidates={addSelectedCandidatesToCanvas}
                      onClearSelectedCandidates={() => setSelectedSourceCandidates([])}
                      onSearchCurrentQuery={searchCurrentSourceLibrary}
                      onLoadTeamLibrary={() => void loadTeamLibrary({ announce: true })}
                    />
                  </div>
                </div>
              ) : null}
              <div
                ref={canvasViewportRef}
                className="iconops-stage relative h-full min-h-0 select-none overflow-hidden bg-[#2b2b2b]"
                onWheel={handleCanvasWheel}
                onPointerDown={startCanvasPan}
                onClick={() => {
                  setSelectedInstanceId(undefined);
                  setIsSourcePanelCollapsed(true);
                }}
                onDragOver={handleCanvasDragOver}
                onDragLeave={handleCanvasDragLeave}
                onDrop={handleCanvasDrop}
              >
                <div
                  className={`pointer-events-none absolute inset-3 z-10 rounded-2xl border-2 border-dashed transition ${
                    isCanvasDropActive ? "border-blue-400 bg-indigo-500/10 opacity-100" : "border-transparent opacity-0"
                  }`}
                />
                <div className="iconops-recraft-tool-palette absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-[22px] border border-white/10 bg-[#2b2b2b]/95 p-2 shadow-2xl shadow-black/35 backdrop-blur-xl">
                  <button type="button" className="is-active" title="选择">↖</button>
                  <button type="button" title="拖拽画布">✋</button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); searchCurrentSourceLibrary(); }} title="参考图标">▦</button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); void loadTeamLibrary({ announce: true }); }} title="团队库">◇</button>
                  <button type="button" title="文本标注">T</button>
                  <button type="button" title="上传">↥</button>
                </div>
                <div className="iconops-canvas-hint absolute left-24 top-4 z-20 rounded-full border border-white/10 bg-[#2f2f2f]/78 px-3 py-2 text-xs leading-5 text-white/38 shadow-lg shadow-black/20 backdrop-blur-xl">
                  {activeCanvasLayer?.name ?? "画布"} · 拖拽移动 · Delete 删除
                  {canvasInstances.some((instance) => instance.sourceName?.startsWith(aiPreviewGridSourcePrefix)) ? (
                    <div className="text-blue-200">AI 方案已在画布两排展示：点击任一方案即可设为当前预览。</div>
                  ) : null}
                  {isCanvasDropActive ? <div className="text-blue-200">松手后会套团队规范并放置到当前位置</div> : null}
                </div>
                <div className="iconops-canvas-mini-actions absolute right-4 top-4 z-20 flex max-w-[56%] items-center gap-2 overflow-hidden rounded-full border border-white/10 bg-[#2f2f2f]/78 px-3 py-2 text-xs text-white/42 shadow-lg shadow-black/20 backdrop-blur">
                  <span>{canvasInstances.length} icons</span>
                  {canvasInstances.length ? (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        focusAllCanvasInstances();
                      }}
                      className="rounded border border-white/10 px-2 py-0.5 text-white/54 hover:bg-white/[0.08] hover:text-white"
                    >
                      看全部
                    </button>
                  ) : null}
                  {selectedInstance ? (
                    <>
                      <span className="max-w-[180px] truncate">选中：{selectedInstance.name}</span>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          focusSelectedCanvasInstance();
                        }}
                        className="rounded border border-white/10 px-2 py-0.5 text-white/54 hover:bg-white/[0.08] hover:text-white"
                      >
                        定位
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          updateSelectedInstanceScale(selectedInstance.scale - 0.1);
                        }}
                        className="rounded border border-white/10 px-2 py-0.5 text-white/54 hover:bg-white/[0.08] hover:text-white"
                      >
                        缩小
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          updateSelectedInstanceScale(selectedInstance.scale + 0.1);
                        }}
                        className="rounded border border-white/10 px-2 py-0.5 text-white/54 hover:bg-white/[0.08] hover:text-white"
                      >
                        放大
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteSelectedCanvasInstance();
                        }}
                        className="rounded border border-white/10 px-2 py-0.5 text-white/54 hover:bg-red-500/15 hover:text-red-200"
                      >
                        删除
                      </button>
                    </>
                  ) : null}
                </div>
                <div
                  ref={canvasSurfaceRef}
                  className="iconops-canvas-surface absolute left-1/2 top-1/2 h-[1200px] w-[1600px] origin-center rounded-[34px] border border-white/10 bg-[linear-gradient(rgba(148,163,184,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.10)_1px,transparent_1px)] bg-[size:48px_48px] shadow-2xl shadow-black/70"
                  style={{
                    transform: `translate(calc(-50% + ${canvasPan.x}px), calc(-50% + ${canvasPan.y}px)) scale(${canvasZoom})`,
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedInstanceId(undefined);
                    setIsSourcePanelCollapsed(true);
                  }}
                >
                  {showPreview && selectedOption ? (
                    <div
                      className={`absolute left-[120px] top-[110px] z-10 rounded-2xl border bg-white p-4 shadow-2xl shadow-slate-200/70 ${
                        previewReview.blockers.length ? "border-amber-400/80" : "border-emerald-400/60"
                      }`}
                      style={{ width: canvasInstanceBaseSize, height: canvasInstanceBaseSize }}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedInstanceId(undefined);
                        setIsSourcePanelCollapsed(true);
                      }}
                    >
                      <IconCanvasSvg
                        elements={canvasElements}
                        glyphKind={brief.glyphKind}
                        previewSvg={previewSvg}
                        previewPadding={28}
                        selectedElementId="frame"
                        onSelect={() => setSelectedElementId("frame")}
                      />
                      <div
                        className={`pointer-events-none absolute -bottom-7 left-0 max-w-[260px] truncate rounded border px-2 py-1 text-xs ${
                          previewReview.blockers.length
                            ? "border-amber-500/30 bg-amber-50 text-amber-700"
                            : "border-emerald-500/30 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {previewReview.blockers.length ? "预览需修正" : "当前预览"} · {selectedOption.title}
                      </div>
                    </div>
                  ) : null}
                  {canvasInstances.map((instance) => (
                    <IconInstanceNode
                      key={instance.id}
                      instance={instance}
                      selected={selectedInstanceId === instance.id}
                      onSelect={() => {
                        setSelectedInstanceId(instance.id);
                        setIsSourcePanelCollapsed(true);
                        setActiveTab("properties");
                        if (instance.previewVariantId && instance.sourceName?.startsWith(aiPreviewGridSourcePrefix)) {
                          activateCanvasPreviewInstance(instance);
                        }
                      }}
                      onDragStart={(event) => startInstanceDrag(event, instance.id)}
                    />
                  ))}
                  {!canvasInstances.length && !showPreview ? (
                    <div className="absolute inset-0 flex items-center justify-center text-center">
                      <div className="iconops-workbench-empty max-w-sm rounded-none border-0 bg-transparent p-8 shadow-none">
                        <div className="mx-auto mb-5 grid h-32 w-48 grid-cols-2 gap-3 rounded-2xl border border-dashed border-white/12 p-4 text-white/32">
                          <div className="rounded-xl border border-dashed border-white/12" />
                          <div className="rounded-xl border border-dashed border-white/12" />
                          <div className="col-span-2 rounded-xl border border-dashed border-white/12" />
                        </div>
                        <h2 className="text-sm font-semibold text-white/42">Working out the details.</h2>
                        <p className="mt-2 text-sm leading-6 text-white/46">
                          生成结果会出现在画布中。
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>


          <aside
            className={`iconops-panel iconops-inspector-panel absolute bottom-0 right-0 top-0 z-40 flex min-h-0 flex-col rounded-none border-0 border-l border-white/10 bg-[#242424] shadow-none transition duration-300 ${selectedInstance || showPreview ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-full opacity-0"}`}
            style={{ width: inspectorWidth }}
          >
            <div className="shrink-0 border-b border-white/10 bg-[#242424] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white/86">Icon details</h2>
                  <p className="mt-1 text-xs text-white/42">只显示当前选中图标的关键操作。</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={selectedElement.locked ? "amber" : "green"}>{selectedElement.locked ? "固定" : "可编辑"}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1 rounded-2xl border border-white/10 bg-white/[0.05] p-1 text-xs shadow-inner shadow-black/30">
                {(["properties", "layers", "spec", "quality"] as InspectorTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-xl px-2 py-2 font-semibold transition ${activeTab === tab ? "bg-white text-black shadow-sm shadow-cyan-500/20 ring-1 ring-white/20" : "text-white/46 hover:bg-white/10 hover:text-white"}`}
                  >
                    {inspectorLabel(tab)}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              aria-label="拖拽调整属性检查器宽度"
              onPointerDown={startInspectorResize}
              onDoubleClick={() => setInspectorWidth(360)}
              className={`absolute left-[-5px] top-0 z-20 h-full w-2 cursor-col-resize transition ${
                isResizingInspector ? "bg-indigo-500/40" : "bg-transparent hover:bg-indigo-500/25"
              }`}
            >
              <span className="absolute left-0 top-1/2 h-14 w-px -translate-y-1/2 rounded bg-white/20" />
            </button>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              {activeTab === "properties" ? (
                <div className="space-y-3">
                  <div className="inspector-compact-status rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-white/82">已套团队规范</h3>
                        <p className="mt-1 truncate text-xs text-white/36">
                          {activeOutputProfile.masterSize}×{activeOutputProfile.masterSize} · {activeOutputProfile.strokeWidth}px · {activeOutputProfile.color} · native nodes
                        </p>
                      </div>
                      <Badge tone={inspectorWarnings.length ? "amber" : "green"}>{inspectorWarnings.length ? "待检查" : "已套用"}</Badge>
                    </div>
                    {inspectorWarnings.length ? <p className="mt-2 truncate text-xs text-amber-200/80">{inspectorWarnings[0]}</p> : null}
                  </div>
                  {selectedInstance ? (
                    <>
                      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/50">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs text-white/42">当前画布图标</div>
                            <input
                              value={selectedInstance.name}
                              onChange={(event) => updateSelectedInstance({ name: event.target.value })}
                              className="mt-1 w-full rounded border border-transparent bg-transparent px-0 py-0.5 text-sm font-semibold text-white/86 outline-none transition focus:border-slate-200 focus:bg-slate-50 focus:px-2"
                            />
                            <div className="mt-1 text-xs text-white/42">
                              {sourceLabel(selectedInstance.sourceName)} · {instanceSourceModeLabel(selectedInstance)} ·{" "}
                              {Math.round(selectedInstance.scale * 100)}%
                            </div>
                          </div>
                          <Badge tone={selectedInstance.reviewStatus === "approved" ? "green" : instanceSourceModeTone(selectedInstance)}>
                            {selectedInstance.reviewStatus === "approved" ? "已确认" : instanceSourceModeLabel(selectedInstance)}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm inspector-core-controls">
                        <NumberSlider
                          label="画布 X"
                          value={selectedInstance.x}
                          min={0}
                          max={canvasSurfaceWidth - canvasInstanceBaseSize}
                          step={1}
                          onChange={(nextValue) => updateSelectedInstance({ x: nextValue })}
                        />
                        <NumberSlider
                          label="画布 Y"
                          value={selectedInstance.y}
                          min={0}
                          max={canvasSurfaceHeight - canvasInstanceBaseSize}
                          step={1}
                          onChange={(nextValue) => updateSelectedInstance({ y: nextValue })}
                        />
                        <NumberSlider
                          label="缩放"
                          value={selectedInstance.scale}
                          min={0.55}
                          max={2.4}
                          step={0.05}
                          onChange={(nextValue) => updateSelectedInstance({ scale: nextValue })}
                        />
                        <NumberSlider
                          label="预览留白"
                          value={selectedInstance.previewPadding ?? 28}
                          min={12}
                          max={44}
                          step={1}
                          onChange={(nextValue) => updateSelectedInstance({ previewPadding: nextValue })}
                        />
                        {selectedInstanceUsesSvgPreview ? (
                          <NumberSlider
                            label="线性粗细"
                            value={selectedInstance.previewStrokeWidth ?? 2}
                            min={1}
                            max={3}
                            step={0.25}
                            onChange={(nextValue) => updateSelectedInstance({ previewStrokeWidth: nextValue })}
                          />
                        ) : null}
                      </div>

                      {selectedInstanceUsesSvgPreview ? (
                        <ColorPickerField
                          label="预览颜色"
                          value={selectedInstance.previewColor ?? activeOutputProfile.color}
                          onChange={(nextValue) => updateSelectedInstance({ previewColor: nextValue })}
                          helperText={
                            (selectedInstance.previewColor ?? activeOutputProfile.color) === activeOutputProfile.color
                              ? `当前使用 ${selectedTeamSpecLibrary.skillName} 团队默认色。`
                              : `注意：生产交付仍建议恢复 ${activeOutputProfile.color}，避免偏离团队规范。`
                          }
                        />
                      ) : null}

                      {selectedInstance.sourcePreviewSvg ? (
                        <details className="inspector-details rounded-2xl border border-white/10 bg-white/[0.025] p-3">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-white/76">
                            <span>来源参考</span>
                            <Badge tone={instanceSourceModeTone(selectedInstance)}>
                              {selectedInstance.sourceConversionStatus === "team_normalized"
                                ? "已套规范"
                                : selectedInstance.sourceConversionStatus === "needs_review"
                                  ? "需确认"
                                  : "仅作对照"}
                            </Badge>
                          </summary>
                          <div className="mt-3 flex items-center gap-3">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white p-3 text-[#0F1218] [&_svg]:h-full [&_svg]:w-full">
                              <div dangerouslySetInnerHTML={{ __html: selectedInstance.sourcePreviewSvg }} />
                            </div>
                            <p className="text-xs leading-5 text-white/42">
                              {selectedInstance.reviewNote || `保留来源形态，并统一套用 ${selectedTeamSpecLibrary.name}。`}
                            </p>
                          </div>
                        </details>
                      ) : null}

                      {selectedInstanceElement &&
                      !selectedInstanceUsesSvgPreview &&
                      selectedInstance.sourceConversionStatus !== "reference_only" ? (
                        <>
                          <details className="inspector-details rounded-2xl border border-white/10 bg-white/[0.025] p-3">
                            <summary className="cursor-pointer list-none text-sm font-semibold text-white/76">高级：内部图层</summary>
                            <div className="mt-2 text-xs text-white/42">{selectedInstanceElement.name} · {selectedInstanceElement.type}</div>
                          </details>
                          <div className="grid grid-cols-2 gap-2 text-sm inspector-advanced-controls">
                            {([
                              ["形态 X", selectedInstanceElement.x, instanceElementBounds?.x[0] ?? 0, instanceElementBounds?.x[1] ?? 24, "x"],
                              ["宽度", selectedInstanceElement.width, instanceElementBounds?.width[0] ?? 0, instanceElementBounds?.width[1] ?? 24, "width"],
                              ["高度", selectedInstanceElement.height, instanceElementBounds?.height[0] ?? 0, instanceElementBounds?.height[1] ?? 24, "height"],
                            ] as const).map(([label, value, min, max, key]) => (
                              <NumberSlider
                                key={label}
                                label={label}
                                value={value}
                                min={min}
                                max={max}
                                step={0.5}
                                disabled={selectedInstanceElement.locked}
                                onChange={(nextValue) => updateSelectedInstanceElement({ [key]: nextValue })}
                              />
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <NumberSlider
                              label="线宽"
                              value={selectedInstanceElement.strokeWidth ?? 0}
                              min={instanceElementBounds?.strokeWidth[0] ?? 0}
                              max={instanceElementBounds?.strokeWidth[1] ?? 3}
                              step={0.5}
                              disabled={selectedInstanceElement.locked || selectedInstanceElement.type === "ellipse"}
                              onChange={(nextValue) => updateSelectedInstanceElement({ strokeWidth: nextValue })}
                            />
                            <NumberSlider
                              label="圆角"
                              value={selectedInstanceElement.radius ?? 0}
                              min={instanceElementBounds?.radius[0] ?? 0}
                              max={instanceElementBounds?.radius[1] ?? 4}
                              step={0.5}
                              disabled={selectedInstanceElement.locked || (selectedInstanceElement.type !== "path" && selectedInstanceElement.type !== "rect")}
                              onChange={(nextValue) => updateSelectedInstanceElement({ radius: nextValue })}
                            />
                          </div>
                          <ColorPickerField
                            label={selectedInstanceElement.type === "ellipse" ? "局部填充" : "描边颜色"}
                            value={
                              selectedInstanceElement.type === "ellipse"
                                ? selectedInstanceElement.fill ?? defaultTeamIconColor
                                : selectedInstanceElement.stroke ?? defaultTeamIconColor
                            }
                            disabled={selectedInstanceElement.locked}
                            onChange={(nextValue) =>
                              updateSelectedInstanceElement(
                                selectedInstanceElement.type === "ellipse" ? { fill: nextValue } : { stroke: nextValue },
                              )
                            }
                            helperText={
                              selectedInstanceElement.type === "ellipse"
                                ? "只有极小状态点允许局部填充；生产交付建议保持团队规范色。"
                                : "生产交付建议保持 #0F1218；改色适合临时预览或特殊业务态。"
                            }
                          />
                        </>
                      ) : selectedInstance.sourceConversionStatus === "reference_only" ? (
                        <details className="inspector-details rounded-2xl border border-white/10 bg-white/[0.025] p-3 text-xs leading-5 text-white/46">
                          <summary className="cursor-pointer list-none text-sm font-semibold text-white/72">高级说明</summary>
                          <p className="mt-2">来源库图标已保留原始形态并套用团队规范。详细路径编辑放在“列表/交付”中处理。</p>
                        </details>
                      ) : (
                        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100/80">
                          该图标还需转成可交付 native nodes，当前先调整位置、缩放和留白。
                        </div>
                      )}
                    </>
                  ) : !showPreview ? (
                    <div className="iconops-workbench-empty flex min-h-[420px] items-center justify-center rounded-[26px] border border-dashed border-white/10 bg-white/[0.055]/62 p-6 text-center">
                      <div>
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl text-slate-300 shadow-sm shadow-slate-200/70">
                          ⌁
                        </div>
                        <h3 className="text-sm font-semibold text-white/86">选中图标后编辑</h3>
                        <p className="mt-2 text-xs leading-5 text-white/42">
                          位置、缩放、颜色、质量检查和 Figma 交付会在这里出现。
                        </p>
                        <div className="mt-4 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-white/42">
                          24×24 · 2px · #0F1218
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="rounded border border-slate-200 bg-white p-3">
                        <div className="text-xs text-white/42">AI 预览模板层</div>
                        <div className="mt-1 text-sm font-semibold text-white/86">{selectedElement.name}</div>
                        <div className="mt-1 text-xs text-white/42">{selectedElement.type}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {([
                          ["x", selectedElement.x, propertyBounds.x[0], propertyBounds.x[1]],
                          ["y", selectedElement.y, propertyBounds.y[0], propertyBounds.y[1]],
                          ["width", selectedElement.width, propertyBounds.width[0], propertyBounds.width[1]],
                          ["height", selectedElement.height, propertyBounds.height[0], propertyBounds.height[1]],
                        ] as const).map(([label, value, min, max]) => (
                          <NumberSlider
                            key={label}
                            label={label}
                            value={value}
                            min={min}
                            max={max}
                            step={0.5}
                            disabled={selectedElement.locked}
                            onChange={(nextValue) => updateSelectedElement({ [label]: nextValue })}
                          />
                        ))}
                      </div>
                      <div className="grid gap-2 text-sm">
                        <ColorPickerField
                          label="描边颜色"
                          value={selectedElement.stroke ?? defaultTeamIconColor}
                          disabled={selectedElement.locked}
                          onChange={(nextValue) => updateSelectedElement({ stroke: nextValue })}
                          helperText="生产交付默认使用 #0F1218；这里主要用于预览和特殊状态验证。"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <NumberSlider
                            label="线宽"
                            value={selectedElement.strokeWidth ?? 0}
                            min={propertyBounds.strokeWidth[0]}
                            max={propertyBounds.strokeWidth[1]}
                            step={0.5}
                            disabled={selectedElement.locked || selectedElement.type === "ellipse"}
                            onChange={(nextValue) => updateSelectedElement({ strokeWidth: nextValue })}
                          />
                          <NumberSlider
                            label="圆角"
                            value={selectedElement.radius ?? 0}
                            min={propertyBounds.radius[0]}
                            max={propertyBounds.radius[1]}
                            step={0.5}
                            disabled={selectedElement.locked || (selectedElement.type !== "path" && selectedElement.type !== "rect")}
                            onChange={(nextValue) => updateSelectedElement({ radius: nextValue })}
                          />
                        </div>
                      </div>
                      {selectedElement.type === "ellipse" ? (
                        <ColorPickerField
                          label="局部填充"
                          value={selectedElement.fill ?? defaultTeamIconColor}
                          disabled={selectedElement.locked}
                          onChange={(nextValue) => updateSelectedElement({ fill: nextValue })}
                          helperText="只有极小状态点允许局部填充；这不是装饰色，而是 24px 下保持可读性的例外。"
                        />
                      ) : null}
                      <div className="flex gap-2">
                        <button
                          onClick={resetCanvasElements}
                          className="flex-1 rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition hover:border-slate-300"
                        >
                          重置模板
                        </button>
                        <button
                          onClick={applyProMaxDefaults}
                          disabled={selectedElement.locked}
                          className="flex-1 rounded bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/28"
                        >
                          恢复团队默认
                        </button>
                      </div>
                      <div className="rounded border border-slate-200 bg-white p-3 text-xs leading-5 text-white/42">
                        这里调整的是 AI 预览模板。把预览放入画布后，再选中画布图标即可调整真实实例。
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {activeTab === "layers" ? (
                <div className="space-y-3">
                  {batchTasks.length ? (
                    <div className="rounded border border-blue-500/20 bg-indigo-500/10 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold text-blue-700">从资料中识别到的图标</h3>
                          <p className="mt-1 text-xs text-blue-700/70">确认后可以一键放进画布。</p>
                        </div>
                        <Badge tone="blue">{batchTasks.length}</Badge>
                      </div>
                      <div className="max-h-44 space-y-2 overflow-auto pr-1">
                        {batchTasks.map((task) => (
                          <div key={task.id} className="rounded border border-blue-500/20 bg-slate-50 p-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-xs font-semibold text-white/86">{task.name}</span>
                              <Badge tone={task.status === "queued" ? "green" : "amber"}>{taskStatusLabel(task.status)}</Badge>
                            </div>
                            <div className="mt-1 text-xs text-white/42">
                              {batchInputKindLabel(task.sourceKind)} · {task.candidateCount} 个参考 · 匹配 {task.bestScore || "-"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded border border-slate-200 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-base font-semibold text-slate-800">画布图层</h3>
                        <p className="mt-1 text-xs text-white/42">按用途拆多个画布；当前只编辑选中的画布层。</p>
                      </div>
                      <Badge tone={totalCanvasInstanceCount ? "blue" : "neutral"}>{totalCanvasInstanceCount} 个</Badge>
                    </div>
                    <div className="mb-3 space-y-2">
                      {canvasLayers.map((layer) => (
                        <button
                          key={layer.id}
                          type="button"
                          onClick={() => switchCanvasLayer(layer.id)}
                          className={`w-full rounded border px-3 py-2 text-left transition ${
                            layer.id === activeCanvasLayerId
                              ? "border-blue-400 bg-indigo-500/10"
                              : "border-white/10 bg-white/[0.055] hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-semibold text-white/86">{layer.name}</span>
                            <span className="text-xs text-white/42">{layer.instances.length} 个</span>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="mb-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={createCanvasLayer}
                        className="rounded border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-semibold text-white/86 transition hover:border-blue-400"
                      >
                        新增画布
                      </button>
                      <button
                        onClick={clearActiveCanvasLayer}
                        disabled={!canvasInstances.length}
                        className="rounded border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-semibold text-white/86 transition hover:border-amber-400 disabled:cursor-not-allowed disabled:text-white/32"
                      >
                        清空当前
                      </button>
                    </div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-800">当前画布图标</h3>
                      <Badge tone={canvasInstances.length ? "blue" : "neutral"}>{canvasInstances.length} 个</Badge>
                    </div>
                    <button
                      onClick={downloadBatchManifest}
                      disabled={!canvasInstances.length}
                      className="mb-3 w-full rounded border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-semibold text-white/86 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:text-white/32"
                    >
                      导出图标清单
                    </button>
                    <button
                      onClick={focusAllCanvasInstances}
                      disabled={!canvasInstances.length}
                      className="mb-3 w-full rounded border border-blue-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:border-blue-300 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-white/32"
                    >
                      定位全部图标
                    </button>
                    {canvasInstances.length ? (
                      <div className="max-h-64 space-y-2 overflow-auto pr-1">
                        {canvasInstances.map((instance) => (
                          <div
                            key={instance.id}
                            className={`w-full rounded border p-3 text-left transition ${
                              selectedInstanceId === instance.id
                                ? "border-blue-400 bg-indigo-500/10"
                              : "border-white/10 bg-white/[0.055] hover:border-slate-300"
                            }`}
                          >
                            <button type="button" onClick={() => selectAndFocusCanvasInstance(instance)} className="w-full text-left">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-xs font-semibold text-white/86">{instance.name}</span>
                                <Badge tone={canvasInstanceQualityState(instance, activeOutputProfile).tone}>{canvasInstanceQualityState(instance, activeOutputProfile).label}</Badge>
                              </div>
                              <div className="mt-1 truncate text-xs text-white/42">
                                {sourceLabel(instance.sourceName)} · 画法 {instance.optionId ?? "A"} · {Math.round(instance.scale * 100)}%
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => selectAndFocusCanvasInstance(instance)}
                              className="mt-2 mr-2 rounded border border-slate-200 px-2 py-1 text-xs text-white/42 transition hover:border-blue-400 hover:text-blue-700"
                            >
                              定位
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteCanvasInstance(instance.id)}
                              className="mt-2 rounded border border-slate-200 px-2 py-1 text-xs text-white/42 transition hover:border-red-400 hover:text-red-700"
                            >
                              删除
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded border border-dashed border-slate-200 p-3 text-xs leading-5 text-white/42">
                        画布还是空的。可以先说一个需求，或切到批量模式粘贴清单。
                      </p>
                    )}
                  </div>

                  {userEditableLayers.map((element) => (
                    <div
                      key={element.id}
                      className={`rounded border p-3 transition ${
                        selectedElementId === element.id
                          ? "border-blue-400 bg-indigo-500/10"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <button
                          onClick={() => {
                            setSelectedElementId(element.id);
                            setActiveTab("properties");
                          }}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="truncate text-sm font-medium text-white/86">{element.name}</div>
                          <div className="mt-1 text-xs text-white/42">
                            {element.type === "rect" ? "原生矩形" : element.type === "path" ? "矢量路径" : element.type === "line" ? "原生直线" : "原生圆形"} · {element.width}×{element.height} · {element.visible === false ? "已隐藏" : "显示中"}
                          </div>
                        </button>
                        <div className="flex shrink-0 items-center gap-2">
                          {element.locked ? <Badge tone="amber">固定</Badge> : <Badge tone="green">可改</Badge>}
                          <button
                            onClick={() => toggleElementVisibility(element.id)}
                            disabled={element.locked}
                            className="rounded border border-slate-200 px-2 py-1 text-xs text-white/70 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:text-white/32"
                          >
                            {element.visible === false ? "显示" : "隐藏"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {activeTab === "spec" ? (
                <div className="space-y-3">
                  <div className="rounded border border-slate-200 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-base font-semibold text-slate-800">交付说明（JSON）</h3>
                      <Badge tone={canGenerateFigmaPayload ? "green" : "amber"}>
                        {canGenerateFigmaPayload ? "可生成" : "待确认"}
                      </Badge>
                    </div>
                    <div className="mb-3 rounded border border-white/10 bg-white/[0.055] p-3 text-xs leading-5 text-white/42">
                      <div className="mb-2 flex items-center justify-between">
                        <span>交付前确认</span>
                        <Badge tone={approvedPreview ? "green" : "amber"}>{approvedPreview ? "已确认" : "等你确认"}</Badge>
                      </div>
                      {drawBlockedReasons.length ? (
                        <div className="space-y-1">
                          {drawBlockedReasons.map((reason) => (
                            <p key={reason} className="text-amber-700">• {reason}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-emerald-700">当前图标已满足交付条件，可以准备写入 Figma；写入后还需要截图检查。</p>
                      )}
                    </div>
                    <button
                      onClick={() => approveCurrentPreview()}
                      disabled={!showPreview || !selectedOption || approvedPreview || Boolean(specWarnings.length)}
                      className="mb-3 w-full rounded bg-emerald-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/28"
                    >
                      {approvedPreview ? "当前预览已确认" : specWarnings.length ? "预览质量未通过，暂不能交付" : "确认这个样子，准备交付"}
                    </button>
                    <pre className="max-h-80 overflow-auto rounded border border-slate-200 bg-white p-3 text-xs leading-5 text-white/70">
                      {JSON.stringify(iconSpecContract, null, 2)}
                    </pre>
                  </div>
	                  <div className="rounded border border-slate-200 bg-white p-3">
	                    <div className="mb-2 flex items-center justify-between">
	                      <h3 className="text-base font-semibold text-slate-800">批量写入 Figma</h3>
	                      <Badge tone={productionStatus === "ready" ? "green" : productionStatus === "blocked" ? "amber" : productionStatus === "failed" ? "red" : canGenerateFigmaPayload ? "blue" : "neutral"}>
	                        {batchFigmaWriteStatus === "idle" ? `${totalCanvasInstanceCount} 个` : runStatusLabel(batchFigmaWriteStatus)}
	                      </Badge>
	                    </div>
		                    <p className="mb-3 text-xs leading-5 text-white/42">
		                      目标链接和 Token 已前置到顶部“Figma 输出设置”。这里仅查看 JSON 规格、执行器和门禁结果，避免写入入口藏在交付页。
		                    </p>
		                    <div className="mb-3 rounded border border-white/10 bg-white/[0.055] p-3 text-xs leading-5 text-white/42">
		                      <div className="flex items-center justify-between gap-2">
		                        <span>{figmaTargetUrl.trim() ? "已填写目标 Figma" : "顶部还没填写目标 Figma"}</span>
		                        <Badge tone={batchFigmaWriteStatus === "ready" ? "green" : batchFigmaWriteStatus === "failed" ? "red" : batchFigmaWriteStatus === "blocked" ? "amber" : "blue"}>
		                          {batchFigmaWriteStatus === "idle" ? `${totalCanvasInstanceCount} 个待写入` : runStatusLabel(batchFigmaWriteStatus)}
		                        </Badge>
		                      </div>
		                      <p className="mt-1 text-white/32">真实边界：Figma REST Token 只校验权限；最终仍由 Figma 插件/Connector 按 JSON 创建 native nodes。</p>
		                    </div>
	                    {batchFigmaWriteMessage ? (
	                      <p className="mb-3 rounded border border-white/10 bg-white/[0.055] px-3 py-2 text-xs leading-5 text-white/70">
	                        {batchFigmaWriteMessage}
	                      </p>
	                    ) : null}
	                    {batchFigmaWriteRun ? (
	                      <div className="mb-3 space-y-2">
	                        {batchFigmaWriteRun.target ? (
	                          <div className="rounded border border-white/10 bg-white/[0.055] p-2 text-xs leading-5 text-white/42">
	                            <div className="font-semibold text-slate-800">{batchFigmaWriteRun.target.fileName ?? "Figma 目标"}</div>
	                            <div className="mt-1 break-all font-mono">{batchFigmaWriteRun.target.fileKey} · {batchFigmaWriteRun.target.nodeId}</div>
	                          </div>
	                        ) : null}
	                        {batchFigmaWriteRun.warnings.map((warning) => (
	                          <p key={warning} className="rounded border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-700">
	                            {warning}
	                          </p>
	                        ))}
	                      </div>
	                    ) : null}
		                    <div className="mb-4 grid gap-2">
		                      <label className="block">
		                        <span className="mb-1 block text-xs font-semibold text-white/42">icon-spec-batch.json</span>
		                        <textarea
		                          readOnly
		                          value={
		                            batchFigmaWriteRun?.figma.jsonSpec ||
		                            "生成后这里会出现 JSON 规格：包含每个 icon 的 meta / shapes / strokes / position，Figma 端按它创建可编辑 native 图层。"
		                          }
		                          className="h-40 w-full resize-none rounded border border-slate-200 bg-white p-3 font-mono text-xs leading-5 text-white/70 outline-none"
		                        />
		                      </label>
		                      <label className="block">
		                        <span className="mb-1 block text-xs font-semibold text-white/42">figma-json-draw-runner.js</span>
		                        <textarea
		                          readOnly
		                          value={
		                            batchFigmaWriteRun?.figma.script ||
		                            "执行器脚本只负责读取 JSON 并调用 Figma Plugin API 画 native nodes；不是 SVG 导入。"
		                          }
		                          className="h-32 w-full resize-none rounded border border-slate-200 bg-white p-3 font-mono text-xs leading-5 text-white/70 outline-none"
		                        />
		                      </label>
		                    </div>
	                    <div className="my-3 border-t border-slate-200" />
	                    <div className="mb-2 flex items-center justify-between">
	                      <h4 className="text-sm font-semibold text-white/70">单个预览写入任务</h4>
	                      <Badge tone={productionStatus === "ready" ? "green" : productionStatus === "blocked" ? "amber" : productionStatus === "failed" ? "red" : canGenerateFigmaPayload ? "blue" : "neutral"}>
	                        {productionStatus === "idle" && canGenerateFigmaPayload ? "可准备" : runStatusLabel(productionStatus)}
	                      </Badge>
	                    </div>
	                    <button
	                      onClick={() => void prepareProductionRun()}
	                      disabled={!canGenerateFigmaPayload || productionStatus === "building"}
                      className="mb-2 w-full rounded bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/28"
                    >
                      {productionStatus === "building" ? "正在准备写入任务" : "准备写入 Figma"}
                    </button>
                    <button
                      onClick={copyFigmaNativeScript}
                      disabled={!canGenerateFigmaPayload}
                      className="mb-3 w-full rounded border border-white/10 bg-white/[0.055] px-3 py-2 text-sm font-semibold text-white/86 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:text-white/32"
                    >
                      {copyStatus === "copied" ? "已复制写入脚本" : copyStatus === "failed" ? "复制失败，请手动选择" : "复制写入脚本"}
                    </button>
                    {productionMessage ? (
                      <p className="mb-3 rounded border border-white/10 bg-white/[0.055] px-3 py-2 text-xs leading-5 text-white/70">
                        {productionMessage}
                      </p>
                    ) : null}
                    {productionRun ? (
                      <div className="mb-3 space-y-2">
                        {productionRun.gates.map((gate) => (
                          <div key={gate.id} className="rounded border border-white/10 bg-white/[0.055] p-2 text-xs leading-5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-800">{gate.label}</span>
                              <Badge tone={gate.status === "done" ? "green" : gate.status === "blocked" ? "red" : "amber"}>{gateStatusLabel(gate.status)}</Badge>
                            </div>
                            <p className="mt-1 text-white/42">{gate.detail}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
	                    <textarea
	                      readOnly
	                      value={
	                        productionRun?.figma.script ||
	                        (canGenerateFigmaPayload ? figmaNativeScript : "Preview 未批准或交付未通过前，不生成 Figma native draw payload。")
	                      }
	                      className="h-40 w-full resize-none rounded border border-slate-200 bg-white p-3 font-mono text-xs leading-5 text-white/70 outline-none"
	                    />
	                  </div>
                  <div className="rounded border border-slate-200 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-base font-semibold text-slate-800">交付文件</h3>
                      <Badge tone={deliveryStatus === "ready" ? "green" : deliveryStatus === "blocked" ? "amber" : deliveryStatus === "failed" ? "red" : "neutral"}>
                        {runStatusLabel(deliveryStatus)}
                      </Badge>
                    </div>
                    <p className="mb-3 text-xs leading-5 text-white/42">
                      生成可下载的交付文件，包含图标说明、预览、React 组件和 Figma 写入脚本。
                    </p>
                    <button
                      onClick={() => void generateDeliveryPackage()}
                      disabled={!canGenerateFigmaPayload || deliveryStatus === "building"}
                      className="mb-3 w-full rounded bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/28"
                    >
                      {deliveryStatus === "building" ? "正在准备交付包" : "生成交付文件"}
                    </button>
                    {deliveryMessage ? (
                      <p className="mb-3 rounded border border-white/10 bg-white/[0.055] px-3 py-2 text-xs leading-5 text-white/70">
                        {deliveryMessage}
                      </p>
                    ) : null}
                    {deliveryPackage ? (
                      <div className="space-y-2">
                        {deliveryPackage.persisted ? (
                          <div className="rounded border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs leading-5 text-emerald-700">
                            <div className="font-semibold">已写入本地目录</div>
                            <div className="mt-1 break-all font-mono text-emerald-50">{deliveryPackage.persisted.directory}</div>
                          </div>
                        ) : null}
                        {deliveryPackage.files.map((file) => (
                          <div key={file.path} className="rounded border border-white/10 bg-white/[0.055] p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate text-xs font-semibold text-white/86">{file.path}</div>
                                <div className="mt-1 text-xs text-white/32">{file.language} · {file.content.length} chars</div>
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <button
                                  onClick={() => void copyDeliveryFile(file.content)}
                                  className="rounded border border-slate-200 px-2 py-1 text-xs text-white/70 transition hover:border-slate-300"
                                >
                                  复制
                                </button>
                                <button
                                  onClick={() => downloadDeliveryFile(file.path, file.content)}
                                  className="rounded border border-slate-200 px-2 py-1 text-xs text-white/70 transition hover:border-slate-300"
                                >
                                  下载
                                </button>
                              </div>
                            </div>
                            <pre className="max-h-28 overflow-auto rounded bg-white p-2 text-xs leading-5 text-white/42">
                              {file.content}
                            </pre>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {activeTab === "quality" ? (
                <div className="space-y-3">
                  <div className="rounded border border-amber-500/25 bg-amber-500/10 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-amber-800">当前图标质量门禁</h3>
                        <p className="mt-1 text-xs leading-5 text-amber-800/70">
                          逐条处理警告：可以编辑后复查，也可以对可接受的偏差留下人工批准记录。
                        </p>
                      </div>
                      <Badge tone={selectedInstanceBlockers.length ? "red" : selectedInstancePendingQualityIssues.length ? "amber" : "green"}>
                        {selectedInstance ? (selectedInstanceBlockers.length ? "硬阻断" : selectedInstancePendingQualityIssues.length ? "待处理" : "可写入") : "未选中"}
                      </Badge>
                    </div>
                    {selectedInstance ? (
                      <div className="mt-3 space-y-2">
                        <div className="rounded border border-amber-500/20 bg-white/70 p-2 text-xs leading-5 text-amber-900/70">
                          当前阶段：
                          {selectedInstanceQualityIssues.length
                            ? Array.from(new Set(selectedInstanceQualityIssues.map((issue) => qualityStageLabel(issue.stage)))).join("、")
                            : "已通过团队规范和 Figma native 写入检查"}
                        </div>
                        {selectedInstanceQualityIssues.length ? (
                          selectedInstanceQualityIssues.map((issue) => {
                            const isApproved = issue.severity === "warning" && selectedInstanceApprovedIssueIds.has(issue.id);
                            return (
                              <div
                                key={issue.id}
                                className={`rounded border p-2 ${
                                  issue.severity === "blocker"
                                    ? "border-red-500/25 bg-red-500/10"
                                    : isApproved
                                      ? "border-emerald-500/20 bg-emerald-500/10"
                                      : "border-amber-500/20 bg-white/70"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="font-semibold text-slate-800">{issue.title}</span>
                                      <Badge tone={issue.severity === "blocker" ? "red" : isApproved ? "green" : "amber"}>
                                        {issue.severity === "blocker" ? "必须修复" : isApproved ? "人工已批准" : "可人工批准"}
                                      </Badge>
                                      <span className="text-[11px] text-slate-500">{qualityStageLabel(issue.stage)}</span>
                                    </div>
                                    <p className="mt-1 text-xs leading-5 text-slate-600">{issue.message}</p>
                                  </div>
                                  <div className="flex shrink-0 gap-1">
                                    <button
                                      type="button"
                                      onClick={() => focusQualityIssue(issue)}
                                      className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-blue-400 hover:text-blue-700"
                                    >
                                      {issue.actionLabel}
                                    </button>
                                    {issue.severity === "warning" ? (
                                      <button
                                        type="button"
                                        onClick={() => approveSelectedQualityIssue(issue.id)}
                                        disabled={isApproved}
                                        className="rounded bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-200"
                                      >
                                        {isApproved ? "已批准" : "批准"}
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-2 text-xs leading-5 text-emerald-800">
                            当前图标没有未处理质量问题，可以进入 Figma 写入。
                          </p>
                        )}
                        {selectedInstancePendingQualityIssues.some((issue) => issue.severity === "warning") && !selectedInstanceBlockers.length ? (
                          <button
                            type="button"
                            onClick={approveSelectedQualityWarnings}
                            className="w-full rounded bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
                          >
                            批准当前图标的全部可接受警告
                          </button>
                        ) : null}
                        {selectedInstanceBlockers.length ? (
                          <p className="rounded border border-red-500/20 bg-red-500/10 px-2 py-2 text-xs leading-5 text-red-800">
                            红色问题是硬阻断，不能通过人工批准绕过；请按每条问题右侧动作修复后重新检查。
                          </p>
                        ) : null}
                        {selectedInstanceQualityIssues.some((issue) => issue.stage === "team-spec") ? (
                          <button
                            type="button"
                            onClick={normalizeSelectedInstanceToTeamSpec}
                            className="w-full rounded border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:border-indigo-400"
                          >
                            一键恢复团队线宽和颜色
                          </button>
                        ) : null}
                        {selectedInstance.sourceConversionStatus !== "reference_only" && selectedInstance.elements.some((element) => element.locked && isDrawableElement(element)) ? (
                          <button
                            type="button"
                            onClick={enableSelectedInstanceGeometryEditing}
                            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-400 hover:text-blue-700"
                          >
                            开启来源几何编辑
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-3 rounded border border-amber-500/20 bg-white/70 px-2 py-2 text-xs leading-5 text-amber-900/70">
                        先点击画布中的图标，再在这里查看具体卡点和修复动作。
                      </p>
                    )}
                  </div>
                  <div className="rounded border border-blue-500/20 bg-indigo-500/10 p-3">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-blue-700">人工审核</h3>
                        <p className="mt-1 text-xs leading-5 text-blue-700/70">
                          人来判断语义是否准确、是否适合业务场景、是否允许进入团队资产库。
                        </p>
                      </div>
                      <Badge tone={manualReviewTone(selectedReviewStatus)}>{manualReviewLabel(selectedReviewStatus)}</Badge>
                    </div>
                    {selectedInstance ? (
                      <div className="rounded border border-blue-500/20 bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-white/86">{selectedInstance.name}</div>
                            <div className="mt-1 truncate text-xs text-white/42">
                              {sourceLabel(selectedInstance.sourceName)} · 画法 {selectedInstance.optionId ?? "A"} · {Math.round(selectedInstance.scale * 100)}%
                            </div>
                          </div>
                          <Badge tone={manualReviewTone(selectedReviewStatus)}>{manualReviewLabel(selectedReviewStatus)}</Badge>
                        </div>
                        {selectedInstance.reviewNote ? (
                          <p className="mt-2 rounded border border-white/10 bg-white/[0.055] px-2 py-1.5 text-xs leading-5 text-white/42">
                            {selectedInstance.reviewNote}
                          </p>
                        ) : null}
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <button
                            onClick={() => {
                              updateSelectedInstanceReview("approved", "设计师已确认语义和业务场景，可进入交付检查。");
                              approveSelectedQualityWarnings();
                            }}
                            disabled={selectedInstanceBlockers.length > 0}
                            className="rounded bg-emerald-500 px-2 py-2 text-xs font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-200"
                          >
                            通过并批准警告
                          </button>
                          <button
                            onClick={() => updateSelectedInstanceReview("rejected", "人工打回：需要重新调整语义、比例或视觉细节。")}
                            className="rounded border border-red-500/30 bg-red-500/10 px-2 py-2 text-xs font-semibold text-red-100 transition hover:border-red-400"
                          >
                            打回
                          </button>
                          <button
                            onClick={() => void approveSelectedInstanceIntoTeamLibrary()}
                            disabled={selectedInstanceBlockers.length > 0 || selectedInstancePendingQualityIssues.some((issue) => issue.severity === "warning") || selectedReviewStatus === "rejected"}
                            className="rounded bg-indigo-500 px-2 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/28"
                          >
                            {teamLibraryTrainingStatus === "training" ? "入库中" : "入库"}
                          </button>
                        </div>
                        {selectedInstancePendingQualityIssues.length ? (
                          <p className="mt-2 text-xs leading-5 text-amber-700">仍有未处理质量问题，暂不建议入库。</p>
                        ) : null}
                      </div>
                    ) : showPreview ? (
                      <div className="rounded border border-blue-500/20 bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-slate-800">当前 AI 预览质量</div>
                            <p className="mt-1 text-xs leading-5 text-slate-500">先修复或批准可接受警告，再确认预览进入交付。</p>
                          </div>
                          <Badge tone={previewHasQualityIssues ? "red" : pendingPreviewQualityIssues.length ? "amber" : "green"}>
                            {previewHasQualityIssues ? "硬阻断" : pendingPreviewQualityIssues.length ? "待处理" : "可确认"}
                          </Badge>
                        </div>
                        <div className="mt-3 space-y-2">
                          {previewQualityIssues.map((issue) => {
                            const isApproved = approvedPreviewWarningIds.includes(issue.id);
                            return (
                              <div key={issue.id} className={`rounded border p-2 ${isApproved ? "border-emerald-500/20 bg-emerald-500/10" : "border-amber-500/20 bg-white"}`}>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-semibold text-slate-800">{issue.title}</span>
                                      <Badge tone={isApproved ? "green" : "amber"}>{isApproved ? "人工已批准" : "可人工批准"}</Badge>
                                    </div>
                                    <p className="mt-1 text-xs leading-5 text-slate-600">{issue.message}</p>
                                  </div>
                                  <div className="flex shrink-0 gap-1">
                                    <button
                                      type="button"
                                      onClick={() => focusQualityIssue(issue)}
                                      className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700"
                                    >
                                      {issue.actionLabel}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => approvePreviewQualityIssue(issue.id)}
                                      disabled={isApproved}
                                      className="rounded bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-emerald-200"
                                    >
                                      {isApproved ? "已批准" : "批准"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {previewHasQualityIssues ? (
                            <p className="rounded border border-red-500/20 bg-red-500/10 px-2 py-2 text-xs leading-5 text-red-800">
                              SVG 预览质量存在硬阻断：需要重新生成或编辑图形，不能人工批准绕过。
                            </p>
                          ) : null}
                          {pendingPreviewQualityIssues.length ? (
                            <button
                              type="button"
                              onClick={approveAllPreviewQualityWarnings}
                              className="w-full rounded bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                            >
                              批准当前预览的全部可接受警告
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <p className="rounded border border-blue-500/20 bg-slate-50 px-3 py-2 text-xs leading-5 text-blue-700/70">
                        先在画布中选中一个图标，再进行人工审核。
                      </p>
                    )}
                  </div>

                  <div className="rounded border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-800">系统视觉审核</h3>
                        <p className="mt-1 text-xs leading-5 text-white/42">
                          系统负责查规范、复杂度、预览确认和截图门禁；不替代设计师最终判断。
                        </p>
                      </div>
                      <Badge tone={visualReviewBlockedCount ? "amber" : visualReviewPassCount === visualReviewItems.length ? "green" : "blue"}>
                        {visualReviewPassCount}/{visualReviewItems.length}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      {visualReviewItems.map((item) => (
                        <div key={item.label} className="rounded border border-white/10 bg-white/[0.055] p-2 text-xs leading-5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-800">{item.label}</span>
                            <Badge tone={item.status === "pass" ? "green" : item.status === "warning" ? "amber" : "neutral"}>
                              {item.status === "pass" ? "通过" : item.status === "warning" ? "待处理" : "未开始"}
                            </Badge>
                          </div>
                          <p className="mt-1 text-white/42">{item.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-slate-800">资产库状态</h3>
                      <Badge tone={visibleTeamLibrarySummary.count || libraryInstanceCount ? "blue" : "neutral"}>
                        训练库 {visibleTeamLibrarySummary.count} · 本画布 {libraryInstanceCount}
                      </Badge>
                    </div>
                    {teamLibraryTrainingMessage ? (
                      <p className="mt-2 rounded border border-white/10 bg-white/[0.055] px-2 py-1.5 text-xs leading-5 text-white/42">
                        {teamLibraryTrainingMessage}
                      </p>
                    ) : null}
                    <div className="mt-3 space-y-2 text-xs leading-5">
                      {canvasInstances.length ? (
                        canvasInstances.map((instance) => (
                          <button
                            key={instance.id}
                            onClick={() => setSelectedInstanceId(instance.id)}
                            className={`w-full rounded border p-2 text-left transition ${
                              selectedInstanceId === instance.id
                                ? "border-blue-400 bg-indigo-500/10"
                                : "border-white/10 bg-white/[0.055] hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate font-semibold text-slate-800">{instance.name}</span>
                              <div className="flex items-center gap-1">
                                <Badge tone={manualReviewTone(instance.reviewStatus)}>{manualReviewLabel(instance.reviewStatus)}</Badge>
                                <Badge tone={canvasInstanceQualityState(instance, activeOutputProfile).tone}>{canvasInstanceQualityState(instance, activeOutputProfile).label}</Badge>
                              </div>
                            </div>
                            <p className="mt-1 truncate text-white/42">{sourceLabel(instance.sourceName)}</p>
                          </button>
                        ))
                      ) : (
                        <p className="rounded border border-dashed border-slate-200 p-3 text-white/42">
                          画布里还没有图标，无法进入审核。
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-slate-800">Figma 截图门禁</h3>
                      <Badge tone={productionRun?.screenshotGate.status === "waiting_for_figma_node" ? "amber" : productionRun ? "green" : "neutral"}>
                        {productionRun?.screenshotGate.status === "waiting_for_figma_node" ? "等待截图" : productionRun ? "任务已准备" : "未开始"}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-2 text-xs leading-5">
                      {(productionRun?.screenshotGate.checks ?? [
                        "等待 Figma 写入任务准备完成",
                        "写入后截图，并和已确认的预览对比",
                      ]).map((check) => (
                        <p key={check} className="rounded border border-white/10 bg-white/[0.055] px-2 py-1 text-white/42">
                          {check}
                        </p>
                      ))}
                    </div>
                    {productionRun?.screenshotGate.failureBranches.length ? (
                      <div className="mt-3 rounded border border-amber-500/20 bg-amber-500/10 p-2 text-xs leading-5 text-amber-700">
                        {productionRun.screenshotGate.failureBranches.map((branch) => (
                          <p key={branch.failure}>
                            {branch.failure} → return to {branch.returnTo}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-slate-800">实时规范问题</h3>
                      <Badge tone={specWarnings.length ? "amber" : "green"}>{specWarnings.length ? "需处理" : "通过"}</Badge>
                    </div>
                    <div className="mt-3 space-y-2 text-xs leading-5">
                      {specWarnings.length ? (
                        specWarnings.map((warning) => (
                          <p key={warning} className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-amber-700">
                            {warning}
                          </p>
                        ))
                      ) : (
                        <p className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-700">
                          当前图标符合团队默认规则。
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

export type IconIntent =
  | "brief_icon"
  | "plan_semantics"
  | "generate_svg_preview"
  | "approve_preview"
  | "draw_figma_native"
  | "revise_preview"
  | "explain_spec"
  | "unknown";

export type IntentResult = {
  intent: IconIntent;
  confidence: number;
  query: string;
  response: string;
};

const approvalWords = ["通过", "可以", "ok", "approved", "确认", "就这个", "选这个", "写入figma", "画到figma"];
const previewWords = ["选a", "选b", "选c", "方向a", "方向b", "方向c", "option a", "option b", "option c", "预览"];
const reviseWords = ["改", "调整", "不对", "不像", "换一个", "太复杂", "太满", "不要", "revise", "wrong"];
const drawWords = ["画到figma", "写入figma", "native", "节点", "组件", "draw", "figma"];
const specWords = ["规范是什么", "规则", "spec", "标准", "pro max", "promax", "平台风格"];
const generationWords = ["找", "需要", "要一个", "生成", "做一个", "给我", "create", "generate", "icon", "图标"];
const smallTalkWords = ["你好", "早上好", "晚上好", "good morning", "hello", "hi", "thanks", "谢谢", "再见"];

function includesAny(message: string, words: string[]) {
  return words.some((word) => message.toLowerCase().includes(word.toLowerCase()));
}

export function routeIntent(message: string): IntentResult {
  const trimmed = message.trim();

  if (!trimmed) {
    return {
      intent: "unknown",
      confidence: 0,
      query: "",
      response: "告诉我图标概念、出现位置和想强调的含义，我会先给 2–3 个视觉语义方向。",
    };
  }

  if (includesAny(trimmed, smallTalkWords)) {
    return {
      intent: "unknown",
      confidence: 0.9,
      query: trimmed,
      response: "你好，我可以帮你生成或规范化团队图标。你可以直接说：做一个分享图标，用在章节卡片，强调转发动作。",
    };
  }

  if (includesAny(trimmed, specWords)) {
    return {
      intent: "explain_spec",
      confidence: 0.8,
      query: trimmed,
      response: "我会说明 icon-gen-promax 的固定漫画平台规范和四阶段门禁。",
    };
  }

  if (includesAny(trimmed, reviseWords)) {
    return {
      intent: "revise_preview",
      confidence: 0.82,
      query: trimmed,
      response: "我会回到对应阶段修订语义方向或 SVG Preview，不会直接进入 Figma 绘制。",
    };
  }

  if (includesAny(trimmed, drawWords) || includesAny(trimmed, approvalWords)) {
    return {
      intent: "draw_figma_native",
      confidence: 0.78,
      query: trimmed,
      response: "我会在 SVG Preview 获得批准后，进入 Icon Spec JSON 和 Figma native nodes 绘制门禁。",
    };
  }

  if (includesAny(trimmed, previewWords)) {
    return {
      intent: "generate_svg_preview",
      confidence: 0.78,
      query: trimmed,
      response: "我会按你选择的语义方向生成 SVG Preview，供你确认后再进入 Spec & Draw。",
    };
  }

  if (includesAny(trimmed, generationWords)) {
    return {
      intent: "plan_semantics",
      confidence: 0.84,
      query: trimmed,
      response: "我会先完成 Brief 判断，再给出 2–3 个漫画平台 24px outline 图标语义方向。",
    };
  }

  return {
    intent: "brief_icon",
    confidence: 0.68,
    query: trimmed,
    response: "这看起来还缺少图标用途或出现位置，我会先补齐 Brief，再进入语义方案。",
  };
}

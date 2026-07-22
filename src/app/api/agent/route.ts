import { routeIntent, type IconIntent } from "@/lib/intents/router";
import type { AgentAction, AgentDecision } from "@/lib/agent/types";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { resolveTeamSpecSkill } from "@/lib/team-spec-skills";

type AgentRequest = {
  message?: string;
  activeSkillId?: string;
  history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  context?: {
    query?: string;
    selectedName?: string;
    importedCount?: number;
    reportScore?: number;
    candidates?: Array<{
      name: string;
      source: string;
      category: string;
      tags: string[];
    }>;
    teamSpecLibrary?: {
      id: string;
      name: string;
      skillName: string;
    };
  };
};

type ModelApiStyle = "responses" | "chat";

type ModelConfig = {
  apiKey: string;
  model: string;
  baseUrl: string;
  style: ModelApiStyle;
  providerName: string;
};

const allowedIntents = new Set<IconIntent>([
  "brief_icon",
  "plan_semantics",
  "generate_svg_preview",
  "approve_preview",
  "draw_figma_native",
  "revise_preview",
  "explain_spec",
  "unknown",
]);

const maxSkillPromptChars = 18000;
const modelRequestTimeoutMs = 20000;

async function loadTeamSpecSkillPrompt(skillId?: string) {
  const skill = resolveTeamSpecSkill(skillId);
  if (!skill.skillPath) {
    return {
      skill,
      content: "",
      loaded: false,
    };
  }

  try {
    const absolutePath = path.join(process.cwd(), skill.skillPath);
    const content = await readFile(absolutePath, "utf8");
    return {
      skill,
      content: content.slice(0, maxSkillPromptChars),
      loaded: true,
    };
  } catch {
    return {
      skill,
      content: "",
      loaded: false,
    };
  }
}

function buildActions(intent: IconIntent, context: AgentRequest["context"] = {}): AgentAction[] {
  const hasPreview = Boolean(context.selectedName);
  const activeSkillName = context.teamSpecLibrary?.skillName ?? "当前团队规范 skill";

  if (intent === "brief_icon" || intent === "unknown") {
    return [
      {
        id: "brief",
        label: "Phase 1 · Brief",
        detail: "收集图标用途、出现位置和意义重点；最多补问一轮。",
        status: "running",
      },
      {
        id: "semantic_plan",
        label: "Phase 2 · Semantic Plan",
        detail: "Brief 足够后，提供 2–3 个视觉语义方向。",
        status: "planned",
      },
    ];
  }

  if (intent === "plan_semantics") {
    return [
      {
        id: "brief",
        label: "Phase 1 · Brief",
        detail: "从用户输入中提取概念、场景和强调点。",
        status: "done",
      },
      {
        id: "semantic_plan",
        label: "Phase 2 · Semantic Plan",
        detail: "输出 2–3 个彼此不同的低保真语义方向，等待用户选择。",
        status: "running",
      },
      {
        id: "svg_preview",
        label: "Phase 3 · SVG Preview",
        detail: "只有方向确认后才生成 SVG 视觉预览。",
        status: "planned",
      },
    ];
  }

  if (intent === "generate_svg_preview") {
    return [
      {
        id: "semantic_plan",
        label: "Phase 2 · Semantic Plan",
        detail: "用户已选择或明确暗示视觉方向。",
        status: "done",
      },
      {
        id: "svg_preview",
        label: "Phase 3 · SVG Preview",
        detail: "先检索真实外部来源；仅在来源不合格时进入当前 skill 的 AI 预览兜底。",
        status: "running",
      },
      {
        id: "preview_approval",
        label: "Preview Approval",
        detail: "等待设计师确认预览；未确认前不进入 Figma。",
        status: "waiting",
      },
    ];
  }

  if (intent === "draw_figma_native" || intent === "approve_preview") {
    return [
      {
        id: "preview_approval",
        label: "Preview Approval",
        detail: hasPreview ? "已有批准预览，可以进入规格转换。" : "需要先完成并批准 SVG Preview。",
        status: hasPreview ? "done" : "blocked",
      },
      {
        id: "icon_spec",
        label: "Phase 4A · Icon Spec JSON",
        detail: "把已批准预览转换为 contract-first native-node 规格。",
        status: hasPreview ? "running" : "blocked",
      },
      {
        id: "figma_native_draw",
        label: "Phase 4B · Figma Native Draw",
        detail: "使用 Figma Plugin API 绘制可编辑原生节点；禁止粘贴 SVG。",
        status: hasPreview ? "planned" : "blocked",
      },
      {
        id: "screenshot_gate",
        label: "Screenshot Gate",
        detail: "截图比对批准预览，若不匹配则回到对应阶段。",
        status: hasPreview ? "planned" : "blocked",
      },
    ];
  }

  if (intent === "revise_preview") {
    return [
      {
        id: "svg_preview",
        label: "Phase 3 · SVG Preview",
        detail: "根据反馈修订预览，而不是跳过批准直接绘制。",
        status: "running",
      },
      {
        id: "preview_approval",
        label: "Preview Approval",
        detail: "修订后再次等待用户批准。",
        status: "waiting",
      },
    ];
  }

  if (intent === "explain_spec") {
    return [
      {
        id: "explain_spec",
        label: `读取 ${activeSkillName}`,
        detail: "解释当前团队规范、来源优先级、阶段门禁和 Figma-native 交付边界。",
        status: "done",
      },
    ];
  }

  return [
    {
      id: "brief",
      label: "Phase 1 · Brief",
      detail: "确认图标意图与使用上下文。",
      status: "running",
    },
    {
      id: "semantic_plan",
      label: "Phase 2 · Semantic Plan",
      detail: "给出 2–3 个视觉语义方向。",
      status: "planned",
    },
    {
      id: "svg_preview",
      label: "Phase 3 · SVG Preview",
      detail: "方向确认后生成预览。",
      status: "planned",
    },
    {
      id: "icon_spec",
      label: "Phase 4A · Icon Spec JSON",
      detail: "预览批准后生成绘制规格。",
      status: "planned",
    },
    {
      id: "figma_native_draw",
      label: "Phase 4B · Figma Native Draw",
      detail: "绘制 Figma 原生可编辑节点。",
      status: "planned",
    },
  ];
}

function fallbackDecision(
  message: string,
  reason?: string,
  context?: AgentRequest["context"],
  history?: AgentRequest["history"],
): AgentDecision {
  const isBriefContinuation = /用于|用在|出现在|放在|位置|工具栏|内容列表|数据报表|批量操作|强调|表达|突出|普通下载|下载文件|导出数据/.test(message);
  const previousUserMessage = history?.findLast((item) => item.role === "user")?.content;
  const contextualMessage = isBriefContinuation && previousUserMessage ? `${previousUserMessage}；${message}` : message;
  const routed = routeIntent(contextualMessage);

  return {
    mode: "fallback",
    intent: routed.intent,
    query: routed.query,
    confidence: routed.confidence,
    response: routed.response,
    actions: buildActions(routed.intent, context),
    modeReason: reason,
    suggestions: [
      "做一个书签图标，用在章节卡片操作区",
      "我选 Option A，先生成 SVG Preview",
      "这个预览可以，继续生成 Figma native component",
    ],
  };
}

function normalizeBaseUrl(raw?: string) {
  let baseUrl = (raw?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");

  if (baseUrl.endsWith("/token")) {
    baseUrl = baseUrl.slice(0, -"/token".length);
  }

  if (!/\/v\d+(?:\/|$)/.test(baseUrl)) {
    baseUrl = `${baseUrl}/v1`;
  }

  return baseUrl;
}

function appendEndpoint(baseUrl: string, endpoint: string) {
  return `${baseUrl.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`;
}

function resolveModelConfig(): { config?: ModelConfig; reason?: string } {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ONEAPI_API_KEY;
  const model = process.env.OPENAI_MODEL || process.env.ONEAPI_MODEL;

  if (!apiKey || !model) {
    return {
      reason:
        "当前未配置 OPENAI_API_KEY / OPENAI_MODEL，正在使用本地规则 fallback；它会执行阶段门禁，但不是真模型推理。",
    };
  }

  const baseUrl = normalizeBaseUrl(process.env.OPENAI_BASE_URL || process.env.ONEAPI_BASE_URL);
  const configuredStyle = (process.env.OPENAI_API_STYLE || process.env.ONEAPI_API_STYLE || "auto").toLowerCase();
  const style: ModelApiStyle =
    configuredStyle === "chat" || configuredStyle === "chat_completions"
      ? "chat"
      : configuredStyle === "responses"
        ? "responses"
        : baseUrl.includes("api.openai.com")
          ? "responses"
          : "chat";

  return {
    config: {
      apiKey,
      model,
      baseUrl,
      style,
      providerName: baseUrl.includes("api.openai.com") ? "OpenAI" : "OneAPI/OpenAI-compatible",
    },
  };
}

function extractResponsesOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  if ("output_text" in payload && typeof payload.output_text === "string") return payload.output_text;

  const output = "output" in payload && Array.isArray(payload.output) ? payload.output : [];
  return output
    .flatMap((item: unknown) => {
      if (!item || typeof item !== "object") return [];
      const content = "content" in item && Array.isArray(item.content) ? item.content : [];
      return content.map((part: unknown) => {
        if (!part || typeof part !== "object") return "";
        if ("text" in part && typeof part.text === "string") return part.text;
        return "";
      });
    })
    .join("");
}

function extractChatOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";

  const choices = "choices" in payload && Array.isArray(payload.choices) ? payload.choices : [];
  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== "object") return "";

  const message = "message" in firstChoice && firstChoice.message;
  if (!message || typeof message !== "object") return "";

  const content = "content" in message ? message.content : "";
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((part: unknown) => {
      if (!part || typeof part !== "object") return "";
      if ("text" in part && typeof part.text === "string") return part.text;
      if ("content" in part && typeof part.content === "string") return part.content;
      return "";
    })
    .join("");
}

function parseDecision(text: string, fallback: AgentDecision): AgentDecision {
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) return fallback;

  try {
    const parsed = JSON.parse(json) as Partial<AgentDecision>;
    const parsedIntent = parsed.intent && allowedIntents.has(parsed.intent) ? parsed.intent : fallback.intent;
    const semanticOptions = Array.isArray(parsed.semanticOptions)
      ? parsed.semanticOptions
          .filter((option) => option && typeof option === "object")
          .slice(0, 3)
          .map((option, index) => {
            const id = (index === 0 ? "A" : index === 1 ? "B" : "C") as "A" | "B" | "C";

            return {
              id,
              title: typeof option.title === "string" ? option.title : fallback.semanticOptions?.[index]?.title ?? `方向 ${index + 1}`,
              elements:
                typeof option.elements === "string" && option.elements.trim()
                  ? option.elements
                  : typeof option.meaning === "string"
                    ? option.meaning
                    : fallback.semanticOptions?.[index]?.elements ?? "",
              meaning: typeof option.meaning === "string" ? option.meaning : fallback.semanticOptions?.[index]?.meaning ?? "",
              risk: typeof option.risk === "string" ? option.risk : fallback.semanticOptions?.[index]?.risk ?? "",
              previewGlyphKind: typeof option.previewGlyphKind === "string" ? option.previewGlyphKind : fallback.semanticOptions?.[index]?.previewGlyphKind,
            };
          })
      : fallback.semanticOptions;

    return {
      mode: "model",
      intent: parsedIntent,
      query: parsed.query ?? fallback.query,
      response: parsed.response ?? fallback.response,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.8,
      actions: parsed.actions?.length ? parsed.actions : fallback.actions,
      modeReason: parsed.modeReason,
      needsClarification: parsed.needsClarification,
      clarifyingQuestion: parsed.clarifyingQuestion,
      suggestions: parsed.suggestions ?? fallback.suggestions,
      brief: parsed.brief ?? fallback.brief,
      semanticOptions: semanticOptions?.length ? semanticOptions : fallback.semanticOptions,
    };
  } catch {
    return fallback;
  }
}

async function callModel(config: ModelConfig, system: string, userPayload: unknown) {
  const endpoint = config.style === "responses" ? "responses" : "chat/completions";
  const body =
    config.style === "responses"
      ? {
          model: config.model,
          input: [
            { role: "system", content: system },
            { role: "user", content: JSON.stringify(userPayload) },
          ],
        }
      : {
          model: config.model,
          temperature: 0.2,
          messages: [
            { role: "system", content: system },
            { role: "user", content: JSON.stringify(userPayload) },
          ],
        };

  const response = await fetch(appendEndpoint(config.baseUrl, endpoint), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(modelRequestTimeoutMs),
  });

  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
    };
  }

  const payload = await response.json();
  return {
    ok: true as const,
    text: config.style === "responses" ? extractResponsesOutputText(payload) : extractChatOutputText(payload),
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as AgentRequest;
  const message = body.message?.trim() ?? "";
  const activeSkill = await loadTeamSpecSkillPrompt(body.activeSkillId ?? body.context?.teamSpecLibrary?.id);

  if (!message) {
    return Response.json(fallbackDecision(message, undefined, body.context, body.history));
  }

  const { config, reason } = resolveModelConfig();

  if (!config) {
    return Response.json(fallbackDecision(message, reason, body.context, body.history));
  }

  const fallback = fallbackDecision(message, undefined, body.context, body.history);
  const system = [
    `You are the conversation brain for ${activeSkill.skill.skillName}, selected by the user as ${activeSkill.skill.name}.`,
    activeSkill.loaded
      ? `ACTIVE TEAM SPEC / SEMANTIC LIBRARY SKILL (${activeSkill.skill.skillName}) FROM ${activeSkill.skill.skillPath}:\n${activeSkill.content}`
      : `ACTIVE TEAM SPEC / SEMANTIC LIBRARY SKILL (${activeSkill.skill.skillName}) is not uploaded yet. Use the closest available product workflow, but clearly treat it as pending upload if asked.`,
    "The selected skill is authoritative for platform semantics, style constraints, source-library strategy, quality gates, naming, and Figma-native delivery rules.",
    "If the selected skill conflicts with generic defaults below, follow the selected skill.",
    "The fixed workflow is Brief -> Semantic Plan -> SVG Preview approval -> Icon Spec JSON -> Figma native-node draw -> Screenshot Gate -> Production Handoff.",
    `The active output profile is ${activeSkill.skill.outputProfile.masterSize}x${activeSkill.skill.outputProfile.masterSize}, ${activeSkill.skill.outputProfile.color}, ${activeSkill.skill.outputProfile.strokeWidth}px stroke, ${activeSkill.skill.outputProfile.padding}px padding, with skillNames ${activeSkill.skill.outputProfile.skillNames}.`,
    "Do not ask the user to choose style, color, or canvas size. Those are locked by the skill.",
    "SVG preview is only for approval. Final Figma output must be editable native nodes, never pasted or embedded SVG.",
    "Never skip semantic direction approval or SVG preview approval before Figma draw.",
    "Return JSON only with keys: intent, query, response, confidence, actions, needsClarification, clarifyingQuestion, suggestions, brief, semanticOptions.",
    "Allowed intent values: brief_icon, plan_semantics, generate_svg_preview, approve_preview, draw_figma_native, revise_preview, explain_spec, unknown.",
    "Allowed action ids: brief, semantic_plan, svg_preview, preview_approval, icon_spec, figma_native_draw, screenshot_gate, production_handoff, reference_workflow, explain_spec, ask_clarification.",
    "Allowed action status values: planned, running, done, blocked, waiting.",
    "If the user provides enough concept and context, use plan_semantics and propose 2-3 visual semantic directions.",
    "Treat short answers about placement, purpose, or emphasis as continuations of the latest unfinished icon brief. Merge them with the previous request and never ask the same brief question again.",
    "For plan_semantics, return brief and 2-3 genuinely distinct semanticOptions. Do not pad weak or duplicate directions to reach three. Options are low-fidelity meaning sketches, never final generated results.",
    "Every semantic option must include concrete visual elements, not an empty string. Describe a simple non-overlapping schematic composition that can be rendered as a low-fidelity thumbnail.",
    "After a semantic direction is selected or the user requests more variants, retrieve real approved external sources before any AI drawing. Present only 1-3 strong source-backed candidates; AI is fallback after retrieval fails or the user explicitly requests original exploration.",
    "For icon-gen-baijiahao, exact mature-library reuse requires strict mode plus the real Figma source node or source screenshot. Adjacent mature hits and team-icon-shape-specs.json are constraints only and must not become final geometry.",
    "When an external candidate passes intake, preserve its recognizable silhouette, part relationship, direction, and composition. Normalize only controlled style variables such as stroke, radius, spacing, density, live area, and editable decomposition.",
    "semanticOptions must be specific to the latest user request, not generic. For example, personal center should mention avatar/person/card/profile entry; network should mention connected nodes/globe/signal/routing; online game should mention controller/gamepad/play entry, not Wi-Fi. Avoid repeating object/action/status templates unless they genuinely fit.",
    "Allowed previewGlyphKind values: bookmark, share, search, filter, download, upload, play, comment, like, read, settings, arrowsUpDown, arrowsIn, arrowsOut, user, game, network, generic.",
    "If the user says 网络游戏, 联机游戏, 小游戏, game, gaming, controller, choose glyphKind game unless they explicitly ask for network infrastructure/status.",
    "If there is no exact previewGlyphKind, choose the nearest safe visual template but keep option text semantically precise.",
    "If the user chooses an option, use generate_svg_preview.",
    "If the user approves a preview or asks to write to Figma, use draw_figma_native, but mention preview approval if missing.",
    "If the user rejects or asks changes, use revise_preview.",
    "Do not infer a new icon request from prior context when the latest user message is only a greeting, thanks, random text, or unrelated small talk.",
    "If the latest message is a greeting or unrelated small talk, intent must be unknown and response should briefly greet back, then invite the user to describe the icon need.",
    "Only use context.candidates as existing workflow state after the latest user explicitly chooses/continues a direction. Never treat candidates as the user's latest request.",
    "If the user input is unclear, random, or unrelated, do not repeat the same previous question verbatim. Briefly say what you did not understand, then ask one concrete next question with examples.",
    "If the brief is incomplete, ask at most three short questions: icon purpose, location, and meaning emphasis.",
    "If the user mentions Iconfont, IconPark, a source library, SVG, batch names, documents, or Figma links, treat that as source selection context and explain how it will be used before team-spec normalization.",
    "When you propose text the user can send directly, put each clickable follow-up in the suggestions array as a complete user message. Do not only place it inside response prose.",
    "Always reply in concise Chinese for the product UI.",
  ].join("\n");

  const userPayload = {
    message,
    history: body.history?.slice(-8) ?? [],
    activeSkill: {
      id: activeSkill.skill.id,
      name: activeSkill.skill.name,
      skillName: activeSkill.skill.skillName,
      loaded: activeSkill.loaded,
    },
    context: body.context ?? {},
  };

  try {
    const modelResult = await callModel(config, system, userPayload);

    if (!modelResult.ok) {
      return Response.json(
        fallbackDecision(
          message,
          `${config.providerName} 模型接口返回 ${modelResult.status}，已切换本地 fallback。`,
          body.context,
          body.history,
        ),
      );
    }

    return Response.json(parseDecision(modelResult.text, fallback));
  } catch {
    return Response.json(fallbackDecision(message, "模型接口暂不可用，已切换本地 fallback。", body.context, body.history));
  }
}

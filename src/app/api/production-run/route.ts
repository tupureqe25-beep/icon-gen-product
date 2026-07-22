import { buildFigmaNativeScript } from "@/lib/icon-contract/generate";
import type { IconSpecContract, ProductionGate, ProductionRun } from "@/lib/icon-contract/types";

type ProductionRunRequest = {
  spec?: IconSpecContract;
  skillNames?: string;
};

function validateSpec(spec: unknown): spec is IconSpecContract {
  if (!spec || typeof spec !== "object") return false;
  const candidate = spec as Partial<IconSpecContract>;

  return Boolean(
    candidate.meta?.name &&
      [24, 48].includes(candidate.meta?.size ?? 0) &&
      candidate.meta?.style === "outline" &&
      candidate.meta?.color_mode === "monochrome" &&
      candidate.meta?.preview_status === "approved" &&
      ["#0F1218", "#242529"].includes(candidate.strokes?.color ?? "") &&
      [2, 4].includes(candidate.strokes?.width ?? 0) &&
      candidate.strokes?.cap === "round" &&
      candidate.strokes?.join === "round" &&
      (candidate.meta?.platform !== "baijiahao" || candidate.meta?.runtime_mode === "strict") &&
      Array.isArray(candidate.shapes) &&
      candidate.shapes.length > 0,
  );
}

function buildBlockedRun(reason: string, spec?: IconSpecContract, skillNames = "icon-gen-promax"): ProductionRun {
  const specSummary = spec ? `${spec.meta.size}px / ${spec.strokes.color} / ${spec.strokes.width}px` : "当前团队规范";
  const gates: ProductionGate[] = [
    {
      id: "preview_approval",
      label: "Preview Approval",
      status: spec?.meta.preview_status === "approved" ? "done" : "blocked",
      detail: "SVG Preview 必须先被用户批准。",
    },
    {
      id: "icon_spec",
      label: "Phase 4A · Icon Spec JSON",
      status: spec?.validation.status === "pass" ? "done" : "blocked",
      detail: reason,
      evidence: spec?.validation.warnings.join(" / "),
    },
    {
      id: "figma_native_draw",
      label: "Phase 4B · Figma Native Draw",
      status: "blocked",
      detail: "Spec 未通过前不能生成可执行 Figma 写入任务。",
    },
    {
      id: "screenshot_gate",
      label: "Screenshot Gate",
      status: "blocked",
      detail: "必须先完成 Figma native draw，才能截图比对批准预览。",
    },
  ];

  return {
    id: `blocked-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: "blocked",
    summary: reason,
    gates,
    figma: {
      runtime: "figma-use",
      skillNames,
      executable: false,
      script: "",
      expectedRootName: spec?.meta.name ?? "",
    },
    screenshotGate: {
      required: true,
      status: "blocked",
      compareAgainst: "approved-svg-preview",
      checks: [
        "metaphor matches confirmed direction",
        `${spec?.meta.size ?? 24}px component/frame remains editable native nodes`,
        `stroke matches ${specSummary} with round cap and join`,
        "visual density and proportions match approved preview",
      ],
      failureBranches: [
        { failure: "wrong metaphor / wrong concept", returnTo: "semantic_plan" },
        { failure: "preview itself needs visual changes", returnTo: "svg_preview" },
        { failure: "spec changed approved proportions", returnTo: "icon_spec" },
        { failure: "native draw caused mismatch", returnTo: "figma_native_draw" },
      ],
    },
  };
}

function buildReadyRun(spec: IconSpecContract, skillNames = "icon-gen-promax"): ProductionRun {
  const script = buildFigmaNativeScript(spec);

  return {
    id: `${spec.meta.name}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: "ready_for_figma",
    summary:
      "Phase 4B 执行任务已就绪：下一步必须通过 figma-use 调用 use_figma 写入 native nodes，然后执行截图门禁。",
    gates: [
      {
        id: "preview_approval",
        label: "Preview Approval",
        status: "done",
        detail: "用户已批准当前 SVG Preview。",
        evidence: spec.meta.selected_direction,
      },
      {
        id: "icon_spec",
        label: "Phase 4A · Icon Spec JSON",
        status: "done",
        detail: "Approved preview 已转换为 contract-first native-node 规格。",
        evidence: `${spec.shapes.length} native shape instructions`,
      },
      {
        id: "figma_native_draw",
        label: "Phase 4B · Figma Native Draw",
        status: "waiting",
        detail: `等待通过 figma-use 执行脚本。必须传 skillNames: ${skillNames}。`,
        evidence: "script generated; no SVG import/paste",
      },
      {
        id: "screenshot_gate",
        label: "Screenshot Gate",
        status: "waiting",
        detail: "写入后必须截图，和批准预览对比后才能最终 handoff。",
      },
      {
        id: "preview_fidelity",
        label: "Preview Fidelity",
        status: "waiting",
        detail: "检查隐喻、比例、间距、圆角、密度是否匹配批准预览。",
      },
      {
        id: "production_handoff",
        label: "Production Handoff",
        status: "waiting",
        detail: "截图门禁通过后，才能生成最终报告并交付团队使用。",
      },
    ],
    figma: {
      runtime: "figma-use",
      skillNames,
      executable: true,
      script,
      expectedRootName: spec.meta.name,
    },
    screenshotGate: {
      required: true,
      status: "waiting_for_figma_node",
      compareAgainst: "approved-svg-preview",
      checks: [
        "metaphor matches confirmed direction",
        `${spec.meta.size}px component/frame remains editable native nodes`,
        `stroke is ${spec.strokes.color} / ${spec.strokes.width}px / round cap and join`,
        "no SVG string was pasted or imported",
        "local fills only exist for documented tiny readability exceptions",
        "visual density and proportions match approved preview",
      ],
      failureBranches: [
        { failure: "wrong metaphor / wrong concept", returnTo: "semantic_plan" },
        { failure: "preview itself needs visual changes", returnTo: "svg_preview" },
        { failure: "spec changed approved proportions", returnTo: "icon_spec" },
        { failure: "native draw caused mismatch", returnTo: "figma_native_draw" },
      ],
    },
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as ProductionRunRequest;
  const skillNames = body.skillNames || "icon-gen-promax";

  if (!validateSpec(body.spec)) {
    return Response.json(
      buildBlockedRun("需要 approved 的团队 Icon Spec，且必须包含合法尺寸、颜色、线宽和 native shapes。", body.spec, skillNames),
      { status: 422 },
    );
  }

  if (body.spec.validation.status !== "pass") {
    return Response.json(buildBlockedRun("当前 Spec 仍有规范警告，不能进入 Figma native draw。", body.spec, skillNames), { status: 409 });
  }

  return Response.json(buildReadyRun(body.spec, skillNames));
}

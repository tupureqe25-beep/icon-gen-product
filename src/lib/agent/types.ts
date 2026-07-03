import type { IconIntent } from "@/lib/intents/router";

export type AgentMode = "model" | "fallback";

export type AgentActionId =
  | "brief"
  | "semantic_plan"
  | "svg_preview"
  | "preview_approval"
  | "icon_spec"
  | "figma_native_draw"
  | "screenshot_gate"
  | "preview_fidelity"
  | "production_handoff"
  | "reference_workflow"
  | "explain_spec"
  | "ask_clarification";

export type AgentActionStatus = "planned" | "running" | "done" | "blocked" | "waiting";

export type AgentAction = {
  id: AgentActionId;
  label: string;
  detail: string;
  status: AgentActionStatus;
  evidence?: string;
};

export type AgentIconBrief = {
  concept: string;
  label: string;
  semanticName: string;
  context: string;
  emphasis: string;
  glyphKind?: string;
};

export type AgentSemanticOption = {
  id: "A" | "B" | "C";
  title: string;
  elements: string;
  meaning: string;
  risk: string;
  previewGlyphKind?: string;
};

export type AgentDecision = {
  mode: AgentMode;
  intent: IconIntent;
  query: string;
  response: string;
  confidence: number;
  actions: AgentAction[];
  modeReason?: string;
  needsClarification?: boolean;
  clarifyingQuestion?: string;
  suggestions?: string[];
  brief?: AgentIconBrief;
  semanticOptions?: AgentSemanticOption[];
};

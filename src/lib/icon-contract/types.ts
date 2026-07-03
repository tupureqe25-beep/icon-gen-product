export type NativeShapeContract =
  | {
      id: string;
      name: string;
      type: "rect";
      role: string;
      x: number;
      y: number;
      width: number;
      height: number;
      radius?: number;
      open?: false;
      strokeWeight: number;
    }
  | {
      id: string;
      name: string;
      type: "path";
      role: string;
      data: string;
      strokeWeight: number;
    }
  | {
      id: string;
      name: string;
      type: "line";
      role: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      strokeWeight: number;
    }
  | {
      id: string;
      name: string;
      type: "circle";
      role: string;
      x: number;
      y: number;
      width: number;
      height: number;
      strokeWeight?: number;
      fill?: string;
      fillExceptionReason?: string;
    };

export type IconSpecContract = {
  meta: {
    name: string;
    label: string;
    size: number;
    grid: number;
    context: string;
    style: "outline";
    color_mode: "monochrome";
    corner_radius: "rounded";
    selected_direction: string;
    preview_status: "approved" | "waiting";
    source?: {
      type: string;
      name: string;
      license: string;
      processor: "team-spec-normalizer";
      note: string;
    };
  };
  canvas: {
    padding: number;
    live_area: string;
    optical_center: boolean;
  };
  shapes: NativeShapeContract[];
  strokes: {
    color: string;
    width: number;
    cap: "round";
    join: "round";
  };
  validation: {
    status: "pass" | "needs_review" | "blocked";
    warnings: string[];
    output: string;
  };
};

export type DeliverableFile = {
  path: string;
  language: "json" | "xml" | "tsx" | "ts" | "js" | "md";
  content: string;
};

export type DeliveryPackage = {
  id: string;
  createdAt: string;
  status: "ready" | "blocked";
  summary: string;
  files: DeliverableFile[];
  persisted?: {
    directory: string;
    files: Array<{
      path: string;
      absolutePath: string;
    }>;
  };
};

export type ProductionGateStatus = "done" | "waiting" | "blocked";

export type ProductionGate = {
  id:
    | "preview_approval"
    | "icon_spec"
    | "figma_native_draw"
    | "screenshot_gate"
    | "preview_fidelity"
    | "production_handoff";
  label: string;
  status: ProductionGateStatus;
  detail: string;
  evidence?: string;
};

export type ProductionRun = {
  id: string;
  createdAt: string;
  status: "ready_for_figma" | "blocked";
  summary: string;
  gates: ProductionGate[];
  figma: {
    runtime: "figma-use";
    skillNames: "icon-gen-promax";
    executable: boolean;
    script: string;
    expectedRootName: string;
    nodeId?: string;
  };
  screenshotGate: {
    required: true;
    status: "waiting_for_figma_node" | "blocked";
    compareAgainst: "approved-svg-preview";
    checks: string[];
    failureBranches: Array<{
      failure: string;
      returnTo: "semantic_plan" | "svg_preview" | "icon_spec" | "figma_native_draw";
    }>;
  };
};

export type FigmaTarget = {
  url: string;
  fileKey: string;
  nodeId: string;
  fileName?: string;
};

export type BatchFigmaWriteItem = {
  id: string;
  name: string;
  sourceName: string;
  position: {
    x: number;
    y: number;
  };
  spec: IconSpecContract;
};

export type BatchFigmaWriteRun = {
  id: string;
  createdAt: string;
  status: "ready_for_figma" | "blocked";
  summary: string;
  target?: FigmaTarget;
  itemCount: number;
  figma: {
    runtime: "figma-plugin-api";
    execution: "run_in_figma_plugin_or_codex_figma_connector";
    executable: boolean;
    script: string;
    jsonSpec: string;
    expectedRootName: string;
  };
  gates: ProductionGate[];
  warnings: string[];
};

export type FigmaWriteJobStatus = "queued" | "claimed" | "drawing" | "completed" | "failed";

export type FigmaWriteJobResult = {
  success: boolean;
  count: number;
  rootIds: string[];
  createdNodeIds: string[];
  primitiveStats?: {
    rectangle: number;
    ellipse: number;
    line: number;
    vector: number;
    tinyFill: number;
  };
  errors?: Array<{
    item: string | number;
    message: string;
  }>;
  message?: string;
};

export type FigmaWriteJob = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: FigmaWriteJobStatus;
  target?: FigmaTarget;
  itemCount: number;
  items: BatchFigmaWriteItem[];
  batchRunId?: string;
  pluginPullUrl: string;
  result?: FigmaWriteJobResult;
  error?: string;
};

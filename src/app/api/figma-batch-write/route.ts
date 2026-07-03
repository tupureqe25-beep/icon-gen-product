import { buildBatchFigmaNativeScript } from "@/lib/icon-contract/generate";
import type { BatchFigmaWriteItem, BatchFigmaWriteRun, FigmaTarget, IconSpecContract, ProductionGate } from "@/lib/icon-contract/types";

type BatchFigmaWriteRequest = {
  targetUrl?: string;
  token?: string;
  items?: BatchFigmaWriteItem[];
};

type FigmaFileResponse = {
  name?: string;
  err?: string;
  message?: string;
};

function parseFigmaTarget(input: string): FigmaTarget | undefined {
  const url = input.match(/https?:\/\/[^\s"'<>]+figma\.com\/[^\s"'<>]+/i)?.[0] ?? input.trim();
  const fileKey = url.match(/figma\.com\/(?:design|file)\/([^/?#]+)/i)?.[1];
  if (!fileKey) return undefined;

  const nodeId = url.match(/[?&]node-id=([^&#]+)/i)?.[1]?.replace(/-/g, ":") ?? "0:1";
  return { url, fileKey, nodeId };
}

function validateSpec(spec: unknown): spec is IconSpecContract {
  if (!spec || typeof spec !== "object") return false;
  const candidate = spec as Partial<IconSpecContract>;

  return Boolean(
    candidate.meta?.name &&
      candidate.meta?.size === 24 &&
      candidate.meta?.style === "outline" &&
      candidate.meta?.color_mode === "monochrome" &&
      candidate.strokes?.color === "#0F1218" &&
      candidate.strokes?.width === 2 &&
      candidate.strokes?.cap === "round" &&
      candidate.strokes?.join === "round" &&
      Array.isArray(candidate.shapes) &&
      candidate.shapes.length > 0,
  );
}

function buildGates(items: BatchFigmaWriteItem[], warnings: string[]): ProductionGate[] {
  return [
    {
      id: "preview_approval",
      label: "Batch Source Ready",
      status: items.length ? "done" : "blocked",
      detail: items.length ? `已准备 ${items.length} 个画布图标。` : "画布中还没有可写入的 icon。",
    },
    {
      id: "icon_spec",
      label: "Team Spec Gate",
      status: warnings.length ? "blocked" : "done",
      detail: warnings.length ? "仍有图标未通过 24px / 2px / #0F1218 native spec。" : "所有图标已转换成团队 native-node 规格。",
      evidence: warnings.join(" / ") || `${items.length} specs`,
    },
    {
      id: "figma_native_draw",
      label: "Figma Native Draw",
      status: warnings.length || !items.length ? "blocked" : "waiting",
      detail: "JSON 规格已生成；需要在 Figma Plugin API 或 Codex Figma Connector 中按规格创建 native nodes。",
    },
    {
      id: "screenshot_gate",
      label: "Screenshot Gate",
      status: warnings.length || !items.length ? "blocked" : "waiting",
      detail: "写入后需要截图核对每个 icon 的语义、比例、负空间与团队规范。",
    },
  ];
}

async function verifyFigmaTarget(target: FigmaTarget, token?: string) {
  if (!token) {
    return {
      ok: false,
      message: "未填写 Figma Token：可以先生成批量脚本，但无法校验目标文件读取权限。",
    };
  }

  const response = await fetch(`https://api.figma.com/v1/files/${target.fileKey}`, {
    headers: {
      "X-Figma-Token": token,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as FigmaFileResponse;

  if (!response.ok) {
    return {
      ok: false,
      message: payload.message ?? payload.err ?? `Figma 文件校验失败：${response.status}`,
    };
  }

  return {
    ok: true,
    fileName: payload.name,
    message: payload.name ? `已校验目标文件：${payload.name}` : "已校验目标文件读取权限。",
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as BatchFigmaWriteRequest;
  const target = body.targetUrl ? parseFigmaTarget(body.targetUrl) : undefined;
  const rawItems = body.items ?? [];
  const warnings: string[] = [];

  if (!target) {
    return Response.json(
      {
        status: "blocked",
        summary: "请提供有效的 Figma design/file URL，最好带 node-id。",
        itemCount: rawItems.length,
      },
      { status: 400 },
    );
  }

  const items = rawItems.filter((item) => {
    const valid = validateSpec(item.spec);
    if (!valid) warnings.push(`${item.name || item.id} 不是有效团队 Icon Spec`);
    if (valid && item.spec.validation.status !== "pass") warnings.push(`${item.name || item.id} 仍有规范警告`);
    return valid;
  });

  const verification = await verifyFigmaTarget(target, body.token?.trim() || process.env.FIGMA_ACCESS_TOKEN || process.env.FIGMA_TOKEN);
  const script = warnings.length || !items.length ? "" : buildBatchFigmaNativeScript(items);
  const jsonSpec = warnings.length || !items.length ? "" : `${JSON.stringify({ version: "icon-gen-promax.batch.v1", target, items }, null, 2)}\n`;
  const gates = buildGates(items, warnings);
  const responseStatus: BatchFigmaWriteRun["status"] = warnings.length || !items.length ? "blocked" : "ready_for_figma";

  return Response.json({
    id: `batch-figma-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: responseStatus,
    summary:
      responseStatus === "ready_for_figma"
        ? `${verification.message} 已生成 ${items.length} 个 icon 的 JSON 规格与 Figma native 执行器。`
        : warnings.length
          ? `批量写入被规范门禁阻断：${warnings[0]}`
          : "画布中没有可写入的 icon。",
    target: {
      ...target,
      fileName: verification.fileName,
    },
    itemCount: items.length,
    figma: {
      runtime: "figma-plugin-api",
      execution: "run_in_figma_plugin_or_codex_figma_connector",
      executable: Boolean(script),
      script,
      jsonSpec,
      expectedRootName: `IconOps Batch · ${items.length} icons`,
    },
    gates,
    warnings: [
      ...warnings,
      ...(verification.ok ? [] : [verification.message]),
      "重要边界：平台输出的是 JSON 规格；Figma REST API Token 只能用于读取/校验文件，不能直接创建画布节点。需要 Figma 插件运行时或 Codex Figma Connector 按 JSON 画出 native nodes。",
    ],
  } satisfies BatchFigmaWriteRun);
}

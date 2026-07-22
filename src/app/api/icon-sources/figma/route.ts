import type { IconAsset } from "@/lib/icons/types";
import { getFigmaToken, saveFigmaToken } from "@/lib/auth/store";

type FigmaUrlTarget = {
  fileKey: string;
  nodeId: string;
};

type FigmaNode = {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  absoluteBoundingBox?: {
    width: number;
    height: number;
  };
};

type FigmaNodesResponse = {
  nodes?: Record<
    string,
    {
      document?: FigmaNode;
    }
  >;
  err?: string;
  message?: string;
};

type FigmaImagesResponse = {
  images?: Record<string, string | null>;
  err?: string;
  message?: string;
};

function parseFigmaUrl(input: string): FigmaUrlTarget | undefined {
  const url = input.match(/https?:\/\/[^\s"'<>]+figma\.com\/[^\s"'<>]+/i)?.[0] ?? input.trim();
  const fileKey = url.match(/figma\.com\/(?:design|file)\/([^/?#]+)/i)?.[1];
  if (!fileKey) return undefined;

  const nodeId = url.match(/[?&]node-id=([^&#]+)/i)?.[1]?.replace(/-/g, ":") ?? "0:1";
  return { fileKey, nodeId };
}

function nodeLooksLikeIcon(node: FigmaNode) {
  const name = node.name.toLowerCase();
  const box = node.absoluteBoundingBox;
  const likelyName = /icon|图标|ico|aijbasic|basic|24/.test(name);
  const likelySize = Boolean(box && box.width >= 12 && box.height >= 12 && box.width <= 80 && box.height <= 80);
  const likelyType = ["COMPONENT", "INSTANCE", "FRAME", "GROUP", "VECTOR", "BOOLEAN_OPERATION"].includes(node.type);
  const genericLayerName = /^(rectangle|vector|group|frame|ellipse|line|polygon|boolean)(?:\s+\d+)?$/i.test(node.name.trim());

  return likelyType && !genericLayerName && (likelyName || likelySize);
}

function collectIconNodes(root: FigmaNode, limit = 48) {
  const result: FigmaNode[] = [];
  const queue: FigmaNode[] = [root];
  const seen = new Set<string>();

  while (queue.length && result.length < limit) {
    const node = queue.shift();
    if (!node || seen.has(node.id)) continue;
    seen.add(node.id);

    if (nodeLooksLikeIcon(node)) {
      result.push(node);
      continue;
    }

    node.children?.forEach((child) => queue.push(child));
  }

  return result;
}

function tagsFromName(name: string) {
  return Array.from(
    new Set(
      name
        .replace(/[\/_.:-]+/g, " ")
        .split(/\s+/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { url?: string; query?: string; token?: string };
  const target = body.url ? parseFigmaUrl(body.url) : undefined;

  if (!target) {
    return Response.json({ message: "请提供有效的 Figma design/file URL，最好带 node-id。" }, { status: 400 });
  }

  const submittedToken = body.token?.trim();
  const storedToken = await getFigmaToken(request);
  const token = submittedToken || storedToken || process.env.FIGMA_ACCESS_TOKEN || process.env.FIGMA_TOKEN;
  if (submittedToken && submittedToken.length >= 20) await saveFigmaToken(request, submittedToken);
  if (!token) {
    return Response.json(
      {
        message: "当前没有可用的 Figma Token。请先登录并填写 Token，或在 .env.local 配置 FIGMA_ACCESS_TOKEN。",
        requiresToken: true,
        source: "figma-canvas",
        assets: [],
      },
      { status: 501 },
    );
  }

  const nodeUrl = `https://api.figma.com/v1/files/${target.fileKey}/nodes?ids=${encodeURIComponent(target.nodeId)}`;
  const nodeResponse = await fetch(nodeUrl, {
    headers: {
      "X-Figma-Token": token,
    },
  });
  const nodePayload = (await nodeResponse.json().catch(() => ({}))) as FigmaNodesResponse;

  if (!nodeResponse.ok) {
    return Response.json(
      {
        message: nodePayload.message ?? nodePayload.err ?? `Figma 节点读取失败：${nodeResponse.status}`,
        source: "figma-canvas",
        assets: [],
      },
      { status: nodeResponse.status },
    );
  }

  const root = nodePayload.nodes?.[target.nodeId]?.document;
  if (!root) {
    return Response.json({ message: "没有在该 Figma 节点中找到可读取内容。", source: "figma-canvas", assets: [] }, { status: 404 });
  }

  const iconNodes = collectIconNodes(root);
  if (!iconNodes.length) {
    return Response.json({ message: "已读取 Figma 节点，但没有识别到疑似 icon 的 12–80px 节点。", source: "figma-canvas", assets: [] });
  }

  const ids = iconNodes.map((node) => node.id).join(",");
  const imageUrl = `https://api.figma.com/v1/images/${target.fileKey}?ids=${encodeURIComponent(ids)}&format=svg&svg_outline_text=true`;
  const imageResponse = await fetch(imageUrl, {
    headers: {
      "X-Figma-Token": token,
    },
  });
  const imagePayload = (await imageResponse.json().catch(() => ({}))) as FigmaImagesResponse;

  if (!imageResponse.ok) {
    return Response.json(
      {
        message: imagePayload.message ?? imagePayload.err ?? `Figma SVG 导出失败：${imageResponse.status}`,
        source: "figma-canvas",
        assets: [],
      },
      { status: imageResponse.status },
    );
  }

  const assets = (
    await Promise.all(
      iconNodes.map(async (node, index) => {
        const svgUrl = imagePayload.images?.[node.id];
        if (!svgUrl) return undefined;

        const svgResponse = await fetch(svgUrl);
        if (!svgResponse.ok) return undefined;
        const svg = await svgResponse.text();

        return {
          id: `figma-${target.fileKey}-${node.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`,
          name: node.name || `figma-icon-${index + 1}`,
          category: "figma-canvas",
          tags: [...tagsFromName(node.name), body.query ?? "", "figma", "团队库", "画布"].filter(Boolean),
          source: "figma-canvas",
          license: "team-internal",
          svg,
        } satisfies IconAsset;
      }),
    )
  ).filter((asset): asset is IconAsset => Boolean(asset));

  return Response.json({
    source: "figma-canvas",
    fileKey: target.fileKey,
    nodeId: target.nodeId,
    message: assets.length ? `已从 Figma 画布读取 ${assets.length} 个 icon 候选。` : "Figma 导出成功，但 SVG 内容为空。",
    assets,
  });
}

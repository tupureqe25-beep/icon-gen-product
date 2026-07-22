figma.showUI(__html__, { width: 360, height: 360, themeColors: true });

const BRIDGE_VERSION = "2.0";
let activeAutoJobId = "";
let currentServerUrl = "http://localhost:3000";
let autoListening = true;

function postStatus(message) {
  figma.ui.postMessage({ type: "status", message });
}

function formatError(error) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    if (typeof error.message === "string") return error.message;
    if (typeof error.description === "string") return error.description;
    try {
      return JSON.stringify(error);
    } catch {
      return "Figma 返回了无法序列化的错误对象";
    }
  }
  return String(error);
}

function colorPaint(spec, colorOverride) {
  const hex = String(colorOverride || spec.strokes?.color || "#0F1218").replace("#", "");
  const value = hex.length === 3 ? hex.split("").map((part) => part + part).join("") : hex.padEnd(6, "0").slice(0, 6);
  return {
    type: "SOLID",
    color: {
      r: parseInt(value.slice(0, 2), 16) / 255,
      g: parseInt(value.slice(2, 4), 16) / 255,
      b: parseInt(value.slice(4, 6), 16) / 255,
    },
  };
}

function metadataNamespace(spec) {
  return String(spec.meta?.skill_id || "icon_gen").replace(/[^a-zA-Z0-9_]/g, "_");
}

function applyIconStroke(node, spec, weight = spec.strokes.width) {
  node.fills = [];
  node.strokes = [colorPaint(spec)];
  node.strokeWeight = weight;
  node.strokeAlign = "CENTER";
  if ("strokeCap" in node) node.strokeCap = "ROUND";
  if ("strokeJoin" in node) node.strokeJoin = "ROUND";
  if ("effects" in node) node.effects = [];
}

function applyLocalTinyFill(node, spec, color, reason, primitiveStats) {
  node.fills = [colorPaint(spec, color)];
  node.strokes = [];
  if ("effects" in node) node.effects = [];
  if ("setSharedPluginData" in node) {
    node.setSharedPluginData(metadataNamespace(spec), "fillExceptionReason", reason || "local tiny fill for clarity");
  }
  primitiveStats.tinyFill += 1;
}

function applyShapeMetadata(node, spec, shape) {
  node.name = shape.name || shape.id;
  if ("setSharedPluginData" in node) {
    node.setSharedPluginData(metadataNamespace(spec), "shapeId", shape.id || "");
    node.setSharedPluginData(metadataNamespace(spec), "shapeRole", shape.role || "");
  }
}

function drawLine(root, spec, shape, suffix, createdNodeIds, primitiveStats) {
  const node = figma.createLine();
  root.appendChild(node);
  applyShapeMetadata(node, spec, { ...shape, name: suffix ? `${shape.name || shape.id} ${suffix}` : shape.name });
  node.name = suffix ? `${shape.id}__${suffix}` : node.name;
  node.x = shape.x1;
  node.y = shape.y1;
  node.resize(Math.hypot(shape.x2 - shape.x1, shape.y2 - shape.y1), 0);
  node.rotation = (Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1) * 180) / Math.PI;
  applyIconStroke(node, spec, shape.strokeWeight || spec.strokes.width);
  createdNodeIds.push(node.id);
  primitiveStats.line += 1;
  return node;
}

function drawShape(root, spec, shape, createdNodeIds, primitiveStats) {
  if (shape.type === "rect") {
    const node = figma.createRectangle();
    root.appendChild(node);
    applyShapeMetadata(node, spec, shape);
    node.x = shape.x;
    node.y = shape.y;
    node.resize(shape.width, shape.height);
    node.cornerRadius = typeof shape.radius === "number" ? shape.radius : 4;
    applyIconStroke(node, spec, shape.strokeWeight || spec.strokes.width);
    createdNodeIds.push(node.id);
    primitiveStats.rectangle += 1;
    return [node];
  }

  if (shape.type === "path") {
    const node = figma.createVector();
    root.appendChild(node);
    applyShapeMetadata(node, spec, shape);
    node.vectorPaths = [{ windingRule: "NONZERO", data: shape.data }];
    applyIconStroke(node, spec, shape.strokeWeight || spec.strokes.width);
    createdNodeIds.push(node.id);
    primitiveStats.vector += 1;
    return [node];
  }

  if (shape.type === "line" && shape.role === "plus-badge") {
    const centerX = (shape.x1 + shape.x2) / 2;
    const centerY = (shape.y1 + shape.y2) / 2;
    const half = Math.abs(shape.x2 - shape.x1) / 2;
    return [
      drawLine(root, spec, shape, "horizontal", createdNodeIds, primitiveStats),
      drawLine(
        root,
        spec,
        {
          ...shape,
          x1: centerX,
          y1: centerY - half,
          x2: centerX,
          y2: centerY + half,
        },
        "vertical",
        createdNodeIds,
        primitiveStats,
      ),
    ];
  }

  if (shape.type === "line") {
    return [drawLine(root, spec, shape, "", createdNodeIds, primitiveStats)];
  }

  if (shape.type === "circle") {
    const node = figma.createEllipse();
    root.appendChild(node);
    applyShapeMetadata(node, spec, shape);
    node.x = shape.x;
    node.y = shape.y;
    node.resize(shape.width, shape.height);
    if (shape.fill && shape.fillExceptionReason) {
      applyLocalTinyFill(node, spec, shape.fill, shape.fillExceptionReason, primitiveStats);
    } else {
      applyIconStroke(node, spec, shape.strokeWeight || spec.strokes.width);
    }
    createdNodeIds.push(node.id);
    primitiveStats.ellipse += 1;
    return [node];
  }

  throw new Error(`Unsupported shape type: ${shape.type}`);
}

function getSpecValidationError(spec) {
  if (!spec || typeof spec !== "object") return "规格不是对象";

  const size = spec.meta?.size;
  const color = spec.strokes?.color;
  const width = spec.strokes?.width;
  const platform = spec.meta?.platform;

  if (!spec.meta?.name) return "缺少图标名称";
  if (![24, 48].includes(size)) return `不支持 ${String(size)}px 画布`;
  if (spec.meta.style !== "outline" || spec.meta.color_mode !== "monochrome") return "必须是 outline monochrome 规格";
  if (!["#0F1218", "#242529"].includes(color)) return `描边颜色 ${String(color)} 不符合团队规格`;
  if (![2, 4].includes(width)) return `描边宽度 ${String(width)}px 不符合团队规格`;
  if (spec.strokes.cap !== "round" || spec.strokes.join !== "round") return "描边端点和连接必须是 round";

  const isBaijiahao = platform === "baijiahao" || size === 48 || color === "#242529" || width === 4;
  if (isBaijiahao && (size !== 48 || color !== "#242529" || width !== 4)) return "百家号规格必须是 48px / #242529 / 4px";
  if (isBaijiahao && spec.meta.runtime_mode !== "strict") return "百家号正式写入必须使用 strict 模式";
  if (!isBaijiahao && (size !== 24 || color !== "#0F1218" || width !== 2)) return "漫剧/默认规格必须是 24px / #0F1218 / 2px";
  if (!Array.isArray(spec.shapes) || !spec.shapes.length) return "没有可写入的 native shapes";

  return "";
}

function drawIcon(item, index, createdNodeIds, primitiveStats) {
  const spec = item.spec;
  const validationError = getSpecValidationError(spec);
  if (validationError) throw new Error(`${item.name || item.id}：${validationError}`);

  const root = figma.createComponent();
  try {
    root.name = spec.meta.name || item.name || `AijBasicBatchIcon${index + 1}`;
    root.resize(spec.meta.size, spec.meta.size);
    root.clipsContent = true;
    root.fills = [];
    root.strokes = [];
    root.x = item.position?.x ?? index * 48;
    root.y = item.position?.y ?? 0;
    if ("setSharedPluginData" in root) {
      root.setSharedPluginData(metadataNamespace(spec), "sourceName", item.sourceName || "batch");
      root.setSharedPluginData(metadataNamespace(spec), "batchItemId", item.id || "");
      root.setSharedPluginData(metadataNamespace(spec), "jsonContract", JSON.stringify(spec));
    }
    createdNodeIds.push(root.id);

    const nodes = [];
    for (const shape of spec.shapes) {
      nodes.push(...drawShape(root, spec, shape, createdNodeIds, primitiveStats));
    }

    if (nodes.length) {
      const glyph = figma.group(nodes, root);
      glyph.name = `${root.name}__glyph`;
      createdNodeIds.push(glyph.id);
    }

    figma.currentPage.appendChild(root);
    return root;
  } catch (error) {
    if (!root.removed) root.remove();
    throw error;
  }
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message ? formatError(payload.message) : `请求失败：${response.status}`);
  }
  return payload;
}

async function sendBridgeHeartbeat(serverUrl, listening) {
  await fetchJson(`${serverUrl}/api/figma-write-jobs/bridge-status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      serverUrl,
      fileName: figma.root.name,
      pageName: figma.currentPage.name,
      listening,
      bridgeVersion: BRIDGE_VERSION,
    }),
  });
}

async function writeJob(serverUrl, jobId) {
  const jobUrl = jobId ? `${serverUrl}/api/figma-write-jobs/${jobId}` : `${serverUrl}/api/figma-write-jobs?latest=1`;
  const payload = await fetchJson(jobUrl);
  const job = payload.job;
  if (!job || !Array.isArray(job.items)) {
    throw new Error("没有可写入任务。请先在网页顶部点击“自动写入 Figma”。");
  }

  figma.ui.postMessage({ type: "job-id", jobId: job.id });
  await fetchJson(`${serverUrl}/api/figma-write-jobs/${job.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "drawing" }),
  });

  const createdNodeIds = [];
  const errors = [];
  const primitiveStats = { rectangle: 0, ellipse: 0, line: 0, vector: 0, tinyFill: 0 };
  const roots = [];

  for (let index = 0; index < job.items.length; index += 1) {
    try {
      roots.push(drawIcon(job.items[index], index, createdNodeIds, primitiveStats));
    } catch (error) {
      errors.push({
        item: job.items[index]?.name || index,
        message: formatError(error),
      });
    }
  }

  if (roots.length) figma.viewport.scrollAndZoomIntoView(roots);

  const result = {
    success: errors.length === 0,
    count: roots.length,
    rootIds: roots.map((node) => node.id),
    createdNodeIds,
    primitiveStats,
    errors,
    message: errors.length
      ? `写入 ${roots.length} 个，有 ${errors.length} 个失败。`
      : `已写入 ${roots.length} 个可编辑 native icon。下一步请截图核对质量。`,
  };

  await fetchJson(`${serverUrl}/api/figma-write-jobs/${job.id}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ result }),
  });

  return result;
}

async function pollQueuedJob(serverUrl) {
  const payload = await fetchJson(`${serverUrl}/api/figma-write-jobs?latestQueued=1`);
  const job = payload.job;
  if (!job || job.id === activeAutoJobId) return undefined;

  activeAutoJobId = job.id;
  try {
    return await writeJob(serverUrl, job.id);
  } finally {
    activeAutoJobId = "";
  }
}

figma.ui.onmessage = async (message) => {
  if (message.type === "close") {
    figma.closePlugin();
    return;
  }

  if (message.type === "heartbeat") {
    currentServerUrl = message.serverUrl;
    autoListening = Boolean(message.listening);
    sendBridgeHeartbeat(message.serverUrl, autoListening).catch(() => {
      // Local server may not be running yet.
    });
    return;
  }

  if (message.type === "poll-queued-job") {
    currentServerUrl = message.serverUrl;
    autoListening = true;
    try {
      await sendBridgeHeartbeat(message.serverUrl, true);
      const result = await pollQueuedJob(message.serverUrl);
      if (result) {
        postStatus(`${result.message}\n\nRoot IDs:\n${result.rootIds.join("\n") || "-"}`);
        figma.notify(result.message);
      }
    } catch (error) {
      const messageText = formatError(error);
      if (!messageText.includes("当前没有等待写入")) {
        postStatus(`自动写入失败：${messageText}`);
        figma.notify(`IconOps 自动写入失败：${messageText}`, { error: true });
      }
    }
    return;
  }

  if (message.type !== "write-job") return;

  try {
    currentServerUrl = message.serverUrl;
    await sendBridgeHeartbeat(message.serverUrl, autoListening);
    postStatus("正在拉取网页端 JSON 任务…");
    const result = await writeJob(message.serverUrl, message.jobId);
    postStatus(`${result.message}\n\nRoot IDs:\n${result.rootIds.join("\n") || "-"}`);
    figma.notify(result.message);
  } catch (error) {
    const messageText = formatError(error);
    postStatus(`写入失败：${messageText}`);
    figma.notify(`IconOps 写入失败：${messageText}`, { error: true });
  }
};

setInterval(() => {
  sendBridgeHeartbeat(currentServerUrl, autoListening).catch(() => {
    // Local server may not be running yet.
  });
}, 2500);

figma.showUI(__html__, { width: 360, height: 360, themeColors: true });

const ICON_COLOR = { r: 15 / 255, g: 18 / 255, b: 24 / 255 };
const ICON_STROKE = { type: "SOLID", color: ICON_COLOR };
let activeAutoJobId = "";
let currentServerUrl = "http://localhost:3000";
let autoListening = true;

function postStatus(message) {
  figma.ui.postMessage({ type: "status", message });
}

function applyIconStroke(node, weight = 2) {
  node.fills = [];
  node.strokes = [ICON_STROKE];
  node.strokeWeight = weight;
  node.strokeAlign = "CENTER";
  if ("strokeCap" in node) node.strokeCap = "ROUND";
  if ("strokeJoin" in node) node.strokeJoin = "ROUND";
  if ("effects" in node) node.effects = [];
}

function applyLocalTinyFill(node, reason, primitiveStats) {
  node.fills = [ICON_STROKE];
  node.strokes = [];
  if ("effects" in node) node.effects = [];
  if ("setSharedPluginData" in node) {
    node.setSharedPluginData("icon_gen_promax", "fillExceptionReason", reason || "local tiny fill for clarity");
  }
  primitiveStats.tinyFill += 1;
}

function applyShapeMetadata(node, shape) {
  node.name = shape.name || shape.id;
  if ("setSharedPluginData" in node) {
    node.setSharedPluginData("icon_gen_promax", "shapeId", shape.id || "");
    node.setSharedPluginData("icon_gen_promax", "shapeRole", shape.role || "");
  }
}

function drawLine(root, spec, shape, suffix, createdNodeIds, primitiveStats) {
  const node = figma.createLine();
  root.appendChild(node);
  applyShapeMetadata(node, { ...shape, name: suffix ? `${shape.name || shape.id} ${suffix}` : shape.name });
  node.name = suffix ? `${shape.id}__${suffix}` : node.name;
  node.x = shape.x1;
  node.y = shape.y1;
  node.resize(Math.hypot(shape.x2 - shape.x1, shape.y2 - shape.y1), 0);
  node.rotation = (Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1) * 180) / Math.PI;
  applyIconStroke(node, shape.strokeWeight || spec.strokes.width);
  createdNodeIds.push(node.id);
  primitiveStats.line += 1;
  return node;
}

function drawShape(root, spec, shape, createdNodeIds, primitiveStats) {
  if (shape.type === "rect") {
    const node = figma.createRectangle();
    root.appendChild(node);
    applyShapeMetadata(node, shape);
    node.x = shape.x;
    node.y = shape.y;
    node.resize(shape.width, shape.height);
    node.cornerRadius = typeof shape.radius === "number" ? shape.radius : 4;
    applyIconStroke(node, shape.strokeWeight || spec.strokes.width);
    createdNodeIds.push(node.id);
    primitiveStats.rectangle += 1;
    return [node];
  }

  if (shape.type === "path") {
    const node = figma.createVector();
    root.appendChild(node);
    applyShapeMetadata(node, shape);
    node.vectorPaths = [{ windingRule: "NONZERO", data: shape.data }];
    applyIconStroke(node, shape.strokeWeight || spec.strokes.width);
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
    applyShapeMetadata(node, shape);
    node.x = shape.x;
    node.y = shape.y;
    node.resize(shape.width, shape.height);
    if (shape.fill && shape.fillExceptionReason) {
      applyLocalTinyFill(node, shape.fillExceptionReason, primitiveStats);
    } else {
      applyIconStroke(node, shape.strokeWeight || spec.strokes.width);
    }
    createdNodeIds.push(node.id);
    primitiveStats.ellipse += 1;
    return [node];
  }

  throw new Error(`Unsupported shape type: ${shape.type}`);
}

function validateSpec(spec) {
  return Boolean(
    spec &&
      spec.meta &&
      spec.meta.size === 24 &&
      spec.meta.style === "outline" &&
      spec.meta.color_mode === "monochrome" &&
      spec.strokes &&
      spec.strokes.color === "#0F1218" &&
      spec.strokes.width === 2 &&
      spec.strokes.cap === "round" &&
      spec.strokes.join === "round" &&
      Array.isArray(spec.shapes) &&
      spec.shapes.length,
  );
}

function drawIcon(item, index, createdNodeIds, primitiveStats) {
  const spec = item.spec;
  if (!validateSpec(spec)) throw new Error(`${item.name || item.id} 不是有效 icon-gen-promax Icon Spec`);

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
      root.setSharedPluginData("icon_gen_promax", "sourceName", item.sourceName || "batch");
      root.setSharedPluginData("icon_gen_promax", "batchItemId", item.id || "");
      root.setSharedPluginData("icon_gen_promax", "jsonContract", JSON.stringify(spec));
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
    throw new Error(payload.message || `请求失败：${response.status}`);
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
        message: error instanceof Error ? error.message : String(error),
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
    } catch {
      // No queued job is normal while listening.
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
    const messageText = error instanceof Error ? error.message : String(error);
    postStatus(`写入失败：${messageText}`);
    figma.notify(`IconOps 写入失败：${messageText}`, { error: true });
  }
};

setInterval(() => {
  sendBridgeHeartbeat(currentServerUrl, autoListening).catch(() => {
    // Local server may not be running yet.
  });
}, 2500);

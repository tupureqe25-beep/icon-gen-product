import type { BatchFigmaWriteItem, DeliverableFile, DeliveryPackage, IconSpecContract, NativeShapeContract } from "./types";
import { normalizeSvgPathForFigma } from "@/lib/icons/path-normalize";

function formatScaledNumber(value: number) {
  const rounded = Math.round(value * 1000) / 1000;
  return String(rounded).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function scalePathData(data: string, scale: number) {
  if (scale === 1) return data;
  const normalized = normalizeSvgPathForFigma(data);
  const scalableData = normalized.data ?? data;
  if (!normalized.data && /[AaHhQqSsTtVv]/.test(data)) return data;
  return scalableData.replace(/[-+]?(?:(?:\d*\.\d+)|(?:\d+\.?))(?:[eE][-+]?\d+)?/g, (value) =>
    formatScaledNumber(Number(value) * scale),
  );
}

export function scaleNativeShapes(shapes: NativeShapeContract[], scale: number): NativeShapeContract[] {
  if (scale === 1) return shapes;
  return shapes.map((shape) => {
    if (shape.type === "path") return { ...shape, data: scalePathData(shape.data, scale), strokeWeight: shape.strokeWeight * scale };
    if (shape.type === "line") {
      return {
        ...shape,
        x1: shape.x1 * scale,
        y1: shape.y1 * scale,
        x2: shape.x2 * scale,
        y2: shape.y2 * scale,
        strokeWeight: shape.strokeWeight * scale,
      };
    }
    if (shape.type === "rect") {
      return {
        ...shape,
        x: shape.x * scale,
        y: shape.y * scale,
        width: shape.width * scale,
        height: shape.height * scale,
        radius: shape.radius === undefined ? undefined : shape.radius * scale,
        strokeWeight: shape.strokeWeight * scale,
      };
    }
    return {
      ...shape,
      x: shape.x * scale,
      y: shape.y * scale,
      width: shape.width * scale,
      height: shape.height * scale,
      strokeWeight: shape.strokeWeight === undefined ? undefined : shape.strokeWeight * scale,
    };
  });
}

function toKebabCase(value: string) {
  return (
    value
      .replace(/^AijBasic/, "")
      .replace(/^BjhBasic/, "")
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/[\s_]+/g, "-")
      .toLowerCase()
      .replace(/^-+|-+$/g, "") || "icon"
  );
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function shapeToSvg(shape: NativeShapeContract, strokeColor: string) {
  if (shape.type === "rect") {
    return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" rx="${shape.radius ?? 4}" fill="none" stroke="${strokeColor}" stroke-width="${shape.strokeWeight}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  if (shape.type === "path") {
    return `<path d="${escapeXml(shape.data)}" fill="none" stroke="${strokeColor}" stroke-width="${shape.strokeWeight}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  if (shape.type === "line" && shape.role === "plus-badge") {
    const centerX = (shape.x1 + shape.x2) / 2;
    const centerY = (shape.y1 + shape.y2) / 2;
    const half = Math.abs(shape.x2 - shape.x1) / 2;

    return [
      `<line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" stroke="${strokeColor}" stroke-width="${shape.strokeWeight}" stroke-linecap="round"/>`,
      `<line x1="${centerX}" y1="${centerY - half}" x2="${centerX}" y2="${centerY + half}" stroke="${strokeColor}" stroke-width="${shape.strokeWeight}" stroke-linecap="round"/>`,
    ].join("\n  ");
  }

  if (shape.type === "line") {
    return `<line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" stroke="${strokeColor}" stroke-width="${shape.strokeWeight}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  if (shape.type === "circle") {
    const cx = shape.x + shape.width / 2;
    const cy = shape.y + shape.height / 2;
    const rx = shape.width / 2;
    const ry = shape.height / 2;

    if (shape.fill && shape.fillExceptionReason) {
      return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${shape.fill}"/>`;
    }

    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${strokeColor}" stroke-width="${shape.strokeWeight ?? 2}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  return "";
}

export function buildPreviewSvg(spec: IconSpecContract) {
  const strokeColor = spec.strokes.color;
  const body = spec.shapes.map((shape) => shapeToSvg(shape, strokeColor)).filter(Boolean).join("\n  ");

  return `<svg width="${spec.meta.size}" height="${spec.meta.size}" viewBox="0 0 ${spec.meta.size} ${spec.meta.size}" fill="none" xmlns="http://www.w3.org/2000/svg">\n  ${body}\n</svg>`;
}

export function buildReactComponent(spec: IconSpecContract, svg: string) {
  const innerSvg = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "").trim();

  return `import type { SVGProps } from "react";\n\nexport function ${spec.meta.name}(props: SVGProps<SVGSVGElement>) {\n  return (\n    <svg\n      width="${spec.meta.size}"\n      height="${spec.meta.size}"\n      viewBox="0 0 ${spec.meta.size} ${spec.meta.size}"\n      fill="none"\n      xmlns="http://www.w3.org/2000/svg"\n      aria-hidden="true"\n      {...props}\n    >\n      ${innerSvg
        .replace(/stroke-width=/g, "strokeWidth=")
        .replace(/stroke-linecap=/g, "strokeLinecap=")
        .replace(/stroke-linejoin=/g, "strokeLinejoin=")}\n    </svg>\n  );\n}\n`;
}

function buildFigmaRunner(itemsExpression: string) {
  return `const batchItems = ${itemsExpression};
const createdNodeIds = [];
const errors = [];
const primitiveStats = { rectangle: 0, ellipse: 0, line: 0, vector: 0, tinyFill: 0 };

function colorPaint(spec) {
  const hex = String(spec.strokes?.color || "#0F1218").replace("#", "");
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

function applyLocalTinyFill(node, spec, reason) {
  node.fills = [colorPaint(spec)];
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

function drawLine(root, spec, shape, suffix = "") {
  const node = figma.createLine();
  root.appendChild(node);
  applyShapeMetadata(node, spec, { ...shape, name: suffix ? \`\${shape.name || shape.id} \${suffix}\` : shape.name });
  node.name = suffix ? \`\${shape.id}__\${suffix}\` : node.name;
  node.x = shape.x1;
  node.y = shape.y1;
  node.resize(Math.hypot(shape.x2 - shape.x1, shape.y2 - shape.y1), 0);
  node.rotation = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1) * 180 / Math.PI;
  applyIconStroke(node, spec, shape.strokeWeight || spec.strokes.width);
  createdNodeIds.push(node.id);
  primitiveStats.line += 1;
  return node;
}

function drawShape(root, spec, shape) {
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
      drawLine(root, spec, shape, "horizontal"),
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
      ),
    ];
  }

  if (shape.type === "line") {
    return [drawLine(root, spec, shape)];
  }

  if (shape.type === "circle") {
    const node = figma.createEllipse();
    root.appendChild(node);
    applyShapeMetadata(node, spec, shape);
    node.x = shape.x;
    node.y = shape.y;
    node.resize(shape.width, shape.height);
    if (shape.fill && shape.fillExceptionReason) {
      applyLocalTinyFill(node, spec, shape.fillExceptionReason);
    } else {
      applyIconStroke(node, spec, shape.strokeWeight || spec.strokes.width);
    }
    createdNodeIds.push(node.id);
    primitiveStats.ellipse += 1;
    return [node];
  }

  throw new Error(\`Unsupported shape type: \${shape.type}\`);
}

function drawIcon(item, index) {
  const spec = item.spec;
  const root = figma.createComponent();
  try {
    root.name = spec.meta.name || item.name || \`AijBasicBatchIcon\${index + 1}\`;
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
      nodes.push(...drawShape(root, spec, shape));
    }

    const glyph = figma.group(nodes, root);
    glyph.name = \`\${root.name}__glyph\`;
    createdNodeIds.push(glyph.id);
    figma.currentPage.appendChild(root);
    return root;
  } catch (error) {
    if (!root.removed) root.remove();
    throw error;
  }
}

const roots = [];
for (let index = 0; index < batchItems.length; index += 1) {
  try {
    roots.push(drawIcon(batchItems[index], index));
  } catch (error) {
    errors.push({ item: batchItems[index]?.name || index, message: error instanceof Error ? error.message : String(error) });
  }
}

if (roots.length) figma.viewport.scrollAndZoomIntoView(roots);

return {
  success: errors.length === 0,
  count: roots.length,
  rootIds: roots.map((node) => node.id),
  createdNodeIds,
  primitiveStats,
  errors,
  output: "editable Figma native nodes from the selected team-skill JSON contract; SVG was not imported",
  nextGate: "capture screenshots and compare each generated component against approved previews",
};`;
}

export function buildFigmaNativeScript(spec: IconSpecContract) {
  const item: BatchFigmaWriteItem = {
    id: spec.meta.name,
    name: spec.meta.name,
    sourceName: spec.meta.source?.name ?? "single-icon-spec",
    position: { x: 0, y: 0 },
    spec,
  };

  return `// ${spec.meta.skill_id || "team-icon"} Phase 4B JSON draw runner
// Run through figma-use / use_figma with the selected skillNames.
// This creates editable Figma native nodes from Icon Spec JSON. It does not paste/import SVG.
${buildFigmaRunner(JSON.stringify([item], null, 2))}`;
}

export function buildBatchFigmaNativeScript(items: BatchFigmaWriteItem[]) {
  return `// team icon batch JSON draw runner
// Input contract: icon-spec-batch.json generated by IconOps.
// Run inside Figma Plugin API / Codex figma-use. This creates editable native nodes only; no SVG paste/import.
${buildFigmaRunner(JSON.stringify(items, null, 2))}`;
}

export function buildHandoffMarkdown(spec: IconSpecContract) {
  const blockers = spec.validation.warnings.length ? spec.validation.warnings.map((warning) => `- ${warning}`).join("\n") : "- none";

  return `# ${spec.meta.name} production handoff\n\n- Preview status: ${spec.meta.preview_status}\n- Confirmed direction: ${spec.meta.selected_direction}\n- Size: ${spec.meta.size}x${spec.meta.size}\n- Stroke: ${spec.strokes.width}px center, round cap/join, ${spec.strokes.color}\n- Output target: editable Figma native nodes\n- SVG status: preview/export artifact only, not final Figma delivery\n\n## Validation warnings\n${blockers}\n\n## Screenshot gate\nAfter running the Figma script, capture the generated component and compare it with the approved preview. Do not hand off if metaphor, proportions, gap, radius, or density differ.\n`;
}

export function buildDeliveryPackage(spec: IconSpecContract): DeliveryPackage {
  const slug = toKebabCase(spec.meta.name);
  const svg = buildPreviewSvg(spec);
  const figmaScript = buildFigmaNativeScript(spec);
  const reactComponent = buildReactComponent(spec, svg);
  const files: DeliverableFile[] = [
    {
      path: `${slug}/icon-spec.json`,
      language: "json",
      content: `${JSON.stringify(spec, null, 2)}\n`,
    },
    {
      path: `${slug}/preview.svg`,
      language: "xml",
      content: `${svg}\n`,
    },
    {
      path: `${slug}/${spec.meta.name}.tsx`,
      language: "tsx",
      content: reactComponent,
    },
    {
      path: `${slug}/figma-native-draw.js`,
      language: "js",
      content: `${figmaScript}\n`,
    },
    {
      path: `${slug}/handoff.md`,
      language: "md",
      content: buildHandoffMarkdown(spec),
    },
  ];

  return {
    id: `${slug}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: spec.meta.preview_status === "approved" && spec.validation.status === "pass" ? "ready" : "blocked",
    summary:
      spec.meta.preview_status === "approved" && spec.validation.status === "pass"
        ? "交付包已生成：Spec / SVG Preview / React Component / Figma native draw script / handoff。"
        : "交付包被门禁阻断：需要批准预览并修复规范警告。",
    files,
  };
}

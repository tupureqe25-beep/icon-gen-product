# Figma Node Spec

## Status
✅ Defined — contract-to-use_figma execution spec

---

## Purpose

This file defines how to translate `Icon Spec JSON` into Figma-native nodes.
It is the execution contract between Phase 4A (`shapes[]`) and Phase 4B (drawing on canvas).

Use this file every time Phase 4B starts.

For any `rect` with `open: true`, also load `references/open-shape-schema.md` before drawing.

Core rule:

```
Icon Spec JSON shapes[] → use_figma plugin script → native Figma nodes → grouped/componentized icon → screenshot fidelity check
```

Never paste SVG. Never use image import. Never freehand outside the spec.
The final Figma output must visually match the approved SVG preview unless a difference is explicitly reported and accepted.

---

## Required runtime

This skill uses `figma-use` as the required Figma execution foundation.

Before any drawing script:

1. Load `figma-use`.
2. Call `use_figma` with `skillNames: "icon-gen-promax"`.
3. Execute real Figma Plugin API code inside `use_figma`.
4. Do not invent generic MCP action names such as `create_or_update_node`.
5. Do not use pasted SVG as a fallback.

This document defines the **adapter logic** from icon contract to Figma Plugin API operations. It does not define a fictional MCP API.

---

## Phase 4B execution order

```
1. Read the confirmed Icon Spec JSON.
2. Create a top-level component when possible; otherwise create a 24×24 frame.
3. Draw shapes[] in order: back → front.
4. Apply platform stroke defaults and keep icon shape fills empty by default; apply local tiny fill only when the spec gives a fill exception reason.
5. Group all icon shape nodes as {meta.name}__glyph.
6. Apply optical centering as a group-level transform.
7. Keep grouped native nodes by default; do not flatten by default.
8. Run validation checklist + visual quality gates.
9. If fallback/warning thresholds are exceeded, return to Phase 4A and simplify the spec before redrawing.
10. Capture screenshot for visual validation.
11. Compare the screenshot with the approved SVG preview and confirmed visual direction.
12. If the screenshot fails the decision gate, branch back to Phase 2 / Phase 3 / Phase 4A / Phase 4B based on failure type.
13. Report canvas location, node IDs, layer count, warnings, fallback used, and visual match to approved preview.
```

---

## Screenshot decision gate

The screenshot step is mandatory and must produce a decision.
It is not enough to capture a screenshot for the report.

Compare the screenshot against:

1. the confirmed semantic direction from Phase 2
2. the approved SVG preview from Phase 3
3. the Icon Spec JSON from Phase 4A

Decision branch:

```txt
if screenshot shows wrong metaphor or wrong concept:
  return to Phase 2 Semantic Plan

if screenshot shows the approved preview itself needs visual changes:
  return to Phase 3 SVG Preview

if screenshot differs because the spec changed radius, proportion, curve, gap, or detail count:
  return to Phase 4A Spec and restore preview fidelity

if screenshot differs because Figma-native drawing or a fallback changed the appearance:
  return to Phase 4B Draw and repair native construction

if screenshot only has minor centering/spacing imbalance:
  revise spec or optical correction, redraw, screenshot again

if screenshot matches approved preview and passes visual gates:
  proceed to final handoff
```

Report field:

```md
- Visual match to approved preview: {yes | no — differences + action taken}
```

---

## Coordinate system

All geometry uses Figma's normal canvas coordinate system:

```
origin:       top-left of the icon component/frame
x axis:       right
y axis:       down
unit:         px
frame size:   meta.size × meta.size, default 24 × 24
```

For a 24px icon:

```
frame:        0,0 → 24,24
safe zone:    2px inset
live area:    2,2 → 22,22
path range:   usually 3,3 → 21,21 for 2px center stroke
center:       12,12
```

Individual anchor coordinates must be integers.
Optical correction may move the whole glyph group by `0.5px` increments.

---

## Figma style defaults

Apply these to every drawn shape unless the spec explicitly contains a size-scaled stroke override:

```js
const ICON_COLOR = { r: 15/255, g: 18/255, b: 24/255 }; // #0F1218
const STROKE = {
  type: 'SOLID',
  color: ICON_COLOR
};

function applyIconStroke(node, weight = 2) {
  node.fills = [];
  node.strokes = [STROKE];
  node.strokeWeight = weight;
  node.strokeAlign = 'CENTER';
  if ('strokeCap' in node) node.strokeCap = 'ROUND';
  if ('strokeJoin' in node) node.strokeJoin = 'ROUND';
  if ('effects' in node) node.effects = [];
}

function applyLocalTinyFill(node, reason) {
  // Use only when the spec documents a clarity exception,
  // e.g. a 3px dot where 2px stroke would collapse or stick.
  node.fills = [STROKE];
  node.strokes = [];
  if ('effects' in node) node.effects = [];
  if ('setSharedPluginData' in node) {
    node.setSharedPluginData('icon-gen-promax', 'fillExceptionReason', reason || 'local tiny fill for clarity');
  }
}
```

No gradients, shadows, blur, opacity changes, or mixed stroke weights.
Actual fills are forbidden on main shapes. Local tiny fill is allowed only when documented by the spec.
Also check for visual fill effect after drawing.

---

## Node mapping table

| `shape.type` | Figma native node | Use for | Primary construction | Fallback |
|---|---|---|---|---|
| `rect` | Rectangle or Vector | cards, panels, trays, open boxes | closed rect → Rectangle; open rect → Vector path | draw as 3 or 4 `line` nodes |
| `circle` | Ellipse | lens, ring, avatar, globe outline, tiny status dot | Ellipse with no fill by default; local tiny fill only with reason | approximate as Vector circle path |
| `line` | Line | stems, dividers, arrow tips | Line node from `(x1,y1)` to `(x2,y2)` | Vector path `M x1 y1 L x2 y2` |
| `arc` | Vector | partial circles, latitude arcs, curves | Vector path using cubic/arc approximation | polyline with 3–5 line segments |
| `path` | Vector or Lines | chevrons, arrows, custom outlines | Vector path from `commands[]` or `points[]` | split into multiple `line` nodes |
| `boolean` | Boolean group | rare union/subtract cases | create operands → apply operation only if safe | keep separate paths or simplify metaphor |

---

## Base use_figma script structure

Use one script per icon when possible. If generating a set, use one script for page/setup and one script per icon or small batch.

```js
// Always called through use_figma with skillNames: "icon-gen-promax".
const spec = ICON_SPEC_JSON;
const createdNodeIds = [];

const size = spec.meta.size ?? 24;
const name = spec.meta.name;

// Prefer component for production handoff.
const root = figma.createComponent();
root.name = name;
root.resize(size, size);
root.clipsContent = true;
root.fills = [];
root.x = TARGET_X;
root.y = TARGET_Y;
createdNodeIds.push(root.id);

// Draw shapes back → front.
const nodes = [];
for (const shape of spec.shapes) {
  const node = createIconShape(shape, root, spec);
  if (node) {
    nodes.push(node);
    createdNodeIds.push(node.id);
  }
}

// Group, then optical-shift the group.
const glyph = figma.group(nodes, root);
glyph.name = `${name}__glyph`;
applyOpticalShift(glyph, spec);
createdNodeIds.push(glyph.id);

return { success: true, rootId: root.id, glyphId: glyph.id, createdNodeIds };
```

If `createComponent()` is unavailable or inappropriate for the current file context, create a `FRAME` instead and name it `{meta.name}`. Report this in notes.

---

## 1. Top-level component/frame

Create the outer icon container before any shapes.

### Input

```jsonc
{
  "meta": { "name": "AijBasicDownload", "size": 24 },
  "canvas": { "padding": 2, "optical_center": true }
}
```

### Figma Plugin API pattern

```js
const root = figma.createComponent(); // preferred
// fallback: const root = figma.createFrame();
root.name = spec.meta.name;
root.resize(spec.meta.size, spec.meta.size);
root.clipsContent = true;
root.fills = [];
root.strokes = [];
```

### Rules

- Top-level container is the production deliverable, not a visible background.
- Do not add a frame border.
- `clipsContent = true`.
- If drawing multiple icons, create one component/frame per icon and align them on canvas with consistent spacing.

---

## 2. Closed rectangle

Use for `shape.type = "rect"` and `open = false`.

### Input

```jsonc
{
  "id": "body",
  "type": "rect",
  "open": false,
  "x": 3,
  "y": 5,
  "w": 18,
  "h": 16,
  "r": 4
}
```

### Figma Plugin API pattern

```js
const node = figma.createRectangle();
node.name = shape.id;
node.x = shape.x;
node.y = shape.y;
node.resize(shape.w, shape.h);
node.cornerRadius = resolveCornerRadius(shape);
applyIconStroke(node, spec.strokes?.weight ?? 2);
root.appendChild(node);
```

Use this helper for all rectangle-like shapes:

```js
function resolveCornerRadius(shape) {
  if (typeof shape.r === 'number') return shape.r;
  if (shape.type === 'rect') return 4;
  return 0;
}
```

Do not let omitted `r` become a 0px sharp rectangle.

### Fallback

If rounded rectangle creation fails:

1. Create plain rectangle with `x/y/w/h`.
2. Apply `cornerRadius` in a separate update.
3. If that fails, convert to a vector rounded-rect path.
4. If that fails, halt and report — do not draw a sharp rectangle.

---

## 3. Open rectangle / tray / C-shape

Use for `shape.type = "rect"` and `open = true`.

This is a primary supported shape, not an informal fallback pattern. Load `open-shape-schema.md` and use its coordinate rules.

Do not create a closed rectangle and cover the missing edge with a mask.
Draw an open vector path or line-node fallback.

### Input

```jsonc
{
  "id": "tray",
  "type": "rect",
  "open": true,
  "x": 4,
  "y": 7,
  "w": 16,
  "h": 12,
  "r": 4,
  "gap": { "edge": "top", "width": 8 }
}
```

### Figma Plugin API pattern

Preferred: create a vector path if the current Figma runtime supports setting `vectorPaths`.

```js
const node = figma.createVector();
node.name = shape.id;
node.vectorPaths = [{
  windingRule: 'NONEZERO',
  data: buildOpenRoundedRectPath(shape)
}];
applyIconStroke(node, spec.strokes?.weight ?? 2);
root.appendChild(node);
```

### Coordinate standard

Before drawing, compute the centered gap from the normalized schema:

```js
function getOpenRectGap(shape) {
  const gap = shape.gap;
  if (!gap || !["top", "right", "bottom", "left"].includes(gap.edge)) {
    throw new Error("open rect requires gap.edge");
  }
  if (!Number.isInteger(gap.width) || gap.width < 6 || gap.width % 2 !== 0) {
    throw new Error("open rect gap.width must be an even integer >= 6 at 24px");
  }

  if (gap.edge === "top" || gap.edge === "bottom") {
    const start = shape.x + (shape.w - gap.width) / 2;
    const end = shape.x + (shape.w + gap.width) / 2;
    if (!Number.isInteger(start) || !Number.isInteger(end)) {
      throw new Error("open rect horizontal gap endpoints must resolve to integers");
    }
    return { edge: gap.edge, startX: start, endX: end };
  }

  const start = shape.y + (shape.h - gap.width) / 2;
  const end = shape.y + (shape.h + gap.width) / 2;
  if (!Number.isInteger(start) || !Number.isInteger(end)) {
    throw new Error("open rect vertical gap endpoints must resolve to integers");
  }
  return { edge: gap.edge, startY: start, endY: end };
}
```

The open side is omitted symmetrically from the selected edge. Do not use custom fields such as `openEdge`, `gapWidth`, `notch`, or `missingSide` in Phase 4B; normalize them back to `gap.edge` and `gap.width` during Phase 4A.

### Fallback

If open rounded vector path fails:

1. Draw as three or four `LINE` nodes matching the same `x/y/w/h/gap` schema.
2. Preserve corner intent by using round caps/joins.
3. Group those segments and name the group `{shape.id}`.
4. Increment `fallbackCount`.
5. Report: `⚠️ open rect fallback: drawn as line segments`.

---

## 4. Circle / ellipse

Use for `shape.type = "circle"`.

### Input

```jsonc
{
  "id": "lens",
  "type": "circle",
  "open": false,
  "x": 4,
  "y": 4,
  "w": 14,
  "h": 14
}
```

### Figma Plugin API pattern

```js
const node = figma.createEllipse();
node.name = shape.id;
node.x = shape.x;
node.y = shape.y;
node.resize(shape.w, shape.h);
applyIconStroke(node, spec.strokes?.weight ?? 2);
root.appendChild(node);
```

### Fallback

If ellipse creation fails:

1. Create a vector circle path using the same bounding box.
2. If vector path fails, halt and report.

Do not replace a circle with a rounded square.

---

## 5. Line

Use for `shape.type = "line"`.

### Input

```jsonc
{
  "id": "handle",
  "type": "line",
  "role": "stem",
  "x1": 16,
  "y1": 16,
  "x2": 21,
  "y2": 21,
  "angle": 45
}
```

### Figma Plugin API pattern

```js
const node = figma.createLine();
node.name = shape.id;
node.x = shape.x1;
node.y = shape.y1;
node.resize(Math.hypot(shape.x2 - shape.x1, shape.y2 - shape.y1), 0);
node.rotation = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1) * 180 / Math.PI;
applyIconStroke(node, spec.strokes?.weight ?? 2);
root.appendChild(node);
```

### Rules

- Keep endpoints on integer coordinates.
- Angle must be a multiple of 15° unless the user approved an exception.
- Use line nodes for simple straight strokes rather than vector paths.

### Fallback

If line node creation fails, draw vector path:

```js
const node = figma.createVector();
node.vectorPaths = [{ windingRule: 'NONEZERO', data: `M ${shape.x1} ${shape.y1} L ${shape.x2} ${shape.y2}` }];
```

---

## 6. Path / chevron / arrow tip

Use for `shape.type = "path"`.

Preferred schema in `shapes[]`:

```jsonc
{
  "id": "arrow_tip",
  "type": "path",
  "role": "arrow",
  "open": true,
  "points": [
    { "x": 8, "y": 10 },
    { "x": 12, "y": 6 },
    { "x": 16, "y": 10 }
  ]
}
```

### Figma Plugin API pattern

```js
const node = figma.createVector();
node.name = shape.id;
node.vectorPaths = [{
  windingRule: 'NONEZERO',
  data: pathDataFromPointsOrCommands(shape)
}];
applyIconStroke(node, spec.strokes?.weight ?? 2);
root.appendChild(node);
```

### Fallback

If vector points fail:

1. Split each segment into a `line` node.
2. Preserve the same endpoints.
3. Group the segments and report fallback.

---

## 7. Arc

Use for `shape.type = "arc"`.

Arcs must be vectors. Use them sparingly.

### Input

```jsonc
{
  "id": "latitude",
  "type": "arc",
  "role": "division",
  "open": true,
  "x": 5,
  "y": 8,
  "w": 14,
  "h": 8,
  "startAngle": 0,
  "endAngle": 180
}
```

### Figma Plugin API pattern

```js
const node = figma.createVector();
node.name = shape.id;
node.vectorPaths = [{
  windingRule: 'NONEZERO',
  data: buildArcPath(shape)
}];
applyIconStroke(node, spec.strokes?.weight ?? 2);
root.appendChild(node);
```

### Fallback

If arc path creation fails:

1. Approximate with a 3–5 point polyline.
2. Keep the curve visually smooth enough at 24px.
3. Do not exceed the path-count budget unless recognizability requires it.

---

## 8. Boolean operations

Use boolean only when the spec explicitly sets `boolean`.
Most platform icons should not need boolean operations.

### Rules

- Boolean operations are not the default production path for outline icons.
- Do not use boolean operations merely to create fake fills or cutouts.
- If boolean output changes stroke appearance, abandon it and simplify the geometry.

### Fallback

If boolean fails:

1. Keep operands as separate visible native nodes only if the result still reads correctly.
2. Otherwise simplify the metaphor and redraw without boolean.
3. Report the boolean failure.

---

## Final structure and flatten policy

Default final structure:

```
AijBasic{Name}  // component preferred; frame fallback allowed
└── AijBasic{Name}__glyph  // group
    ├── descriptive_shape_layer_1
    ├── descriptive_shape_layer_2
    └── descriptive_shape_layer_3
```

Do not flatten by default.

Flatten only when all conditions are true:

1. User explicitly requests single-vector output or export preparation.
2. The current runtime supports flattening safely.
3. Screenshot/metadata validation before and after flattening shows no visual or structural regression.
4. A copy of the editable grouped version is preserved or the user approved destructive flattening.

If flattening changes appearance or fails, keep the grouped native nodes and report the reason.

---

## Iteration / redraw protocol

When the user requests a visual change after drawing:

```
1. Start from last_spec, not from the current visual appearance.
2. Update the relevant fields in last_spec.
3. Re-run constraint checks and visual quality gates.
4. Hide or delete the previous generated component/frame.
5. Redraw the full icon from the updated spec.
6. Report what changed.
```

Do not manually patch random nodes unless the user explicitly requests a tiny position tweak.
For system consistency, full redraw is preferred.

### Micro-tweak exception

A direct node edit is allowed only when the user asks for a tiny optical adjustment, such as:

```
"move it up 1px"
"make the handle 1px shorter"
"center the dot"
```

Even then, update `last_spec` after the edit.

---

## Error recovery paths

Follow the official Figma skill pattern: stop on error, inspect, fix, retry.
Do not blindly retry the same failed script.

### Level 1 — script fix

If a `use_figma` script fails:

1. Stop.
2. Read the error message.
3. If unclear, inspect current state with metadata or screenshot.
4. Fix the script.
5. Retry the corrected script.

### Level 2 — simplify geometry

If a vector path fails:

- open rect → 3 line nodes
- chevron → 2 line nodes
- arrow tip → 2 line nodes
- arc → 3–5 point polyline
- compound path → simpler structural pattern from `shape-decomposition.md`

### Level 3 — stop safely

Stop and report when:

- `figma-use` / `use_figma` is unavailable
- the top-level component/frame cannot be created
- the required node type is unsupported and the fallback would violate constraints
- drawing would require SVG paste, image import, or manual tracing

Safe stop message:

```
I can’t complete the Figma draw step because {reason}. I stopped before creating a non-compliant icon. The current Icon Spec JSON is still valid and can be redrawn when Figma access is available.
```

---

## Draw report template and re-spec trigger

After Phase 4B, run validation-checklist.md and visual-quality-gates.md.

Before handing off, count failures:

```txt
fallbackCount = number of runtime fallbacks used
warningCount  = number of validation warnings / revise gates triggered
blockerCount  = number of blockers found
```

Re-spec rules:

```txt
if blockerCount > 0:
  stop and fix before handoff

if fallbackCount >= 2:
  return to Phase 4A and simplify geometry before redrawing

if warningCount >= 3:
  return to Phase 4A and reduce density / improve negative space before redrawing

if visual fill effect appears:
  return to Phase 4A and revise geometry; use local fill only for documented tiny-detail clarity exceptions
```

Then report briefly:

```md
✅ Drew `{meta.name}` as native Figma nodes.
- Deliverable: {component | frame fallback}
- Frame: {size}×{size}, clip content true
- Structure: grouped native nodes, not flattened
- Paths: {count}, {node_types}
- Stroke: {weight}px center, round cap/join, #0F1218
- Optical correction: {shift}
- Fallbacks: {none | list}
- Warnings: {none | list}
```

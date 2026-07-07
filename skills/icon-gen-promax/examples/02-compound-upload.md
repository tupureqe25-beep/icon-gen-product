# Example 02 — Compound icon: Upload

## User request

> Draw an upload icon for a creation panel.

## Brief result

24px outline `upload` icon for a creation panel.

## Semantic Plan

Option A — action into platform
  Visual elements: open-top tray + upward arrow
  Meaning: upload / send into creation panel
  Risk: low; matches platform opening-as-meaning rule

Option B — file action
  Visual elements: document outline + upward arrow
  Meaning: upload a file
  Risk: can read too specifically as document upload

Option C — cloud metaphor
  Visual elements: cloud outline + upward arrow
  Meaning: cloud upload
  Risk: less suitable if the creation panel is not cloud-related

Confirmed visual direction: Option A, open-top tray + upward arrow.

## SVG Preview approval

Generate a temporary SVG preview in Codex using the confirmed direction:

```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 11V16C4 18.209 5.791 20 8 20H16C18.209 20 20 18.209 20 16V11" stroke="#0F1218" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M12 15V5" stroke="#0F1218" stroke-width="2" stroke-linecap="round"/>
  <path d="M8 9L12 5L16 9" stroke="#0F1218" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

Preview status: approved
Local fill used? no

## Lookup

Optional. The metaphor is common:

```
open-top tray + upward arrow
```

This matches the platform style rule: openings carry meaning.

## Decomposition

Pattern: **S4 — Shape + attached directional**

- `tray`: open-top rounded rectangle / U-shape
- `arrow_stem`: vertical upload direction
- `arrow_tip`: open V arrowhead

## Icon Spec JSON


```jsonc
{
  "meta": {
    "name": "AijBasicUpload",
    "label": "Upload",
    "size": 24,
    "grid": 24,
    "context": "creation panel",
    "style": "outline",
    "color_mode": "monochrome",
    "corner_radius": "rounded",
    "style_notes": ""
  },
  "canvas": {
    "padding": 2,
    "optical_center": true
  },
  "shapes": [
    {
      "id": "tray",
      "type": "rect",
      "open": true,
      "role": "container",
      "x": 4,
      "y": 10,
      "w": 16,
      "h": 9,
      "r": 4,
      "gap": { "edge": "top", "width": 8 },
      "fill": null,
      "group": "root"
    },
    {
      "id": "arrow_stem",
      "type": "line",
      "open": true,
      "role": "stem",
      "x1": 12,
      "y1": 15,
      "x2": 12,
      "y2": 5,
      "angle": 90,
      "fill": null,
      "group": "root"
    },
    {
      "id": "arrow_tip",
      "type": "path",
      "open": true,
      "role": "arrow",
      "points": [
        { "x": 8, "y": 9 },
        { "x": 12, "y": 5 },
        { "x": 16, "y": 9 }
      ],
      "fill": null,
      "group": "root"
    }
  ],
  "strokes": {
    "weight": 2,
    "color": "#0F1218",
    "position": "center",
    "cap": "round",
    "join": "round"
  },
  "validation": {
    "path_count": 3,
    "passes_constraints": true
  }
}
```

## use_figma draw plan

1. Create 24×24 frame named `AijBasicUpload`.
2. Draw `tray` as open rounded vector path.
3. Draw `arrow_stem` as Line.
4. Draw `arrow_tip` as open Vector path.
5. Apply stroke defaults.
6. Apply optical correction: no shift or up 0.5px if it appears bottom-heavy.
7. Group native nodes as `AijBasicUpload`.
8. Validate.

## Error recovery path

If open rounded vector fails:

```
tray → draw as 3 line nodes: left side + bottom side + right side
```

If `arrow_tip` vector fails:

```
arrow_tip → draw as 2 line nodes
```

## Expected report

```md
✅ Drew `AijBasicUpload` as native Figma nodes.
- Frame: 24×24, clip content true
- Paths: 3, open vector + line + vector
- Stroke: 2px center, round cap/join, #0F1218
- Optical correction: none
- Visual match to approved preview: yes
- Canonical registry: unavailable; suggested entry should be emitted if production storage is needed
- Fallbacks: none
- Warnings: none
```

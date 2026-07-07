# Example 03 — Icon set: Toolbar actions

## User request

> Draw a toolbar icon set: search, filter, sort, and more.

## Brief result

Four 24px outline icons for the same toolbar context.

## Semantic Plan

Option A — conventional toolbar set
  Visual elements: search lens, filter lines, sort direction lines, more dots
  Meaning: fast recognition in a dense toolbar
  Risk: low; common and compact

Option B — container-based set
  Visual elements: each action placed inside small rounded containers
  Meaning: stronger grouping
  Risk: too dense at 24px and less aligned with minimal toolbar icons

Confirmed visual direction: Option A, conventional toolbar set.

## SVG Preview approval

Generate temporary SVG previews in Codex for the set before Figma drawing.
A representative filter preview:

```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 7H20" stroke="#0F1218" stroke-width="2" stroke-linecap="round"/>
  <path d="M7 12H17" stroke="#0F1218" stroke-width="2" stroke-linecap="round"/>
  <path d="M10 17H14" stroke="#0F1218" stroke-width="2" stroke-linecap="round"/>
</svg>
```

Preview status: approved
Local fill used? no

## Lookup

Library lookup is optional for `search` and `more`, but useful for `filter` and `sort` if the product has existing conventions.

Check the Figma canvas library if available:

```
search existing toolbar icons → inspect weight, proportion, naming
```

## Set-level rules


Use `references/icon-set-rules.md`.

```
size:       all 24×24
stroke:     all 2px center, round cap/join
color:      all #0F1218
density:    each icon 2–4 paths
naming:     AijBasicSearch / AijBasicFilter / AijBasicSort / AijBasicMore
alignment:  frames aligned horizontally with equal spacing
```

## Concept decomposition

| Icon | Pattern | Construction |
|---|---|---|
| Search | S4 | circle lens + diagonal handle |
| Filter | S5 | three horizontal lines with decreasing lengths or knob offsets |
| Sort | S5 | vertical arrow pair or stacked directional lines |
| More | S5 | three dots as stroked circles |

## One representative Icon Spec JSON: Filter

```jsonc
{
  "meta": {
    "name": "AijBasicFilter",
    "label": "Filter",
    "size": 24,
    "grid": 24,
    "context": "toolbar",
    "style": "outline",
    "color_mode": "monochrome",
    "corner_radius": "rounded",
    "style_notes": "part of toolbar set"
  },
  "canvas": {
    "padding": 2,
    "optical_center": true
  },
  "shapes": [
    {
      "id": "top_filter_line",
      "type": "line",
      "open": true,
      "role": "division",
      "x1": 4,
      "y1": 7,
      "x2": 20,
      "y2": 7,
      "angle": 0,
      "fill": null,
      "group": "root"
    },
    {
      "id": "middle_filter_line",
      "type": "line",
      "open": true,
      "role": "division",
      "x1": 7,
      "y1": 12,
      "x2": 17,
      "y2": 12,
      "angle": 0,
      "fill": null,
      "group": "root"
    },
    {
      "id": "bottom_filter_line",
      "type": "line",
      "open": true,
      "role": "division",
      "x1": 10,
      "y1": 17,
      "x2": 14,
      "y2": 17,
      "angle": 0,
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

1. Create one frame per icon.
2. Place frames in a horizontal row.
3. Draw each icon from its own Icon Spec JSON.
4. Validate each icon individually.
5. Run set-level consistency check:
   - same stroke
   - similar visual density
   - same optical center behavior
   - consistent naming

## Expected report

```md
✅ Drew toolbar set as native Figma nodes.
- Frames: 4 icons, each 24×24
- Stroke: 2px center, round cap/join, #0F1218
- Density: 2–3 paths per icon
- Set consistency: passed
- Visual match to approved preview: yes
- Canonical registry: unavailable; suggested entry should be emitted if production storage is needed
- Fallbacks: none
- Warnings: none
```

# Example 01 — Simple icon: Search

## User request

> Draw a search icon for a toolbar.

## Brief result

24px outline `search` icon for a toolbar.

## Semantic Plan

Option A — object metaphor
  Visual elements: circular lens + short diagonal handle
  Meaning: conventional search / magnifier
  Risk: low; very recognizable in toolbar context

Option B — action emphasis
  Visual elements: lens + slightly extended handle pointing down-right
  Meaning: active scanning / looking
  Risk: handle can dominate if too long

Confirmed visual direction: Option A, circular lens + short diagonal handle.

## SVG Preview approval

Generate a temporary SVG preview in Codex using the confirmed direction:

```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="10" cy="10" r="6" stroke="#0F1218" stroke-width="2"/>
  <path d="M15 15L20 20" stroke="#0F1218" stroke-width="2" stroke-linecap="round"/>
</svg>
```

Preview status: approved
Local fill used? no

## Decomposition

Pattern: **S4 — Shape + attached directional**

- `lens`: circle
- `handle`: line attached at 45°

## Icon Spec JSON


```jsonc
{
  "meta": {
    "name": "AijBasicSearch",
    "label": "Search",
    "size": 24,
    "grid": 24,
    "context": "toolbar",
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
      "id": "lens",
      "type": "circle",
      "open": false,
      "role": "container",
      "x": 4,
      "y": 4,
      "w": 13,
      "h": 13,
      "fill": null,
      "group": "root"
    },
    {
      "id": "handle",
      "type": "line",
      "open": true,
      "role": "stem",
      "x1": 15,
      "y1": 15,
      "x2": 20,
      "y2": 20,
      "angle": 45,
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
    "path_count": 2,
    "passes_constraints": true
  }
}
```

## use_figma draw plan

1. Create 24×24 frame named `AijBasicSearch`.
2. Draw `lens` as Ellipse.
3. Draw `handle` as Line.
4. Apply 2px center stroke, round cap/join, #0F1218.
5. Apply optical shift up 0.5px because circle-dominant icons visually sit low.
6. Group native nodes as `AijBasicSearch`.
7. Validate.

## Expected report

```md
✅ Drew `AijBasicSearch` as native Figma nodes.
- Frame: 24×24, clip content true
- Paths: 2, ellipse + line
- Stroke: 2px center, round cap/join, #0F1218
- Optical correction: up 0.5px
- Visual match to approved preview: yes
- Canonical registry: unavailable; suggested entry should be emitted if production storage is needed
- Fallbacks: none
- Warnings: none
```

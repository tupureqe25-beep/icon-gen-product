# Example 04 — Ambiguous concept: Share

## User request

> Draw a share icon for a comic chapter card.

## Brief result

24px outline `share` icon for a comic chapter card action.

## Semantic Plan

`Share` can mean several different visual metaphors, so offer options before writing JSON:

Option A — forward action
  Visual elements: open diagonal arrow moving up-right
  Meaning: share / forward this chapter
  Risk: can overlap with external-link if placed inside a box

Option B — send metaphor
  Visual elements: paper-plane / send arrow
  Meaning: send this chapter outward
  Risk: may read as message/send rather than share

Option C — social graph
  Visual elements: connected dots
  Meaning: social sharing / network
  Risk: too complex and can read as relationship/network

Confirmed visual direction: Option A, forward action arrow for compact card context.

## SVG Preview approval

Generate a temporary SVG preview in Codex using the confirmed direction:

```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M6 18L17 7" stroke="#0F1218" stroke-width="2" stroke-linecap="round"/>
  <path d="M12 7H17V12" stroke="#0F1218" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

Preview status: approved
Local fill used? no

## Why this is ambiguous

`Share` can mean several different visual metaphors:

```
1. node graph / connected dots
2. box with outward arrow
3. forward arrow
4. send / paper-plane arrow
```

Do not guess silently when the product context affects meaning.

## Metaphor decision


Use the decision priority before external lookup:

```
1. User context: comic chapter card action
2. Internal table: share + card action → forward arrow / curved arrow
3. Existing platform set: check nearby card-action icons if available
4. External lookup: optional only if still uncertain
```

External library lookup is not required here because the context and internal table are enough.

If the platform canvas already has a nearby share/send/forward icon, inspect it for proportion and visual weight only.

## Decision rationale

For a comic chapter card, choose **forward arrow / outward action** rather than node graph.

Reason:

```
The card action is likely a lightweight content action. A node graph can read as "network" or "relation". A forward arrow reads faster in a compact toolbar/card context.
```

Visual quality note:

```
Use an open arrowhead. Do not create a filled triangle or a visually filled arrow tip.
Keep enough negative space around the arrowhead so the 2px stroke does not collapse into a blob.
```

## Decomposition

Pattern: **S5 — Pure line composition** or **S4 — open box + directional**.

Chosen construction:

- `arrow_stem`: diagonal line moving up-right
- `arrow_tip`: open V arrowhead
- optional `origin`: short starting line only if recognition needs it

Keep it minimal.

## Icon Spec JSON

```jsonc
{
  "meta": {
    "name": "AijBasicShare",
    "label": "Share",
    "size": 24,
    "grid": 24,
    "context": "comic chapter card action",
    "style": "outline",
    "color_mode": "monochrome",
    "corner_radius": "rounded",
    "style_notes": "ambiguous concept resolved as forward/share arrow for card action context"
  },
  "canvas": {
    "padding": 2,
    "optical_center": true
  },
  "shapes": [
    {
      "id": "arrow_stem",
      "type": "line",
      "open": true,
      "role": "stem",
      "x1": 6,
      "y1": 18,
      "x2": 17,
      "y2": 7,
      "angle": 45,
      "fill": null,
      "group": "root"
    },
    {
      "id": "arrow_tip",
      "type": "path",
      "open": true,
      "role": "arrow",
      "points": [
        { "x": 12, "y": 7 },
        { "x": 17, "y": 7 },
        { "x": 17, "y": 12 }
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
    "path_count": 2,
    "passes_constraints": true
  }
}
```

## use_figma draw plan

1. Create 24×24 frame named `AijBasicShare`.
2. Draw `arrow_stem` as Line.
3. Draw `arrow_tip` as open Vector path.
4. Apply stroke defaults.
5. Apply optical correction: up 0.5px if arrow appears bottom-heavy.
6. Group native nodes as `AijBasicShare`.
7. Validate.

## Expected report

```md
✅ Drew `AijBasicShare` as native Figma nodes.
- Frame: 24×24, clip content true
- Paths: 2, line + vector
- Stroke: 2px center, round cap/join, #0F1218
- Optical correction: up 0.5px
- Visual match to approved preview: yes
- Canonical registry: unavailable; suggested entry should be emitted if production storage is needed
- Fallbacks: none
- Warnings: concept was ambiguous; resolved as forward/share arrow based on card-action context
```

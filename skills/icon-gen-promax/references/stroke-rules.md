# Stroke Rules

## Status
✅ Defined — session 1 (core spec); updated session 3 (scale table, endpoint rules)

---

## Core Stroke Spec (24×24 canvas)

```
weight:     2px
position:   center
cap:        round
join:       round
color:      #0F1218
opacity:    100%
```

Uniform on every path, every icon. No exceptions to weight, position, or style.

---

## Stroke Scale by Canvas Size

Production-safe output is currently defined for 24px master icons only.

When drawing draft output at any size other than 24px, this table may be used as a proportional reference, but it is not a complete small-size pixel-hinting system. If the requested target is 20px or smaller, load `small-size-production-rule.md` and warn before drawing:

```
Canvas size     Stroke weight
──────────────────────────────
48 × 48 px      4.00 px   (base)
32 × 32 px      2.66 px
24 × 24 px      2.00 px   ← default
18 × 18 px      1.50 px
16 × 16 px      1.33 px
12 × 12 px      1.00 px
```

Mismatching stroke weight to canvas size is a hard constraint violation (C2).
Do not use 2px stroke at 48px. Do not interpolate between table values.

Do not claim 16px/20px output is production-ready until small-size mode is defined.

---

## Stroke Position

Always **center** stroke in Figma. This is the platform standard at 24×24px.
Inner stroke is not used, regardless of reference grid conventions at other scales.

---

## Endpoint and Anchor Rules

```
All line segment endpoints:   round cap  (matches stroke style)
All path joins / corners:     round join
All anchor coordinates:       integers only — no sub-pixel anchors
                              (group-level optical shift of 0.5px is fine)
```

Keep stroke width consistent across all segments of an icon.
Inconsistent stroke width (e.g. one arm thicker than another) reads as a mistake.

Example of correct behavior:
- ¥ symbol: all strokes of the character and enclosing circle = same 2px weight
- Card icon: all four sides of the rounded rect = same 2px weight, same corner radius

---

## Color

```
Stroke color:   #0F1218   (flat, 100% opacity)
Fill color:     none by default — icon shapes should have fills: [] unless a local tiny-fill exception is justified
Gradients:      NEVER
Shadows:        NEVER
Opacity:        100% always — no semi-transparent strokes or fills
```

Single flat color. No tinting, no lightening, no variation.

---

## What This Means for Figma Nodes

```
Node type              Stroke setting
────────────────────────────────────────────────────────────────
Line                   strokeWeight: 2, strokeCap: ROUND
Open path              strokeWeight: 2, strokeCap: ROUND, strokeJoin: ROUND
Closed path            strokeWeight: 2, strokeAlign: CENTER, strokeJoin: ROUND,
                        fills: []
Rectangle (outline)    strokeWeight: 2, strokeAlign: CENTER, strokeJoin: ROUND,
                        cornerRadius: > 0, fills: []
Ellipse (outline)      strokeWeight: 2, strokeAlign: CENTER, fills: []
Tiny filled dot         fills: #0F1218, strokes: [] — only with local fill exception reason
```

Never mix stroked and filled treatments on the same logical shape element in the default outline style.
A separate tiny indicator may use local fill only when stroke harms clarity, such as a 3px dot with a 2px stroke.
See constraints.md and visual-quality-gates.md for visual fill effect checks and the local fill exception.

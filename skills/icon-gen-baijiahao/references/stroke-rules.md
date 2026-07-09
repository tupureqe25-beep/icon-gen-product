# Stroke Rules

## Status
✅ Defined — session 1 (core spec); updated session 3 (scale table, endpoint rules)

---

## Core Stroke Spec

Baijiahao inherits the quality workflow from `icon-gen-promax`, but not its production-size assumption.

Use the official Baijiahao PDF and mature library as the source of truth:

```txt
Default production output: 48 × 48px PC team master
Official PC stroke:       4px
Normalized logical model: 24 × 24px with 2px stroke for reasoning and preview
```

## Logical 24×24 Reference

```
weight:     2px
position:   center
cap:        round
join:       round
color:      #242529
opacity:    100%
```

Uniform on every path, every icon. This 24px profile is a logical/reference profile unless the user explicitly asks for compact 24px output.

---

## Stroke Scale by Canvas Size

Production-safe Baijiahao PC output is defined by the official 48px master and proportional scale table.

When drawing output at another official size, use this proportional reference. It is not a complete small-size pixel-hinting system. If the requested target is 20px or smaller, load `small-size-production-rule.md` and warn before drawing:

```
Canvas size     Stroke weight
──────────────────────────────
48 × 48 px      4.00 px   (base)
32 × 32 px      2.66 px
24 × 24 px      2.00 px   ← logical reference / explicit compact output
18 × 18 px      1.50 px
16 × 16 px      1.33 px
12 × 12 px      1.00 px
```

Mismatching stroke weight to canvas size is a hard constraint violation (C2).
Do not use 2px stroke at 48px. Do not interpolate between table values.

Do not claim 16px/20px output is production-ready until small-size mode is defined.

---

## Stroke Position

The official Baijiahao PC spec uses **inner stroke** on the 48×48 drawing canvas.

Figma-native drawing rules:

- Prefer inner stroke for rectangles/ellipses/primitives when the API operation supports it reliably.
- For open paths and vectors where inner stroke is not meaningful or not supported, use center stroke and compensate coordinates so the visible result matches the official 48px master.
- Never report a center-stroke output as official unless screenshot validation confirms equivalent outer bounds, weight, and spacing.
- Record the chosen stroke alignment in Icon Spec JSON and final handoff.

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
Stroke color:   #242529   (flat, 100% opacity)
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
Closed path            strokeWeight: 2, strokeAlign: INSIDE when supported for production,
                        otherwise CENTER with compensated bounds; strokeJoin: ROUND,
                        fills: []
Rectangle (outline)    strokeWeight: 2, strokeAlign: INSIDE when supported for production,
                        otherwise CENTER with compensated bounds; strokeJoin: ROUND,
                        cornerRadius: > 0, fills: []
Ellipse (outline)      strokeWeight: 2, strokeAlign: INSIDE when supported for production,
                        otherwise CENTER with compensated bounds; fills: []
Tiny filled dot         fills: #242529, strokes: [] — only with local fill exception reason
```

Never mix stroked and filled treatments on the same logical shape element in the default outline style.
A separate tiny indicator may use local fill only when stroke harms clarity, such as a 3px dot with a 2px stroke.
See constraints.md and visual-quality-gates.md for visual fill effect checks and the local fill exception.

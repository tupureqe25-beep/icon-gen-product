# Corner Radius Rules

## Status
✅ Defined — default radius and visual adjustment rules for rounded outline icons

---

## Purpose

This icon system should feel friendly, rounded, and consistent, but it should not force every shape to use the same radius when the visual result becomes cramped or overly soft.

The rule is:

> Start from 4px. Adjust only when the visual fit requires it.

---

## Default rule

For 24px master icons, the default corner radius is **4px**.

Use 4px as the starting value for:

- closed rectangles
- rounded rectangles
- open rectangles / trays
- cards, panels, screens, documents, bags, boxes
- container-like shapes inside the icon

Always write the actual numeric radius into Icon Spec JSON. Do not leave radius implicit.

```jsonc
{
  "type": "rect",
  "x": 4,
  "y": 5,
  "w": 16,
  "h": 14,
  "r": 4
}
```

---

## Visual adjustment range

Use the table below when 4px does not fit the actual geometry:

| Shape situation | Recommended radius | When to use |
|---|---:|---|
| Large container, card, panel, tray | 4px | Default for most 24px rounded rectangular forms |
| Medium shape or slightly narrow container | 3px | Use when 4px makes the shape too soft or crowded |
| Narrow or small sub-shape | 2px | Use when the shape is small but still needs rounded corners |
| Tiny detail under 8px | 1px | Use only when 2px would visually collapse the shape |
| Circle / ellipse | N/A | Use ellipse geometry, not corner radius |
| Lines, arrows, open paths | N/A | Use round cap and round join |

Do not use `0px` sharp corners in the default rounded outline style.

---

## Adjustment triggers

Adjust down from 4px only when one of these is true:

- 4px causes the interior counter space to collapse.
- 4px makes the icon look blobby or visually filled.
- 4px makes two adjacent corners merge or feel muddy at 24px.
- The shape is narrower than 12px on one axis.
- The shape is a secondary detail rather than the primary motif.

If none of these apply, keep 4px.

---

## Open shape rule

For `rect` with `open: true`, the same default applies:

```jsonc
{
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

Open-edge terminals rely on `strokeCap: ROUND`; the `r` value controls the retained corners.

Use `r: 3` or `r: 2` only when the tray is shallow, narrow, or visually crowded.

---

## Figma execution rule

When drawing `rect` or `open rect` shapes:

1. Resolve the radius before calling Figma.
2. Apply the resolved numeric value explicitly.
3. Never fall back to `0` when `shape.r` is omitted.

Runtime default:

```js
function resolveCornerRadius(shape) {
  if (typeof shape.r === 'number') return shape.r;
  if (shape.type === 'rect') return 4;
  return 0;
}
```

If the resolved radius produces a poor visual result, return to Phase 4A and revise the Icon Spec JSON instead of silently changing the Figma node.

---

## Validation

A radius passes validation when:

- closed rectangular shapes use a numeric radius greater than 0
- the default is 4px unless a visual-fit reason is documented
- small-radius exceptions are intentional and recorded in the draw report
- no default outline icon uses sharp 0px rectangular corners

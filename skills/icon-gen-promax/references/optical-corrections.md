# Optical Corrections

## Status
✅ Defined — session 2 (standard empirical rules)

---

## Principle

Mathematical center ≠ visual center. The eye reads certain shapes as sitting
lower, heavier, or smaller than their bounding box suggests. Optical corrections
compensate so icons *feel* centered and balanced, even when they aren't
mathematically so.

Optical centering is **always on** for this platform. Apply these rules to every icon.

---

## Rule 1 — Vertical shift by shape type

Shift the entire icon composition (all paths as a group) relative to the frame center:

```
Shape type / composition          Vertical adjustment
──────────────────────────────────────────────────────
Circle / ellipse dominant         shift UP  0.5px
Triangle / chevron / arrow up     shift UP  1.0px
Arrow down / chevron down         shift DOWN 0.5px
Wide horizontal shape (aspect > 2:1)  shift UP 0.5px
Tall vertical shape (aspect < 1:2)    no shift needed
Square / near-square composition  no shift (already stable)
Mixed / complex composition       shift UP 0.5px (default nudge)
```

Apply the shift to the group, not individual paths.
Round to nearest 0.5px — do not use sub-0.5px values.

---

## Rule 2 — Perceived weight compensation

Heavy visual mass at the bottom makes an icon look like it's sinking.
Compensate by:

- If the bottom half of the composition has more filled/stroked area than the top:
  shift the whole group UP 0.5px (in addition to Rule 1 if applicable, max total 1.5px).
- If top and bottom are balanced: no adjustment.

---

## Rule 3 — Small shape inflation

Shapes that are geometrically identical but visually appear smaller due to their
form (circles vs squares of the same bounding box):

```
Circle vs square of equal bounding box:
  Circle appears ~12% smaller.
  Compensate: make the circle's bounding box 1–2px larger than the equivalent square.

Diamond / rotated square:
  Appears smaller and lighter.
  Compensate: scale up 1–2px beyond the square equivalent.
```

---

## Rule 4 — Stroke optical correction

At 2px stroke weight on a 24px canvas:

- Very small closed shapes (bounding box < 6px): the stroke visually fills the shape.
  Prefer open paths or reduce the shape size to avoid a blob.
- Corner radius on stroked paths: visually the inside corner radius is reduced by
  ~half the stroke weight. If the intended visual radius is 3px, set it to 4px in Figma.

---

## Rule 5 — Centering check (mental test)

Before finalizing, run this check:

1. Cover the frame border — does the icon look centered in empty space?
2. Would a non-designer immediately agree it looks balanced?
3. Does any element feel like it's "falling" toward an edge?

If any answer is no → apply Rule 1 or 2 adjustments and check again.

---

## Grid snapping

```
grid snapping:    OFF
pixel rounding:   round coordinates to nearest 0.5px
                  (not full pixel — 0.5px precision preserves optical adjustments)
```

Do not snap to pixel grid. The 2px stroke at center alignment and the optical
shift values require sub-pixel positioning to render cleanly.


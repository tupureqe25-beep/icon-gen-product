# Style Guide — Outline (Platform Style)

## Status
✅ Defined — session 1 (initial); updated session 4 (revised from reference icon set); updated session 5 (local fill exception)

---

## Style in one sentence

Confident geometric outlines — one dominant shape, minimal inner structure,
no decoration, every stroke is load-bearing.

---

## What this style looks like

Observed from the platform reference set (攻略, 官网, 男, 礼物, 上传, 下载):

```
Visual character:
  - Outline-first. No fills by default. Local fill is allowed only for tiny details
    when a 2px stroke would visually stick, deform, or collapse.
  - Shapes are substantial — they occupy the keyline space confidently,
    not delicately. A circle at 18–20px, not 12px.
  - Openings are intentional technique, not accidents. An open-top tray
    reads immediately as a receiver/emitter. The opening is part of the concept.
  - Crossing lines pass through container boundaries cleanly.
    The globe's longitude arcs cross the outer circle without closing.
  - Attachments (stems, tails) are proportional — about 1/3 the container size.
    They exit at clean angles (45°, 90°). Never freehand.
  - Arrowheads are open (two angled lines), never filled triangles.
  - Symmetry is the strong default. Asymmetry only when it IS the concept
    (e.g. the male symbol's curl, a directional arrow).
```

---

## Construction principles

### Start with the minimum
Ask: what is the fewest number of strokes a viewer would immediately read
as this concept? Start there. Add one path only if recognition would fail without it.

The upload icon is a U-shape + one arrow. Not a U-shape + arrow + decorative rim.
The globe is a circle + 2 arcs + 1 line. Not 3 latitude rings and 4 meridians.

### Openings carry meaning
A rect with one edge removed is a fundamentally different icon than a closed rect.
Use open shapes deliberately:
- Open top = tray, receiver, inbox, import
- Open bottom = drop, spill, export downward
- Open side = door, entry, slide

### Lines cross boundaries
Interior lines (longitude arcs, lid seams, ribbon stems) can and should
cross the container boundary when the concept requires it. The frame clips them.
Do not truncate a line just because it reaches the container edge.

### Attachments exit, not float
A stem or tail that represents directionality exits from the container's edge.
It should visually connect to the container at a natural point —
not float separately near it.

### Top-right corner indicators stay detached
When a small mark is placed at the top-right of a main container — such as
an external-link arrow, corner badge, jump mark, or status indicator — keep a
visible **2px gap** from the main container.

Do not glue the mark to the top-right corner unless the concept explicitly
requires a connected construction. This prevents the top-right area from
becoming visually sticky at 24px.

---

## What to draw

```
✔ Rounded containers     rect, square, circle as the primary shape
✔ Open shapes            tray/U-shape, C-shape, arc — when concept requires it
✔ Crossing lines         arcs, dividers that pass through container boundary
✔ Open arrow tips        two angled lines forming a V at the tip — never filled
✔ Clean attachments      stems at 45° or 90°, proportional length
✔ Detached top-right marks visible 2px gap for external-link/badge/corner marks
✔ Symmetric layouts      centered, balanced — default unless asymmetry is the concept
```

## What to avoid

```
✗ Filled arrowheads        use open V-tip lines instead
✗ Decorative detail        if a path doesn't change the meaning, remove it
✗ Small containers         main shape should use 80–90% of keyline max
✗ Thin ornamental lines    every line must carry semantic weight
✗ Multiple concentric rings only one container outline — no double-borders
✗ Gradients / shadows      flat color only, always
✗ Sharp 0-radius corners   all closed paths have radius > 0
✗ Filled silhouettes       no interior fills for main shapes — outline-first
✗ Glued top-right marks     external-link/badge/corner marks need a visible 2px gap
△ Local tiny fill          allowed only for clarity exceptions, e.g. 3px dot
```

---

## Local fill exception

Default behavior remains outline-first and stroke-only.

Use local fill only when a tiny element cannot remain readable as a stroked outline at 24px.
This is a visual correction, not a style switch.

Allowed cases:
- 3px status dot / notification dot / small badge point where a 2px stroke would collapse the counter
- tiny circular detail that becomes sticky, deformed, or visually glued to nearby strokes
- small indicator whose semantic role is clearer as a filled point than as a broken outline

Example:
- A 3px circle with a 2px stroke creates an almost solid blob with poor geometry.
  In this case, use a 3px filled circle instead.

Not allowed:
- filled arrowheads
- filled main containers
- filled silhouettes
- large filled badges
- decorative filled marks that do not improve readability

If local fill is used, keep it small, isolated, and report the reason in final feedback.

## Corner radius

Default corner radius is **4px** for the 24px logical model, scaled to **8px** for the default 48px Baijiahao PC team master unless visual fit or mature-library precedent requires adjustment.

```
Large container / card / tray:   4px default
Medium or narrow shape:          3px when 4px feels too soft or crowded
Small sub-shape:                 2px
Tiny detail (< 8px):             1px only when necessary
Circle / Ellipse:                n/a
Open path terminals:             strokeCap: round (no radius needed)
```

Use 4px as the starting point, then adjust only for visual fit.
Never use 0px sharp rectangular corners in the default rounded outline style.
See `corner-radius-rules.md` for the full adjustment rules.

---

## Visual weight calibration

At 24×24px with 2px stroke, the icon should feel:
- Present and readable at a glance — not fragile or thin
- Balanced — no single element dominates unexpectedly
- At home next to other icons of the same set — consistent weight

If an icon looks lighter than others in the set → the container is probably
too small, or there are too few paths for the composition to feel anchored.
Increase the container size toward the keyline ceiling.

If an icon looks heavier → the container is too close to frame edges,
or too many detail paths are competing. Reduce or remove one element.

---

## Recognizability test

Cover the label. Show the icon at 24×24px.
Would a Chinese mobile app user identify this immediately?

- If yes → proceed
- If uncertain → consult Library A (iconfont.cn) for the conventional metaphor
- If the concept genuinely has no simple geometric proxy → flag to user,
  propose an alternative metaphor, do not proceed without confirmation

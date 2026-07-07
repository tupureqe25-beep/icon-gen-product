# Icon Set Rules

## Status
✅ Defined — balanced set consistency gates

---

## Purpose

Use this file when generating multiple icons as a set.

Also load `set-consistency-profile.md` for the mechanical baseline.

The goal is not pixel-identical icons. The goal is that the set feels designed by
the same system.

---

## Set consistency principle

```
Hard consistency: canvas, stroke, color, caps/joins, naming, native-node output
Soft consistency: visual density, abstraction level, motif scale, detail amount
Free judgment: metaphor choice, composition direction, local proportions
```

Do not force identical bounding boxes or identical path counts. That can make
icons worse. Instead, balance perceived weight and readability.

---

## Hard consistency — must match across the set

- Same canvas size unless user explicitly requests mixed sizes.
- Same stroke weight for the same target size.
- Same stroke cap and join.
- Same color: #0F1218.
- Same default outline behavior: outline-first; local tiny fill only when justified by the fill exception rule.
- Same naming convention: `AijBasic{SemanticName}`.
- Same native-node production method — no SVG paste.

---

## Soft consistency — revise if it feels off

Check these side by side:

- Visual density: no icon should feel much darker/heavier than the rest.
- Motif scale: main motifs should occupy comparable perceived area.
- Detail level: avoid mixing very simple 1-part icons with very detailed 5-part icons unless context requires it.
- Abstraction level: don't mix literal illustration with abstract symbols in the same set.
- Corner language: rounded forms should feel equally soft.
- Negative space: icons should have comparable airiness.

If one icon feels too heavy, do not reduce stroke weight. Instead:
1. open up negative space
2. simplify internal detail
3. enlarge the main counter
4. use a more open metaphor

---

## No requirement for

- Identical bounding box usage
- Identical path counts
- Exact pixel alignment between unrelated metaphors
- Same silhouette shape
- Same composition direction

---

## Set workflow

1. List all icon names first.
2. Load `set-consistency-profile.md` and create a shared set profile.
3. Resolve metaphors together before drawing.
4. Generate all Icon Spec JSON entries first.
5. Review density, motif scale, and metaphor consistency as a set.
6. Draw the set.
7. Validate individually and side by side with screenshot.
8. Revise any icon that breaks the visual family by updating its Icon Spec JSON, then redraw.

---

## Set report format

```
✅ Set: {n} icons
✅ Shared style: 24px, 2px stroke, round cap/join, #0F1218
✅ Set profile: {density}, bbox {range}, primitive count {range}
✅ Naming: AijBasic{SemanticName}
🔁 Revised for set consistency: {icon names, if any}
⚠️ Notes: {any deliberate deviations}
```

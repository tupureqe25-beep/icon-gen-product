# Constraints

## Status
✅ Defined — session 3 (platform keyline & construction spec); updated session 5 (local fill exception)

---

## How to use this file

Load during **Phase 4A, before finalizing the spec.**
These are hard rules — not design preferences. Any violation requires
spec revision before proceeding to Phase 4B. Do not draw a non-compliant spec.

Run this checklist mentally for every spec produced:

```
CONSTRAINT CHECK
  [ ] C1   path count ≤ 5
  [ ] C2   stroke uniformity
  [ ] C3   fill policy
  [ ] C4   color — flat #242529 for normal monochrome glyphs; approved team status fills allowed for canonical state icons
  [ ] C5   corners — no 0-radius on closed shapes
  [ ] C6   keyline boundaries by shape type
  [ ] C7   angles are multiples of 15°
  [ ] C8   gaps are even numbers ≥ 2px
  [ ] C9   anchor coordinates are integers
  [ ] C10  recognizability
  [ ] C11  one concept per icon
  [ ] C12  top-right marks keep visible 2px gap
  [ ] C13  production profile matches Baijiahao official PDF / mature library
  [ ] C14  intentional overlap and endpoint hygiene
```

---

## C1 — Path Count

```
Maximum:     5 paths per icon
Recommended: 2–4 paths
```

If the spec requires more than 5 paths:
→ Simplify. Remove decorative elements first.
→ Simplify adjacent shapes or use a clearer shared contour where possible.
→ Avoid boolean/flatten tricks unless they preserve stroke appearance.
→ If the concept still cannot reduce to ≤5 paths, ask the user
  for a simpler metaphor. Do not draw a 6+ path spec.

Why: at 24px, more than 5 stroked paths create visual noise and
make the icon illegible at small sizes.

---

## C2 — Stroke Uniformity

```
weight:     2px logical / 4px 48px PC master — see stroke-rules.md
position:   logical center for preview; official 48px production prefers inner stroke where supported
cap:        round
join:       round
color:      #242529
opacity:    100%
```

No path may deviate from the chosen output profile. No mixing weights, no arbitrary inner/center/outer stroke position, no opacity variation.

- If detail seems to need a thinner line → remove the detail instead.
- If emphasis seems to need a heavier line → simplify the motif, enlarge the key element, or use a clearer open-stroke construction instead.
- Anchor and editable node coordinates must be **integers**.
  (Optical group shift of 0.5px is allowed on the group transform — not on individual anchors.)

---

## C3 — Fill Policy and Visual Fill Effect

```
Default style:        outline-first / stroke-only by default
Actual fills:         not allowed by default; local tiny fill allowed only for clarity exceptions
Visual fill effect:   must be avoided
```

This style has no filled areas in the default outline variant for main shapes.
Every element should be built as an outline stroke path unless a tiny detail would become unreadable with a 2px stroke.

A technically no-fill icon can still fail if it visually reads as filled because
2px strokes are too dense for the available negative space.

Avoid:
- tiny closed shapes whose inner counter collapses
- overlapping strokes that form dark blobs
- arrowheads that read as filled triangles
- small details packed into the same 4–6px area
- nested shapes with gaps under 2px

If the icon appears visually filled:
→ enlarge the key motif
→ increase inner negative space
→ remove secondary detail
→ choose a more open metaphor
→ redraw from the revised spec

Local fill exception:
→ allowed only for tiny clarity details, such as a 3px status dot where a 2px stroke would visually stick, deform, or collapse
→ keep the fill small and isolated
→ never use fill for arrowheads, main containers, silhouettes, or decorative large areas
→ record the reason in the spec and final feedback

---

## C4 — Color

```
Only permitted:   #242529 for normal monochrome glyphs

Approved canonical status fills:
- success: #00BA73
- failure: #F54242
- warning: #FAAD14
- mark on status fill: #FFFFFF
Gradients:        NEVER — hard block
Shadows / glows:  NEVER — hard block
Opacity < 100%:   NEVER — all elements fully opaque
```

If a concept seems to require multiple colors to be understood →
reduce to its geometric metaphor using outline only.

---

## C5 — Corner Policy

```
Default rect/openRect radius: 4px at 24px logical size / 8px at 48px team master after scaling
Allowed visual-fit range:     4px / 3px / 2px / 1px
Minimum radius:               1px for tiny details under 8px
Sharp 0-radius corners:       NEVER on rectangular icon paths
```

Start from 4px. Reduce to 3px, 2px, or 1px only when 4px makes the shape too crowded, too soft, or visually filled.
Line intersections (cross, plus icons) are exempt — the round join handles terminals.
Always write the resolved numeric radius into Icon Spec JSON.

---

## C6 — Keyline Boundaries by Shape Type

Platform base grid is 48×48px. At 24×24px (2× scale), all keyline
dimensions are halved. The values below are the hard ceilings at 24px:

```
Shape type      Max bounding box at 24px    Notes
──────────────────────────────────────────────────────────────────
Square          18 × 18 px                  fills the square keyline
Rectangle       20 × 16 px                  width × height; wider than tall
Circle          20 × 20 px                  largest container — full live width
Triangle        20 × 17 px                  base × height; aligns to keyline diagonals

Live area:      20 × 20 px                  hard outer limit for all shapes
Stroke bleed:   center 2px = 1px outward    place path edges ≥ 1px inside live area
                                             → effective path ceiling = 19 × 19 px
```

Shapes may be smaller than these ceilings — these are maximums, not targets.
All shapes must be centered within the live area (apply optical-corrections.md).

---

## C7 — Angle Constraint

```
All diagonal / non-axis-aligned paths:
  angle must be a multiple of 15°

Permitted:   0°, 15°, 30°, 45°, 60°, 75°, 90° (and mirrors 105°–180°)
Must align:  parallel to keyline diagonals (45°) or keyline cross-lines (90°)
```

Common examples:
- Trend / arrow up-right → 45°
- Hexagon segment / clock hands → 30° or 60°
- Right-angle detail → 90°

If a path falls between multiples of 15° → round to the nearest permitted angle.

---

## C8 — Gaps and Spacing

Internal spacing between icon elements must use **even numbers**.
Use multiples of 2px as the reference system.

```
Minimum gap:       2px   (hard floor — never 1px at this stroke weight)
Preferred values:  2px, 4px, 6px, 8px, 10px
Large / sparse:    8px or more for intentionally open compositions
```

- Left-right internal spacing must be **symmetric** — equal on both sides.
- Compound shapes must maintain consistent spacing throughout each zone.
  (e.g. trash icon: lid gap and body gap may differ, but left = right within each zone.)
- Odd-number gaps (1px, 3px, 5px) are not permitted.

---

## C9 — Anchor Coordinates

```
All anchor points and editable node coordinates:   integers only
Sub-pixel anchors (e.g. x: 3.5):                  NOT permitted

Exception: group-level optical shift (0.5px on the group transform) is allowed.
           Individual path anchors must remain whole numbers.
```

Integer anchors prevent anti-aliasing artifacts on stroke terminals
and ensure consistent rendering across display densities.

---

## C10 — Recognizability

```
Test:   Would a first-time user identify this icon without a label at 24×24px?
Pass:   Yes, immediately and unambiguously
Fail:   Requires context, label, or explanation
```

On fail:
→ Consult Library A (iconfont.cn) to find the established metaphor.
→ Simplify — remove secondary detail until the core shape is unmistakable.
→ If still unclear after simplification, flag to the user before drawing.
   Do not draw an icon that fails this test without explicit user confirmation.

---

## C11 — Concept Scope

```
One semantic concept per icon frame.
```

Compound icon (icon + small badge / indicator) is allowed only if
the secondary element passes the C3 visual fill effect rule.

Two independent concepts in one frame → split into two separate icons.
If the user requests a compound concept, clarify before proceeding:
  > "That sounds like two icons — should I draw them as a set, or pick one?"

---

## Violation handling

```
Hard violations → fix in spec before drawing, no exceptions:
  C2  stroke mismatch
  C4  color / gradient / shadow
  C7  non-15° angle
  C9  sub-pixel anchors

Boundary violations → scale shape down, recheck optical centering:
  C6  shape exceeds keyline max

Soft violations → note in spec comment, proceed with care:
  C1  path count exactly at 5
  C8  gap slightly irregular but symmetric

Ambiguous → flag to user, consult Library A, await confirmation:
  C10 recognizability uncertain
  C11 concept scope unclear
```

---

## C12 — Top-right Mark Gap

Any small element placed at the top-right of a main container must keep a visible **2px gap** from the container edge unless the user explicitly requests a connected construction.

Applies to:
- external-link arrows
- corner badges
- jump/open-in-new marks
- status dots or small indicators

Do:
```
main container + detached top-right mark with 2px gap
```

Do not:
```
main container + mark glued to the top-right corner
```

Why: at 24px, a glued top-right mark collapses into the container corner and makes the icon look sticky or visually filled.

---

## C13 — Baijiahao Official Production Profile

For Baijiahao PC production output:

```
Default container: 48 × 48px
Default stroke:    4px
Official stroke:   inner stroke for closed PC icon construction when supported
Logical model:     24 × 24px / 2px stroke only as reasoning, preview, or explicit compact output
```

Hard fail when:
- a 48px deliverable uses unscaled 24px geometry
- a 48px deliverable uses 2px strokes
- a normal PC component is handed off as 24px production without user request
- inner-stroke official behavior is ignored without compensated bounds and screenshot validation
- mature-library exact matches are regenerated as competing metaphors

If the implementation uses center stroke because the Figma native operation requires it, compensate bounds before drawing and confirm in screenshot review that the visible size matches the official/mature-library result.

---

## C14 — Intentional Overlap and Endpoint Hygiene

Overlaps are allowed only when they are visibly intentional constructions, such
as a pen crossing a document, a status mark attached by design, or a shared
stroke joint that reads cleanly at 24px.

Reject accidental construction failures:

- stroke endpoints collide without alignment
- open-stroke terminals are swallowed by another stroke
- badge, spark, plus, arrow, or pen details glue to the main shape unintentionally
- two independent objects sit flush against each other with no breathing room
- side attachments look pasted on rather than nested, connected, or clearly separated
- two round caps overlap and create a local black knot
- an intersection cannot be read as either connected or separated
- a secondary mark touches the main object with less than a 2px visible gap unless the connection is explicit

Rules:

- If elements are meant to be separate, keep a visible 2px minimum gap and a readable silhouette break.
- If elements are meant to connect, align endpoints on the same integer coordinate or create a single intentional shared joint.
- If elements are meant to be nested or attached, make the hierarchy clear: the child element must sit inside, overlap with purpose, or connect through an obvious shared edge; do not place it flush beside the parent as a pasted-on extra object.
- Do not use overlap to hide awkward endpoints.
- Do not let a secondary AI/spark/status mark deform the silhouette of the main object.
- Do not combine two object metaphors at equal visual weight if they compete for the same 24px live area.
- When in doubt, detach the secondary mark or remove it before adding more detail.

Any C14 failure is a hard blocker before drawing. Revise the spec or return to
the preview phase; do not patch random nodes after Figma output.

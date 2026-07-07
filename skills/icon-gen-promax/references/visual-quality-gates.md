# Visual Quality Gates

## Status
✅ Defined — production quality layer

---

## Purpose

These gates prevent a technically valid outline icon from becoming visually poor.
They are not extra style constraints. They are revision triggers.

Use this file after drafting the spec, after drawing, and during screenshot review.

---

## Rule hierarchy

```
Hard constraints       = must not break the icon system
Visual quality gates   = if failed, revise the spec or redraw
Design discretion      = agent may decide based on context and set fit
```

Do not turn every visual preference into a hard blocker. Production quality comes
from stable constraints plus intelligent revision.

---

## V1 — Visual fill effect

Default style is stroke-only outline.

Avoid both:
- unjustified actual fills
- shapes that visually read as filled because of excessive stroke density

A no-fill icon can still look filled when:
- a closed shape is too small for a 2px stroke
- inner negative space is under 2px
- strokes overlap or nearly touch
- too many details sit inside a small area
- a small enclosed counter collapses at 24px

If the icon appears visually filled, fix it by:
1. increasing the inner counter space
2. enlarging the key motif
3. simplifying the shape
4. removing overlapping internal strokes
5. switching to a more open metaphor

Local fill exception:
- If the problem is a tiny detail whose 2px stroke collapses its counter, local fill may be clearer.
- Example: a 3px status dot should use a 3px fill rather than a 2px stroked circle.
- Do not use fill to repair dense main shapes, filled silhouettes, or filled arrowheads.

---

## V2 — Negative space

At 24px, the main enclosed negative space should remain readable.

Guideline:
- internal gaps should usually be at least 2px
- tiny closed counters under 4×4px should be avoided
- small circles under 6×6px often collapse visually with a 2px stroke

If negative space collapses, simplify or enlarge the motif.

---

## V3 — Density consistency

When generating an icon set, all icons should feel equally heavy.

Check:
- similar amount of stroked area
- similar live-area occupation
- similar detail level
- similar number of visual parts

A 2-path icon and a 5-path icon can coexist only if their visual density feels balanced.

---

## V4 — Small-size readability

The icon must remain readable at its intended size.

At 24px:
- the concept should be readable without a label
- secondary details must not compete with the main motif
- details that require zooming should be removed

At 16px or 20px:
- small-size pixel hinting is not yet supported by this skill
- warn that output is draft-only, not production-safe
- do not simply scale down the 24px structure and claim it is ready to ship
- prefer creating a 24px production master instead

---

## V5 — Optical balance

The icon should look centered without relying on the visible frame.

Revise if:
- it feels bottom-heavy
- it leans to one side unintentionally
- an arrow or diagonal makes the icon feel off-center
- the main motif appears too high or too low

Apply optical correction as a group shift, not by randomly moving individual anchors.

---

## V6 — Metaphor clarity

Revise if the selected metaphor could be confused with another common icon.

Common confusion pairs:
- filter vs sort
- save vs download
- close vs back
- hide vs delete
- subscription vs favorite
- creator vs user
- guide vs help

Resolve confusion by changing the metaphor, not by adding decorative detail.

---

## V7 — Approved preview fidelity

After Figma drawing, the screenshot must be compared with the approved SVG preview.

Revise if the Figma output silently diverges from the preview in:

- metaphor or meaning
- radius or corner treatment
- proportions or live-area occupation
- curve smoothness, such as arc → visibly angular polyline
- gap size, especially top-right detached marks
- detail count or density
- local fill presence/absence

Allowed differences:

- purely technical layer structure, if the appearance is unchanged
- documented native-node fallback that remains visually equivalent
- user-approved difference after seeing the mismatch report

If a difference is found, name the difference and branch:

```txt
wrong metaphor                 → Phase 2
preview needs style change     → Phase 3
spec translation changed shape → Phase 4A
native drawing changed shape   → Phase 4B
```

Final report must include:

```md
Visual match to approved preview: yes / no + differences
```

---

## Revision protocol

If a visual quality gate fails:

```
1. Name the failed gate.
2. Revise the Icon Spec JSON.
3. Redraw from the revised spec.
4. Screenshot the revised version.
5. Confirm visual match to the approved SVG preview.
6. Keep only the passing version unless the user asks to compare versions.
```

Do not patch random nodes after drawing unless the user asks for a tiny positional tweak.

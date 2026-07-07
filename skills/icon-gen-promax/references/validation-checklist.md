# Validation Checklist

## Status
✅ Defined — production validation with balanced enforcement

---

## Purpose

Run this checklist before handoff.

Validation has three levels:

```
BLOCKER  = cannot hand off; revise or redraw first
REVISE   = visually weak; revise unless user explicitly accepts it
NOTE     = acceptable, but report the condition
```

Use hard blockers for system consistency only. Use revise gates for visual quality.
This keeps generation reliable without making the icon mechanically rigid.

---

## BLOCKERS — must fix before handoff

```
STRUCTURE
[ ] Frame is 24×24px, or a user-confirmed override size
[ ] If size <= 20px, output is marked draft-only or redirected to a 24px production master
[ ] Frame bevel = 4px corner radius
[ ] clip content = true on frame
[ ] All paths stay inside the 2px safe zone unless user approved an override
[ ] Native Figma nodes only — no pasted SVG, bitmap, or embedded foreign vector
[ ] Deliverable is a Figma component when possible, or a named frame fallback
[ ] Final component/frame naming follows AijBasic{SemanticName}
[ ] Default structure preserves grouped native nodes; no default flatten/merge-to-single-vector

STROKE / STYLE
[ ] All strokes use the approved weight for the icon size
[ ] Stroke position = center
[ ] Stroke cap = round
[ ] Stroke join = round
[ ] Stroke color = #0F1218
[ ] No gradients, shadows, blur, opacity variation, or effects
[ ] No actual fills on main icon shapes; local tiny fill appears only when justified by the fill exception rule
[ ] No filled arrowheads or filled silhouettes in the default outline style

GEOMETRY
[ ] Path count is ≤ 5 unless user explicitly approved a more complex special icon
[ ] Rect/openRect shapes use explicit numeric radius: 4px default, or 3/2/1px with visual-fit reason; no sharp 0-radius corners
[ ] No unnamed trash layers remain in the deliverable
[ ] No construction-only layers remain visible unless documented
```

---

## REVISE GATES — fix by revising the spec/redraw

Load `visual-quality-gates.md` for details.

```
[ ] Icon does not create a visual fill effect from overly dense strokes
[ ] Main negative space remains readable at target size
[ ] Icon is visually centered after optical correction
[ ] Concept is recognizable without a label
[ ] Metaphor is not easily confused with a neighboring concept
[ ] For icon sets: visual density, scale, stroke feel, and detail level match the set consistency profile
[ ] Open shapes use the normalized `gap.edge` + `gap.width` schema and centered gap coordinates
[ ] Top-right external-link/badge/corner marks keep a visible 2px gap from the main container
[ ] Screenshot visually matches the approved SVG preview, or differences are resolved before handoff
[ ] Screenshot confirms the intended metaphor, not only technical drawing success
```

If any revise gate fails, revise the Icon Spec JSON and redraw from spec.
Do not add actual fill to solve general visual density. Local tiny fill is allowed only when stroke treatment itself harms clarity, such as a 3px dot with a 2px stroke.

Re-spec trigger:

```txt
if fallbackCount >= 2       → return to Phase 4A and simplify geometry
if warningCount >= 3        → return to Phase 4A and reduce density / increase negative space
if blockerCount > 0         → stop and fix before handoff
if screenshotMismatch = true → branch to Phase 2 / 3 / 4A / 4B by failure type before handoff
```

---

---

## Screenshot decision branch

Screenshot review must answer two questions:

```txt
1. Does the icon look like the approved SVG preview?
2. Does the icon communicate the confirmed semantic direction?
```

If no, do not hand off. Branch as follows:

```txt
wrong metaphor / concept        → Phase 2 Semantic Plan
approved preview needs change   → Phase 3 SVG Preview
spec caused geometry divergence → Phase 4A Spec
Figma fallback caused mismatch  → Phase 4B Draw
minor centering or spacing      → revise spec / optical correction, redraw, screenshot again
```

Use this report line after the screenshot gate:

```md
- Visual match to approved preview: {yes | no — differences + action taken}
```

---

## NOTES — acceptable but report briefly

```
[ ] Slight optical shift applied, e.g. +0.5px / -1px
[ ] User requested non-standard size
[ ] User requested 16px/20px output and accepted draft-only warning
[ ] User requested a stylistic override
[ ] External reference was used only for metaphor inspiration
[ ] Existing platform icon influenced proportion or weight matching
[ ] Frame fallback used because component creation was unavailable
[ ] Flatten requested by user and passed before/after validation
[ ] Canonical registry unavailable; cross-session consistency is not guaranteed
```

---

## Reporting

After drawing, output a brief report:

```
✅ frame: 24×24, bevel 4px, clip true
✅ strokes: 2px center round, #0F1218
✅ paths: {n} native layers, all named
✅ validation: no blockers
✅ visual match to approved preview: {yes | no — differences + action taken}
🔁 revised: {visual quality fixes, if any}
⚠️ notes: {non-blocking notes, if any}
🔁 re-spec: {yes/no, reason if triggered}
```

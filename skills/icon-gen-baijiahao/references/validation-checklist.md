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
[ ] Output profile is explicit: `logical-24` or `team-master-48`
[ ] Frame is 24×24px for `logical-24`, or 48×48px for `team-master-48`
[ ] Default Baijiahao PC production uses `team-master-48`; `logical-24` is used only for explicit compact/export output
[ ] If size <= 20px, output is marked draft-only or redirected to a 48px Baijiahao PC production master
[ ] Top-level component/frame has no visible background, border, shadow, or decorative bevel
[ ] clip content = true on frame
[ ] All paths stay inside the 2px logical safe zone / 4px team-master safe zone unless user approved an override
[ ] Native Figma nodes only — no pasted SVG, bitmap, or embedded foreign vector
[ ] Deliverable is a Figma component when possible, or a named frame fallback
[ ] Final component/frame naming follows BjhBasic{SemanticName}
[ ] Default structure preserves grouped native nodes; no default flatten/merge-to-single-vector
[ ] Hidden `.基准线` / `图标/ 规则-24` reference layers are not included as visible glyph layers

STROKE / STYLE
[ ] All strokes use the approved weight for the icon size
[ ] Stroke position follows the output profile: official inner stroke where supported for 48px closed shapes; center stroke only with compensated bounds and screenshot-equivalent result
[ ] Stroke cap = round
[ ] Stroke join = round
[ ] Stroke color = #242529 for normal monochrome glyphs
[ ] Canonical status icons may use approved team status fills: success `#00BA73`, failure `#F54242`, warning `#FAAD14`, with white marks
[ ] No gradients, shadows, blur, opacity variation, or effects
[ ] No arbitrary actual fills on main icon shapes; local/team-canonical fills appear only when justified by the fill exception rule or mature-library precedent
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
- 与预览一致性：{一致 | 不一致 — 差异 + 已采取动作}
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
✅ 画布规格：{24×24 逻辑输出 | 48×48 团队母版}，clip content = true
✅ 描边：{2px 逻辑 | 4px 团队母版}，{支持时内描边 | 补偿后的居中描边}，圆头/圆角，#242529
✅ 节点：{n} 个 Figma 原生图层，均已命名
✅ 校验：无阻塞问题
✅ 与预览一致性：{一致 | 不一致 — 差异 + 已采取动作}
🔁 已修正：{视觉质量修正，如有}
⚠️ 备注：{非阻塞说明，如有}
🔁 是否重新出 spec：{是/否，触发原因}
```

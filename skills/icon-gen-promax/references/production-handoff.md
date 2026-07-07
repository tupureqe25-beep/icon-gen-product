# Production Handoff

## Status
✅ Defined — component/frame handoff contract

---

## Purpose

Use this file before final handoff. It defines what counts as a production-ready Figma icon output.

Current production-safe target: **24×24px master icons only**. If the user requested 16px or 20px output, apply `small-size-production-rule.md` and mark the result as draft-only unless the user chose a 24px master instead.

The goal is not just to draw something that looks right. The output should be editable, inspectable, repeatable, and easy to add to a real icon library.

---

## Default deliverable

Preferred structure:

```
AijBasic{Name}                 // Figma component, 24×24
└── AijBasic{Name}__glyph      // group of native nodes
    ├── lens                   // named shape layer
    ├── handle                 // named shape layer
    └── ...
```

Fallback structure if component creation is unavailable:

```
AijBasic{Name}                 // 24×24 frame
└── AijBasic{Name}__glyph      // group of native nodes
    ├── ...
```

Report when frame fallback is used.

---

## Handoff requirements

```
[ ] Top-level name follows AijBasic{SemanticName}
[ ] Top-level size is 24×24 for production-safe output
[ ] If size <= 20px, the output is explicitly marked draft-only and not production-safe
[ ] Clip content is true
[ ] Top-level container has no visible background or border
[ ] Icon shape nodes are native Figma nodes, not pasted SVG or bitmap
[ ] All shape nodes have descriptive names
[ ] Glyph group is named {meta.name}__glyph
[ ] No hidden trash layers remain
[ ] No construction-only layers remain visible unless documented
[ ] Validation report is returned after drawing
[ ] Screenshot decision gate passed before handoff
[ ] Visual match to the approved SVG preview is reported
[ ] Canonical registry status is reported when production consistency matters
[ ] Any non-editable or less-editable fallback is explained with reason
[ ] Any local tiny fill is explained with reason
```

---

## Flatten policy

Do not flatten by default.

Grouped native nodes are the production default because they are:

- easier to inspect
- easier to revise
- less likely to change stroke appearance
- more repeatable across generation sessions

Flatten only when the user explicitly asks for single-vector output or export preparation.

Before flattening:

1. Screenshot the grouped version.
2. Duplicate or preserve an editable grouped version unless the user approves destructive flattening.
3. Flatten the copy.
4. Screenshot again.
5. Compare appearance.
6. If anything changes, keep the grouped version and report the failure.

---

## Generation notes

If anything non-obvious happened, add a short note in the report. For larger batches, optionally create a visible `⚠️ Generation Notes` frame near the output.

Always note:

- visual match to approved SVG preview: yes / no + differences
- screenshot gate failure and branch taken, if any
- canonical registry status: checked/reused/new entry emitted/unavailable
- frame fallback instead of component
- any geometry fallback, such as arc → polyline
- any part that could not remain fully editable and why
- any local tiny fill and why it was necessary
- any user-approved style override
- any external reference used for metaphor inspiration
- any set-consistency revision
- any flatten attempt and result

---

## Final report format

```md
✅ Generated `{meta.name}`
- Deliverable: {component | frame fallback}
- Size: {size}×{size}
- Production status: {24px production-safe | small-size draft only}
- Structure: grouped native nodes, not flattened
- Stroke: {stroke}px center, round cap/join, #0F1218
- Fill: {none | local tiny fill with reason}
- Corner radius: 4px default for rect/openRect; exceptions documented
- Validation: {no blockers | fixed blockers | stopped}
- Visual match to approved preview: {yes | no — differences + action taken}
- Canonical registry: {checked + reused | checked + new entry emitted | unavailable}
- Cross-session consistency: {covered by registry | not guaranteed without registry}
- Revisions: {none | list}
- Notes: {none | list}
```

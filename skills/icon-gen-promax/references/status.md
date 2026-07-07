# Design Rules Status

## Status
✅ Defined — implementation checklist for icon generation rules.

This file tracks whether design rules have a concrete implementation reference. It is metadata for maintenance, not a runtime phase.

```
[x] Stroke weight & style       2px center, round cap/join — stroke-rules.md
[x] Stroke scale by size        full table 12–48px — stroke-rules.md
[x] Canvas & padding            24×24px, 4px bevel, 2px padding — drawing-primitives.md
[x] Keyline system              base 48px grid, shape max dimensions — drawing-primitives.md
[x] Color                       #0F1218 flat, no gradients/shadows — stroke-rules.md
[x] Outline style rules         shape language, fill policy — style-guide-outline.md
[x] Corner radius on shapes     4px default + visual-fit adjustment — corner-radius-rules.md
[x] Optical centering           always on, empirical rules — optical-corrections.md
[x] Grid snapping               OFF, 0.5px group shift / integer anchors — optical-corrections.md
[x] Gaps and spacing            even numbers, min 2px, symmetric — drawing-primitives.md
[x] Angle constraint            multiples of 15° — drawing-primitives.md
[x] Anchor coordinates          integers only — stroke-rules.md
[x] Constraints (C1–C11)        pre-draw hard rules, inline + post-build — constraints.md
[x] Shape decomposition         shapes[] schema + 9 decomposition patterns — shape-decomposition.md
[x] Validation checklist        blocker / revise / note post-draw QA — validation-checklist.md
[x] Metaphor decision table      stable ambiguous concept handling — metaphor-decision-table.md
[x] Visual quality gates         prevent visual fill / density / readability failures — visual-quality-gates.md
[x] Icon set rules              set consistency gates without over-rigid matching — icon-set-rules.md
[x] Set consistency profile       mechanical density/scale baseline — set-consistency-profile.md
[x] Reference libraries           iconfont + Figma file — reference-libraries.md
[x] Figma node spec               spec-to-use_figma execution contract — figma-node-spec.md
[x] Production handoff            component/group/flatten policy — production-handoff.md
[x] Canonical spec registry        optional cross-session consistency protocol — canonical-spec-registry.md
[x] Examples                      worked walkthroughs — examples/
[x] Small-size production warning  16/20px marked draft-only — small-size-production-rule.md
[x] Open-shape coordinate schema  centered gap + line fallback — open-shape-schema.md
[x] Re-spec feedback loop        fallback/warning thresholds — figma-node-spec.md
[ ] Pixel-hinting at small sizes (future full production mode)
```

When a rule is taught in a design session:

1. Update the relevant reference file.
2. Check off the item above.
3. Note the date in the reference file's `## Status` section.

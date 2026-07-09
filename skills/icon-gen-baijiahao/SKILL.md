---
name: icon-gen-baijiahao
description: Use when the user asks to create, generate, adapt, preview, refine, or draw editable Baijiahao / 百家号 standard icon components or icon sets in Figma. This skill preserves the icon-gen-promax production chain while replacing the platform variables with Baijiahao business semantics, Baijiahao icon style rules, team/source-library strategy, source-to-standard adaptation, JSON spec generation, editable Figma-native drawing, and quality validation.
---

# Baijiahao Icon Generation Skill

## Overview

This skill is purpose-built for the **Baijiahao / 百家号 creator-console and AI assistant product family**.
It reuses the proven `icon-gen-promax` production chain:

```
User intent → brief → source strategy → semantic plan → SVG preview
→ Icon Spec JSON → quality gates → Figma native editable nodes
→ screenshot validation → production handoff
```

The reusable core is the production method. The platform variables are Baijiahao-specific:

- business semantics and product scenes
- icon base style and constraints
- source-library priority and adaptation rules
- naming, grouping, and asset registry behavior
- visual quality baseline for a calm, clear, creator-console product

Never treat this as a generic icon style picker. Generate or adapt icons into the fixed Baijiahao standard.

---

## Core Principle

Quality is the first requirement.

Every final icon must be:

- semantically correct for the Baijiahao context
- visually clear at 24px
- aligned to Baijiahao icon style rules
- consistent with existing team icons where available
- editable as Figma-native nodes, not pasted SVG
- validated against the approved preview before handoff

If quality, semantic clarity, or editability cannot be guaranteed, stop and return to the relevant earlier phase.

---

## Never Do

- Never paste, import, or embed SVG into Figma as the final output. SVG is preview-only.
- Never skip semantic direction confirmation unless the user has already provided a fully confirmed direction.
- Never copy external library geometry, path data, coordinates, or visual style.
- Never let external sources override Baijiahao style, team library consistency, or user context.
- Never output icons with collapsed counters, tangled overlaps, broken strokes, cramped details, or visual fill blobs.
- Never output icons with accidental overlaps, misaligned stroke endpoints, glued badges, swallowed terminals, or local black knots that look like generation errors rather than intentional construction.
- Never flatten editable native nodes by default.
- Never claim source-library or registry consistency if the source was not actually available.
- Never ask the user to choose basic style attributes that are locked by Baijiahao rules.
- Never treat hidden `.基准线` / `图标/ 规则-24` layers from the team library as visible glyph geometry.

---

## Required Runtime

Use `figma-use` / `use_figma` as the drawing foundation when writing to Figma.

- Always load `figma-use` before any `use_figma` call.
- Always pass `skillNames: "figma-use,icon-gen-baijiahao"` when calling `use_figma` for this skill.
- Implement final drawing through real Figma Plugin API scripts.
- Use SVG only for preview and designer approval.
- Use Icon Spec JSON as the contract for drawing. Do not improvise geometry during the draw phase.

---

## Platform Defaults

Load `references/baijiahao-icon-style.md` before Phase 3 or any shape/spec work.
Load `references/baijiahao-official-icon-spec.md` when deciding production size, stroke scaling, naming, or delivery behavior.

Default production master:

```
canvas:       24 × 24 px
figma master: 48 × 48 px in the audited Baijiahao PC Component library, using 2× scale from the 24px logical grid
grid:         24 px
padding:      2px safe-zone
stroke:       2px logical / 4px in 48px Figma master
stroke align: official PC spec uses inner stroke; Figma-native output may use center stroke only with compensated bounds and screenshot-equivalent result
stroke cap:   round
stroke join:  round
style:        outline / monochrome / clean creator-console
color:        Baijiahao icon ink token, default #242529 from audited team icons unless a project token overrides it
optical:      ON
```

Do not ask the user to choose canvas size, stroke, color mode, or style unless they explicitly request a non-standard output. If writing into the Baijiahao component-library context, default to the 48×48 team master while preserving 24px logical geometry.

Use `icon-gen-promax` as the production-quality chain, not as the visual source of truth. Reuse its brief → semantic plan → preview → Icon Spec JSON → native Figma draw → screenshot validation workflow and quality gates. Replace its comic-platform variables with Baijiahao official rules and the Baijiahao mature-library index.

---

## User-Facing Language

用户可见的关键信息默认用中文输出，便于设计同事、mentor、主管直接读懂。

Use Chinese for:

- brief confirmation / assumptions
- semantic option titles and labels
- visual elements, meaning, source basis, risk, recommendation
- preview status and source route summaries
- validation and final handoff summaries
- any explanation that affects user choice or production quality

Keep English only when it is a code/API/schema literal or fixed technical identifier:

- Icon Spec JSON keys, e.g. `meta.source.route`
- route enum values, e.g. `team-reuse`, `source-adapt`, `ai-generated`
- Figma/API names, e.g. `BjhBasicChenggong1`, `strokeAlign`
- file names and node IDs

Do not output mixed English headings such as `Visual elements`, `Meaning`, `Source basis`, or `Risk` in user-facing messages. Use their Chinese equivalents:

```txt
视觉元素
表达含义
来源依据
风险判断
推荐结论
```

---

## Phase 1 — Brief

Gather only what cannot be inferred. Keep it to one round if possible, two rounds max.

Ask only the missing items:

```
Q1. What is the icon for?
    concept / action / object, e.g. "AI改写", "发布成功", "粉丝增长"

Q2. Where will it appear?
    navigation / toolbar / content list / data card / AI assistant / empty state / settings / batch operation

Q3. Is this a single icon or an icon set?
    If a set, ask for all names before proceeding.

Q4. Any meaning emphasis to keep or avoid?
    object, action, status, badge, trend, document, AI mark, risk/approval mark, etc.
```

Skip questions already answered by the user. Do not ask about style/color/duotone.

Before Phase 2, confirm briefly:

> 已确认：为「{concept}」生成百家号规范 icon，使用场景是「{scene}」。如果用户未说明场景，先用中文说明合理假设。

---

## Phase 2 — Source Strategy

Load `references/runtime-modes-and-cache.md`.
Load `references/source-decision-pipeline.md`.
Load `references/source-library-protocol.md`.
Load `references/external-source-connectors.md` before using any external icon library.
Load `references/team-icon-index.json` before any runtime Figma library lookup.

Before generating from scratch, run the automated source decision pipeline:

```
1. Team mature library exact/adjacent match
2. External approved source libraries
3. AI generation fallback
```

The source route changes how the icon is made:

- **reuse route**: inspect existing team icon, preserve accepted metaphor, adapt only if needed
- **adapt route**: use source icon as semantic reference, redraw into Baijiahao rules
- **generate route**: create new semantic options and preview from scratch

Never copy external geometry. Source libraries provide meaning and composition patterns, not final coordinates.
Do not make routine skill execution depend on reading the Figma mature library. Figma lookup is a maintenance/verifying path; the offline team index is the default semantic matching layer.

Select a runtime mode before preview:

- default to `fast` for normal requests using the offline index and distilled rules
- use `strict` for exact mature-library reuse, final production writeback, or any source-locked icon requiring visual fidelity
- use `explore` for non-standard variants, external-source adaptation, or AI fallback
- use `maintenance` only when refreshing the mature-library index/cache

Report the selected mode briefly in Chinese. Never sacrifice mature-library fidelity just to stay fast.
When using external sources, call `scripts/search_external_icons.py` and inspect real results before claiming a Lucide, Tabler, Phosphor, IconPark, or Iconfont match. If the script cannot retrieve or cache the source data, report the source as unavailable instead of inventing candidates.

If `team-icon-index.json` returns an exact mature-library match, do not treat it as a loose semantic hint. Treat it as a source-locked canonical icon:

- skip divergent metaphor exploration unless the user asks for variants
- preview or redraw the mature-library silhouette as closely as possible
- if the offline index marks `needsSourceVerificationForPixelMatch: true`, inspect the runtime Figma node before SVG preview; do not generate a preview from text-only memory
- if the offline index lacks enough visual detail and runtime Figma access is unavailable, stop and ask for source verification instead of producing a plausible reconstruction
- never substitute another common metaphor just because it has similar meaning

---

## Phase 3 — Semantic Plan

Load `references/baijiahao-metaphor-table.md`.
Use `references/team-icon-index.json` to find exact, alias, or adjacent team-library matches before inventing semantic options.

Translate the brief into 2–3 visual semantic options. For source-first requests, include the best source candidates if available.

Exception: if Phase 2 found a source-locked exact mature-library match, present one recommended reuse direction first, and add a clearly separated optional exploration entry. Do not invent 2–3 competing directions by default for the same canonical mature icon.

Use this pattern for exact mature-library hits:

```
方案 A — 复用成熟库标准版：{icon label}
  视觉元素：成熟库原始轮廓 / 关键内部符号 / 方向与视觉重量
  表达含义：...
  来源依据：团队成熟库精确命中，node {nodeId}
  风险判断：低；需要保证源图形态一致，不能自由改画

可选探索 — 非标准变体
  如果你想探索不同业务场景或更强表达，我可以再给 2–3 个非标准方向。
  这些方向会标记为“变体/探索”，不会覆盖成熟库标准版。

追问：“默认建议走方案 A。你要直接预览成熟库标准版，还是需要我展开非标准变体？”
```

Each option must include:

- semantic strategy: object / action / state / data / AI / content / permission / operation
- key visual elements
- why it fits the Baijiahao scene
- source basis: offline team index / runtime team library / external reference / generated
- 24px readability risk

Required pattern:

```
方案 A — {语义方向}
  视觉元素：...
  表达含义：...
  来源依据：...
  风险判断：...

方案 B — {语义方向}
  ...

追问：“你想先预览哪个方向？或者需要我调整哪一点？”
```

Do not proceed to preview until the direction is confirmed or clearly implied.

---

## Phase 4 — SVG Preview

Generate a visual SVG preview so the designer can judge shape, meaning, density, and Baijiahao style fit.

Rules:

- Use SVG only as a preview artifact.
- Use Baijiahao defaults from `baijiahao-icon-style.md`.
- Keep details open and readable at 24px.
- Avoid dense internal strokes, broken curves, accidental blobs, and unclear AI/spark decorations.
- Inspect local construction quality before showing the preview: every overlap or attachment must look intentional; open-stroke endpoints must be cleanly aligned or clearly detached; badges, sparks, arrows, pens, cards, portraits, and garments must keep visible separation unless a connected construction is explicitly designed.
- Reject and redraw previews with accidental endpoint collisions, glued secondary marks, swallowed terminals, awkward side-by-side attachments, ambiguous intersections, missing breathing room, or local dark knots. Do not continue to Icon Spec JSON when these failures are present.
- For source-locked exact mature-library matches, the SVG preview must match the source silhouette family; it is a fidelity preview, not a new generated interpretation.
- If source metadata says `needsSourceVerificationForPixelMatch: true`, do not claim the SVG preview is source-matched until the source node or source screenshot has been inspected.
- If preview quality is poor, revise the semantic plan or source route before spec.

Before Phase 5, state:

```
预览状态：已确认
确认方向：...
来源路线：团队成熟库复用 | 来源适配 | AI 生成
是否使用局部填充：是/否 + 原因
已解决的质量风险：...
```

---

## Phase 5A — Icon Spec JSON

Produce the Icon Spec JSON from the approved preview. This is the single source of truth for Figma drawing.

Check `references/canonical-spec-registry.md` before producing a divergent icon for a repeated concept.
For source-based icons, record source metadata in `meta.source`.

Schema:

```jsonc
{
  "meta": {
    "name": "BjhBasicAiRewrite",
    "label": "AI改写",
    "aliases": ["rewrite", "AI writing", "智能改写"],
    "size": 24,
    "grid": 24,
    "context": "AI assistant toolbar",
    "platform": "baijiahao",
    "style": "outline",
    "color_mode": "monochrome",
    "source": {
      "route": "team-reuse | source-adapt | ai-generated",
      "library": "team-figma | iconpark | iconfont | lucide | tabler | phosphor | none",
      "reference_id": "",
      "adaptation_notes": ""
    },
    "style_notes": ""
  },
  "canvas": {
    "padding": 2,
    "optical_center": true
  },
  "shapes": [],
  "strokes": {},
  "validation": {}
}
```

Spec rules:

- Build from the approved preview, not from an unapproved draft.
- Keep native-node editability in mind while decomposing shapes.
- Load `references/shape-decomposition.md` and `references/drawing-primitives.md` when building `shapes`.
- Load `references/constraints.md`, `references/visual-quality-gates.md`, and `references/validation-checklist.md` before finalizing.
- Resolve hard violations before drawing.
- Present the spec for lightweight confirmation before Figma drawing.

---

## Phase 5B — Draw in Figma

Translate the confirmed Icon Spec JSON into Figma-native nodes.

Sequence:

```
1. Load figma-use and call use_figma with skillNames: "figma-use,icon-gen-baijiahao".
2. Resolve output profile: `team-master-48` for Baijiahao component-library work, or `logical-24` only for explicit compact/export work.
3. Create a component/frame named {meta.name}; use 48×48 for `team-master-48`, with coordinates scaled 2× from the Icon Spec JSON.
4. Draw shapes[] back → front as editable native nodes only.
5. Apply Baijiahao stroke, color, radius, and fill rules.
6. Group named layers, apply optical centering, then validate.
7. Capture screenshot and compare with approved preview.
8. Report node IDs, validation result, source route, output profile, and visual match.
```

Load `references/figma-node-spec.md` before the first `use_figma` call.
Load `references/production-handoff.md` before final handoff.

---

## Screenshot Decision Gate

Do not hand off an icon just because the drawing script succeeded.

```
Screenshot correct + preview match? ──Yes──▶ final handoff
                                  └─No──▶ branch by failure

wrong meaning                    → return to Phase 3
source/adaptation mismatch        → return to Phase 2 or 4
preview itself is poor            → return to Phase 4
spec changed proportions          → return to Phase 5A
native draw mismatch              → return to Phase 5B
spacing/centering issue           → adjust spec and redraw
```

---

## Batch Icon Sets

For multiple icons, load `references/icon-set-rules.md` and `references/set-consistency-profile.md`.

Batch rules:

- Build a shared set profile before drawing.
- Keep one metaphor family per icon.
- Prevent duplicate semantic directions across different icon names.
- Align visual weight, density, radius behavior, and badge placement.
- Validate the set as a whole before handoff.

---

## Reference Files

Load on demand:

```
references/
├── baijiahao-official-icon-spec.md ← Official PDF rules; wins over inherited promax behavior
├── baijiahao-icon-style.md        ← Baijiahao icon base rules and visual personality
├── baijiahao-metaphor-table.md    ← Baijiahao business semantics to icon metaphors
├── runtime-modes-and-cache.md     ← fast/strict/explore/maintenance mode and mature-source cache rules
├── source-decision-pipeline.md    ← automated mature-library → external-source → AI route decision
├── source-library-protocol.md     ← team/external source priority and adaptation rules
├── external-source-connectors.md  ← real Lucide/Tabler/Phosphor/IconPark/Iconfont retrieval protocol
├── skill-file-annotated-comparison.md ← learning doc comparing this SKILL.md with icon-gen-promax
├── team-icon-index.json           ← offline mature-library semantic index; use before runtime Figma lookup
├── team-icon-library.md           ← audited source metadata and optional runtime Figma lookup protocol
├── team-index-maintenance.md      ← maintainer-only workflow for refreshing distilled team index
├── source-to-standard-rules.md    ← how to convert source icons into Baijiahao standard
├── shape-decomposition.md         ← reusable native-node decomposition schema
├── constraints.md                 ← hard geometry and quality constraints
├── drawing-primitives.md          ← canvas/keyline/spacing primitives
├── figma-node-spec.md             ← Figma Plugin API mapping
├── visual-quality-gates.md        ← visual review gates
├── validation-checklist.md        ← final validation checklist
├── canonical-spec-registry.md     ← persistent registry protocol
├── icon-set-rules.md              ← batch icon set rules
└── production-handoff.md          ← final report format
```

---

## Session Memory

Persist within one session:

```
confirmed_platform: baijiahao
confirmed_size: 24 unless user overrides
active_scene: current product context
active_source_route: team-reuse | source-adapt | ai-generated
active_icon_set: list of icon names
last_spec: most recent Icon Spec JSON
registry_status: available | unavailable | checked
```

Cross-session consistency requires a persistent registry or team Figma library.

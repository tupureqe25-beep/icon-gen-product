# Source Library Protocol

## Status

Draft v2 — source-aware generation layer with offline mature-library index.

## Purpose

Source libraries are not decoration. They are a production strategy for reducing semantic error and improving consistency.

Use them to:

- find already-approved team icons
- calibrate style, density, and metaphor
- retrieve conventional metaphors for unfamiliar terms
- avoid duplicate or divergent icon directions
- adapt existing icons into Baijiahao standard

Never use source libraries to copy external path data or bypass quality gates.

## Source Priority

For the full automatic decision behavior and user-facing result presentation, load `source-decision-pipeline.md`.
For runtime speed/fidelity behavior, load `runtime-modes-and-cache.md`.
For real external-source retrieval, load `external-source-connectors.md`.

```
P0 — User-provided reference icon or Figma selection
P1 — Offline Baijiahao mature-library exact source-locked icon: `team-icon-index.json`
P2 — Runtime Baijiahao/team canonical Figma icon library lookup, only when needed and available
P3 — Approved external libraries: IconPark, Lucide, Tabler, Phosphor, Iconfont
P4 — Adjacent internal/team semantic references for fallback controlled adaptation
P5 — AI generation from scratch
```

Default skill execution should not depend on reading the Figma library. Use the offline index first so the skill remains fast, repeatable, and usable by teammates without Figma file permission.
If the offline index is not enough for an exact source-locked icon, switch to strict mode rather than guessing.
If the offline index only returns an adjacent/base-family match, do not standardize directly by default. First retrieve external approved sources and use the adjacent team match only as a semantic/style guardrail. Only use adjacent mature-library geometry as fallback after external retrieval is unavailable or fails shape/semantic intake.

## Offline Team Index

Load `team-icon-index.json` before runtime Figma lookup.

Search order:

```
1. Exact full-phrase label/name match, e.g. "内容分销" → 内容分销
2. Exact alias match, e.g. "检索" / "查询" → BjhBasicSousuo
3. Confusion rule, e.g. "导出" ≠ "分享" ≠ "下载"
4. Family/base match, e.g. "内容管理" → content family / BjhBasicNeirong, used as a guardrail
5. Adjacent match, e.g. "AI改写" → 编辑 family, used as a guardrail before external retrieval
```

When a user phrase contains both a broad word and a specific mature-library concept, prefer the longest exact concept match. Example: `内容分销` must match the mature `内容分销` icon before the broad `内容 / BjhBasicNeirong` base icon.

Use `semanticDirection`, `visualElements`, `shapeSummary`, `useWhen`, and `avoidWhen` to choose the form. Use `nodeId` only as optional provenance or for later runtime verification. Do not copy path data or coordinates.

For an exact mature-library match, treat the mature icon as **source-locked** unless the user explicitly asks for a variant. Source-locked means:

- preview the mature-library silhouette, not a new metaphor inspired by its label
- preserve the main outer contour, inner mark family, orientation, and visual weight
- allow only production-safe reconstruction changes needed for Figma-native editability
- do not introduce substitute metaphors such as share nodes, arrows, cards, or status marks
- if `needsSourceVerificationForPixelMatch: true`, inspect the Figma `nodeId` or a source screenshot before producing the SVG preview
- if the offline index only contains a vague description and runtime Figma access is unavailable, stop and request source verification instead of hallucinating a replacement

User-facing option behavior:

- Show `方案 A — 复用成熟库标准版` as the default recommendation.
- Add `可选探索 — 非标准变体` as a collapsed/secondary choice, not as competing options by default.
- Only expand 2–3 variant directions after the user asks to explore variants or rejects the mature-library standard version.
- Label variants clearly as non-standard exploration so they do not replace the canonical mature-library icon by accident.

## Route Selection

Choose one route per icon:

### Team Reuse

Use when an exact or near-exact team icon exists.

Do:
- check `team-icon-index.json` first for label, aliases, family, and confusion rules
- inspect layer structure, visual weight, radius, and metaphor only when runtime Figma access is needed and available
- reuse if it already meets the requested meaning
- for exact matches, reproduce the mature-library silhouette as closely as possible in SVG preview and final native redraw
- emit or update canonical registry metadata
- ignore hidden `.基准线` / `图标/ 规则-24` layers when extracting glyph structure
- preserve the 48×48 team-master convention when writing back into the Baijiahao component-library context

Do not:
- generate a divergent icon silently
- alter accepted team metaphors without user approval
- convert a source-locked exact match into a visually different generated metaphor
- replace a mature filled status icon with a monochrome outline variant unless the user explicitly requests a non-status usage

### Source Adapt

Use when an external icon gives a good metaphor but does not match Baijiahao style.

Do:
- for external libraries, call `scripts/search_external_icons.py` and inspect real returned candidates first
- extract semantic pattern only
- redraw with Baijiahao stroke, radius, live area, and density
- simplify until it passes 24px readability
- combine the chosen external metaphor with adjacent team-family constraints when available

Do not:
- copy path data, exact coordinates, filled silhouettes, gradients, or decorative details
- preserve library-specific style if it conflicts with Baijiahao rules
- claim Lucide, Tabler, Phosphor, IconPark, or Iconfont results without a real connector result

### Team Adapt

Use only after exact mature-library reuse is unavailable and external retrieval is unavailable, weak, unsuitable, fails intake, or rejected by the user.

Do:
- use adjacent team icons as style and semantic guardrails
- clearly label the route as `team-adapt`, not `team-reuse`
- explain that this is a controlled internal adaptation rather than a source-library retrieval result

Do not:
- present adjacent-family adaptation as a mature-library exact hit
- skip external-source retrieval merely because an adjacent team family exists
- generate broad AI variants before checking approved external sources
- use adjacent mature-library repaint as the primary shape route when a suitable external source exists

### AI Generated

Use when:
- no suitable source exists
- the concept is novel
- the user asks for exploration
- source candidates are semantically wrong or visually too complex

Do:
- only enter this route after mature-library and external-source checks have been attempted and reported, unless the user explicitly asks for original AI exploration
- still check the metaphor table
- still run preview and quality gates
- still emit registry metadata after approval

Do not:
- present AI-drawn sketches as if they were source-backed options
- generate concrete AI visual schemes before external retrieval has been attempted for the selected semantic direction
- let Phase 3 semantic-direction sketches visually compete with source-library priority

## External Library Notes

- Lucide: real retrieval through `lucide-static`; clean outline baseline; useful for simple system/action icons.
- Tabler: real retrieval through `@tabler/icons`; broad coverage; useful for admin-console actions.
- IconPark: real retrieval through `@icon-park/svg`; good for Chinese product semantics; adapt style strictly.
- Phosphor: real retrieval through `@phosphor-icons/core`; expressive set; use cautiously to avoid style drift.
- Iconfont: only real when the user provides a project `symbol.js` / SVG sprite / exported source; do not promise global database search.

## Reporting

For every final icon, report:

```
来源路线：team-reuse | source-adapt | ai-generated
来源库：...
规范适配：为了符合百家号规则改了什么
质量状态：通过 / 已修正 / 阻塞
```

User-facing source and quality explanations should be in Chinese. Keep enum values such as `team-reuse`, `source-adapt`, and `ai-generated` in English because they are metadata literals.

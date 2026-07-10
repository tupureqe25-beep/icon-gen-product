# Source Decision Pipeline

## Status

Defined v1 — automated source route decision and user-facing presentation.

## Purpose

Make source selection automatic and repeatable:

```txt
团队成熟库精确命中 → 外部高质量来源检索 → 百家号规范化改造 → 成熟库相近兜底改造 → AI 生成兜底
```

The agent should decide the route internally, then present the result clearly. Do not ask the user to choose a source route before doing the search unless required access is missing.

Load `runtime-modes-and-cache.md` before deciding whether to read runtime Figma sources. Source priority and runtime mode are related but not identical:

- source priority decides **what basis** to use
- runtime mode decides **how much verification** is needed before preview/draw

Use the fastest mode that does not reduce correctness.

## Pipeline

### Step 1 — Team Mature Library

Load `team-icon-index.json` and search in this order:

```txt
1. exact label/name match
2. exact alias match
3. longest specific phrase match
4. confusion-rule exclusion
5. adjacent/base family match
```

Decision outcomes:

| Result | Route | Action |
|---|---|---|
| exact mature hit | `team-reuse` | Default to `方案 A — 复用成熟库标准版`; source-lock silhouette. |
| exact hit but `needsSourceVerificationForPixelMatch=true` | `team-reuse-needs-verification` | Inspect Figma node/source screenshot before SVG preview; if unavailable, stop and explain. |
| adjacent mature hit | `team-adjacent-reference` | Record it as a constraint only, then continue to external sources. Do not adapt yet. |
| no mature match | continue | Move to external sources. |

Do not skip to AI generation when an exact mature hit exists.
Do not treat an adjacent/base-family mature match as enough to generate directly. Adjacent hits are semantic guardrails, not final source assets.

If an exact mature hit has a production-grade distilled shape spec, use `fast` mode for preview. If it only has semantic metadata and `needsSourceVerificationForPixelMatch=true`, use `strict` mode and inspect the Figma node/source screenshot before preview.

### Step 2 — External Approved Sources

Use external sources after the team mature library fails to provide an exact source-locked icon, including when the team library only provides adjacent/base-family references.
For non-exact mature-library cases, external source candidates are the primary shape source. Adjacent mature-library matches are only semantic/style guardrails until external retrieval fails intake.
Load `external-source-connectors.md` and run `scripts/search_external_icons.py` before claiming an external-source hit.
Before selecting a source for standardization, run the Source Intake Check in `external-source-connectors.md`. A keyword match is not enough; the retrieved icon must have a readable shape and a matching action metaphor.

Approved sources:

```txt
IconPark → Chinese product/UI metaphors
Iconfont → broad Chinese semantic convention scanning; inconsistent quality
Lucide → clean system/action baseline
Tabler → broad admin-console actions
Phosphor → expressive metaphors; use cautiously
```

Decision outcomes:

| Result | Route | Action |
|---|---|---|
| clear external metaphor candidate that passes intake | `source-adapt` | Use the external candidate as the primary metaphor source, then standardize into Baijiahao rules. |
| multiple clear external candidates that pass intake | `source-adapt-options` | Present 2–3 source-informed directions with concrete source names and thumbnail previews. |
| user selected a specific external icon | `source-adapt-selected` | Preserve semantic silhouette, not path data; standardize into Baijiahao rules. |
| candidates fail shape/semantic intake, conflict, or are too complex | `team-adapt-fallback` | Report external results as unsuitable; then use adjacent mature-library controlled adaptation as fallback. |
| connector unavailable or no real result | continue | Report unavailable source; do not fabricate external hits. |

Never copy external path data, coordinates, visual style, gradients, or fills.
Iconfont is only considered real when the user provides a project `symbol.js`, SVG sprite, or exported project asset. Do not claim global Iconfont database retrieval.

### Step 3 — Baijiahao Standardization / Controlled Adaptation

Standardize only after a source has been selected:

```txt
source icon / mature exact icon / adjacent team constraint
→ extract semantic silhouette
→ redraw into Baijiahao grid, stroke, radius, density, and editability rules
→ run quality gates
```

Priority inside standardization:

1. `team-reuse`: preserve exact mature-library silhouette.
2. `source-adapt`: preserve external source metaphor and composition, not coordinates.
3. `team-adapt`: use adjacent team-family metaphor only after external retrieval is unavailable, fails intake, unsuitable, or user asks to stay internal.

For adjacent-only cases such as `智能扩写` matching the `编辑` family, do not output direct AI semantic variants before trying external retrieval for expansion / text-plus / writing-growth metaphors.

### Step 4 — AI Generation

Use AI generation only when:

- no mature-library exact source fits
- external sources are semantically weak or visually unsuitable
- the concept is new to Baijiahao
- the user explicitly asks for exploration
- the user rejects mature-library or external-source directions

AI generation must still use:

- Baijiahao official rules
- Baijiahao metaphor table
- source-to-standard conversion rules
- visual quality gates
- SVG preview approval before Icon Spec JSON
- Figma-native editable draw and screenshot validation

## Automatic Decision Report

After source search, report briefly in Chinese:

```md
运行模式：{快速模式 / 严格模式 / 探索模式}
来源判断：
- 成熟库：{精确命中 / 相近命中 / 未命中} — {icon label/nodeId/原因}
- 外部来源：{无需检索 / 已检索并采用 / 已检索但不适合 / 检索不可用}
- 规范化改造：{复用成熟库精确标准版 / 基于外部来源套百家号规范 / 外部失败后基于相近成熟库做兜底改造 / 暂不执行}
- AI 生成：{不需要 / 作为变体探索 / 作为最终兜底}

推荐路线：{复用成熟库标准版 | 外部来源检索后规范化 | 成熟库相近兜底改造 | AI 生成兜底}
```

Keep the report short. Do not show all internal candidates unless the user asks.

## User-Facing Presentation By Route

Important sequencing:

- Phase 3 presents semantic directions only.
- External-source candidates may be summarized as evidence, but they must not become final visual schemes before the user selects a semantic direction.
- Phase 3 must not show AI-drawn icon-like visual schemes that make AI appear higher priority than source libraries. If no source-backed thumbnail exists, use text-only semantic cards.
- After the user selects one semantic direction, Phase 4A retrieves/sifts sources and generates specific visual schemes within that selected direction.
- Do not output three concrete source-adapted icon schemes when the user has not yet selected the semantic direction.
- Do not output AI-generated concrete schemes until external retrieval has been attempted and reported, unless exact mature-library reuse already satisfies the request.

### Mature Exact Hit

```md
方案 A — 复用成熟库标准版：{label}
- 视觉元素：{source silhouette summary}
- 表达含义：{meaning}
- 来源依据：团队成熟库精确命中，node {nodeId}
- 风险判断：低；重点是保证源图形态一致

可选探索 — 非标准变体
如果你想探索不同业务场景或更强表达，我可以再给 2–3 个非标准方向。
```

If source verification is required:

```md
源图校验：需要读取 Figma 源节点或源截图后再预览，不能只靠文字描述生成。
```

### Mature Adjacent Hit

```md
成熟库相近命中：{label}
处理方式：只作为语义/风格约束，不作为主形态来源。
下一步：先从 Lucide / Tabler / IconPark / Phosphor 等来源中找更贴近的真实图标隐喻，并以通过筛选的外部来源为主形态进行百家号规范化。
兜底：只有外部来源不可用或不合格时，才基于相近成熟库做可控改造。
```

### External Source Adapt

```md
已选择语义方向：{direction}
来源筛选：已检索外部来源，并采用/淘汰以下候选...
方案 1/2/3 — 外部来源适配后的具体视觉方案
- 来源库：{IconPark/Lucide/...}
- 保留：语义轮廓 / 常见隐喻
- 改造：百家号描边、圆角、密度、可编辑节点
```

### AI Generation

```md
已选择语义方向：{direction}
方案 1/2/3 — AI 生成的具体视觉方案
- 前置条件：成熟库无精确可复用结果，外部来源已检索但不适合/不可用，或用户明确要求原创探索
- 生成依据：用户语义 + 百家号规范 + 质量门禁
- 风险判断：需要预览确认语义和小尺寸可读性
```

## Stop Conditions

Stop instead of guessing when:

- exact mature match requires source verification but Figma/source screenshot is unavailable
- source candidates conflict with Baijiahao metaphor table
- output would violate visual quality gates
- the route would silently replace a canonical mature-library icon

When stopped, say what is missing and what the next action is.

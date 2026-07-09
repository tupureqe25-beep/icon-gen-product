# Source Decision Pipeline

## Status

Defined v1 — automated source route decision and user-facing presentation.

## Purpose

Make source selection automatic and repeatable:

```txt
团队成熟库 → 外部高质量来源 → AI 生成
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
| adjacent mature hit | `team-adapt` | Use mature-library metaphor/weight as basis; present controlled variant. |
| no mature match | continue | Move to external sources. |

Do not skip to AI generation when an exact mature hit exists.

If an exact mature hit has a production-grade distilled shape spec, use `fast` mode for preview. If it only has semantic metadata and `needsSourceVerificationForPixelMatch=true`, use `strict` mode and inspect the Figma node/source screenshot before preview.

### Step 2 — External Approved Sources

Use external sources only after team mature library fails or only provides weak adjacent matches.
Load `external-source-connectors.md` and run `scripts/search_external_icons.py` before claiming an external-source hit.

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
| clear external metaphor candidate | `source-adapt` | Present 2–3 source-informed directions; redraw into Baijiahao rules. |
| candidates conflict or are too complex | continue | Move to AI generation or ask one concise clarification. |
| user selected a specific external icon | `source-adapt-selected` | Preserve semantic silhouette, not path data; adapt to Baijiahao. |
| connector unavailable or no real result | continue | Report unavailable source; do not fabricate external hits. |

Never copy external path data, coordinates, visual style, gradients, or fills.
Iconfont is only considered real when the user provides a project `symbol.js`, SVG sprite, or exported project asset. Do not claim global Iconfont database retrieval.

### Step 3 — AI Generation

Use AI generation only when:

- no mature-library exact/adjacent source fits
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
- 外部来源：{无需检索 / 已参考 / 未找到合适来源}
- AI 生成：{不需要 / 作为变体探索 / 作为兜底生成}

推荐路线：{复用成熟库标准版 | 基于成熟库做变体 | 外部来源适配 | AI 生成}
```

Keep the report short. Do not show all internal candidates unless the user asks.

## User-Facing Presentation By Route

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
方案 A — 基于成熟库做可控变体
方案 B — 保守业务语义变体
可选：如果你要完全原创，我可以继续走 AI 生成。
```

### External Source Adapt

```md
方案 A/B/C — 外部来源适配方向
- 来源库：{IconPark/Lucide/...}
- 保留：语义轮廓 / 常见隐喻
- 改造：百家号描边、圆角、密度、可编辑节点
```

### AI Generation

```md
方案 A/B/C — AI 生成方向
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

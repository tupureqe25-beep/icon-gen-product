# External Source Connectors

## Status

Defined v1 — real source retrieval for approved external icon libraries.

## Purpose

Use external icon libraries as real, inspectable source references when the Baijiahao mature library does not provide an exact or strong adjacent hit.

External results are **source references**, not final output. Use them to understand common metaphors and silhouettes, then redraw into Baijiahao rules as editable native Figma nodes.
When a result passes intake, treat it as a source-fidelity candidate: preserve its recognizable silhouette and composition while changing only Baijiahao-controlled style variables. Do not use AI to replace the source with a new metaphor.

## Connector Script

Use:

```bash
scripts/search_external_icons.py "{query}" --libraries all --limit 12 --json
```

Add `--include-svg` when visual source inspection is needed:

```bash
scripts/search_external_icons.py "AI改写" --libraries all --limit 12 --include-svg --json
```

The script downloads official npm packages into:

```txt
~/.cache/codex/icon-gen-baijiahao/external-sources
```

It returns real package metadata and, where available, real SVG/source snippets.

## Supported Libraries

| Library | Retrieval status | Source | Use for | Risk |
|---|---|---|---|---|
| Lucide | Real | `lucide-static` npm package | clean system/action outline metaphors | low |
| Fluent UI | Real | `@fluentui/svg-icons` npm package | toolbar, AI assistant, Microsoft-like product UI actions | low |
| Material Symbols | Real | `@material-symbols/svg-400` npm package | broad conventional UI metaphors | medium |
| Tabler | Real | `@tabler/icons` npm package | admin-console and broad UI actions | low |
| Ant Design Icons | Real | `@ant-design/icons-svg` npm package | Chinese B-end/admin product conventions | medium |
| TDesign Icons | Real | `tdesign-icons-svg` npm package | Chinese B-end operation/component-library conventions | medium |
| Carbon Icons | Real | `@carbon/icons` npm package | data, analytics, enterprise tooling, status semantics | medium |
| Phosphor | Real | `@phosphor-icons/core` npm package | expressive fallback metaphors | medium |
| Remix Icon | Real | `remixicon` npm package | broad fallback and web product conventions | medium |
| IconPark | Real | `@icon-park/svg` npm package with Chinese metadata | Chinese UI/product semantic scanning | medium |
| Iconfont | Semi-automatic | user-provided `symbol.js` / SVG sprite | team/project-specific iconfont assets | high |

Do not claim global Iconfont database search. Iconfont public website search is not a stable production connector. Use user-provided project assets or links.

## Required Search Order

Only run external search after:

```txt
P1 offline Baijiahao mature exact-match check
P2 runtime team library verification only when an exact mature match requires it
P3 adjacent internal match may be recorded as a guardrail, but must not block external search
```

Then search external libraries:

```txt
Lucide + Fluent + Material first for clean toolbar / AI assistant / system metaphors
Tabler + Ant Design + TDesign for admin-console, batch operation, and Chinese B-end conventions
IconPark for Chinese product semantics
Carbon for data / analytics / enterprise tooling
Phosphor + Remix for expressive or broad fallback variants
Iconfont only from user-provided project source
```

For Chinese product concepts, search all supported libraries because the script expands Chinese terms into common English icon keywords while still reading real library data.

## Scenario Routing Hints

Use these as ranking hints after real retrieval, not as hard-coded results:

- AI assistant / toolbar: prefer Lucide, Fluent UI, Material Symbols.
- Chinese B-end operation / admin console: prefer Ant Design Icons, TDesign Icons, IconPark, Tabler.
- Upload / publish / table / batch operation: prefer Ant Design Icons, TDesign Icons, Tabler, Lucide.
- Data / analytics / diagnosis: prefer Carbon Icons, Tabler, Material Symbols.
- Creative exploration or metaphor fallback: use Phosphor and Remix cautiously.

## Interpretation Rules

For every external result:

- inspect name, title, tags, category, library, license, and SVG/source snippet if available
- decide whether the metaphor fits the Baijiahao scene
- run a source intake check before adapting the result; do not standardize a candidate whose shape/meaning is already weak
- if accepted, record the exact library and icon name/ID as the source basis for the scheme
- reject candidates that are too decorative, too dense, filled/logo-like, or semantically ambiguous
- never copy path data, exact coordinates, gradients, or library-specific style into final output
- convert the source silhouette and composition into Baijiahao `24×24` logical / `48×48` master rules, changing only stroke/radius/spacing/density/editability as needed

## Source Intake Check

Before a retrieved external icon can become a Phase 3 option or a Phase 4A concrete scheme, score it against shape and semantic fit.
For any request without an exact mature-library standard icon, run retrieval before Phase 3 options are shown so semantic directions can be grounded by real source candidates.

Accept only candidates that pass all required checks:

```txt
semantic fit:       exact / strong adjacent only
shape readability:  recognizable without the option title
standardization:    can become 2–4 paths, 5 max
overlap risk:       no forced stacking, occlusion, or glued details
metaphor clarity:   no crop/resize/open/jump meaning for writing concepts
source evidence:    concrete retrieved library/name/tags/source snippet
fidelity lock:      can preserve source silhouette after Baijiahao standardization
```

Reject before standardization when:

- the result only matches a keyword but not the intended action
- the source name suggests a different action, e.g. `arrow-right`, `maximize`, `corner`, `crop`, `external-link`, or `move`
- the icon relies on overlap/occlusion to express itself
- the icon needs an arrow, plus, spark, and text lines all at once to become understandable
- the icon would require inventing most of the final shape after retrieval
- the retrieved metadata/source cannot be inspected
- preserving the source silhouette would violate Baijiahao quality gates, and changing it would make it no longer recognizably source-backed

For writing, rewriting, and expansion concepts, prefer source names and tags related to:

```txt
file-text, text, text-plus, text-increase, file-pen, edit, writing, pencil-line
```

Reject or heavily down-rank:

```txt
arrow-right, expand, maximize, crop, external-link, corners, move, wand
```

If fewer than one source candidate passes intake, report `外部来源：已检索但不适合` and use team-adapt or AI fallback instead of forcing a poor source-adapt result.
If Phase 3 still needs thumbnails after no source passes, label them as `AI 兜底草图（非最终方案）`; do not present them as source-backed directions.

## User-Facing Report

When external search is used, summarize briefly in Chinese:

```md
外部来源检索：
- Lucide：命中 search / file-pen-line，适合作为清爽系统隐喻参考
- Fluent：命中 document-edit / text 类动作，适合 AI 助手工具栏
- TDesign/IconPark：命中中文产品语义，但需要筛掉复杂形态
- Tabler/Carbon：命中数据或后台操作语义，可作为低风险候选

推荐路线：外部来源适配
规范处理：只保留语义轮廓，最终按百家号描边、圆角、密度和可编辑节点重绘。
```

Do not dump raw result lists unless the user asks.
When presenting source-adapt schemes, say which source icon was adopted and what was changed. Do not describe the result as AI-generated unless no source passed intake.

## Iconfont Boundary

Use Iconfont only when the user provides one of:

- iconfont project `symbol.js` URL
- downloaded `symbol.js`
- SVG sprite file
- exported project zip / JSON metadata

Then call:

```bash
scripts/search_external_icons.py "{query}" --libraries iconfont --iconfont-source "{path-or-url}" --include-svg --json
```

If no Iconfont source is provided, say:

```txt
Iconfont：当前没有可检索的项目源，不能保证真实命中；请提供 symbol.js 或项目导出文件。
```

## Stop Conditions

Stop or fall back to AI generation when:

- external search returns only weak matches
- candidates conflict with Baijiahao mature-library semantics
- candidates are visually too complex for 24px
- no retrieved candidate passes the source intake check
- script cannot fetch packages and no cached package is available
- user expects Iconfont global search but no project source is provided

When stopped, report what was searched and why it is unsafe to use the result.

# External Source Connectors

## Status

Defined v1 — real source retrieval for approved external icon libraries.

## Purpose

Use external icon libraries as real, inspectable source references when the Baijiahao mature library does not provide an exact or strong adjacent hit.

External results are **source references**, not final output. Use them to understand common metaphors and silhouettes, then redraw into Baijiahao rules as editable native Figma nodes.

## Connector Script

Use:

```bash
scripts/search_external_icons.py "{query}" --libraries lucide,tabler,iconpark,phosphor --limit 12 --json
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
| Tabler | Real | `@tabler/icons` npm package | admin-console and broad UI actions | low |
| Phosphor | Real | `@phosphor-icons/core` npm package | expressive fallback metaphors | medium |
| IconPark | Real | `@icon-park/svg` npm package with Chinese metadata | Chinese UI/product semantic scanning | medium |
| Iconfont | Semi-automatic | user-provided `symbol.js` / SVG sprite | team/project-specific iconfont assets | high |

Do not claim global Iconfont database search. Iconfont public website search is not a stable production connector. Use user-provided project assets or links.

## Required Search Order

Only run external search after:

```txt
P1 offline Baijiahao mature index
P2 runtime team library check if required
P3 adjacent internal libraries if available
```

Then search external libraries:

```txt
Lucide + Tabler first for clean system metaphors
IconPark for Chinese product semantics
Phosphor for expressive variants
Iconfont only from user-provided project source
```

For Chinese product concepts, search all supported libraries because the script expands Chinese terms into common English icon keywords while still reading real library data.

## Interpretation Rules

For every external result:

- inspect name, title, tags, category, library, license, and SVG/source snippet if available
- decide whether the metaphor fits the Baijiahao scene
- reject candidates that are too decorative, too dense, filled/logo-like, or semantically ambiguous
- never copy path data, exact coordinates, gradients, or library-specific style into final output
- convert only the semantic silhouette into Baijiahao `24×24` logical / `48×48` master rules

## User-Facing Report

When external search is used, summarize briefly in Chinese:

```md
外部来源检索：
- Lucide：命中 search / file-pen-line，适合作为清爽系统隐喻参考
- IconPark：命中「智能改写」相关编辑/AI符号，但需要简化密度
- Tabler：命中 edit / sparkles，适合做低风险方向

推荐路线：外部来源适配
规范处理：只保留语义轮廓，最终按百家号描边、圆角、密度和可编辑节点重绘。
```

Do not dump raw result lists unless the user asks.

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
- script cannot fetch packages and no cached package is available
- user expects Iconfont global search but no project source is provided

When stopped, report what was searched and why it is unsafe to use the result.

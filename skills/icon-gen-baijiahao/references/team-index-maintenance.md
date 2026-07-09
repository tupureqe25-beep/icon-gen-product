# Team Index Maintenance

## Purpose

Maintain the distilled mature-library knowledge used by `team-icon-index.json`.

This file is for skill maintainers. Normal icon generation should load `team-icon-index.json`, not runtime-read the Figma mature library.

## When to Refresh

Refresh the index when:

- Baijiahao mature icon library adds or renames many icons
- a generated icon repeatedly misses a known mature-library concept
- a mentor/designer confirms a new canonical metaphor
- the Figma source file or frame moves
- batch validation finds duplicate or conflicting semantic directions

## What to Extract

Extract:

- icon name and display label
- aliases in Chinese and English
- source node ID
- semantic family
- semantic direction
- visual elements
- shape summary
- style attributes, such as status color or fill exception
- useWhen / avoidWhen
- confusion rules against nearby concepts

Do not extract:

- complete vector path data
- exact coordinates as the generation source of truth
- hidden `.基准线` / `图标/ 规则-24` geometry
- visual style from external libraries that conflicts with Baijiahao rules

## Refresh Workflow

```
1. Read direct icon nodes from `百家号PC Component / icon / 基础元素`.
2. Filter out hidden baseline/rule layers and non-icon labels.
3. Group icons by semantic family.
4. Add aliases and use/avoid rules manually.
5. Update `team-icon-index.json`.
6. Update `baijiahao-metaphor-table.md` only for broadly reusable rules.
7. Run 3 validation prompts:
   - exact hit, e.g. 搜索
   - adjacent variant, e.g. AI改写
   - fallback generation, e.g. a new AI assistant action not in the index
```

## Quality Rule

The index is not an asset dump. It is a distilled semantic layer. Keep it compact enough to load during generation, but rich enough to prevent wrong metaphors.

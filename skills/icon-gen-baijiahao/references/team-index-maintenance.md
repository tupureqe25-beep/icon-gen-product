# Team Index Maintenance

## Purpose

Maintain the distilled mature-library knowledge used by `team-icon-index.json`.
Maintain guardrail shape notes in `team-icon-shape-specs.json`. Do not treat them as final mature-library geometry.

This file is for skill maintainers. Normal icon generation should load `team-icon-index.json`, not runtime-read the Figma mature library.
For exact mature-library hits, normal icon generation must read/extract Figma source before standard preview. Shape notes are guardrails only.

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
- guardrail shape notes for high-frequency exact hits
- geometry signature and fidelity locks for distinctive silhouettes
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
6. For high-frequency or previously mismatched exact icons, update `team-icon-shape-specs.json` as guardrail notes only.
7. Update `baijiahao-metaphor-table.md` only for broadly reusable rules.
8. Run 3 validation prompts:
   - exact hit, e.g. 搜索
   - adjacent variant, e.g. AI改写
   - fallback generation, e.g. a new AI assistant action not in the index

After updating the index or shape specs, run deterministic lookup checks:

```bash
scripts/lookup_team_icon.py "上传文件" --json
scripts/lookup_team_icon.py "内容分销" --json
scripts/lookup_team_icon.py "智能诊断" --json
```

Expected behavior:

- specific phrases outrank broad base concepts
- exact hits return `team-reuse-needs-verification`; source extraction is required
- exact hits with guardrail-only specs return `team-reuse-needs-verification`
- adjacent-only concepts do not skip external-source retrieval
```

## Quality Rule

The index is not an asset dump. It is a distilled semantic layer. Keep it compact enough to load during generation, but rich enough to prevent wrong metaphors.

The shape spec cache is also not a full vector asset dump. Store structural native-node recipes only:

```txt
icon name / label / nodeId
fidelityLevel
geometrySignature
mustKeep / forbidden
No final Icon Spec JSON shapes[] for mature-library standard reuse unless generated from current Figma source extraction
guardrailOnly=true when source verification is still required
```

Do not use `production-grade` for embedded mature-library shape notes. Mature-library standard preview must be generated from current Figma source extraction.

Do not promote embedded notes to final geometry. If source extraction is unavailable, stop or show only a temporary schematic; never claim standard mature-library reuse.

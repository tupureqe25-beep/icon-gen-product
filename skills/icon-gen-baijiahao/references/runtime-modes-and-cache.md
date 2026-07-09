# Runtime Modes And Mature-Source Cache

## Status

Defined v1 — speed / fidelity decision rules for Baijiahao source-first icon generation.

## Purpose

Keep `icon-gen-baijiahao` accurate without making every run slow.

The skill should behave like a source-first production pipeline, but it should not read Figma on every request. Use the offline mature-library index and distilled specs first, then escalate to runtime source verification only when fidelity requires it.

## Mode Summary

| Mode | Chinese label | Use when | Source behavior | Expected speed |
|---|---|---|---|---|
| `fast` | 快速模式 | normal generation, early exploration, teammate reuse | use offline index + distilled rules; no runtime Figma read by default | fastest |
| `strict` | 严格模式 | exact mature-library reuse, manager review, final production, pixel/shape fidelity | verify source node/screenshot when required before preview/draw | slower |
| `explore` | 探索模式 | user asks for new variants, no mature hit, divergent business need | external sources + AI generation; still pass Baijiahao quality gates | medium |
| `maintenance` | 维护模式 | refreshing team index/cache from Figma mature library | inspect Figma library and update distilled metadata | slowest |

Default to `fast` unless the user asks for exact reuse, production handoff, Figma writeback, or the source index marks the icon as requiring verification.

## Automatic Mode Selection

Use this decision tree:

```txt
User requests exact mature icon / final Figma output / 1:1 match?
  ├─ yes → strict
  └─ no
      Exact mature hit with complete distilled shape spec?
        ├─ yes → fast
        └─ no
            Exact mature hit with needsSourceVerificationForPixelMatch=true?
              ├─ yes → strict
              └─ no
                  User asks for variants / no mature hit?
                    ├─ yes → explore
                    └─ no → fast
```

Do not ask the user to choose a mode unless the tradeoff affects the output. Decide internally and report it briefly in Chinese.

## User-Facing Mode Report

Use a compact report:

```md
运行模式：快速模式
原因：已命中离线成熟库索引，不需要读取 Figma 源文件。
质量策略：按百家号规范重绘并通过 24px 可读性检查。
```

For strict mode:

```md
运行模式：严格模式
原因：这是成熟库标准版，需要保证源图形态一致。
下一步：先读取 Figma 源节点/源截图，再生成预览和 Icon Spec JSON。
```

## Mature Source Cache

The mature-source cache is a distilled, compact representation of approved team icons.

Use cache layers in this order:

```txt
L1 — team-icon-index.json
     semantic matching, aliases, source lock, high-level visual summary

L2 — distilled shape spec
     reusable geometry proportions for high-frequency mature icons

L3 — runtime source verification
     Figma node or source screenshot for exact visual fidelity
```

`team-icon-index.json` is required for normal execution. Distilled shape specs are optional but strongly recommended for frequently used exact hits such as 搜索、内容分销、成功、失败、警示、智能诊断.

## Distilled Shape Spec Rule

Add a distilled shape spec only after the mature icon has been inspected from an approved source. A distilled spec may describe:

- outer contour family
- inner symbol family
- bounding box proportions
- stroke/fill behavior
- optical center
- negative-space ratio
- safe simplifications for native Figma editability

Do not store full path data or copyrighted external vectors as the generation source of truth. For team-owned mature icons, store enough structural information to recreate the icon faithfully as editable native nodes.

## When Fast Mode Is Safe

Fast mode is safe when:

- the user is exploring directions
- no exact mature-library source is expected
- an exact mature hit has a reliable distilled shape spec
- the output is a first preview, not final Figma handoff
- small deviations from mature-source proportions are acceptable

Fast mode is not allowed to claim pixel/source fidelity unless the source has been verified or the distilled shape spec is marked production-grade.

## When Strict Mode Is Required

Strict mode is required when:

- the user asks to reuse a mature-library icon exactly
- the request is final production or Figma writeback
- a manager/mentor review depends on visual fidelity
- `needsSourceVerificationForPixelMatch=true` and no production-grade distilled spec exists
- previous output mismatched the mature icon
- the icon is source-locked and visually distinctive, e.g. 内容分销

In strict mode, do not generate from text-only description if the source is needed. Read the Figma node or source screenshot first. If access is unavailable, stop and ask for the missing source instead of guessing.

## Explore Mode Boundaries

Explore mode can generate new variants, but it must not blur canonical reuse.

When an exact mature hit exists:

- default output remains `方案 A — 复用成熟库标准版`
- variants must be labeled `非标准变体`
- variants must not replace the canonical mature icon silently
- variants still use Baijiahao stroke, density, radius, and editability rules

## Performance Guidance Versus Promax

`icon-gen-promax` is usually faster because it is generation-first and does not normally read a Figma mature library. It relies on embedded semantic rules, preview iteration, and quality gates.

`icon-gen-baijiahao` can be slower because it adds a source-first decision layer:

```txt
offline mature index → optional source verification → external sources → AI generation
```

This speed cost is intentional only when it buys correctness. The best production balance is:

- use `fast` mode for most daily requests
- use `strict` mode only for source-locked exact reuse or final writeback
- maintain distilled shape specs for high-frequency mature icons
- use `maintenance` mode outside normal generation sessions to refresh the cache

## Cache Maintenance Targets

Prioritize distillation for:

1. exact mature icons users frequently ask for
2. icons that previously produced semantic or shape mismatches
3. distinctive silhouettes that text descriptions cannot reconstruct reliably
4. status icons with special fill/color behavior
5. icons used in manager/mentor demos

For each newly distilled icon, update:

```txt
team-icon-index.json
team-index-maintenance.md if extraction rules changed
canonical-spec-registry.md if the icon has a reusable production spec
```

## Stop Conditions

Stop instead of trading quality for speed when:

- fast mode would produce a plausible but non-canonical mature icon
- strict mode requires source access that is missing
- source metadata conflicts with the requested meaning
- the icon has a known previous mismatch and no verified source/cached spec is available

Report the stop in Chinese with the exact missing input and the fastest safe next action.

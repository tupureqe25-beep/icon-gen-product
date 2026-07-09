# Promax → Baijiahao Delta

## Status

Defined after auditing `百家号PC Component / icon / 基础元素` on 2026-07-07.

## Purpose

This file records what changed when migrating the reusable `icon-gen-promax` production chain into `icon-gen-baijiahao`.
It controls variables by normalizing Baijiahao mature-library icons from their 48×48 Figma master back to the same 24×24 logical icon system used by `icon-gen-promax`.

Use this file when explaining the skill to a mentor, reviewing generated output, or deciding whether a difference is a true Baijiahao platform rule or only a size-scaling artifact.

## Controlled Comparison

| Attribute | icon-gen-promax | Baijiahao mature library normalized to 24×24 | Delta |
|---|---|---|---|
| Product context | Comic/content-consumption platform | Baijiahao creator-console / PC operations platform | Different semantic world |
| Visual personality | Confident geometric outline, friendly content-product feel | Clear, rational, efficient, less decorative, more tool-like | Baijiahao should be more restrained |
| Default ink | `#0F1218` | `#242529` | Different token |
| Standard stroke | 2px on 24px canvas | 4px on 48px master = 2px normalized | Same after scale normalization |
| Stroke position | Center | Official PDF: inner stroke for PC construction; mature/Figma-native generated output may need compensated center stroke for some nodes | Baijiahao official rule wins; use center only when visually equivalent |
| Stroke cap | Round | Round for generated/open strokes and action marks | Mostly same |
| Stroke join | Round | Round preferred, but canonical team icons may preserve existing join behavior | Baijiahao allows canonical reuse |
| Canvas model | 24×24 production master | 48×48 official PC/team master with 24px logical construction | Baijiahao PC production defaults to 48×48 |
| Padding / safe zone | 2px logical | 4px on 48px master = 2px normalized | Same after scale normalization |
| Corner style | More rounded; closed shapes commonly 4px, reduced only when needed | More restrained; card/document corners often normalize closer to 2px | Different temperament |
| Fill policy | Outline-first; no fills by default; tiny local fill only for collapse cases | Outline-first for normal icons, but mature library permits solid/boolean shapes and canonical colored status icons | Different exception policy |
| Status icons | Normally monochrome | Success `#00BA73`, failure `#F54242`, warning `#FAAD14`, white status mark | Major difference |
| Layer count | Recommended 2–4, hard max 5 | Simple icons 1–4, complex business icons 2–5 | Similar, but Baijiahao accepts business-specific complexity |
| Metaphor priority | Comic-platform reference set and promax metaphor table | Team mature library first, Baijiahao business metaphor second, external source/AI last | Major process difference |
| Existing-library behavior | Registry protocol exists, but not tied to Baijiahao component source | `百家号PC Component / icon / 基础元素` is P1 source of truth | Major source-of-truth difference |
| Hidden reference layers | Not a prominent concern | `.基准线` / `图标/ 规则-24` must be ignored as glyph geometry | Baijiahao-specific extraction rule |
| Naming | Promax/platform naming | `BjhBasic{SemanticName}` or mature-library existing naming | Different product namespace |
| Quality target | Editable, semantically clear, screenshot-matched 24px icon | Same, plus visual weight and metaphor must align with mature library | Baijiahao adds library-match gate |

## Migration Principle

Do not treat Baijiahao as a new drawing engine. Treat it as a variable migration of the mature `icon-gen-promax` pipeline:

```txt
shared capability:
  brief → source strategy → semantic plan → SVG preview → Icon Spec JSON → native Figma drawing → screenshot validation → handoff

Baijiahao variables:
  official PDF rules → mature library priority → platform semantics → #242529 ink → restrained radius → canonical status colors → 48×48 team master → BjhBasic naming
```

Reuse from `icon-gen-promax`:

- phased workflow and designer decision gates
- SVG preview as approval artifact only
- Icon Spec JSON as drawing contract
- editable Figma-native output
- screenshot validation and preview-fidelity branching
- visual quality gates for density, negative space, metaphor clarity, and editability

Do not reuse from `icon-gen-promax`:

- comic-platform semantic table
- `#0F1218` ink token
- 24px-as-final-production assumption for Baijiahao PC
- monochrome-only status behavior when Baijiahao has canonical colored status icons
- any metaphor that conflicts with the Baijiahao mature library

## Validation Routes

Use at least three route types when validating the Baijiahao skill:

| Route | Example | Expected behavior |
|---|---|---|
| P1 reuse | 智能诊断 | Find mature-library match or close equivalent, preserve canonical metaphor |
| P1 adaptation | 发布成功 | Combine existing success/status convention with publish/content semantics |
| AI generation | AI 改写 | Generate a new icon when no exact mature icon exists, but calibrate style against the team library |

## Strict Rule

If a sample fails visual quality, do not patch only that sample. Add the missing rule back into the relevant reference file so the skill improves for the next generation.

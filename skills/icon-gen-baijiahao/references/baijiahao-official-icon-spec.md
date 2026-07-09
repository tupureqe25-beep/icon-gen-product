# Baijiahao Official Icon Spec

## Status

Official-spec distilled v1 — extracted from user-provided `图标规范.pdf` on 2026-07-07.

## Source

```txt
Document: 图标规范.pdf
Title:    图标规范
Updated:  2024/11/18 in document body
Scope:    百家号 icon 基础设计标准 / 双端适配 / 新增图标流程
```

Use this file as the official Baijiahao icon-rule layer. If it conflicts with inherited `icon-gen-promax` behavior, this file wins for Baijiahao work.

## Design Principles

- Icons are graphic representations of actions, states, categories, and data.
- Prefer clear, direct, simple forms with high recognition.
- Keep all UI icons visually consistent in detail language, perspective, stroke weight, endpoint treatment, and overall style.

## PC Master Grid

Baijiahao PC icons are drawn on a `48 × 48px` canvas.

```txt
PC drawing canvas: 48 × 48px
Default PC stroke: 4px
Stroke position:   inner stroke when following the official PDF drawing standard
Common output:     the same PC master can be proportionally scaled for different PC sizes
```

The skill may still use a `24 × 24px` logical model for reasoning and preview, but final Baijiahao component-library output should default to a `48 × 48px` master.

## Scale Table

Use the official proportional stroke table when scaling PC icons:

| Icon size | Baseline stroke | Scale |
|---:|---:|---:|
| 48 × 48px | 4px | 4x |
| 32 × 32px | 2.66px | 2.66x |
| 24 × 24px | 2px | 2x |
| 18 × 18px | 1.5px | 1.33x |
| 16 × 16px | 1.33px | 1.33x |
| 12 × 12px | 1px | 1x |

Do not claim an arbitrary size is production-ready unless its stroke follows this table or the user explicitly approves a draft.

## Construction Elements

### Basic Shapes

Use simple base shapes:

- square
- rectangle
- circle
- triangle

### Stroke Endpoints

- Default segment endpoints are round caps with the same width as the stroke.
- Prefer integer coordinates for line endpoints and editable nodes.
- Avoid casual sub-pixel anchors in actual path coordinates.

### Gaps And Spacing

- Icon internal spacing and gaps should use even numbers.
- Use multiples of `2px` as the primary spacing reference.
- Adjust by visual judgment only when required by the specific shape, while preserving overall consistency.

### Angles

- Diagonal lines should use multiples of `15°`.
- Align diagonals with keyline diagonal or cross-axis references where possible.

### Corners

- Use the documented corner set.
- Regular outer frames commonly use `4px` corner radius.
- Special forms, such as paper-plane shapes, may use other angles/radii when needed by the form.

## Naming

Use unified PascalCase naming:

```txt
{Platform}{IconType}{SemanticPinyin}
```

For Baijiahao Basic icons:

```txt
BjhBasicSousuo
BjhBasicZhuye
BjhBasicNeirong
```

Rules:

- Prefix with `Bjh`.
- Use `Basic` as the icon type for basic icons.
- Use Chinese pinyin for the semantic segment.
- Keep Figma component naming aligned with code/NPM naming.

## Dual-End Adaptation

### PC

```txt
Base canvas:      48 × 48px
Base stroke:      4px
Production logic: draw once on PC master, then proportionally scale for PC scenes
```

### Baidu App / Mobile

The official PDF notes that mobile scenes may use different canvas and stroke rules:

| Mobile scene size | Stroke |
|---:|---:|
| 30 × 30px | 2px |
| 26 × 26px | 2px |
| 22 × 22px | 1.67px |
| 18 × 18px | 1.33px |
| 12 × 12px | 1px |

For mobile adaptation:

- Confirm the exact scene before production.
- Mobile may use different corner choices by scene.
- `40 × 40px` personal-center/common-function scenes use rounded corners.
- Other mobile scenes may use square or rounded corners depending on scenario.
- If mobile rules are unclear, ask the responsible designer before claiming production readiness.

## New Icon Delivery Process

The official process includes visual and code review:

1. Draw the new icon in Figma based on visual rules.
2. Name the icon with the PascalCase rule and upload it to the Figma icon library.
3. Publish the Figma icon library and export SVG for the code owner.
4. Convert SVG units from `px` to `em` in VS Code.
5. Upload the converted icon to the NPM icon platform with the same name and icon type.
6. Re-release package and notify engineering.

For this skill:

- Produce editable Figma-native nodes first.
- Do not treat pasted SVG as the final deliverable.
- If code/NPM handoff is requested, report the required SVG-to-EM and naming alignment steps.

## Relationship To Mature Library

The official PDF defines the rules. The mature Figma library shows approved execution of those rules.

Use both:

```txt
Official PDF spec      → hard production rules
Mature Figma library   → accepted semantics, visual weight, and canonical reuse
AI generation          → fallback only when no mature icon or adjacent pattern fits
```


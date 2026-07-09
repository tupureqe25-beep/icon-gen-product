# Team Icon Library

## Status

Audited source available — `百家号PC Component / icon / 基础元素` was inspected on 2026-07-07.

## Primary Library

```txt
Name:       百家号PC Component
URL:        https://www.figma.com/design/jRtQ7X2U4sNUukyxcJGyoX/%E7%99%BE%E5%AE%B6%E5%8F%B7PC-Component?m=auto&node-id=12535-12665
File key:   jRtQ7X2U4sNUukyxcJGyoX
Page:       icon
Page ID:    12535:12314
Frame:      基础元素
Frame ID:   12535:12665
Frame size: 1518 × 2380
Direct children inspected: 177
BjhBasic direct icons found: 119
```

## Purpose

The team icon library is the highest-priority source of truth for Baijiahao icon generation.

Use it to:

- avoid regenerating existing icons
- preserve accepted metaphors
- calibrate visual weight and density
- build canonical registry entries
- support batch retrieval and adaptation

For Baijiahao work, this audited library is no longer optional background material. It is the first source to check before generating a new icon.

In normal skill execution, do not read this Figma file every time. Use the distilled offline index first:

```
references/team-icon-index.json
```

The Figma mature library is the upstream source. The offline index is the runtime semantic matching layer.

Use runtime Figma lookup only when:

- the offline index does not cover the requested concept
- the index has conflicting or ambiguous candidates
- the user explicitly asks to inspect the mature library
- the output must reuse or verify a specific source node
- the skill maintainer is refreshing the index

## Audited Structural Rules

- The mature team icons are mostly 48×48 components, instances, or frames.
- The 48×48 icon is a 2× Figma master for a 24px logical grid.
- Hidden `.基准线` / `图标/ 规则-24` layers exist in many icons; ignore them for glyph extraction.
- Normal glyph color is `#242529`.
- Most outline/action icons use a 4px stroke on the 48px master, equivalent to 2px on a 24px logical icon.
- Common status icons are intentionally filled and colored:
  - `BjhBasicChenggong1`: green success circle + white check
  - `BjhBasicShibai1`: red failure circle + white cross
  - `BjhBasicJingshi1`: amber warning circle + white mark
- Exact team-library matches should be reused or adapted as controlled variants, not regenerated as competing metaphors.

## Representative Canonical Icons

| Meaning | Canonical / adjacent icon | Node ID | Notes |
|---|---|---:|---|
| 搜索 | `BjhBasicSousuo` | `12535:13154` | Magnifier; black stroke/fill, 48×48 master |
| 成功 | `BjhBasicChenggong1` | `12535:13156` | Canonical status success; green filled circle |
| 失败 | `BjhBasicShibai1` | `12535:13157` | Canonical status failure; red filled circle |
| 警示 | `BjhBasicJingshi1` | `12535:13159` | Canonical warning; amber filled circle |
| 内容 | `BjhBasicNeirong` | `12535:13161` | Card/document metaphor, black outline + text bars |
| 数据 | `BjhBasicShuju` | `12535:13174` | Dashboard/chart metaphor, black stroke |
| 编辑 | `BjhBasicBianji` | `12535:13287` | Single editable vector, black stroke |
| 导出 | `BjhBasicDaochu` | `12535:13258` | Solid/boolean export shape; team style permits solid for clarity |
| 草稿 | `草稿` | `12535:13415` | Document/card style, black stroke |
| 发送 | `发送` | `12535:13459` | Minimal arrow/line metaphor, black stroke |
| 智能诊断 | `智能诊断` | `12535:13408` | Magnifier + diagnostic waveform |

## Expected Inputs

The user or project may provide:

- Figma file URL
- Figma page or frame node ID
- selected Figma nodes
- exported JSON inventory
- icon registry file

## Inspection Checklist

When a library is available, inspect:

```
[ ] icon name and aliases
[ ] semantic meaning
[ ] usage scene
[ ] frame size
[ ] stroke weight
[ ] corner behavior
[ ] path/node count
[ ] layer structure
[ ] badge/status placement
[ ] visual weight compared with nearby icons
[ ] whether it is approved/canonical or draft
```

## If Exact Icon Exists

Ask whether to:

```
A. Reuse canonical icon
B. Create controlled variant
C. Replace/update canonical direction
```

Never silently create a competing icon.

For exact matches in the audited library, default recommendation is `A. Reuse canonical icon` unless the user explicitly needs a scene-specific variant.

If `team-icon-index.json` already provides an exact match, treat it as a valid mature-library hit even when the current user has no Figma permission. Report it as:

```
来源路线：offline team index
来源节点：{nodeId，如有}
是否读取 Figma：不需要
```

## If Adjacent Icon Exists

Match:

- metaphor family
- bounding-box proportions
- density and negative space
- radius behavior
- badge placement
- naming pattern

Then generate the new icon through the normal preview/spec/draw gates.

# Production Handoff

## Status
✅ Defined — component/frame handoff contract

---

## Purpose

Use this file before final handoff. It defines what counts as a production-ready Figma icon output.

Current Baijiahao PC production-safe target: **48×48px team master**, based on the official Baijiahao PDF and mature `百家号PC Component / icon / 基础元素` library. A 24×24 icon is the normalized logical model or an explicit compact/export output, not the default PC component handoff.

If the user requested 16px or 20px output, apply `small-size-production-rule.md` and mark the result as draft-only unless the user chose the official PC master or approved compact output.

The goal is not just to draw something that looks right. The output should be editable, inspectable, repeatable, and easy to add to a real icon library.

---

## Default deliverable

Preferred default Baijiahao PC structure:

```
BjhBasic{Name}                 // Figma component, 48×48
└── BjhBasic{Name}__glyph      // group of native nodes
    ├── lens                   // named shape layer
    ├── handle                 // named shape layer
    └── ...
```

Fallback structure if component creation is unavailable:

```
BjhBasic{Name}                 // 48×48 frame
└── BjhBasic{Name}__glyph      // group of native nodes
    ├── ...
```

Report when frame fallback is used.

For explicit compact/export output, the same structure may be emitted at 24×24:

```
BjhBasic{Name}                 // Figma component/frame, 24×24
└── BjhBasic{Name}__glyph      // grouped native nodes, logical geometry
    ├── ...
```

---

## Handoff requirements

```
[ ] Top-level name follows BjhBasic{SemanticName}
[ ] Top-level size is 48×48 for default Baijiahao PC production, or 24×24 only for explicit compact/export output
[ ] If size <= 20px, the output is explicitly marked draft-only and not production-safe
[ ] Clip content is true
[ ] Top-level container has no visible background or border
[ ] Icon shape nodes are native Figma nodes, not pasted SVG or bitmap
[ ] All shape nodes have descriptive names
[ ] Glyph group is named {meta.name}__glyph
[ ] No hidden trash layers remain
[ ] No construction-only layers remain visible unless documented
[ ] Validation report is returned after drawing
[ ] Screenshot decision gate passed before handoff
[ ] Visual match to the approved SVG preview is reported
[ ] Canonical registry status is reported when production consistency matters
[ ] Any non-editable or less-editable fallback is explained with reason
[ ] Any local tiny fill is explained with reason
```

---

## Flatten policy

Do not flatten by default.

Grouped native nodes are the production default because they are:

- easier to inspect
- easier to revise
- less likely to change stroke appearance
- more repeatable across generation sessions

Flatten only when the user explicitly asks for single-vector output or export preparation.

Before flattening:

1. Screenshot the grouped version.
2. Duplicate or preserve an editable grouped version unless the user approves destructive flattening.
3. Flatten the copy.
4. Screenshot again.
5. Compare appearance.
6. If anything changes, keep the grouped version and report the failure.

---

## Generation notes

If anything non-obvious happened, add a short note in the report. For larger batches, optionally create a visible `⚠️ Generation Notes` frame near the output.

Always note:

- visual match to approved SVG preview: yes / no + differences
- screenshot gate failure and branch taken, if any
- canonical registry status: checked/reused/new entry emitted/unavailable
- frame fallback instead of component
- any geometry fallback, such as arc → polyline
- any part that could not remain fully editable and why
- any local tiny fill and why it was necessary
- any user-approved style override
- any external reference used for metaphor inspiration
- any set-consistency revision
- any flatten attempt and result

---

## Final report format

```md
✅ 已生成 `{meta.name}`
- 交付形式：{component | frame fallback}
- 尺寸：{size}×{size}
- 生产状态：{48px 百家号 PC 可投产 | 24px 紧凑/导出版本 | 小尺寸草稿}
- 结构：Figma 原生可编辑节点分组，未扁平化
- 描边：{stroke}px {支持时内描边 | 补偿后的居中描边}，圆头/圆角，#242529
- 填充：{无 | 局部小填充 + 原因}
- 圆角：rect/openRect 默认 4px 逻辑圆角；例外需说明
- 校验结果：{无阻塞 | 已修复阻塞 | 已停止}
- 与预览一致性：{一致 | 不一致 — 差异 + 已采取动作}
- 成熟库/注册表：{已检查并复用 | 已检查并新增 | 不可用}
- 跨会话一致性：{由注册表/成熟库保障 | 无注册表时无法保证}
- 修正记录：{无 | 列表}
- 备注：{无 | 列表}
```

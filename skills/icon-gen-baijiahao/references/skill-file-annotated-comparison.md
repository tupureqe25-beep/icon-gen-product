# Skill File Annotated Comparison: icon-gen-promax vs icon-gen-baijiahao

## Purpose

This is a learning and explanation document.

It annotates the two main `SKILL.md` files side by side so the skill author can explain:

- what `icon-gen-baijiahao` inherited from `icon-gen-promax`
- what changed and why
- which parts are workflow engine, which parts are business/style variables
- how to judge future edits without breaking the reusable production chain

Do not use this file as runtime instruction. The runnable instructions remain:

```txt
/Users/ximai/.codex/skills/icon-gen-promax/SKILL.md
/Users/ximai/.codex/skills/icon-gen-baijiahao/SKILL.md
```

---

## One-Sentence Relationship

`icon-gen-promax` is the original generation-first production skill for a comic-platform 24px icon system.

`icon-gen-baijiahao` preserves the same production chain, but replaces the platform variables with Baijiahao semantics, Baijiahao official/team style rules, source-library priority, and mature-library reuse.

```txt
Same engine:
brief → semantic plan → preview → spec JSON → editable Figma native draw → screenshot validation

Changed variables:
platform semantics → style tokens → source priority → output master size → naming → exact mature-library behavior
```

---

## 1. Frontmatter / Trigger Metadata

### icon-gen-promax 原文要点

```yaml
name: icon-gen-promax
description: >
  Use when the user asks to create, generate, preview, refine, or draw
  editable 24px outline icon components or icon sets in Figma...
default_size: 24px
output_type: editable-figma-native-icon
```

### icon-gen-baijiahao 原文要点

```yaml
name: icon-gen-baijiahao
description: Use when the user asks to create, generate, adapt, preview, refine,
or draw editable Baijiahao / 百家号 standard icon components or icon sets in Figma...
```

### 注解

| 项目 | promax | baijiahao | 为什么改 |
|---|---|---|---|
| 触发对象 | editable 24px outline icons | Baijiahao standard icons | 新 skill 不再是通用 24px icon，而是百家号标准 icon |
| 工作能力 | semantic planning, preview, native drawing, validation | 继承这些，同时加 source-library strategy 和 Baijiahao rules | 说明新 skill 不是重写，而是扩展 |
| 默认尺寸 | frontmatter 写 `24px` | body 中区分 `24px logical` / `48×48 team master` | 百家号成熟库是 48×48 Figma master，但逻辑仍按 24px |
| metadata 丰富度 | 有 version/category/tags/tools | 现在只保留 name/description | Codex skill 标准只要求 name/description；新 skill 更简洁 |

### 你给 mentor 可以这样讲

> 我没有把 promax 复制成另一个画图 prompt，而是把触发范围改成“百家号标准 icon”。核心能力仍是 promax 的生产链，但触发后会加载百家号规范、成熟库和来源库策略。

---

## 2. Overview / Skill 定位

### icon-gen-promax 原文要点

```txt
This skill is purpose-built for a comic platform icon system.
All icons share a fixed platform style — do not ask the user to choose a style.
Your job is to translate intent into visual semantic directions, previewable SVG,
and finally precise Figma-native nodes consistently.
```

### icon-gen-baijiahao 原文要点

```txt
This skill is purpose-built for the Baijiahao / 百家号 creator-console and AI assistant product family.
It reuses the proven icon-gen-promax production chain:

User intent → brief → source strategy → semantic plan → SVG preview
→ Icon Spec JSON → quality gates → Figma native editable nodes
→ screenshot validation → production handoff
```

### 注解

| 项目 | promax | baijiahao |
|---|---|---|
| 业务背景 | comic platform | 百家号创作者后台 / AI 助手 |
| 关键句 | fixed platform style | reuses promax production chain |
| 最大差异 | 直接从意图到语义方案 | 意图后多了 `source strategy` |
| 本质 | 生成优先 | 来源优先 + 生成兜底 |

### 为什么 baijiahao 加了 `source strategy`

因为百家号已经有成熟库。对这类业务，最危险的不是“画不出来”，而是：

- 已有成熟 icon 却重新生成，造成不一致
- 同一语义出现两个不同形态
- 外部库图标没有套规范就混进来
- AI 自由发挥导致语义偏差

所以 `source strategy` 是新 skill 的关键增量。

---

## 3. Workflow / 工作流结构

### icon-gen-promax 原文结构

```txt
1. BRIEF
2. SEMANTIC PLAN
3. SVG PREVIEW
4. SPEC & DRAW
```

并且有明确决策门：

```txt
After BRIEF → enough semantic info?
After SEMANTIC PLAN → user selected direction?
After SVG PREVIEW → visual approved?
After DRAW → editable, valid & preview-matched?
```

### icon-gen-baijiahao 原文结构

```txt
User intent → brief → source strategy → semantic plan → SVG preview
→ Icon Spec JSON → quality gates → Figma native editable nodes
→ screenshot validation → production handoff
```

### 注解

| 阶段 | promax | baijiahao | 继承/变化 |
|---|---|---|---|
| Brief | 问意图和位置 | 问概念、场景、是否批量、强调点 | 继承 |
| Source Strategy | 没有默认来源策略；外部引用只在失败时触发 | 默认先查成熟库，再查外部来源，最后 AI 生成 | 新增 |
| Semantic Plan | 默认 2–3 方向 | 默认 2–3 方向；但成熟库精确命中只推荐标准版 | 变化 |
| SVG Preview | 临时审批物 | 同样临时审批物，但 source-locked 要匹配源图形态 | 继承 + 加严 |
| Spec JSON | approved preview → spec | approved preview → spec，并记录 `meta.source` | 继承 + 加来源字段 |
| Draw | 24×24 native nodes | 默认 48×48 team master，按 24px logical 缩放 | 变化 |
| Screenshot Gate | 必须截图验证 | 必须截图验证，且加 source/adaptation mismatch 分支 | 继承 + 加来源校验 |

### 关键理解

`icon-gen-baijiahao` 不是把 promax 的第 2 步替换掉，而是在第 2 步之前插入了一个“来源决策层”。

这层决定：

```txt
应该复用成熟库？
应该参考外部库并重绘？
还是应该 AI 原创？
```

---

## 4. Never Do / 禁止项

### icon-gen-promax 原文要点

```txt
- Never paste, import, or embed SVG into Figma as the final output.
- Never skip designer approval for Phase 2 semantic direction or Phase 3 SVG preview.
- Never call external reference lookup by default.
- Never hand off without screenshot validation.
- Never flatten editable native icon nodes by default.
- Never allow large fills, gradients, shadows...
```

### icon-gen-baijiahao 原文要点

```txt
- Never paste, import, or embed SVG into Figma as the final output.
- Never skip semantic direction confirmation unless already confirmed.
- Never copy external library geometry, path data, coordinates, or visual style.
- Never let external sources override Baijiahao style, team library consistency, or user context.
- Never claim source-library or registry consistency if the source was not actually available.
- Never treat hidden .基准线 / 图标/ 规则-24 layers as visible glyph geometry.
```

### 注解

| 禁止项类型 | promax | baijiahao |
|---|---|---|
| SVG 不能作为最终产物 | 有 | 有，完全继承 |
| 不能跳过确认 | 更严格要求 Phase 2 / Phase 3 审批 | 成熟库命中时可少发散，但仍要确认 |
| 外部来源 | 默认不查，失败才查 | 可以查，但必须真实检索，且不能复制几何 |
| 质量 | 禁止大填充、渐变、阴影 | 额外禁止 blob、断裂、重叠、源不一致 |
| Figma 图层 | 没特别强调隐藏基准线 | 明确忽略 `.基准线` / `图标/ 规则-24` |

### 为什么这部分很重要

`Never Do` 是 skill 的护栏。百家号版新增的护栏集中在“来源可信”和“成熟库一致”上。

这说明新 skill 的问题空间已经从：

```txt
如何生成一个好看的 icon
```

升级为：

```txt
如何在已有团队资产和外部来源之间，稳定产出符合百家号规范的 icon
```

---

## 5. Required Runtime / Figma 执行方式

### icon-gen-promax 原文要点

```txt
Always load figma-use before any use_figma call.
Always pass skillNames: "icon-gen-promax".
Implement drawing through real Figma Plugin API scripts.
Do not treat /figma-generate-design as required.
```

### icon-gen-baijiahao 原文要点

```txt
Always load figma-use before any use_figma call.
Always pass skillNames: "figma-use,icon-gen-baijiahao".
Implement final drawing through real Figma Plugin API scripts.
Use Icon Spec JSON as the contract for drawing.
```

### 注解

两者底层都坚持：

```txt
SVG 只是预览
Icon Spec JSON 是合同
Figma 里必须画 native editable nodes
```

区别是 `baijiahao` 更强调：

- `figma-use` 与 `icon-gen-baijiahao` 一起传入
- 最终输出要按百家号 `team-master-48` / `logical-24` profile 判断
- 如果来源库命中，不能 draw 阶段临时改语义

### 你可以这样讲

> 两个 skill 的 Figma 写入技术路线是一致的，都是 JSON 合同驱动 native node 绘制。百家号版只是把输出 profile 和来源 metadata 加进合同里。

---

## 6. Platform Defaults / 平台规范变量

### icon-gen-promax 原文要点

```txt
canvas:       24 × 24 px
bevel:        4px
corner:       4px default
padding:      2px
stroke:       2px center
color:        #0F1218
style:        outline / monochrome rounded shapes
```

### icon-gen-baijiahao 原文要点

```txt
canvas:       24 × 24 px
figma master: 48 × 48 px in audited Baijiahao PC Component library
padding:      2px safe-zone
stroke:       2px logical / 4px in 48px Figma master
color:        #242529 from audited team icons
style:        outline / monochrome / clean creator-console
```

### 注解

| 属性 | promax | baijiahao | 解释 |
|---|---|---|---|
| 逻辑画布 | 24×24 | 24×24 | 底层构图一致 |
| Figma 生产母版 | 24×24 | 48×48 | 百家号 PC Component 成熟库按 48×48 交付 |
| stroke | 2px | 2px logical / 4px master | 等比一致 |
| color | `#0F1218` | `#242529` | 品牌/团队 token 不同 |
| 视觉气质 | 漫剧平台，友好内容产品 | 百家号后台，克制、理性、工具化 | 业务气质变化 |
| fill | 默认不填充，小局部例外 | 默认 outline，但成熟库状态 icon 可彩色填充 | 百家号有成熟库例外 |

### 控制变量理解

如果把百家号 48×48 除以 2，看成 24×24：

- stroke 仍是 2px
- safe zone 仍是 2px
- 许多基础几何约束可继承 promax

真正变的是：

- 颜色
- 圆角气质
- 状态色
- 成熟库优先级
- 输出母版尺寸

---

## 7. User-Facing Language / 输出语言

### icon-gen-promax

Promax 默认英文结构，例如：

```txt
Option A
Visual elements
Meaning
Risk
```

### icon-gen-baijiahao

Baijiahao 明确要求：

```txt
用户可见的关键信息默认用中文输出
视觉元素
表达含义
来源依据
风险判断
推荐结论
```

### 注解

这是为你的使用场景特别加的。

原因不是语言偏好，而是汇报对象变了：

- mentor 要看懂
- 主管要快速判断
- 团队同事要复用
- 设计评审需要中文解释语义和风险

保留英文的地方只有 schema / API / enum，例如：

```txt
team-reuse
source-adapt
ai-generated
Icon Spec JSON
strokeAlign
```

---

## 8. Phase 1 Brief / 信息收集

### icon-gen-promax 原文要点

```txt
Q1. What is the icon for?
Q2. Where will it appear?
Q3. Any expected visual element or meaning emphasis?
Q4. Single icon or a set?
Q5. Any important visual detail to keep or avoid?
```

### icon-gen-baijiahao 原文要点

```txt
Q1. What is the icon for?
Q2. Where will it appear?
Q3. Is this a single icon or an icon set?
Q4. Any meaning emphasis to keep or avoid?
```

### 注解

Baijiahao 版的信息收集更偏业务场景：

```txt
navigation / toolbar / content list / data card / AI assistant / empty state / settings / batch operation
```

这些场景会影响：

- 图标语义重心：动作 / 状态 / 内容 / 数据 / AI
- 是否可以用成熟库标准版
- 是否需要状态色
- 复杂度上限
- 是否批量生成并保持 set consistency

### 和成熟库的关系

应用位置不会随便改基础规范，但会影响匹配逻辑：

```txt
同样叫“发布成功”
toolbar 里可能偏动作完成
toast/status 里可能偏成功状态
content list 里可能偏内容发布结果
```

所以场景是语义决策参数，不是风格参数。

---

## 9. Phase 2 Semantic Plan vs Source Strategy

### icon-gen-promax 原文要点

```txt
Goal: translate the brief into 2–3 visual semantic options before writing JSON.

Option A — {semantic direction}
  Visual elements: ...
  Meaning: ...
  Risk: ...
```

Promax 的 Metaphor decision priority：

```txt
1. User-provided context
2. Internal metaphor decision table
3. Existing platform icon set consistency
4. Optional external library lookup for inspiration only
```

### icon-gen-baijiahao 原文要点

```txt
Phase 2 — Source Strategy

1. Team mature library exact/adjacent match
2. External approved source libraries
3. AI generation fallback
```

然后 Phase 3 才是：

```txt
Translate the brief into 2–3 visual semantic options.

Exception: if Phase 2 found a source-locked exact mature-library match,
present one recommended reuse direction first...
```

### 注解

这是两个 skill 最核心的差异。

| 项目 | promax | baijiahao |
|---|---|---|
| 默认是否查来源 | 否 | 是，先查团队成熟库 |
| 语义方向数量 | 通常 2–3 个 | 通常 2–3 个；成熟库精确命中时默认 1 个标准版 |
| 外部库角色 | 失败/不理解时的参考 | P4 来源，可真实检索，但必须重绘 |
| AI 生成角色 | 主路径 | 兜底或探索路径 |

### 为什么成熟库命中时不应该给 3 个平级方向

如果用户输入的是成熟库已有 icon，比如“内容分销”，那目标不是探索三种新隐喻，而是：

```txt
方案 A — 复用成熟库标准版
可选探索 — 非标准变体
```

这样能防止 AI 把团队已有资产改丢。

---

## 10. External Sources / 外部来源库

### icon-gen-promax 原文要点

```txt
Never call external reference lookup by default.
Trigger Reference Workflow only when:
- user says meaning is misunderstood
- result visually poor
- internal table has no suitable solution
- user explicitly asks to reference external icons
```

### icon-gen-baijiahao 原文要点

```txt
Load references/external-source-connectors.md before using any external icon library.
When using external sources, call scripts/search_external_icons.py and inspect real results...
```

### 注解

Promax 的外部库是“救场参考”。

Baijiahao 的外部库是“来源策略的一层”，但有严格边界：

```txt
Lucide / Tabler / Phosphor / IconPark：可以真实检索
Iconfont：只能在用户提供 symbol.js / sprite / 导出文件时检索
```

外部库输出只能作为：

- 语义参考
- 常见隐喻参考
- 轮廓方向参考

不能作为：

- 最终路径
- 坐标来源
- 百家号规范替代品

### 当前新增能力

`icon-gen-baijiahao` 现在有真实检索脚本：

```txt
scripts/search_external_icons.py
```

它能返回：

- library
- package
- version
- license
- name/title/tags
- sourcePath
- SVG snippet
- styleRisk

这让“来源库”从策略层变成了可执行层。

---

## 11. Phase 3 SVG Preview / 预览

### icon-gen-promax 原文要点

```txt
SVG preview is a temporary approval artifact only.
Use the same platform defaults: 24×24, #0F1218, rounded, outline-first.
If designer rejects, revise SVG preview first.
```

### icon-gen-baijiahao 原文要点

```txt
Use SVG only as a preview artifact.
Use Baijiahao defaults.
For source-locked exact mature-library matches, the SVG preview must match the source silhouette family.
If needsSourceVerificationForPixelMatch=true, do not claim source-matched until inspected.
```

### 注解

两者共同点：

- SVG 都只是审批物
- 不允许把 SVG 作为最终 Figma 产物
- 预览不通过不能进入 spec

Baijiahao 额外加了来源真实性：

```txt
如果是成熟库标准版，预览不是“重新设计”，而是“源图忠实预览”。
```

这就是为什么“内容分销”不能凭文字自由画。

---

## 12. Phase 4A / 5A Icon Spec JSON

### icon-gen-promax 原文 schema 要点

```jsonc
{
  "meta": {
    "name": "AijBasicBookmark",
    "label": "Bookmark",
    "size": 24,
    "grid": 24,
    "context": "chapter card",
    "style": "outline",
    "color_mode": "monochrome"
  },
  "canvas": {},
  "shapes": [],
  "strokes": {},
  "validation": {}
}
```

### icon-gen-baijiahao 原文 schema 要点

```jsonc
{
  "meta": {
    "name": "BjhBasicAiRewrite",
    "label": "AI改写",
    "aliases": ["rewrite", "AI writing", "智能改写"],
    "platform": "baijiahao",
    "source": {
      "route": "team-reuse | source-adapt | ai-generated",
      "library": "team-figma | iconpark | iconfont | lucide | tabler | phosphor | none",
      "reference_id": "",
      "adaptation_notes": ""
    }
  }
}
```

### 注解

| 字段 | promax | baijiahao | 原因 |
|---|---|---|---|
| name | `AijBasic...` | `BjhBasic...` | 产品命名空间变化 |
| aliases | 不突出 | 明确加入 | 用于成熟库/外部库/语义索引 |
| platform | 不突出 | `baijiahao` | 防止通用化 |
| source | 无 | 有 | 记录来源路线和适配说明 |
| route | 无 | `team-reuse/source-adapt/ai-generated` | 体现来源优先 pipeline |

### 关键理解

Baijiahao 版的 JSON 不只是绘图合同，还是来源可追溯合同。

它回答：

```txt
这个 icon 是团队库复用？
外部来源适配？
还是 AI 生成？
```

这对平台化、资产治理、后续归档非常重要。

---

## 13. Phase 4B / 5B Draw in Figma

### icon-gen-promax 原文要点

```txt
Create a 24×24 component/frame named {meta.name}.
Draw shapes[] back → front as editable native nodes only.
Apply stroke defaults and local tiny fills.
Capture screenshot and compare with approved SVG preview.
```

### icon-gen-baijiahao 原文要点

```txt
Resolve output profile: team-master-48 or logical-24.
Create a component/frame named {meta.name}; use 48×48 for team-master-48,
with coordinates scaled 2× from Icon Spec JSON.
Apply Baijiahao stroke, color, radius, and fill rules.
```

### 注解

两个 skill 都是 contract-first，不允许 draw 阶段即兴发挥。

区别：

| 项目 | promax | baijiahao |
|---|---|---|
| 默认 Figma frame | 24×24 | 48×48 team master |
| 逻辑坐标 | 24px | 24px，然后 2× scale |
| 颜色 | `#0F1218` | `#242529` 或状态色 |
| 验证对象 | preview fidelity | preview fidelity + source route/source silhouette |

### 为什么不用 SVG 直接导入

两个 skill 的核心共同点：

```txt
最终必须是 Figma-native editable nodes
```

因为 SVG path 通常不可编辑或不便编辑，不符合团队后续维护需求。

---

## 14. Screenshot Decision Gate / 质检门

### icon-gen-promax 原文要点

```txt
wrong metaphor → return to Phase 2
preview needs changes → return to Phase 3
spec changed proportions → return to Phase 4A
native draw mismatch → return to Phase 4B
minor spacing issue → adjust spec or redraw
```

### icon-gen-baijiahao 原文要点

```txt
wrong meaning → return to Phase 3
source/adaptation mismatch → return to Phase 2 or 4
preview itself is poor → return to Phase 4
spec changed proportions → return to Phase 5A
native draw mismatch → return to Phase 5B
```

### 注解

Baijiahao 版保留 promax 的质量闭环，并加了：

```txt
source/adaptation mismatch
```

这对应你之前遇到的核心问题：

- 来源库选择的是 A，画布里变成 B
- 成熟库命中，但预览画成了另一个隐喻
- 图标放到画布后形变
- AI 生成质量低于原 skill

所以新 skill 的质检不只看“好不好看”，还要看：

```txt
是否和来源一致？
是否和百家号规范一致？
是否仍可编辑？
```

---

## 15. Batch Icon Sets / 批量

### icon-gen-promax 原文要点

```txt
set-consistency-profile.md
icon-set-rules.md
```

### icon-gen-baijiahao 原文要点

```txt
Build a shared set profile before drawing.
Keep one metaphor family per icon.
Prevent duplicate semantic directions across different icon names.
Align visual weight, density, radius behavior, and badge placement.
```

### 注解

Baijiahao 版继承了 promax 的批量一致性逻辑。

但由于有成熟库，批量时还要做来源决策：

```txt
icon A：成熟库复用
icon B：成熟库相邻适配
icon C：外部来源适配
icon D：AI 生成
```

最后仍要统一：

- stroke
- weight
- radius
- density
- badge/status placement

这也是平台化比单次 AI 生成更有价值的地方。

---

## 16. Reference Files / 引用文件结构

### icon-gen-promax 引用结构

核心引用：

```txt
shape-decomposition.md
constraints.md
drawing-primitives.md
stroke-rules.md
figma-node-spec.md
style-guide-outline.md
metaphor-decision-table.md
reference-libraries.md
visual-quality-gates.md
canonical-spec-registry.md
```

### icon-gen-baijiahao 引用结构

继承类：

```txt
shape-decomposition.md
constraints.md
drawing-primitives.md
figma-node-spec.md
visual-quality-gates.md
validation-checklist.md
canonical-spec-registry.md
icon-set-rules.md
production-handoff.md
```

百家号新增类：

```txt
baijiahao-official-icon-spec.md
baijiahao-icon-style.md
baijiahao-metaphor-table.md
team-icon-index.json
team-icon-library.md
team-index-maintenance.md
source-decision-pipeline.md
source-library-protocol.md
source-to-standard-rules.md
runtime-modes-and-cache.md
external-source-connectors.md
```

### 注解

这部分最能说明 skill 的结构原理：

```txt
SKILL.md = 主流程 / 导航
references/*.md = 具体规则
scripts/*.py = 可执行工具
team-icon-index.json = 离线成熟库语义索引
```

这符合 progressive disclosure：

- 不把所有知识塞进主 skill
- 只在需要时加载对应引用
- 复杂/确定性任务交给脚本

---

## 17. Session Memory / 会话记忆

### icon-gen-promax 原文要点

```txt
confirmed_size
confirmed_corner
active_icon_set
last_spec
registry_status
```

### icon-gen-baijiahao 原文要点

```txt
confirmed_platform: baijiahao
confirmed_size: 24 unless user overrides
active_scene
active_source_route
active_icon_set
last_spec
registry_status
```

### 注解

Baijiahao 多了：

- `confirmed_platform`
- `active_scene`
- `active_source_route`

原因是百家号版更依赖：

```txt
当前业务场景
当前来源路线
是否团队库复用 / 外部适配 / AI 生成
```

这使它更适合平台化闭环。

---

## 18. Biggest Conceptual Differences

| 维度 | icon-gen-promax | icon-gen-baijiahao |
|---|---|---|
| 产品背景 | 漫剧平台 | 百家号创作者后台 / AI 助手 |
| 默认方式 | AI 生成优先 | 团队成熟库优先 |
| 外部来源 | 失败时参考 | 可真实检索并作为 P4 来源 |
| 成熟库 | 没有强制读取/索引 | `team-icon-index.json` 是默认语义层 |
| 输出尺寸 | 24×24 final master | 24px logical / 48×48 team master |
| 颜色 | `#0F1218` | `#242529` + 状态色例外 |
| 语义方向 | 通常 2–3 个 | 精确成熟库命中时标准版优先 |
| JSON | 绘图合同 | 绘图合同 + 来源追踪 |
| 质检 | 语义/预览/可编辑/截图 | 再加来源一致性和成熟库保真 |
| 速度 | 通常更快 | 更准确但可能更慢；通过 fast/strict/cache 平衡 |

---

## 19. How To Explain The New Skill To Mentor

可以按这套话术：

```txt
我把 icon-gen-promax 拆成两层理解：

第一层是可复用生产链：
需求澄清 → 语义方向 → SVG 预览 → Icon Spec JSON → Figma native nodes → 截图质检。
这层在百家号 skill 中基本沿用，保证生成质量、可编辑和可验证。

第二层是平台变量：
promax 原来绑定的是漫剧平台 24px icon 规范；
百家号版替换成百家号 PC/AI 助手语义、#242529、48×48 team master、成熟库优先、状态色规则和 BjhBasic 命名。

我额外新增了来源决策层：
团队成熟库 → 外部真实来源库 → AI 生成。
这样可以避免已有 icon 被重复生成，也能在成熟库没有覆盖时，通过 Lucide/Tabler/IconPark/Phosphor 真实检索得到语义参考，再统一重绘成百家号规范。
```

---

## 20. How To Safely Edit The Skill Later

### 可以改的变量

- 新增百家号业务语义
- 新增成熟库 alias
- 新增 useWhen / avoidWhen
- 新增来源库检索规则
- 调整百家号视觉参数
- 增加高频 icon 的 distilled shape spec

### 不要轻易改的核心链路

- SVG 只做预览
- Icon Spec JSON 是绘图合同
- Figma 最终必须 native editable nodes
- 截图质检必须存在
- 外部库不能直接复制路径
- 成熟库精确命中不能被 AI 随便改画

### 判断一次修改是否合理

问四个问题：

```txt
1. 它是改平台变量，还是破坏生产链？
2. 它是否提升成熟库命中/语义准确/视觉质量？
3. 它是否仍能保证 Figma 可编辑？
4. 它是否会让外部来源覆盖百家号规范？
```

如果第 4 个答案是“会”，就不要改。


# Baijiahao Metaphor Decision Table

## Status

Audited v2 — expanded with examples from `百家号PC Component / icon / 基础元素` on 2026-07-07.

## Decision Priority

Choose metaphors in this order:

```
1. User-provided context
2. Offline mature-library index: `team-icon-index.json`
3. Runtime Baijiahao/team icon library lookup, only if the index is missing or ambiguous
4. This metaphor table
5. Approved external source library for semantic reference
6. New AI-generated metaphor
```

External references can inform meaning, but cannot override Baijiahao style or team conventions.

The offline index is the first stable semantic-matching layer. It lets the skill reuse mature-library knowledge without requiring Figma access during every run.

## Common Concepts

| Concept | Context clue | Preferred metaphor | Avoid |
|---|---|---|---|
| AI改写 / 智能扩写 | AI assistant / editor | document/text lines or pen/edit stroke + tiny detached AI spark | magic wand alone; dominant arrow; folded corner + spark collision; text lines + arrow + spark all at once |
| AI生成 | creation / assistant | spark + document/card | abstract spark cluster |
| AI优化 | quality improvement | sliders/check + spark | gear if it reads as settings |
| 发布 | content operation | paper plane / upload arrow / document arrow | megaphone unless broadcast |
| 发布成功 | status result | reuse `BjhBasicChenggong1` for pure success; document + check only for content-specific success context | silently creating a competing success metaphor |
| 内容分销 | content list / operation | reuse mature `内容分销` icon | generic content card + share/export arrows |
| 草稿 | content management | document outline + small corner/pen | archive box |
| 审核 | content review | document + magnifier/check | shield unless safety/moderation is explicit |
| 审核失败 | review state | document + warning/minus | complex error page |
| 风险/违规 | moderation | shield/warning | lock unless access control |
| 内容管理 | console/list | document stack / list card | folder if not file organization |
| 图文 | content type | image frame + text line | photo-only icon |
| 视频 | content type | play frame | camera unless shooting |
| 文章 | content type | document/text lines | book unless long-form reading |
| 数据看板 | analytics | chart frame / dashboard grid | generic monitor |
| 数据增长 | analytics | upward trend line + axis/card | rocket |
| 阅读量 | analytics | eye + small chart/card | book icon |
| 粉丝 | account/social | person/group outline | heart unless affection |
| 新增粉丝 | growth | person + plus | chart-only |
| 互动 | comments/engagement | speech bubble + dot/line | heart-only |
| 收益 | monetization | coin/wallet/card | crown unless privilege |
| 权益 | creator benefits | badge/ticket/check | gift unless reward |
| 任务 | growth/task | checklist/card | flag unless milestone |
| 通知 | system | bell outline | megaphone unless announcement |
| 设置 | configuration | gear outline | sliders if advanced tuning |
| 搜索 | discovery | magnifier | filter funnel |
| 筛选 | table/list | funnel | search icon |
| 排序 | table/list | vertical arrows + lines | funnel |
| 批量操作 | management | stacked cards + check/arrow | grid alone |
| 导入 | file/input | tray + inward/down arrow | download if direction unclear |
| 导出 | file/output | tray + outward/up arrow | share arrow unless external sharing |
| 同步 | update | two circular arrows | refresh single arrow |
| 刷新 | reload | single circular arrow | sync arrows |
| 账号 | profile | person circle | group |
| 团队 | collaboration | two/three people | person only |
| 帮助 | support | question bubble / lifebuoy | guide/compass unless onboarding |

## Team Index Matching Rules

Use `team-icon-index.json` before inventing a new metaphor.

| User says | Prefer mature-library basis | Controlled variant rule |
|---|---|---|
| 搜索 / 检索 / 查询 | `BjhBasicSousuo` | Use magnifier; never substitute filter/sort. |
| 内容分销 / 分销 / 内容分发 | `内容分销` | Exact mature-library hit; do not degrade to `BjhBasicNeirong` or generic share/export. |
| 内容 / 内容管理 / 文章 | `BjhBasicNeirong` | Use document/card + text bars; add at most one action/status mark. |
| 数据 / 看板 / 统计 | `BjhBasicShuju` | Use dashboard/chart baseline; avoid money metaphor unless revenue is explicit. |
| 成功 / 发布成功 | `BjhBasicChenggong1` | Pure status reuses green success; content-specific success may use document + check. |
| 失败 / 审核失败 | `BjhBasicShibai1` | Pure failure reuses red failure; content-specific failure may use document + warning/minus. |
| 警示 / 风险 / 违规 | `BjhBasicJingshi1` | Pure warning reuses amber warning; moderation-specific variants may use shield/document + warning. |
| AI改写 / 智能改写 / 智能扩写 | `BjhBasicBianji` + content family | Writing/editing/content expansion must be primary; AI spark is optional, secondary, tiny, and detached by 2px. Prefer one expansion cue only. |
| 智能诊断 / AI诊断 | `智能诊断` | Use magnifier + diagnostic signal; do not use random spark clusters. |
| 导出 | `BjhBasicDaochu` | Distinguish from share and download. |
| 下载 | `BjhBasicXiazai` | Downward receiving action; distinguish from export. |
| 发送 / 提交 | `发送` | Paper-plane/send family; distinguish from share/export. |
| 筛选 | `BjhBasicSaixuan` | Funnel; distinguish from search/sort. |
| 排序 | `BjhBasicPaixu` | Ordered arrows/list; distinguish from filter. |
| 阅读量 / 浏览量 / 预览 | `BjhBasicYanjing` | Eye is primary; add analytics only if data context is explicit. |
| 粉丝 / 关注 / 新增粉丝 | `BjhBasicGuanzhu` | Follow relationship first; add plus only for new fans. |

If a requested concept has an exact mature-library basis and an AI-generated alternative, present the mature-library basis first. AI generation should explore variants, not compete with a canonical team metaphor.

For `内容分销`, the mature-library basis is source-locked: rounded hexagon-like container + inner Y-shaped branch. Do not substitute with a three-dot share-network mark, even if it also means distribution.

## Business-Specific Mature Icon Priority

These concepts are easy to over-generalize. Prefer exact mature-library entries before using broad bases such as `BjhBasicNeirong`, `BjhBasicShuju`, or generic status icons.

| User says | Prefer mature-library basis | Avoid fallback |
|---|---|---|
| 直播回看 / 直播回放 / 回放 | `直播回看` | generic play, clock/history |
| 小说 / 网文 | `小说` | article/document generic |
| 表情 / emoji | `表情` | user/avatar or status face |
| 草稿 / 草稿箱 | `草稿` | archive/document generic |
| 课程 / 教程 | `BjhBasicKecheng` | article/book generic |
| 活动 / 运营活动 | `BjhBasicHuodong` | notification or campaign-free generic card |
| 推荐 / 推荐位 | `BjhBasicTuijian` | notification or like |
| 代码 / 开发 | `BjhBasicDaima` | content distribution |
| 附件 | `BjhBasicFujian` | upload/link |
| 标签页 / 页签 | `BjhBasicYeqian` | browser tab/card generic |
| 加粗 / 粗体 | `加粗` | generic edit |
| 倾斜 / 斜体 | `倾斜` | generic edit |
| 下划线 | `下划线` | generic edit or divider |
| 撤回 / 撤销 | `左撤回` | back navigation |
| 橱窗 / 商品橱窗 | `BjhBasicChuchuang` | generic shopping bag |
| 购物袋 / 商品 | `BjhBasicGouwudai` | generic ecommerce or card |
| 结算 | `BjhBasicjiesuan` | revenue or success |
| 电商权益 / 权益 | `BjhBasicDianshangquanyi` | honor or coupon-like generic |
| 任务热度 / 热度 | `BjhBasicrenwuredu` | generic data growth |
| 机构 / 机构账号 | `BjhBasicJigou` | user/team generic |
| 无违规 / 合规 | `BjhBasicWuweigui` | pure success or warning |
| 等级 / 级别 | `BjhBasicDengji` | honor or points |
| 荣誉 / 勋章 | `BjhBasicRongyu` | success or benefits |
| 导入 | `BjhBasicDaoruOld` when exact mature import is requested | upload/download |
| 导航收起 / 导航展开 | `BjhBasicDaohangshouqi` / `BjhBasicDaohangzhankai` | generic expand/collapse |

## Audited Team Examples

Use these before inventing new metaphors:

| Concept | Team icon | Meaning guidance |
|---|---|---|
| 搜索 | `BjhBasicSousuo` | Canonical magnifier; use for search/discovery. |
| 成功 | `BjhBasicChenggong1` | Canonical pure success state. |
| 失败 | `BjhBasicShibai1` | Canonical pure failure state. |
| 警示 | `BjhBasicJingshi1` | Canonical warning state. |
| 内容 | `BjhBasicNeirong` | Content/card/document baseline. |
| 数据 | `BjhBasicShuju` | Data/dashboard baseline. |
| 编辑 | `BjhBasicBianji`, `BjhBasicBianji1`, `BjhBasicBianji2` | Editing metaphor family. |
| 导出 | `BjhBasicDaochu` | Export direction and tray/bottom-line convention. |
| 上传 | `BjhBasicShangchuan` | Upload/import direction family; confirm direction carefully. |
| 草稿 | `草稿` | Draft/document state. |
| 发送 | `发送` | Minimal paper-plane/arrow family. |
| 智能诊断 | `智能诊断` | AI/diagnosis can use magnifier + inner signal, not random spark clusters. |

## Use

1. Match the user's scene first.
2. Prefer team library metaphor if it exists.
3. Use this table to avoid random or duplicate directions.
4. If a concept has multiple valid metaphors, present them as semantic options before preview.

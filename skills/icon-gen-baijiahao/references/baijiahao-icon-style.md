# Baijiahao Icon Style

## Status

Audited v2 — updated from the real `百家号PC Component / icon / 基础元素` mature team library on 2026-07-07.

## Personality

Baijiahao icons should feel:

- clear, rational, efficient, and creator-console oriented
- lighter and more utilitarian than consumer entertainment icons
- friendly enough for AI assistant workflows, but not decorative
- readable in dense PC management interfaces

Avoid cute, game-like, over-rounded, decorative, or marketing-poster icon behavior.

## Base Rules

```
logical canvas:        24 × 24 px
team Figma master:     48 × 48 px, 2× scaled from the 24px logical grid
logical live area:     20 × 20 px
team master live area: usually 40 × 40 px to 44 × 44 px depending on metaphor
logical padding:       2px
team master padding:   4px
logical stroke:        2px normalized stroke
team master stroke:    4px official PC stroke
stroke align:          official PDF says inner stroke for PC drawing; Figma-native generated output may use center stroke only when coordinates are inset/compensated and screenshot matches the official 48px visual result
cap:                   round for open strokes and action marks
join:                  round preferred for generated icons; match team canonical when reusing
normal icon color:     #242529
style:                 clean PC-console icon, mostly outline with controlled solid details
radius:                2px logical / 4px team master default for cards and document corners
optical:               always on
```

If the target project provides a Baijiahao icon token, use that token over `#242529`.
Do not introduce gradients, shadows, blur, random opacity, duotone, or decorative color.

## Audited Team Library Rules

- The mature library frame is `百家号PC Component / icon / 基础元素`.
- Most deliverable icons are 48×48 components or frames named `BjhBasic*`.
- The 48×48 master is a production container, not a new visual style; keep 24px logical thinking and scale geometry by 2 when drawing in that library context.
- Many icons include hidden `.基准线` or `图标/ 规则-24` layers. These are reference grids only and must not be counted as glyph layers or exported as visible icon geometry.
- Standard monochrome glyphs use `#242529`, commonly with 4px stroke on the 48px master.
- The official PDF defines PC icons as 48×48 with 4px inner stroke. If a Figma API path cannot preserve inner stroke for a given primitive, use center stroke with adjusted path bounds and verify visually against the 48px master.
- Status icons may be filled and colored when canonical: success `#00BA73`, failure `#F54242`, warning `#FAAD14`, with white status mark. Do not force these canonical status icons into monochrome outline.
- Some mature icons use filled or boolean shapes for clarity. For newly generated icons, prefer editable simple vectors/rectangles/ellipses, but allow small solid details when they match the mature library and improve 24px readability.

## Density Rules

- Recommended visible glyph layers: 1–4 for simple system icons, 2–5 for complex business icons.
- Hard max: 5 paths unless the user explicitly approves a non-production draft.
- Keep secondary badges simple: check, dot, spark, plus, minus, arrow.
- Keep 2px visible gaps around badges and top-right marks.
- For success/status icons, keep the check mark visually detached from the main object unless the product convention explicitly uses an embedded check. If it sticks to a document/card/tray corner, shrink or shift the main object rather than letting the strokes merge.
- For AI assistant icons, use at most one AI marker. If the main object/action is already clear, keep the spark tiny and detached, or remove it when density reaches 5 paths.
- Do not stack AI spark, document, status, and arrow all in one 24px icon unless one element is removed.

## Baijiahao-Specific Bias

- Prefer document/list/card metaphors for content-management concepts.
- Prefer chart/trend/meters for data concepts.
- Prefer shield/check/magnifier for review, moderation, or diagnosis.
- Prefer pen/spark/cursor for AI-assisted creation, but keep spark minimal.
- Prefer person/group/follow relationship for fans and account concepts.
- Prefer wallet/ticket/coin only when revenue or benefits are explicit.

## Quality Failures

Reject and redraw when:

- strokes visually merge into dark blobs
- inner counters collapse
- arrowheads look like filled triangles
- details are packed into a 4–6px area
- two concepts compete equally
- metaphor requires explanation to understand
- icon looks copied from an external library rather than redrawn into Baijiahao style
- a 48×48 team-master icon is drawn with unscaled 24px geometry and looks tiny
- hidden baseline/rule layers become visible in the final glyph

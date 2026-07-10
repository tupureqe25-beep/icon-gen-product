# Source To Baijiahao Standard Rules

## Status

Draft v1 — conversion rules for source icons.

## Conversion Goal

Transform a selected source icon into a Baijiahao-standard, editable, production icon while preserving the intended semantic silhouette.

The final icon should feel like it belongs to Baijiahao, not like a pasted IconPark/Iconfont/Lucide asset.

When the source is the audited Baijiahao team Figma library, the goal is not to restyle it from scratch. The goal is to reuse or produce a controlled variant that preserves the accepted team metaphor, 48×48 master convention, color exceptions, and visual weight.

Exact mature-library matches are source-locked by default. For these, conversion means native redraw of the same visible silhouette, not semantic reinterpretation.

If the index entry has `needsSourceVerificationForPixelMatch: true`, text-only redraw is not enough. Inspect the source Figma node or a source screenshot before preview/spec. If inspection is not possible, stop and report that source fidelity cannot be guaranteed.

## Conversion Steps

1. Identify the source icon's core metaphor.
   - For exact mature-library hits, first identify the actual visible silhouette, not just the semantic label.
   - If source verification is required, inspect the Figma node or source screenshot before producing preview geometry.
2. For external sources, confirm the candidate passed the Source Intake Check in `external-source-connectors.md`.
3. Select one dominant source metaphor. Do not merge several external icons into one compound sketch.
4. Remove decorative details not needed at 24px.
5. Rebuild the icon on a 24×24 canvas with 2px safe zone.
6. If writing to the Baijiahao component library, scale the 24px logical construction to a 48×48 team master.
7. Convert strokes to Baijiahao defaults.
8. Resolve corners and terminals using Baijiahao style.
9. Simplify path count to 2–4 recommended, 5 max.
10. Replace dense fills with open outline constructions unless the mature team library uses a solid/status form for clarity.
11. Keep badges detached with a visible 2px logical gap.
12. Convert to Icon Spec JSON.
13. Draw as Figma-native editable nodes.
14. Screenshot-compare source silhouette intent and approved preview.

## External Source Adaptation Guardrails

External retrieval improves semantic anchoring, but it does not make the output production-safe by itself.
The risky step is the redraw. Apply these guardrails before showing any thumbnail or SVG preview:

- Use one primary external source per option. Additional sources may only explain why a metaphor was rejected.
- Do not use one source for `text increase` and another source for `pencil sparkles` in the same option. Pick the better one, then simplify.
- Preserve the source's broad silhouette, not its full detail set.
- Do not combine `document + folded corner + long text lines + arrow + AI spark` in one 24px icon.
- Do not combine `text lines + right arrow + plus` for writing/expansion concepts; it reads as send/next/add, not intelligent expansion.
- Do not place a spark, plus, badge, or arrow on the same corner that already has a folded document corner.
- Do not let a spark touch or nearly touch the main document, pen, arrow, or folded corner; keep a visible 2px gap or remove it.
- Do not use filled arrowheads or triangle-like arrowheads that create a dark blob at 24px.
- Do not let an arrow overlap text lines. If the arrow is required, it must be detached and small enough not to become the main meaning.
- Avoid equal-weight compound icons. One element must be primary; secondary marks must be visibly smaller and calmer.
- If external sources disagree, prefer the simplest readable source and reject the rest instead of blending them.
- Reject source candidates whose standardized version becomes abstract geometry rather than a recognizable object/action.
- Reject candidates that need explanatory text to be understood at 24px.
- Do not show a direction when its own risk assessment is `中` or `高`; revise or omit it.

For `智能改写 / 智能扩写 / AI写作`:

- Primary metaphor must read as writing/editing/content expansion.
- Preferred safe constructions:
  1. document/card + two or three open text lines + tiny detached AI spark
  2. pen/edit stroke + two open text lines + tiny detached AI spark
  3. text lines with one controlled extension cue, without a document fold
- Avoid:
  - document folded corner plus spark on the same top-right area
  - pen shoved into text lines with no breathing room
  - pen/sparkle icons that read as magic wand or tool rather than writing/expansion
  - right arrow dominating the icon, which reads as jump/next/open
  - multiple extension cues in one icon
  - spark larger than the text-line gap or touching the main contour
  - opposing L-corners / crop-like corners as the main metaphor, because they read as resize, crop, or input-area expansion
  - text lines partially hidden behind a pen body, because it reads as collision rather than writing

If the safest construction still looks glued, crowded, or ambiguous, drop the AI spark first. Semantic clarity and clean construction beat decorative AI marking.
If a pen-based construction cannot keep 2px breathing room from every text line, switch to a document/text-line construction instead.
For Phase 3 semantic-direction sketches, do not use overlapping arrows, plus marks, pens, or sparks at all. Phase 3 must show separated meaning cues only; detailed integration belongs to Phase 4A after the semantic direction is selected.

For exact mature-library hits, the screenshot comparison must include source-silhouette fidelity:

```txt
outer contour matches? yes/no
inner mark family matches? yes/no
orientation matches? yes/no
visual weight matches? yes/no
```

Any `no` means return to source inspection or redraw; do not proceed as approved.

## Preserve

- primary semantic silhouette
- object/action relationship
- directionality of arrows
- status meaning
- recognizable metaphor family
- exact mature-library silhouette when `matchType = exact`

## Change

- line weight
- radius
- bounding box
- spacing
- density
- badge size and placement
- filled regions that violate outline style
- library-specific quirks

Do not change for exact mature-library hits:

- outer contour family
- inner symbol family
- action direction/orientation
- number of endpoints/branches if it changes the metaphor
- mature-library canonical status/color exception

## Reject Source Candidate When

- it relies on filled silhouette to be understood
- it needs more than 5 paths after simplification
- it has too many tiny internal details
- it conflicts with Baijiahao metaphor table
- it duplicates another approved team icon with a different meaning
- it only works by combining multiple source metaphors into a busy compound icon
- it forces a top-right collision between a folded corner, badge, spark, or arrow
- it requires overlap or stacking to make the source metaphor fit
- it standardizes into abstract corners/brackets rather than a readable writing/content metaphor
- its preview risk is `中` or `高` after one revision pass

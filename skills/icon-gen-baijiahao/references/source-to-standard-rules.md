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
2. Remove decorative details not needed at 24px.
3. Rebuild the icon on a 24×24 canvas with 2px safe zone.
4. If writing to the Baijiahao component library, scale the 24px logical construction to a 48×48 team master.
5. Convert strokes to Baijiahao defaults.
6. Resolve corners and terminals using Baijiahao style.
7. Simplify path count to 2–4 recommended, 5 max.
8. Replace dense fills with open outline constructions unless the mature team library uses a solid/status form for clarity.
9. Keep badges detached with a visible 2px logical gap.
10. Convert to Icon Spec JSON.
11. Draw as Figma-native editable nodes.
12. Screenshot-compare source silhouette intent and approved preview.

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

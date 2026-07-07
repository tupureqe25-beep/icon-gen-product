# Metaphor Decision Table

## Status
✅ Defined — production stability layer

---

## Purpose

Use this file before external library lookup when the icon concept is ambiguous.
It keeps metaphor choice reliable and repeatable without making the drawing feel rigid.

The table does **not** define exact coordinates. It only defines the semantic direction.
Final geometry still follows the platform style, the icon context, and the existing set.

---

## Decision Priority

Choose the icon metaphor in this order:

```
1. User-provided context
2. Internal metaphor decision table
3. Existing platform icon set consistency
4. Optional external library lookup for inspiration only
```

External library lookup may help resolve uncertainty, but it must not override the
project style guide, the user context, or the platform's own icon language.

Never copy external geometry. Translate the chosen metaphor into this platform's
native primitives.

---

## Common Ambiguous Concepts

| Concept | Context clue | Preferred metaphor | Avoid |
|---|---|---|---|
| share | card action / chapter action | forward arrow or curved arrow | social node graph unless social sharing is explicit |
| share | social / invite / network | three connected nodes | box-with-arrow if it reads as external link |
| share | open outside current app | box + outward arrow | generic forward arrow |
| guide | onboarding / tutorial | signpost or compass needle | question mark unless it means help |
| guide | navigation / map | route line or compass | book icon unless reading guide |
| subscription | paid plan / membership | badge / ticket / crown outline | filled crown or coin pile |
| subscription | following creator | person + small check/ring | shopping cart |
| creator | author profile | person outline + pen/spark | generic user icon only |
| creator tools | editing workspace | pen / magic wand / tool mark | avatar-only metaphor |
| chapter | reading structure | page stack / list lines | calendar unless time-based |
| episode | video/comic sequence | stacked frame / play frame | generic document |
| filter | toolbar / search result | funnel outline | sliders if the product already uses funnel |
| sort | list order | vertical arrows + lines | filter funnel |
| upload | file transfer | tray + upward arrow | cloud unless cloud storage is explicit |
| download | file transfer | tray + downward arrow | save disk unless saving is explicit |
| save | editor action | bookmark / disk depending product convention | download arrow |
| collect | content action | bookmark / star outline | folder unless organizing content |
| favorite | emotional preference | heart outline | star if rating is intended |
| rating | score / review | star outline | heart |
| history | recent activity | clock arrow | archive box |
| message | comment / chat | speech bubble | envelope unless email |
| notification | alert | bell outline | megaphone unless broadcast |
| settings | configuration | gear outline | sliders unless fine-tuning controls |
| search | discovery | magnifier | filter/sort marks |
| more | overflow menu | three dots | plus |
| close | dismiss | x mark | back arrow |
| back | navigation | left arrow | x mark |
| refresh | reload | circular arrow | sync if two-way exchange is intended |
| sync | two-way update | two circular arrows | refresh single arrow |
| lock | private / restricted | lock outline | shield unless security/protection |
| protect | safety / moderation | shield outline | lock if access control is not the concept |
| delete | remove permanently | trash outline | x mark if dismiss only |
| hide | visibility off | eye + slash | delete/trash |
| visible | show / preview | eye outline | play button |

---

## How to use the table

1. Identify the user's context first.
2. Pick the row whose context clue matches best.
3. Convert the preferred metaphor into 2–5 native primitives.
4. If two rows both fit, prefer the one already used by the platform's existing icon set.
5. Use external lookup only if the concept is missing from this table or still ambiguous.

---

## Ambiguity report format

When a concept has multiple valid metaphors, briefly report the decision:

```
Metaphor choice: "share" can mean social sharing, external link, or forward action.
For a chapter card action, I chose a forward arrow because it reads best as content sharing in context.
```

# Reference Libraries

## Status
✅ Defined — production reference layer

---

## Overview

Two icon libraries are available as generation references.
Use them for:
- **Semantic comprehension** — understanding how a concept is conventionally visualized
- **Shape vocabulary** — what primitives and proportions work for a given metaphor
- **Consistency** — matching the visual weight and feel of existing icons nearby

Do NOT copy shapes verbatim. Use libraries as inspiration and reference,
then redraw using this platform's rules (2px stroke, #0F1218, rounded, 24px grid).

---

## Decision priority

Do not use external lookup as the first step.

Resolve icon metaphors in this order:

```
1. User-provided context
2. Internal metaphor decision table
   → references/metaphor-decision-table.md
3. Existing platform icon set consistency
   → Library B, if available/relevant
4. Reference Workflow
   → Library A, only under explicit trigger conditions
```

Why: web libraries can change and may contain inconsistent styles. They are useful
for repairing semantic uncertainty, but they reduce repeatability if they become the primary source of truth.

External lookup must never override:
- the user's stated context
- the platform style guide
- the internal metaphor decision table
- the existing platform icon set
- production constraints and validation gates

---

## Library A — Iconfont (Web)

```
URL:    https://www.iconfont.cn/
type:   Alibaba open vector icon library — browse by keyword
```

### How to use

Use Library A only after the Reference Workflow is triggered and internal methods still do not resolve the semantic direction.

1. Open `https://www.iconfont.cn/search/index?searchType=icon&q={keyword}` replacing `{keyword}` with the icon concept.
   Try both English and Chinese if the term is domain-specific.
2. Scan the top results — observe:
   - Which **metaphor** is most common for this concept?
   - Which **primitive family** appears repeatedly? e.g. rounded rect, circle, arrow, envelope.
   - What is the typical **complexity level**? e.g. 2-path, 3-path, 5-path.
3. Use the result only to inform metaphor choice.
4. Redraw from scratch using this platform's primitives and constraints.

### Do not use Library A to

- copy coordinates
- copy path data
- copy visual style
- justify filled silhouettes in the outline style
- override the platform's existing icon language

### When to consult

Use Library A only as part of the Reference Workflow, triggered when:

- The user says the icon meaning is misunderstood
- The user says the visual result is poor, wrong, or "not what I mean"
- The agent still cannot map semantic intent after clarification
- SVG preview repeatedly fails review
- The internal metaphor table has no suitable solution
- The user explicitly asks to reference external icons

Do not consult Library A simply because every icon could benefit from inspiration.

---

## Library B — Figma Canvas Library

```
URL:        https://www.figma.com/design/ChWPGs0aoqUovUMVC4W373/icon?node-id=0-1
file:       icon
root node:  0-1
type:       platform's own existing icon set — native Figma nodes
```

### How to use

1. Use `figma-use` / `use_figma` to open the file and browse from node `0-1`.
2. Search or scan for an icon matching or adjacent to the concept.
3. If found — inspect:
   - **Layer structure**: how many paths, which node types used
   - **Proportions**: how large the shape sits within the 24px frame
   - **Corner radii**: what values are actually used on this platform
   - **Visual weight**: does it feel heavier/lighter than the 2px stroke default?
   - **Negative space**: does it stay airy, or does it intentionally feel dense?
4. If the exact icon exists → note it, confirm with user whether to reuse or redraw.
5. Use findings to calibrate the new icon's spec — especially for proportion and weight matching.

### When to consult

- Platform-specific concepts (comic reading, chapter navigation, subscription, creator tools)
- Generating a set that must visually match existing platform icons
- Checking for duplicates before drawing
- Calibrating visual weight for a new icon in an existing toolbar or nav

---

## Reference Workflow

Use this workflow only after one of the explicit trigger conditions occurs.
It is a repair loop for semantic understanding, not a default generation step.

```
  Trigger condition occurs
  user rejects meaning / preview fails / agent cannot map intent / user asks
          │
          ▼
  Restate the semantic uncertainty
  What is unclear: object? action? state? metaphor? domain term?
          │
          ▼
  Check existing platform set if relevant
  Library B → proportion / weight / platform vocabulary
          │
          ▼
  Consult external references if still needed
  Library A → conventional metaphor patterns only
          │
          ▼
  Extract semantic patterns only
  Do not copy geometry, coordinates, stroke style, or filled silhouettes
          │
          ▼
  Return 2–3 revised visual semantic options
          │
          ▼
  Generate a new SVG preview from the selected revised option
```

### Trigger checklist

```
[ ] User says the icon meaning is misunderstood
[ ] User says the visual result is poor / wrong / not what they mean
[ ] Agent still cannot map semantic intent after clarification
[ ] SVG preview repeatedly fails review
[ ] Internal metaphor table has no suitable solution
[ ] User explicitly asks to reference external icons
```

### What to extract

Extract only:
- conventional metaphor choices
- repeated primitive families, e.g. tray, cloud, file, arrow, badge
- rough complexity level, e.g. 2-path / 3-path / 5-path
- semantic relationship between elements, e.g. arrow enters tray, dot marks status

Never extract:
- exact path data
- coordinates
- filled silhouettes as final style
- gradients, shadows, color systems
- decorative details that conflict with platform style

---

## Decision report format

For ambiguous concepts, report the decision briefly:

```
Metaphor: "share" can mean social graph, external link, or forward action.
Context: chapter card action.
Decision: use forward arrow; external lookup not needed.
```

If Library A was used:

```
Reference Workflow triggered: {reason}.
Reference: checked Iconfont for conventional metaphor only; extracted semantic pattern, then redrew from scratch using platform primitives.
Revised options returned before regenerating SVG preview.
```

---

## Registered library locations

```
Library A — Iconfont (web)
  URL:          https://www.iconfont.cn/
  use:          reference-workflow inspiration for semantic repair only

Library B — Figma canvas
  URL:          https://www.figma.com/design/ChWPGs0aoqUovUMVC4W373/icon?node-id=0-1
  file name:    icon
  start node:   0-1 (root — browse from here)
  use:          inspect existing platform icons for style, weight, proportion reference
```

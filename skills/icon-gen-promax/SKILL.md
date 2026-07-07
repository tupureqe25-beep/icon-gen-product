---
name: icon-gen-promax
version: 1.0
description: >
  Use when the user asks to create, generate, preview, refine, or draw
  editable 24px outline icon components or icon sets in Figma. This skill
  supports semantic planning, SVG preview approval, native-node drawing,
  screenshot validation, preview-to-Figma fidelity checks, and canonical
  registry protocol.
category: design
tags:
  - icon
  - figma
  - svg-preview
  - native-nodes
  - design-system
  - production
compatible_tools:
  - figma-use
  - use_figma
default_size: 24px
output_type: editable-figma-native-icon
---

# Icon Generation Skill

## Overview

This skill is purpose-built for a **comic platform** icon system.
All icons share a fixed platform style — do not ask the user to choose a style.
Your job is to translate intent into visual semantic directions, previewable SVG, and finally precise Figma-native nodes consistently.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              ICON GEN WORKFLOW                              │
├──────────────┬────────────────────┬────────────────────┬───────────────────┤
│  1. BRIEF    │  2. SEMANTIC PLAN  │  3. SVG PREVIEW    │  4. SPEC & DRAW   │
│              │                    │                    │                   │
│  Ask intent  │  Offer 2–3 visual  │  Generate SVG      │  Convert approved │
│  & context   │  semantic options  │  preview in Codex  │  preview to JSON  │
│              │          ↓         │          ↓         │  then draw in     │
│  Default     │  User chooses /    │  User reviews      │  Figma native     │
│  24px        │  refines direction │  visual style /    │  editable nodes   │
│              │          ↓         │  shape / details   │                   │
│  ──────────  │  Confirm visual    │          ↓         │  ───────────────  │
│  Output:     │  direction         │  Confirm preview   │  Output:          │
│  brief       │                    │  result            │  icon component   │
│              │  ────────────────  │                    │                   │
│              │  Output:           │  ────────────────  │                   │
│              │  confirmed         │  Output:           │                   │
│              │  direction         │  approved SVG      │                   │
│              │                    │  preview           │                   │
└──────────────┴────────────────────┴────────────────────┴───────────────────┘

Decision gates:
  After BRIEF          → enough semantic info? ──Yes──▶ SEMANTIC PLAN
                                                └─No──▶ ask 1 more round

  After SEMANTIC PLAN  → user selected direction? ─Yes──▶ SVG PREVIEW
                                                   └─No──▶ revise options

  After SVG PREVIEW    → visual approved? ─────────Yes──▶ SPEC & DRAW
                                            └─No──▶ revise SVG preview

  If preview repeatedly fails / user says meaning is wrong / agent cannot map intent
                         └──────────────▶ trigger REFERENCE WORKFLOW

  After DRAW           → editable, valid & preview-matched? ─Yes──▶ done / next icon
                                                        └─No──▶ screenshot gate branch
```

All design rules live in `references/`. Load only what the current phase needs.

---

## NEVER Do

- Never paste, import, or embed SVG into Figma as the final output. SVG is preview-only.
- Never skip designer approval for Phase 2 semantic direction or Phase 3 SVG preview.
- Never jump from brief directly to Icon Spec JSON unless the user has already provided a fully confirmed visual direction.
- Never call external reference lookup by default; use it only when the Reference Workflow trigger conditions are met.
- Never hand off without screenshot validation and preview-to-Figma visual match reporting.
- Never flatten editable native icon nodes by default.
- Never create production 16px/20px output without warning that only 24px master icons are production-safe.
- Never allow large fills, gradients, shadows, opacity changes, or decorative effects; only documented local tiny fill exceptions are allowed.

---

## Required Figma runtime

This skill uses **`figma-use` as the required execution foundation**.

- Always load `figma-use` before any `use_figma` call.
- Always pass `skillNames: "icon-gen-promax"` when calling `use_figma` for this skill.
- Do not invent generic MCP tool names such as `create_or_update_node`.
- Implement drawing through real Figma Plugin API scripts executed by `use_figma`
  (e.g. create frame/component, rectangle, ellipse, line, vector, group).
- Do not treat `/figma-generate-design` as a required dependency. It is for
  full screens/views. This skill only borrows its incremental build + validation habit.
- Do not treat `/cc-figma-component` as a required dependency. This skill borrows
  its contract-first and production handoff pattern, but uses a lighter icon contract.

Core production chain:

```
User intent → semantic plan → SVG preview for visual approval → Icon Spec JSON
→ geometry/quality gates → use_figma native nodes → grouped/componentized icon
→ screenshot decision gate + preview fidelity check → generation notes + structured summary
```

---

## Platform Defaults (fixed — never ask the user to choose these)

```
canvas:       24 × 24 px          frame size (always square)
bevel:        4px                  frame corner radius
corner:       4px default          shape corner radius; adjust to 3/2/1px only for visual fit
padding:      2px                  safe-zone inset → live area = 20 × 20 px
grid:         24 px

stroke:       2px center           uniform on every path
stroke cap:   round
stroke join:  round
color:        #0F1218              single flat color — no gradients, no shadows

style:        outline / monochrome rounded shapes, outline-first
              no actual fills by default, but local fills are allowed when a tiny element
              would become sticky, deformed, or unreadable with a 2px stroke
              avoid visual fill effect from overly dense strokes

optical:      ON  (always — no toggle)
grid snap:    OFF (use 0.5px precision for optical shift values)
```

These are locked for the comic platform. Never ask the user to choose any of the above.
Do not ask the user to choose canvas size. Default is always 24px; only discuss size if the user explicitly requests a non-24px output.

**Production-size limitation:** this skill is currently production-safe for 24px master icons only. Small-size pixel hinting for 16px/20px is not yet defined. If the requested size is `<= 20px`, load `references/small-size-production-rule.md`, warn the user, and either create a 24px production master or a clearly marked non-production draft.

---

## Phase 1 — Brief

Goal: gather only what cannot be inferred. Keep it to **1 round** if possible; **2 rounds max**.

### Round 1 — always ask

```
Q1. What is the icon for?
    (concept / action / object — e.g. "bookmark", "share chapter", "filter by genre")

Q2. Where will it appear?
    (nav bar | tab bar | toolbar | card action | empty state | marketing)

Q3. Any expected visual element or meaning emphasis?
    (e.g. object itself, action direction, status result, badge/dot, container, arrow)
    If the user is unsure, offer options in Phase 2 instead of forcing an answer.
```

### Round 2 — only if ambiguous after Round 1

```
Q4. Single icon or a set?
    If a set → list all icon names before proceeding.

Q5. Any important visual detail to keep or avoid?
    (e.g. must include an arrow, avoid a cloud, show result state, use a badge/dot)
    Default answer is "no" — skip if context makes it obvious.
```

### Brief rules

- If the user provides enough context upfront, skip directly to Phase 2.
- Never ask more than 4 questions in one message.
- Do NOT ask about style, color, or duotone — these are fixed.
- Before moving on, confirm aloud:
  > *"Got it — 24px outline 'bookmark' icon for the chapter card action bar."*

---

## Phase 2 — Semantic Plan

Goal: translate the brief into **2–3 visual semantic options** before writing JSON.
This phase is for designer-facing decision-making. Do not jump directly from Brief to Icon Spec JSON unless the user explicitly provided a fully confirmed direction.

For each option, include:
- semantic strategy: object / action / state / container / badge / metaphor
- key visual elements: e.g. tray + arrow, document + corner fold, dot badge
- why it fits the requested context
- any readability risk at 24px

Required output pattern:

```
Option A — {semantic direction}
  Visual elements: ...
  Meaning: ...
  Risk: ...

Option B — {semantic direction}
  Visual elements: ...
  Meaning: ...
  Risk: ...

Ask: "Which direction should I preview, or what should I adjust?"
```

Do not proceed to SVG preview until the visual direction is confirmed or clearly implied by the user's choice.

---

## Phase 3 — SVG Preview

Goal: generate a **visual SVG preview** in Codex so the designer can judge shape, style, semantic fit, and small-detail treatment before Figma drawing.

Rules:
- SVG preview is a temporary approval artifact only.
- Never paste or import the preview SVG into Figma as final output.
- Use the same platform defaults: 24×24, #0F1218, rounded, outline-first.
- The preview may use local fill only under the fill exception rule in `style-guide-outline.md` / `constraints.md`.
- If the designer rejects the preview, revise the SVG preview first; do not write Icon Spec JSON yet.
- If preview repeatedly fails or the user says the meaning is wrong, trigger the Reference Workflow in `references/reference-libraries.md`.

Required handoff before Phase 4:

```
Preview status: approved
Confirmed visual direction: ...
Confirmed SVG preview: ...
Notable details: ...
Local fill used? yes/no + reason
```

---

## Phase 4A — Spec

Produce the **Icon Spec JSON** from the approved SVG preview — the single source of truth for the draw phase.

Before writing or presenting the spec, check `references/canonical-spec-registry.md` if a registry or existing platform component library is available. Do not silently create a divergent spec for a concept that already has a canonical entry.

### Schema

```jsonc
{
  "meta": {
    "name": "AijBasicBookmark",   // PascalCase: Aij + Basic + {SemanticName}
    "label": "Bookmark",          // human-readable display label
    "size": 24,                   // px, always square
    "grid": 24,                   // base grid
    "context": "chapter card",    // from Brief Q2
    "style": "outline",           // FIXED
    "color_mode": "monochrome",   // FIXED
    "corner_radius": "rounded",   // platform default; override only if Q5 says so
    "style_notes": ""             // any Q5 adjustments; empty string if none
  },
  "canvas": {
    "padding": 2,                 // px safe-zone inset from frame edge
    "optical_center": true        // apply optical centering — see references/optical-corrections.md
  },
  "shapes": [
    // Ordered list of primitive drawing instructions (back → front).
    // One entry = one Figma node.
    // → Rules in references/drawing-primitives.md
  ],
  "strokes": {
    // Stroke weight, cap, join settings.
    // → Rules in references/stroke-rules.md
  },
  "validation": {
    // QA checks to run before handoff.
    // → Rules in references/validation-checklist.md
  }
}
```

### Spec rules

- Validate all `meta` fields are populated before proceeding.
- Build the spec from the approved SVG preview and confirmed visual direction, not from an unapproved draft.
- Preserve visual fidelity to the approved SVG preview. If conversion to native-node-friendly geometry changes radius, proportion, curve quality, gap, or detail count, flag the difference before drawing and either revise the spec or regenerate the preview.
- If `size` is non-standard (not 16/20/24/32/48), warn and confirm with user.
- If `size <= 20`, do **not** proceed as production-safe. Load `references/small-size-production-rule.md` and ask whether to create a 24px production master or a smaller draft with warning.
- `style`, `color_mode` are always injected from Platform Defaults — never from user input.
- **Before building the `shapes` array**, resolve the metaphor using the decision priority below.
- **While building each shape entry**, check C6 (keyline bounds), C7 (angles),
  C8 (gaps) inline — adjust dimensions before writing the entry, not after.
  Load `references/shape-decomposition.md` for the schema and decomposition process.
- **After completing the `shapes` array**, run C1/C2/C3/C4/C5/C9/C10/C11
  from `references/constraints.md` as a final pre-draw check.
  Any hard violation must be resolved before presenting the spec to the user.
- Present the spec for a lightweight confirmation before drawing:
  > *"Here's the spec translated from the approved preview — look good? I'll start drawing in Figma native nodes."*

### Metaphor decision priority

Use references in this order:

```
1. User-provided context
2. Internal metaphor decision table
   → references/metaphor-decision-table.md
3. Existing platform icon set consistency
   → Library B in references/reference-libraries.md
4. Optional external library lookup for inspiration only
   → Library A in references/reference-libraries.md
```

Do not run web lookup for every icon by default. Trigger the Reference Workflow only when:
- the user says the icon meaning is misunderstood
- the user says the result is visually poor or "not what I mean"
- the agent still cannot map semantic intent after clarification
- the SVG preview repeatedly fails review
- the internal metaphor table has no suitable solution
- the user explicitly asks to reference external icons

External lookup must never override the platform style guide, the user's context, or existing set consistency. Never copy external coordinates or geometry.
Use references to extract semantic patterns only, then return revised visual semantic options and regenerate the SVG preview.

Full lookup instructions: `references/reference-libraries.md`

---

## Phase 4B — Draw

Translate the confirmed Icon Spec JSON into Figma-native nodes through `figma-use` / `use_figma`.

The draw phase must be **contract-first**: do not improvise geometry while drawing. If the spec is insufficient, return to Phase 4A and revise the spec first.

```
Phase 4B sequence:
1. Load figma-use and call use_figma with skillNames: "icon-gen-promax".
2. Create a 24×24 component/frame named {meta.name}.
3. Draw shapes[] back → front as editable native nodes only.
4. Apply stroke defaults and only documented local tiny fills.
5. Group named nodes, apply optical centering, then validate.
6. Capture screenshot, compare with approved SVG preview, and branch if mismatch.
7. Report node IDs, structure, warnings, and visual match result.
```

### Screenshot decision gate

After drawing, screenshot review is a decision gate, not a reporting artifact.
Compare the screenshot against the confirmed semantic direction and approved SVG preview.

```
Screenshot shows correct metaphor + visual match? ──Yes──▶ final handoff
                                                └─No──▶ branch by failure type

Failure branch:
  wrong metaphor / wrong concept        → return to Phase 2 Semantic Plan
  preview itself needs visual changes   → return to Phase 3 SVG Preview
  spec changed approved proportions     → return to Phase 4A Spec
  native draw/fallback caused mismatch  → return to Phase 4B Draw
  minor centering/spacing issue         → adjust spec or redraw, then screenshot again
```

Do not hand off an icon whose screenshot looks wrong just because the script succeeded.

### Figma execution rules

Load `references/figma-node-spec.md` before the first `use_figma` call. It defines how `shapes[]` map to Figma Plugin API operations.

- **Never** paste or embed SVG strings — native nodes only.
- **Never** invent generic MCP function names. Use real `use_figma` scripts.
- Top-level deliverable should be a Figma component when possible; otherwise a clearly named 24×24 frame.
- Default final structure: `{meta.name}` component/frame containing a grouped set of named native nodes.
- Prioritize editable native nodes by default; if a part cannot remain fully editable, explain the reason in final feedback.
- Do **not** flatten by default. Flatten only if the user explicitly asks for a single-vector export and visual validation passes before/after flattening.
- Each shape node gets a descriptive layer name.
- If a `use_figma` script fails → stop, read the error, inspect with metadata/screenshot if needed, fix the script, then retry.
- If `figma-use` / `use_figma` is unavailable → halt and inform the user; do not fall back to SVG.

### Production handoff

Load `references/production-handoff.md` before final handoff. It defines component/frame naming, layer structure, flatten policy, notes, and final report.

---

## Reference files

Load on demand. Do not pre-load all files.

```
references/
├── shape-decomposition.md   ← load when building shapes[] — schema + patterns (Phase 4A)
├── open-shape-schema.md      ← load for any rect/open=true tray, bracket, C-shape
├── constraints.md           ← load inline during shape-build (C6/C7/C8) and
│                               post-build final check (C1–C5, C9–C11)
├── drawing-primitives.md    ← load for canvas/keyline/spacing rules (Phase 3/4A/4B)
├── small-size-production-rule.md ← load whenever target size is <= 20px
├── stroke-rules.md          ← load when populating strokes{} (Phase 4A/4B)
├── corner-radius-rules.md   ← load when choosing or validating shape corner radii
├── optical-corrections.md   ← load every Phase 4B (always on)
├── figma-node-spec.md       ← load during Phase 4B before calling use_figma
├── style-guide-outline.md   ← load for all icons (outline-first + local fill exception)
├── metaphor-decision-table.md ← load during semantic planning before external lookup
├── reference-libraries.md   ← load when Reference Workflow is triggered
├── validation-checklist.md  ← load during Phase 4B step 7
├── visual-quality-gates.md  ← load during SVG preview review, Phase 4A final check, and Phase 4B validation
├── set-consistency-profile.md ← load when generating multiple icons as a set
├── production-handoff.md    ← load before final handoff
├── canonical-spec-registry.md ← load when checking/reusing/emitting cross-session specs
├── status.md                ← load only when auditing or updating rule implementation status
└── icon-set-rules.md        ← load when generating multiple icons as a set
```

> Most reference files are now defined. Any remaining stubs have a `## Status` header showing what is still pending.
> For execution behavior, treat `references/figma-node-spec.md` as the source of truth.


---

## Worked examples

Use `examples/` when the agent needs a concrete reference for the full behavior chain:

```
examples/
├── 01-simple-search.md      ← simple shape: concept → semantic plan → preview → spec → draw
├── 02-compound-upload.md    ← compound/open shape + arrow
├── 03-icon-set-toolbar.md   ← multi-icon set consistency
└── 04-ambiguous-share.md    ← ambiguous concept → internal decision → reference workflow if triggered
```

Each example follows the same sequence:

```
user request → brief result → semantic options → SVG preview approval → optional lookup if triggered → decomposition → Icon Spec JSON → use_figma draw plan → expected report
```

Do not copy example coordinates blindly when the user context differs. Use examples as behavior demonstrations, not as a fixed icon library.

---

## Session memory

Persist across turns within one session:

```
confirmed_size:      once set, reuse unless user overrides
confirmed_corner:    once set, reuse unless user overrides
active_icon_set:     list of icon names when generating a set
last_spec:           most recent Icon Spec JSON produced
registry_status:     {available | unavailable | checked} for the current project, if known
```

Cross-session consistency requires `references/canonical-spec-registry.md` and an available persistent registry or component library. Session memory alone is not enough.

---

## Iteration and refinement

After drawing, ask: *"How does it look? Want to tweak anything?"*
For redraw behavior, follow `references/figma-node-spec.md` → `Iteration / redraw protocol`.
Return to Phase 1 only when the user wants to start over; otherwise revise the relevant phase and redraw.


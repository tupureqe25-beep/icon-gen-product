# Shape Decomposition Guide

## Status
✅ Defined — session 4 (schema + structural patterns based on reference icon set)

---

## Purpose

This file defines two things that must work together:

1. **The `shapes[]` entry schema** — the exact data format each shape entry
   must follow in the Icon Spec JSON. This is the contract between Phase 4A and Phase 4B.

2. **The decomposition process** — how to break any icon concept into
   a compliant list of shape entries before drawing begins.

Load this file during Phase 4A when building the `shapes[]` array.

---

## Part 1 — shapes[] Entry Schema

Every entry in `shapes[]` represents exactly one Figma node.
Entries are ordered **back to front** (index 0 = bottom layer).

### Full schema for one shape entry

```jsonc
{
  "id": "body",                  // working layer name — descriptive noun, no spaces
                                 // working layer name; final output keeps named native nodes grouped by default

  "type": "rect",                // see type vocabulary below
  "open": false,                 // true = path is intentionally incomplete (C-shape, arc, open rect)

  "role": "container",           // see role vocabulary below

  // Position and size (all values in px, integers only)
  "x": 3,                        // left edge of bounding box from frame origin (0,0)
  "y": 3,                        // top edge of bounding box from frame origin
  "w": 18,                       // width of bounding box
  "h": 18,                       // height of bounding box

  // Shape-specific properties
  "r": 4,                        // corner radius (rect/openRect default = 4; adjust to 3/2/1 only for visual fit)

  // Open shape gap (required when type="rect" and open=true)
  // See references/open-shape-schema.md for coordinate rules.
  "gap": {
    "edge": "top",               // "top" | "bottom" | "left" | "right"
    "width": 8                   // even number; minimum 6px at 24px
  },

  // For lines and open paths
  "x1": 5, "y1": 12,            // start point (line only)
  "x2": 19, "y2": 12,           // end point (line only)
  "angle": 0,                    // rotation in degrees (must be multiple of 15°)

  // For crossing lines (lines that pass through a shape boundary)
  "crosses": true,               // true = this line intentionally crosses its container boundary

  // Stroke (inherits platform defaults — only specify if canvas size differs from 24px)
  "stroke": {
    "weight": 2,
    "color": "#0F1218",
    "position": "center",
    "cap": "round",
    "join": "round"
  },

  // Fill — null by default; local tiny fill allowed only for clarity exceptions
  "fill": null,                  // or { "color": "#0F1218", "reason": "3px dot would collapse with 2px stroke" }

  // Boolean operation (only when combining paths)
  "boolean": null,               // null | "union" | "subtract"

  // Optical group this shape belongs to
  "group": "root"                // "root" = top level; or a named group e.g. "arrow"
}
```

### Type vocabulary

```
type          Figma node        When to use
──────────────────────────────────────────────────────────────────
"rect"        Rectangle         containers, trays, panels — open or closed
"circle"      Ellipse           circular outlines, rings, lens shapes
"line"        Line              straight strokes — stems, dividers, crossing lines
"arc"         Vector (arc)      partial circles, curves — latitude lines, ribbon arcs
"path"        Vector            custom shapes — arrows, chevrons, irregular forms
```

### Role vocabulary

```
role            Meaning
──────────────────────────────────────────────
"container"     primary enclosing or framing shape
"crossing"      line or arc that passes through the container boundary
"division"      line that subdivides the interior of a container
"stem"          directional line connecting elements
"arrow"         directional terminal (tip lines, not a filled head)
"attachment"    small element connected to or emerging from the container
```

### Minimal valid entry

```jsonc
{
  "id": "body",
  "type": "rect",
  "open": false,
  "role": "container",
  "x": 3, "y": 5, "w": 18, "h": 16,
  "r": 4,
  "stroke": { "weight": 2, "color": "#0F1218", "position": "center", "cap": "round", "join": "round" },
  "fill": null,
  "group": "root"
}
```

Omit fields that don't apply. No `r` on circles or lines. No `gap` if `open: false`.
No `x1/y1/x2/y2` on rects.

---

## Part 2 — Decomposition Process

```
  CONCEPT (from Brief)
      │
      ▼
  1. FIND THE GEOMETRIC PROXY
     What is the most minimal stroke construction a viewer would
     immediately read as this concept?
     Start with the simplest possible answer.
     Do not add detail until recognition would fail without it.

      │
      ▼
  2. IDENTIFY THE STRUCTURAL PATTERN (see Part 3)
     S1 Single shape?
     S2 Shape + crossing/division lines?
     S3 Open/incomplete shape?
     S4 Shape + attached directional?
     S5 Pure line composition?
     Most icons fit one pattern. Choose the simplest that works.

      │
      ▼
  3. CHECK CONSTRAINTS INLINE — before writing each entry:
     C6: shape within keyline max dimensions?
     C7: all diagonals at 15° multiples?
     C8: all gaps even numbers ≥ 2px?
     C5: all closed shapes have r > 0?
     Adjust before writing — not after.

      │
      ▼
  4. CALCULATE COORDINATES
     Origin: frame top-left (0, 0). Center: (12, 12).
     All values: integers only.
     Effective path range: 3–21px (so 2px center stroke stays within safe zone).
     To center W×H shape: x = (24−W)/2, y = (24−H)/2 — must be integers.
     For open rectangles/trays, load `open-shape-schema.md` and calculate centered gap endpoints before writing the shape entry.

      │
      ▼
  5. ORDER back → front
     Background / container shapes first (index 0).
     Crossing lines and attachments last.

      │
      ▼
  6. WRITE shapes[] — one entry per shape using the schema above.
     Then run final constraint check C1/C2/C3/C4/C9/C10/C11.
```

---

## Part 3 — Five Structural Patterns

Patterns are defined by **construction type**, not by concept category.
The reference style is confident, minimal, and geometric — every stroke carries
semantic weight. When in doubt, remove rather than add.

**Core principle from the reference set:**
A well-designed icon in this style can be described in one sentence.
"A rounded rect with the top edge open and an upward arrow" (upload).
"A circle with two longitude arcs and one latitude line" (globe).
If the description requires more than one sentence, the icon is too complex.

---

### S1 — Single Closed Shape

The entire icon is one outline. The silhouette alone communicates the concept.
No interior detail. No attachments.

```
Path count:   1
Target size:  approach the keyline ceiling — shapes that are too small feel lost
              Circle: 18–20px diameter
              Square: 16–18px
              Rect:   18×14 to 20×16
Use when:     the outer contour IS the concept — shape alone is recognizable
```

Construction notes:
- Corner radius starts at 4px on rects/openRects at 24px; reduce to 3/2/1px only when needed for visual fit
- Circles: no corner radius needed, use Ellipse node
- The shape should feel substantial, not delicate

```
Concept examples:
  circle          → ring, coin, lens, record
  rounded square  → tile, grid cell, checkbox (unchecked)
  rounded rect    → card, panel, screen, banner
```

---

### S2 — Closed Shape + Crossing or Dividing Lines

A container shape with 1–2 lines that cross through it or subdivide it.
The lines are drawn as separate paths that cross the container boundary
or divide its interior — they do not close into new shapes.

```
Path count:   2–3  (container + 1–2 lines)
Use when:     the concept requires interior subdivision or
              lines that pass through a boundary to create structure
```

Construction notes:
- Lines that cross the container boundary extend slightly beyond it,
  then get clipped by the frame's `clip content: true`
- Keep crossing lines to a minimum — 1 horizontal + 1 vertical is the most
  common case (globe: 2 longitude arcs + 1 latitude line = 3 paths total)
- Division lines that only subdivide interior space (not crossing) sit
  at least 4px from the container edge
- Crossing lines must be symmetric if the composition is symmetric

```
Concept examples:
  globe           → circle + 2 longitude arcs + 1 latitude line (3 paths)
  gift box        → rounded rect + horizontal lid-seam line (2 paths)
                    + bow shape on top (3 paths total)
  page with lines → rounded rect + 2–3 horizontal lines inside (3–4 paths)
  calendar        → rounded rect + 1 horizontal divider + vertical stems (3–4 paths)
```

---

### S3 — Open / Incomplete Shape

A shape with one edge deliberately removed or interrupted.
The "missing" edge creates implied space — the opening is the concept.
This is a key technique in the reference style: openings carry meaning
without adding paths.

```
Path count:   1–2  (the open shape + 1 optional element inside or through it)
Use when:     the concept involves containment with entry/exit,
              or a tray/holder/receiver/emitter
```

Construction notes:
- Use the primary schema in `references/open-shape-schema.md`: `type="rect"`, `open=true`, and a required `gap` object.
- Draw as a path (Vector node), not a closed Rectangle — remove the open edge's segment.
- Open edge is centered on the chosen edge by default; do not invent custom fields like `openEdge` or `gapWidth`.
- Open edge is always at least 6–8px wide at 24px canvas to read clearly.
- The open edge should align to a natural axis (top, bottom, left, right) — not diagonal.
- Round the corners at the open edge terminals with `strokeCap: round`.
- The gap at the opening is even-numbered (C8).

```
Concept examples:
  upload tray     → U-shape (rect with top edge removed) + upward arrow through gap
  download tray   → same U-shape + downward arrow into gap
  guide/shelf     → rect with top-center notch interrupted + bookmark tab inside
  inbox           → U-shape tilted or with angled opening
  speaker         → partial arc (open path curved outward)
```

---

### S4 — Shape + Attached Directional

A primary container or circle with a stem, arrow, or tail attached to it —
emerging from the edge of the main shape rather than sitting inside it.

```
Path count:   2–3  (container + stem + optional arrowhead lines)
Use when:     the concept involves movement, direction, linking, or
              a pointer that exits or enters a container
```

Construction notes:
- The stem originates at the container's edge, not from inside it
- Stem angle: 45° or 90° most common (C7)
- Arrowhead: two short lines at ~45° from the stem tip — NOT a filled triangle
  (this style uses open arrow tips, consistent with the outline approach)
- The stem length should be proportional — approximately 1/3 of the container size
- The attachment point on the container should feel natural (bottom-right for
  connected stems such as search, top-center for upward actions, etc.)
- Top-right external-link marks, corner badges, jump marks, and status indicators are
  not treated as glued attachments by default. Place them near the top-right with a
  visible 2px gap from the main container unless the user explicitly requests a
  connected construction.
- Keep the tail/stem thin in terms of path length — do not let it dominate

```
Concept examples:
  male symbol     → circle + diagonal stem exiting bottom-right with inward curl
  search          → circle + diagonal stem exiting bottom-right at 45°
  external link   → rounded rect + detached arrow placed top-right at 45° with a visible 2px gap
  share / export  → open-top tray (S3) + upward arrow as the directional element
```

---

### S5 — Pure Line Composition

No closed container. The icon is built entirely from lines, arcs, or open paths.
The arrangement of strokes creates the form.

```
Path count:   1–3  (prefer fewer — a single continuous path is ideal)
Use when:     the concept IS the gesture or direction, with no container implied
              OR the concept is abstract enough that a container would add noise
```

Construction notes:
- Where possible, combine into a single continuous path rather than separate lines
  (e.g. a chevron is one V-shaped path, not two lines)
- All angles must be 15° multiples (C7)
- Line lengths should feel intentional — avoid very short (<6px) detached strokes
- The overall composition must be centered within the live area
- Apply optical centering (optical-corrections.md) — line compositions
  often need a slight upward shift

```
Concept examples:
  arrow (simple)  → single angled path with arrowhead at tip
  chevron / caret → single V-shaped path, open at bottom
  close / X       → two diagonal lines crossing at center, each at 45°
  menu / lines    → 3 horizontal parallel lines, equal spacing
  trend line      → L-shape base + rising diagonal line at 45°
```

---

## Part 4 — Decision Tree

Ask structural questions, not semantic ones.

```
  Does the concept have a clear outer boundary?
  (a container, a ring, a frame that defines the icon's edges)
        │
        ├── YES — is it closed all the way around?
        │         │
        │         ├── YES, and nothing inside/attached
        │         │   └──▶ S1  Single closed shape
        │         │
        │         ├── YES, with lines crossing through or dividing it
        │         │   └──▶ S2  Closed shape + crossing/division lines
        │         │
        │         └── NO — one edge is deliberately open/interrupted
        │             └──▶ S3  Open shape
        │                  (then check: does something pass through the opening?)
        │                  └── YES → S3 + one directional element (arrow/stem)
        │
        └── NO clear outer boundary
              │
              ├── Has a primary shape with something attached/exiting it?
              │   └──▶ S4  Shape + attached directional
              │
              └── Pure strokes / lines / gesture
                  └──▶ S5  Line composition
```

If still unclear after the decision tree:
1. Consult Library A (iconfont.cn) — search the concept keyword
2. Observe which structural pattern the conventional metaphor uses
3. Consult Library B (Figma) — check if a similar icon already exists
4. Choose the simplest pattern and proceed

---

## Part 5 — Common Mistakes and How to Avoid Them

```
Mistake                              Fix
────────────────────────────────────────────────────────────────────────
Adding detail that isn't needed      Ask: would recognition fail without this path?
                                      If no → remove it. One fewer path is always better.

Using a filled arrowhead              This style uses open arrow tips (two angled lines).
                                      Never a solid filled triangle for directional icons.

Making the container too small        Main container should use 80–90% of the keyline max.
                                      A container at 12×12 in a 24px frame feels weightless.

Forgetting that openings are paths    An open rect is a Vector path, not a Rectangle.
                                      Plan which edge is open before choosing the node type.

Symmetric icon with odd gap           Both sides of an internal gap must be equal.
                                      If centering gives x=3.5, adjust the shape width by 1px.

Crossing lines that don't cross       If a line is meant to pass through a container boundary,
                                      it must actually extend beyond the container path —
                                      the frame clips it, not the container.

Over-complex globe / radial shapes    Globe = 1 circle + 2 arcs + 1 line. That's the maximum.
                                      Do not add more latitude rings or detail meridians.

Diagonal attachment at wrong angle    Stems and tails exit at 45° or 90° — never freehand.
                                      Measure and snap before writing the coordinate.
```

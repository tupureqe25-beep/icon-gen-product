# Drawing Primitives

## Status
✅ Defined — session 1 (canvas/geometry); updated session 3 (keyline system, stroke scale, spacing)

---

## Canvas and Keyline System

```
Base grid:      48 × 48 px  (platform reference — all specs defined at this scale)
Target canvas:  24 × 24 px  (2× scale — keyline dims halved)
Frame bevel:    4px corner radius on the outer frame container
Padding:        2px safe-zone inset on all sides
Live area:      20 × 20 px  (24 − 2px each side)
Clip content:   true
Touch target:   44 × 44 px  (icon frame centered within — informational only)
```

The 4px bevel is on the **frame container** only — never on icon paths inside.

---

## Stroke Scale by Canvas Size

Production-safe output is currently defined for 24px master icons only.

The table below is a proportional reference for future sizing work and draft output. It is **not** a completed small-size pixel-hinting system. If the requested target is 20px or smaller, load `small-size-production-rule.md` and warn before proceeding.

```
Canvas size     Stroke weight
──────────────────────────────
48 × 48 px      4.00 px   (base)
32 × 32 px      2.66 px
24 × 24 px      2.00 px   ← platform default
18 × 18 px      1.50 px
16 × 16 px      1.33 px
12 × 12 px      1.00 px
```

All strokes: center position, round cap, round join, #0F1218.
See stroke-rules.md for full stroke specification.

Do not claim 16px or 20px output is production-ready until a dedicated small-size mode is defined.

---

## Keyline Reference Dimensions (at 24px canvas)

Maximum bounding boxes for each base shape type.
These are ceilings — shapes may be smaller:

```
Shape type      Max bounding box    Notes
──────────────────────────────────────────────────────────────
Square          18 × 18 px          fills the square keyline zone
Rectangle       20 × 16 px          width × height; always wider than tall
Circle          20 × 20 px          full live area width — largest container
Triangle        20 × 17 px          base × height; tip aligns to keyline diagonal
```

With 2px center stroke (1px bleed outward), place path edges
within a 19×19 effective area so the stroked result stays within the 20×20 live area.

---

## Geometry Vocabulary

Prefer primitives in this order. Use the simplest shape that works:

```
Priority   Primitive             When to use
─────────────────────────────────────────────────────────────────
1          Rounded Rectangle     containers, cards, panels, bags,
                                  envelopes, badges, dialogs
2          Circle / Ellipse      avatars, dots, coins, lens, toggles
3          Line                  arrows, stems, dividers, ticks, hands
4          Rounded path          custom shapes where rect/ellipse won't fit
5          Boolean (union/sub)   compound shapes — use sparingly
```

Never use a sharp (0-radius) rectangle. Default rect radius is 4px; corner radius must be explicit and > 0 on all closed rectangular paths.

---

## Keyline Shape Size Guidance

```
SQUARE
  Preferred sizes:  14×14, 16×16, 18×18 px  (max 18×18)
  Corner radius:    4px default at 24px; use 3/2/1px only for visual fit

RECTANGLE
  Preferred sizes:  16×12, 18×14, 20×16 px  (max 20×16 width×height)
  Use for:          cards, panels, screens, documents, envelopes (wide), dialogs

CIRCLE
  Preferred sizes:  16, 18, 20 px diameter  (max 20px)
  Use for:          avatars, coins, lens, notification rings, toggles

TRIANGLE
  Preferred sizes:  16×14, 18×15, 20×17 px  (max 20×17 base×height)
  Angle constraint: sides must follow 15° multiples (typically 60° equilateral)
  Tip rounding:     use round join — no sharp apex
```

---

## Spacing and Gaps Between Elements

Internal spacing between icon elements uses **even numbers only**:

```
Minimum gap:       2px   (never 1px — strokes would appear to merge)
Standard gaps:     2px, 4px, 6px
Large gaps:        8px, 10px  (sparse / open compositions)
```

Rules:
- Left and right margins within a shape zone must be equal (symmetric).
- Do not mix gap values arbitrarily within one icon.
- Denser icons (trash can, list, grid) may use 2–4px gaps.
- Sparser icons (arrows, simple containers) may use 4–8px gaps.

---

## Angle Rules for Diagonal Paths

All non-horizontal, non-vertical paths must use angles that are multiples of 15°:

```
Permitted: 0° 15° 30° 45° 60° 75° 90°  (and mirrors 105°–180°)
Common:    45° (diagonal arrows, trend lines)
           30° / 60° (hexagon sides, clock hands at 10:10)
           90° (right-angle joins, perpendicular stems)
```

Align diagonals to the keyline diagonal (45°) or keyline cross-lines (90°) where possible.

---

## Anchor Coordinate Rules

```
All path anchor points:          integers only  (x: 3, y: 7 ✓  |  x: 3.5 ✗)
Group optical shift transform:   0.5px allowed on the group, not on anchors
```

Integer anchors prevent sub-pixel rendering artifacts on stroke terminals.

---

## Proportions and Centering

- Keep shapes compact and centered within the 20×20 live area.
- Apply optical centering shifts from optical-corrections.md after placing shapes.
- Leave visible breathing room — avoid crowding the live area boundary.
- Internal whitespace should feel intentional, not accidental.

---

## Naming Convention

### Component / frame name

```
Format:   Aij + Basic + {SemanticName}
          Platform (fixed) + Icon type (fixed) + Icon semantics (PascalCase)

Examples:
  AijBasicSearch
  AijBasicDownload
  AijBasicDirectorAnnotation
  AijBasicChapterBookmark
```

SemanticName rules:
- Describes the meaning the icon represents in context, not the literal object
- PascalCase — capitalize each word, no separators
- Use English — translate the concept if the Brief uses Chinese
- Be specific: prefer AijBasicCommentReply over AijBasicComment if context is reply

### Working layer names (construction scaffolding only)

During drawing, use descriptive nouns for intermediate layers
(e.g. "body", "stem", "arrow") to keep structure readable while building.
These remain editable native nodes by default and are grouped inside `{meta.name}__glyph` at the end of Phase 4B.
The top-level component/frame takes the final component name above. Do not flatten unless the user explicitly requests single-vector output and validation passes.

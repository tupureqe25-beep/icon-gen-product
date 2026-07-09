# Open Shape Schema

## Status
✅ Defined — primary coordinate standard for open rectangles, trays, brackets, and C-shapes

---

## Purpose

Open shapes must be repeatable. Do not rely on the agent informally computing a missing edge each time.

This file defines the primary schema and coordinate rules for open rectangular shapes such as upload trays, download trays, brackets, and C-shapes.

---

## Primary schema

Use `type: "rect"` with `open: true`. Default radius is 4px unless visual fit requires 3px, 2px, or 1px.

```jsonc
{
  "id": "tray",
  "type": "rect",
  "open": true,
  "role": "container",
  "x": 4,
  "y": 7,
  "w": 16,
  "h": 12,
  "r": 4,
  "gap": {
    "edge": "top",
    "width": 8
  },
  "fill": null
}
```

### Required fields

| Field | Meaning | Rule |
|---|---|---|
| `x`, `y` | bounding-box top-left | integers only |
| `w`, `h` | bounding-box size | integers only |
| `r` | corner radius | integer; default 4px at 24px, reduce to 3/2/1 only for visual fit |
| `gap.edge` | open side | `top` / `right` / `bottom` / `left` |
| `gap.width` | width of missing segment | even number, minimum 6px at 24px |
| `fill` | fill style | always `null` for open outline shapes; local tiny-fill exceptions must be separate small nodes |

Do not use custom fields such as `openEdge`, `gapWidth`, `missingSide`, or `notch` unless they are first normalized into the schema above.

---

## Gap placement rule

The gap is always centered on the chosen edge unless the user explicitly requests an asymmetric opening.

For a top or bottom gap:

```txt
gapStartX = x + (w - gap.width) / 2
gapEndX   = x + (w + gap.width) / 2
```

For a left or right gap:

```txt
gapStartY = y + (h - gap.width) / 2
gapEndY   = y + (h + gap.width) / 2
```

The values must resolve to integers. If they do not, adjust `w`, `h`, or `gap.width` before writing the spec.

---

## Segment construction

An open rectangle is one semantic shape, but it may be drawn as a single vector path or as grouped line segments depending on runtime support.

### `gap.edge = "top"`

The path contains:

```txt
left vertical side
bottom-left rounded corner
bottom edge
bottom-right rounded corner
right vertical side
```

The top edge is omitted between `gapStartX` and `gapEndX`.

### `gap.edge = "bottom"`

The path contains:

```txt
left vertical side
top-left rounded corner
top edge
top-right rounded corner
right vertical side
```

The bottom edge is omitted between `gapStartX` and `gapEndX`.

### `gap.edge = "left"`

The path contains:

```txt
top edge
top-right rounded corner
right vertical side
bottom-right rounded corner
bottom edge
```

The left edge is omitted between `gapStartY` and `gapEndY`.

### `gap.edge = "right"`

The path contains:

```txt
top edge
top-left rounded corner
left vertical side
bottom-left rounded corner
bottom edge
```

The right edge is omitted between `gapStartY` and `gapEndY`.

---

## Rounded terminal rule

Open-edge terminals must read as rounded stroke endings.

- Use `strokeCap: ROUND`.
- Do not fake the gap by covering a closed rectangle with another shape.
- Do not draw a hidden mask or filled cover over the missing edge.
- If rounded-corner vector construction is too fragile, use the line-segment fallback and report it.

---

## Fallback standard

If vector path construction fails, draw the open shape as grouped line segments.

Fallback is acceptable only when:

1. segment endpoints match the same `x/y/w/h/gap` schema,
2. the layer group is named with the original `shape.id`,
3. each segment uses the platform stroke defaults,
4. the draw report records `openRectLineFallback: true`.

Fallback does **not** count as a blocker by itself, but it counts toward fallback count for the re-spec loop.

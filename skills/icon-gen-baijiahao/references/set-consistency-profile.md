# Set Consistency Profile

## Status
✅ Defined — mechanical baseline for repeatable icon sets

---

## Purpose

Use this file when generating two or more icons as a set.

`icon-set-rules.md` defines the visual principles. This file defines the light mechanical profile that makes those principles checkable.

---

## Default set profile

```jsonc
{
  "canvas": 24,
  "stroke": 2,
  "strokeCap": "round",
  "strokeJoin": "round",
  "color": "#242529",
  "style": "outline",
  "targetBoundingBox": "16-20px perceived main motif",
  "safeZone": 2,
  "maxPrimitiveCount": 5,
  "visualCenterTolerance": "±1px",
  "density": "medium-outline",
  "minReadableGap": 2,
  "minReadableCounter": "about 4×4px at 24px"
}
```

---

## How to use

Before drawing a set:

1. List all icon names.
2. Resolve all metaphors together.
3. Create one set profile.
4. Generate every Icon Spec JSON against that profile.
5. Review all specs side by side before drawing.

After drawing:

1. Screenshot the set together.
2. Check whether any icon looks much darker, larger, smaller, or more detailed than the rest.
3. Revise the outlier from its Icon Spec JSON.
4. Redraw the outlier.

---

## Density budget

Use a practical visual budget, not exact math.

Revise if:

- one icon has many more primitives than the rest without a semantic reason
- one icon visually occupies almost the entire 20×20 live area while others leave more air
- one icon has tiny counters that collapse into dark blobs
- one icon has several internal strokes while siblings use only outer contours
- one icon reads as filled while the rest read as outline

Do not fix density by changing stroke weight. Fix it by simplifying geometry, opening negative space, or changing metaphor.

---

## Spec fields to record for each set icon

When generating a set, each icon spec should include or report:

```jsonc
{
  "set_profile": {
    "motif_bbox": "e.g. 17×18",
    "primitive_count": 3,
    "density_note": "medium; matches toolbar set",
    "optical_shift": "+0.5y",
    "set_deviation": "none"
  }
}
```

This can live inside `validation` or be included in the generation report.

---

## Set-level report format

```md
✅ Set profile: 24px logical / 48px team master, 2px logical / 4px team-master stroke, round cap/join, #242529
✅ Density: medium-outline across {n} icons
✅ Primitive count range: {min}–{max}
🔁 Revised outliers: {none | icon names}
⚠️ Notes: {deliberate deviations}
```

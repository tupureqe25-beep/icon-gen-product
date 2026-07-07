# Small-size Production Rule

## Status
✅ Defined — production-safe output currently limited to 24px master icons

---

## Purpose

This skill currently generates **production-safe 24×24px outline icons**.

Small-size pixel hinting for 16px and 20px contexts is **not yet supported**. At those sizes, a 2px outline icon or a simple scaled-down 24px structure can become muddy because strokes occupy too much of the live area and anti-aliasing reduces edge clarity.

---

## Hard rule

```
Production-safe output: 24px only by default.
```

If the user requests a target size of **20px or smaller**:

1. Warn before Phase 4A that small-size pixel hinting is not defined.
2. Do not claim the result is production-safe for 16px or 20px use.
3. Offer one of two paths:
   - create a 24px production master icon instead, or
   - create a 16/20px visual draft with a clear non-production warning.
4. If the user needs production-ready 16/20px output, stop and request a future small-size mode / pixel-hinting pass.

---

## Warning copy

Use this wording:

> This skill is currently production-safe for 24px icons only. 16px/20px pixel hinting is not defined yet, so I can either create a 24px production master or create a smaller draft that should not be shipped as-is.

---

## What not to do

- Do not simply scale down the 24px coordinates to 16px or 20px and call it production-ready.
- Do not keep 2px strokes at 16px/20px unless the user explicitly accepts a draft-quality output.
- Do not silently switch to 1px/1.5px strokes without a defined small-size mode.
- Do not bypass this warning because the user says “tab bar”, “mobile”, or “small”. Those are exactly the contexts that need pixel hinting.

---

## Future small-size mode

A future version may define:

- 16px and 20px keylines
- stroke weights by size
- minimum counter-space rules
- simplified primitive budgets
- pixel-snapped endpoints
- separate canonical specs for small-size icons

Until then, 16px/20px output is **draft only**.

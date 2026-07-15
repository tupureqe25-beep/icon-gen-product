#!/usr/bin/env python3
"""Validate Baijiahao offline mature-library shape notes.

The goal is to prevent embedded reconstructions from being labeled as
production-grade mature-library reuse. Mature-library standard geometry must
come from runtime Figma source extraction.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


SKILL_ROOT = Path(__file__).resolve().parents[1]
SHAPE_SPECS_PATH = SKILL_ROOT / "references" / "team-icon-shape-specs.json"


def load_specs() -> list[dict[str, Any]]:
    with SHAPE_SPECS_PATH.open(encoding="utf-8") as file:
        return json.load(file).get("specs", [])


def validate() -> list[str]:
    errors: list[str] = []
    for spec in load_specs():
        label = spec.get("label") or spec.get("name")
        fidelity = spec.get("fidelityLevel")
        icon_spec = spec.get("iconSpec") or {}
        validation = icon_spec.get("validation") or {}
        source_structure = validation.get("sourceNodeStructure")
        if fidelity == "production-grade":
            errors.append(f"{label}: embedded production-grade specs are disabled; extract Figma source at runtime")
        if icon_spec.get("shapes"):
            errors.append(f"{label}: offline shape notes must not include final iconSpec.shapes")
    return errors


def main() -> None:
    errors = validate()
    if errors:
        print("shape spec validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        raise SystemExit(1)
    print("shape spec validation ok")


if __name__ == "__main__":
    main()

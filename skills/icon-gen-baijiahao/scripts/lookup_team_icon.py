#!/usr/bin/env python3
"""Lookup Baijiahao mature-library icons from the offline semantic and shape cache.

This script is intentionally small and deterministic. It prevents broad labels
such as "内容" from outranking longer exact concepts such as "内容分销".
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


SKILL_ROOT = Path(__file__).resolve().parents[1]
REFERENCES = SKILL_ROOT / "references"
INDEX_PATH = REFERENCES / "team-icon-index.json"
SHAPE_SPECS_PATH = REFERENCES / "team-icon-shape-specs.json"


def normalize(value: Any) -> str:
    return str(value or "").lower().replace(" ", "").replace("-", "").replace("_", "").strip()


def load_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as file:
        return json.load(file)


def field_values(item: dict[str, Any]) -> list[tuple[str, str]]:
    values: list[tuple[str, str]] = []
    for key in ("name", "label", "nodeId"):
        value = item.get(key)
        if value:
            values.append((key, str(value)))
    for alias in item.get("aliases", []) or []:
        values.append(("alias", str(alias)))
    return values


def match_score(query: str, item: dict[str, Any]) -> tuple[int, int, int, str] | None:
    normalized_query = normalize(query)
    if not normalized_query:
        return None

    best: tuple[int, int, int, str] | None = None
    for field, raw_value in field_values(item):
        normalized_value = normalize(raw_value)
        if not normalized_value:
            continue

        if normalized_value == normalized_query:
            tier = 100
        elif normalized_value in normalized_query:
            tier = 80
        elif normalized_query in normalized_value:
            tier = 60
        else:
            continue

        exact_bonus = 10 if item.get("matchType") in {"exact", "canonical-status"} else 0
        specificity = len(normalized_value)
        score = (tier + exact_bonus, specificity, len(field), raw_value)
        if best is None or score > best:
            best = score

    return best


def find_shape_spec(query: str, icon: dict[str, Any], specs: list[dict[str, Any]]) -> dict[str, Any] | None:
    lookup_values = [
        icon.get("name"),
        icon.get("label"),
        icon.get("nodeId"),
        *(icon.get("aliases", []) or []),
    ]
    normalized_values = {normalize(value) for value in lookup_values if value}

    best: tuple[int, int, dict[str, Any]] | None = None
    for spec in specs:
        for _, raw_value in field_values(spec):
            normalized_value = normalize(raw_value)
            if normalized_value in normalized_values:
                fidelity = 1
                score = (fidelity, len(normalized_value), spec)
                if best is None or score[:2] > best[:2]:
                    best = score

    return best[2] if best else None


def route_for(icon: dict[str, Any], shape_spec: dict[str, Any] | None) -> str:
    if shape_spec:
        return "team-reuse-needs-verification"
    if icon.get("matchType") in {"exact", "canonical-status"}:
        return "team-reuse-needs-verification"
    return "team-adjacent-reference"


def lookup(query: str, limit: int) -> dict[str, Any]:
    index = load_json(INDEX_PATH)
    shape_specs = load_json(SHAPE_SPECS_PATH).get("specs", [])

    ranked: list[tuple[tuple[int, int, int, str], dict[str, Any]]] = []
    for icon in index.get("icons", []):
        score = match_score(query, icon)
        if score:
            ranked.append((score, icon))

    ranked.sort(key=lambda pair: pair[0], reverse=True)

    results: list[dict[str, Any]] = []
    seen: set[str] = set()
    for score, icon in ranked:
        identity = icon.get("nodeId") or icon.get("name") or icon.get("label")
        if identity in seen:
            continue
        seen.add(str(identity))
        shape_spec = find_shape_spec(query, icon, shape_specs)
        result = {
            "label": icon.get("label"),
            "name": icon.get("name"),
            "nodeId": icon.get("nodeId"),
            "matchType": icon.get("matchType"),
            "family": icon.get("family"),
            "route": route_for(icon, shape_spec),
            "score": {
                "tier": score[0],
                "specificity": score[1],
                "matchedValue": score[3],
            },
            "semanticDirection": icon.get("semanticDirection"),
            "visualElements": icon.get("visualElements", []),
            "shapeSummary": icon.get("shapeSummary"),
            "needsSourceVerificationForPixelMatch": bool(
                icon.get("needsSourceVerificationForPixelMatch")
                or (icon.get("styleAttributes", {}) or {}).get("needsSourceVerificationForPixelMatch")
            ),
            "shapeSpec": None,
        }
        if shape_spec:
            result["shapeSpec"] = {
                "name": shape_spec.get("name"),
                "label": shape_spec.get("label"),
                "nodeId": shape_spec.get("nodeId"),
                "fidelityLevel": shape_spec.get("fidelityLevel"),
                "sourceRoute": shape_spec.get("sourceRoute"),
                "geometrySignature": shape_spec.get("geometrySignature"),
                "hasIconSpec": bool(shape_spec.get("iconSpec")),
            }
        results.append(result)
        if len(results) >= limit:
            break

    return {
        "query": query,
        "index": str(INDEX_PATH),
        "shapeSpecs": str(SHAPE_SPECS_PATH),
        "results": results,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Lookup offline Baijiahao mature-library icons.")
    parser.add_argument("query", help="Icon label, alias, node id, or business phrase.")
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--json", action="store_true", help="Print JSON. This is the default-friendly mode for agents.")
    args = parser.parse_args()

    payload = lookup(args.query, args.limit)
    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return

    if not payload["results"]:
        print(f"未命中成熟库：{args.query}")
        return

    for index, result in enumerate(payload["results"], 1):
        shape = result.get("shapeSpec") or {}
        fidelity = shape.get("fidelityLevel") or "none"
        print(
            f"{index}. {result['label']} / {result['name']} "
            f"node={result['nodeId']} route={result['route']} shape={fidelity}"
        )


if __name__ == "__main__":
    main()

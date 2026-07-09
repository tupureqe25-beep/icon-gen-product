#!/usr/bin/env python3
"""Search real external icon libraries for source-reference candidates.

The script downloads official npm packages into a user cache, builds a small
runtime index, and returns source candidates with metadata and optional SVG.
External icons are references for semantic adaptation; they are not the final
Baijiahao output geometry.
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any


PACKAGE_SPECS = {
    "lucide": {
        "package": "lucide-static",
        "license": "ISC",
        "risk": "low",
        "note": "clean outline baseline; good for system/action icons",
    },
    "tabler": {
        "package": "@tabler/icons",
        "license": "MIT",
        "risk": "low",
        "note": "broad admin-console outline icon set",
    },
    "phosphor": {
        "package": "@phosphor-icons/core",
        "license": "MIT",
        "risk": "medium",
        "note": "expressive forms; use as metaphor reference, adapt style strictly",
    },
    "iconpark": {
        "package": "@icon-park/svg",
        "license": "MIT",
        "risk": "medium",
        "note": "Chinese metadata and broad UI/product metaphors; simplify into Baijiahao rules",
    },
}

DEFAULT_LIBRARIES = ["lucide", "tabler", "iconpark", "phosphor"]

CHINESE_QUERY_EXPANSIONS = {
    "搜索": ["search", "find", "magnifier", "magnifying", "zoom"],
    "查询": ["search", "find", "lookup"],
    "检索": ["search", "find", "scan"],
    "成功": ["success", "check", "circle-check", "badge-check", "done"],
    "失败": ["fail", "x", "circle-x", "error"],
    "错误": ["error", "x", "alert"],
    "警告": ["warning", "alert", "triangle-alert"],
    "警示": ["warning", "alert", "triangle-alert"],
    "发布": ["publish", "send", "upload", "rocket", "share"],
    "发送": ["send", "paper-plane", "send-horizontal"],
    "上传": ["upload", "arrow-up", "cloud-upload"],
    "下载": ["download", "arrow-down", "cloud-download"],
    "导入": ["import", "upload", "file-up"],
    "导出": ["export", "download", "file-down", "share"],
    "分享": ["share", "nodes", "network", "share-2"],
    "分发": ["share", "network", "branch", "route"],
    "分销": ["share", "network", "branch", "route", "workflow"],
    "内容": ["content", "file", "document", "newspaper", "article", "text"],
    "文章": ["article", "newspaper", "file-text", "document"],
    "文档": ["document", "file", "file-text"],
    "列表": ["list", "rows", "table"],
    "数据": ["data", "chart", "analytics", "bar-chart", "database"],
    "分析": ["analysis", "analytics", "chart", "scan"],
    "诊断": ["diagnosis", "scan", "activity", "search-check", "stethoscope"],
    "智能": ["ai", "bot", "sparkles", "wand", "brain"],
    "AI": ["ai", "bot", "sparkles", "wand", "brain"],
    "改写": ["rewrite", "edit", "pencil", "pen", "refresh", "file-pen"],
    "编辑": ["edit", "pencil", "pen", "compose"],
    "创作": ["create", "edit", "pencil", "sparkles"],
    "生成": ["generate", "sparkles", "wand", "plus"],
    "设置": ["settings", "cog", "sliders"],
    "筛选": ["filter", "funnel"],
    "排序": ["sort", "arrow-down-up", "list-filter"],
    "删除": ["delete", "trash", "remove"],
    "复制": ["copy", "duplicate", "clone"],
    "刷新": ["refresh", "rotate", "reload"],
    "同步": ["sync", "refresh", "repeat"],
    "用户": ["user", "person", "profile"],
    "粉丝": ["users", "user-plus", "followers"],
    "增长": ["trending-up", "growth", "chart-up"],
    "权限": ["lock", "shield", "key"],
    "审核": ["review", "check", "shield-check", "clipboard-check"],
    "评论": ["comment", "message", "chat"],
    "消息": ["message", "bell", "mail"],
    "通知": ["notification", "bell"],
    "收益": ["income", "money", "coins", "wallet"],
    "素材": ["image", "picture", "folder", "files"],
}


@dataclass
class PackageInfo:
    library: str
    package: str
    version: str
    root: Path
    license: str


def cache_root() -> Path:
    configured = os.environ.get("ICON_SOURCE_CACHE")
    if configured:
        return Path(configured).expanduser()
    return Path.home() / ".cache" / "codex" / "icon-gen-baijiahao" / "external-sources"


def safe_package_name(package_name: str) -> str:
    return package_name.replace("@", "").replace("/", "__")


def safe_extract(tar: tarfile.TarFile, target: Path) -> None:
    target_resolved = target.resolve()
    for member in tar.getmembers():
        member_path = (target / member.name).resolve()
        if target_resolved not in [member_path, *member_path.parents]:
            raise RuntimeError(f"Refusing unsafe tar member: {member.name}")
    tar.extractall(target)


def npm_pack(package_name: str, destination: Path) -> dict[str, Any]:
    if not shutil.which("npm"):
        raise RuntimeError("npm is required to fetch external icon source packages")
    destination.mkdir(parents=True, exist_ok=True)
    completed = subprocess.run(
        ["npm", "pack", package_name, "--json", "--pack-destination", str(destination)],
        check=True,
        capture_output=True,
        text=True,
        timeout=180,
    )
    payload = json.loads(completed.stdout)
    if isinstance(payload, list) and payload:
        return payload[0]
    raise RuntimeError(f"npm pack returned no package metadata for {package_name}")


def ensure_package(library: str, refresh: bool = False) -> PackageInfo:
    spec = PACKAGE_SPECS[library]
    package_name = spec["package"]
    packages_root = cache_root() / "packages"

    if not refresh:
        candidates = sorted(packages_root.glob(f"{safe_package_name(package_name)}-*"), reverse=True)
        for root in candidates:
            package_root = root / "package"
            ready_marker = root / ".ready"
            if package_root.exists() and ready_marker.exists():
                ready = json.loads(ready_marker.read_text(encoding="utf-8"))
                return PackageInfo(
                    library,
                    package_name,
                    ready.get("version", root.name.rsplit("-", 1)[-1]),
                    package_root,
                    ready.get("license", spec["license"]),
                )

    with tempfile.TemporaryDirectory(prefix="icon-source-pack-") as temp_dir:
        pack_dir = Path(temp_dir)
        pack_info = npm_pack(package_name, pack_dir)
        version = pack_info["version"]
        license_value = pack_info.get("license") or spec["license"]
        root = packages_root / f"{safe_package_name(package_name)}-{version}"
        package_root = root / "package"
        ready_marker = root / ".ready"

        if refresh and root.exists():
            shutil.rmtree(root)
        if root.exists() and not ready_marker.exists():
            shutil.rmtree(root)
        if package_root.exists() and ready_marker.exists():
            return PackageInfo(library, package_name, version, package_root, license_value)

        root.mkdir(parents=True, exist_ok=True)
        tarballs = sorted(pack_dir.glob("*.tgz"))
        if not tarballs:
            raise RuntimeError(f"npm pack did not create a tarball for {package_name}")
        with tarfile.open(tarballs[0], "r:gz") as tar:
            safe_extract(tar, root)
        ready_marker.write_text(json.dumps({
            "package": package_name,
            "version": version,
            "license": license_value,
            "fetchedAt": int(time.time()),
            "fetcher": "npm pack",
        }, ensure_ascii=False, indent=2), encoding="utf-8")

        return PackageInfo(library, package_name, version, package_root, license_value)


def split_terms(value: str) -> list[str]:
    if not value:
        return []
    value = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", value)
    value = value.replace("-", " ").replace("_", " ").replace("/", " ")
    english = re.findall(r"[a-zA-Z0-9]+", value.lower())
    chinese_chunks = re.findall(r"[\u4e00-\u9fff]+", value)
    chinese_terms: list[str] = []
    for chunk in chinese_chunks:
        chinese_terms.append(chunk)
        if len(chunk) > 2:
            chinese_terms.extend(chunk[i:i + 2] for i in range(len(chunk) - 1))
    return [term for term in [*english, *chinese_terms] if term]


def expand_query(query: str) -> list[str]:
    terms: list[str] = []
    terms.extend(split_terms(query))
    compact = re.sub(r"\s+", "", query)
    for key, expansions in CHINESE_QUERY_EXPANSIONS.items():
        if key in query or key in compact:
            terms.extend(split_terms(key))
            terms.extend(expansions)
    # Lightweight English aliases.
    if "ai" in [t.lower() for t in terms]:
        terms.extend(["bot", "sparkles", "wand", "brain"])
    unique: list[str] = []
    seen: set[str] = set()
    for term in terms:
        normalized = term.lower()
        if normalized and normalized not in seen:
            unique.append(normalized)
            seen.add(normalized)
    return unique


def camel_to_kebab(value: str) -> str:
    value = re.sub(r"(.)([A-Z][a-z]+)", r"\1-\2", value)
    value = re.sub(r"([a-z0-9])([A-Z])", r"\1-\2", value)
    return value.lower()


def iconpark_file_map(package_root: Path) -> dict[str, Path]:
    icon_dir = package_root / "lib" / "icons"
    result: dict[str, Path] = {}
    for path in icon_dir.glob("*.js"):
        result[camel_to_kebab(path.stem)] = path
    return result


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def svg_summary(svg: str | None) -> dict[str, Any]:
    if not svg:
        return {"nodeCount": None, "hasFill": None, "hasStroke": None}
    lower = svg.lower()
    node_count = len(re.findall(r"<(path|circle|rect|line|polyline|polygon|ellipse)\b", lower))
    fill_values = re.findall(r'fill=["\']([^"\']+)["\']', lower)
    stroke_values = re.findall(r'stroke=["\']([^"\']+)["\']', lower)
    has_fill = any(value.strip() not in {"none", "transparent"} for value in fill_values)
    has_stroke = any(value.strip() not in {"none", "transparent"} for value in stroke_values)
    return {"nodeCount": node_count, "hasFill": has_fill, "hasStroke": has_stroke}


def compact_svg(svg: str, max_chars: int) -> str:
    svg = re.sub(r"\s+", " ", svg).strip()
    if len(svg) <= max_chars:
        return svg
    return svg[:max_chars] + "…"


def score_candidate(query_terms: list[str], fields: list[str], library: str) -> tuple[int, list[str]]:
    text = " ".join(fields)
    lower_text = text.lower()
    field_terms = set(split_terms(text))
    score = 0
    matched: list[str] = []
    for term in query_terms:
        term_lower = term.lower()
        if term_lower in field_terms:
            score += 24
            matched.append(term_lower)
        elif term_lower and term_lower in lower_text:
            score += 12
            matched.append(term_lower)
        else:
            # Singular/plural and hyphen-light tolerance.
            stripped = term_lower.rstrip("s")
            if len(stripped) >= 4 and any(token.rstrip("s") == stripped for token in field_terms):
                score += 10
                matched.append(term_lower)
    name = fields[0].lower() if fields else ""
    if name in query_terms:
        score += 40
    if library in {"lucide", "tabler"}:
        score += 4
    elif library == "iconpark":
        score += 2
    return score, sorted(set(matched))


def lucide_candidates(info: PackageInfo, include_svg: bool, max_svg_chars: int) -> list[dict[str, Any]]:
    tags = read_json(info.root / "tags.json")
    icons_dir = info.root / "icons"
    candidates = []
    for name, tag_values in tags.items():
        svg_path = icons_dir / f"{name}.svg"
        svg = svg_path.read_text(encoding="utf-8") if include_svg and svg_path.exists() else None
        candidates.append({
            "library": "lucide",
            "package": info.package,
            "version": info.version,
            "license": info.license,
            "name": name,
            "title": name.replace("-", " "),
            "category": "",
            "tags": tag_values,
            "sourcePath": str(svg_path),
            "styleRisk": PACKAGE_SPECS["lucide"]["risk"],
            "usageNote": PACKAGE_SPECS["lucide"]["note"],
            "svg": compact_svg(svg, max_svg_chars) if svg else None,
            "svgSummary": svg_summary(svg),
        })
    return candidates


def tabler_candidates(info: PackageInfo, include_svg: bool, max_svg_chars: int) -> list[dict[str, Any]]:
    metadata = read_json(info.root / "icons.json")
    icons_dir = info.root / "icons" / "outline"
    candidates = []
    for name, item in metadata.items():
        svg_path = icons_dir / f"{name}.svg"
        svg = svg_path.read_text(encoding="utf-8") if include_svg and svg_path.exists() else None
        candidates.append({
            "library": "tabler",
            "package": info.package,
            "version": info.version,
            "license": info.license,
            "name": name,
            "title": item.get("name", name).replace("-", " "),
            "category": item.get("category", ""),
            "tags": item.get("tags", []),
            "sourcePath": str(svg_path),
            "styleRisk": PACKAGE_SPECS["tabler"]["risk"],
            "usageNote": PACKAGE_SPECS["tabler"]["note"],
            "svg": compact_svg(svg, max_svg_chars) if svg else None,
            "svgSummary": svg_summary(svg),
        })
    return candidates


def phosphor_candidates(info: PackageInfo, include_svg: bool, max_svg_chars: int, weight: str = "regular") -> list[dict[str, Any]]:
    icons_dir = info.root / "assets" / weight
    candidates = []
    for svg_path in sorted(icons_dir.glob("*.svg")):
        name = svg_path.stem
        svg = svg_path.read_text(encoding="utf-8") if include_svg else None
        candidates.append({
            "library": "phosphor",
            "package": info.package,
            "version": info.version,
            "license": info.license,
            "name": name,
            "title": name.replace("-", " "),
            "category": weight,
            "tags": split_terms(name),
            "sourcePath": str(svg_path),
            "styleRisk": PACKAGE_SPECS["phosphor"]["risk"],
            "usageNote": PACKAGE_SPECS["phosphor"]["note"],
            "svg": compact_svg(svg, max_svg_chars) if svg else None,
            "svgSummary": svg_summary(svg),
        })
    return candidates


def render_iconpark_svg(path: Path, max_svg_chars: int) -> str | None:
    if not shutil.which("node"):
        return None
    js = """
const iconPath = process.argv[1];
const mod = require(iconPath);
const fn = mod.default || mod;
const svg = fn({
  size: 48,
  theme: 'outline',
  fill: '#242529',
  strokeWidth: 4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
});
console.log(String(svg).replace(/^<\\?xml[^>]*>\\s*/, ''));
"""
    try:
        completed = subprocess.run(
            ["node", "-e", js, str(path)],
            check=True,
            capture_output=True,
            text=True,
            timeout=10,
        )
        return compact_svg(completed.stdout.strip(), max_svg_chars)
    except Exception:
        return None


def iconpark_candidates(info: PackageInfo, include_svg: bool, max_svg_chars: int) -> list[dict[str, Any]]:
    metadata = read_json(info.root / "icons.json")
    file_map = iconpark_file_map(info.root)
    candidates = []
    for item in metadata:
        name = item.get("name", "")
        svg_path = file_map.get(name)
        svg = render_iconpark_svg(svg_path, max_svg_chars) if include_svg and svg_path else None
        candidates.append({
            "library": "iconpark",
            "package": info.package,
            "version": info.version,
            "license": info.license,
            "name": name,
            "title": item.get("title", name),
            "category": item.get("category", ""),
            "categoryCN": item.get("categoryCN", ""),
            "tags": item.get("tag", []),
            "sourcePath": str(svg_path) if svg_path else "",
            "styleRisk": PACKAGE_SPECS["iconpark"]["risk"],
            "usageNote": PACKAGE_SPECS["iconpark"]["note"],
            "svg": svg,
            "svgSummary": svg_summary(svg),
        })
    return candidates


def iconfont_candidates(source: str, include_svg: bool, max_svg_chars: int) -> list[dict[str, Any]]:
    if source.startswith("http://") or source.startswith("https://"):
        with urllib.request.urlopen(source, timeout=30) as response:
            text = response.read().decode("utf-8", errors="ignore")
        source_path = source
    else:
        source_path = str(Path(source).expanduser())
        text = Path(source_path).read_text(encoding="utf-8", errors="ignore")

    candidates = []
    for match in re.finditer(r"<symbol\\b([^>]*)>(.*?)</symbol>", text, flags=re.I | re.S):
        attrs = match.group(1)
        body = match.group(2)
        id_match = re.search(r'id=["\\\']([^"\\\']+)["\\\']', attrs)
        view_box_match = re.search(r'viewBox=["\\\']([^"\\\']+)["\\\']', attrs)
        if not id_match:
            continue
        symbol_id = id_match.group(1)
        name = re.sub(r"^icon[-_]", "", symbol_id)
        view_box = view_box_match.group(1) if view_box_match else "0 0 1024 1024"
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{html.escape(view_box)}">{body}</svg>'
        candidates.append({
            "library": "iconfont",
            "package": "user-provided-symbol",
            "version": "local-or-url",
            "license": "user/project controlled",
            "name": name,
            "title": name.replace("-", " ").replace("_", " "),
            "category": "",
            "tags": split_terms(name),
            "sourcePath": source_path,
            "styleRisk": "high",
            "usageNote": "Iconfont global search is not stable; this result comes from user-provided symbol source.",
            "svg": compact_svg(svg, max_svg_chars) if include_svg else None,
            "svgSummary": svg_summary(svg if include_svg else None),
        })
    return candidates


def build_candidates(args: argparse.Namespace) -> list[dict[str, Any]]:
    libraries = args.libraries
    candidates: list[dict[str, Any]] = []
    for library in libraries:
        if library == "iconfont":
            if not args.iconfont_source:
                continue
            candidates.extend(iconfont_candidates(args.iconfont_source, args.include_svg, args.max_svg_chars))
            continue
        info = ensure_package(library, refresh=args.refresh)
        if library == "lucide":
            candidates.extend(lucide_candidates(info, False, args.max_svg_chars))
        elif library == "tabler":
            candidates.extend(tabler_candidates(info, False, args.max_svg_chars))
        elif library == "phosphor":
            candidates.extend(phosphor_candidates(info, False, args.max_svg_chars, args.phosphor_weight))
        elif library == "iconpark":
            candidates.extend(iconpark_candidates(info, False, args.max_svg_chars))
    return candidates


def enrich_svg(candidate: dict[str, Any], max_svg_chars: int) -> dict[str, Any]:
    if candidate.get("svg"):
        return candidate
    source_path = candidate.get("sourcePath")
    if not source_path:
        return candidate
    path = Path(source_path)
    svg: str | None = None
    if candidate["library"] == "iconpark":
        svg = render_iconpark_svg(path, max_svg_chars) if path.exists() else None
    elif path.exists() and path.suffix.lower() == ".svg":
        svg = compact_svg(path.read_text(encoding="utf-8"), max_svg_chars)
    if svg:
        candidate["svg"] = svg
        candidate["svgSummary"] = svg_summary(svg)
    return candidate


def search(args: argparse.Namespace) -> dict[str, Any]:
    query_terms = expand_query(args.query)
    candidates = build_candidates(args)
    results: list[dict[str, Any]] = []
    for candidate in candidates:
        fields = [
            candidate.get("name", ""),
            candidate.get("title", ""),
            candidate.get("category", ""),
            candidate.get("categoryCN", ""),
            " ".join(map(str, candidate.get("tags", []))),
        ]
        score, matched = score_candidate(query_terms, fields, candidate["library"])
        if score <= 0:
            continue
        item = dict(candidate)
        item["score"] = score
        item["matchedTerms"] = matched
        item["adaptationReminder"] = "Use as semantic reference only; redraw into Baijiahao native editable style."
        results.append(item)

    results.sort(key=lambda item: (-item["score"], item["library"], item["name"]))
    if args.library_limit > 0:
        per_library: dict[str, int] = {}
        limited: list[dict[str, Any]] = []
        for item in results:
            count = per_library.get(item["library"], 0)
            if count >= args.library_limit:
                continue
            per_library[item["library"]] = count + 1
            limited.append(item)
        results = limited
    results = results[:args.limit]
    if args.include_svg:
        results = [enrich_svg(item, args.max_svg_chars) for item in results]

    return {
        "query": args.query,
        "expandedTerms": query_terms,
        "libraries": args.libraries,
        "resultCount": len(results),
        "cacheRoot": str(cache_root()),
        "results": results,
    }


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Search real external icon source libraries.")
    parser.add_argument("query", help="Search query, Chinese or English.")
    parser.add_argument(
        "--libraries",
        default=",".join(DEFAULT_LIBRARIES),
        help="Comma-separated libraries: lucide,tabler,iconpark,phosphor,iconfont,all.",
    )
    parser.add_argument("--limit", type=int, default=12, help="Maximum total results.")
    parser.add_argument("--library-limit", type=int, default=4, help="Maximum results per library; 0 disables per-library cap.")
    parser.add_argument("--include-svg", action="store_true", help="Include compact SVG snippets in results.")
    parser.add_argument("--max-svg-chars", type=int, default=2400, help="Maximum SVG snippet length per result.")
    parser.add_argument("--iconfont-source", help="Local path or URL to iconfont symbol.js / SVG sprite.")
    parser.add_argument("--phosphor-weight", default="regular", choices=["thin", "light", "regular", "bold", "fill", "duotone"])
    parser.add_argument("--refresh", action="store_true", help="Refresh npm package cache.")
    parser.add_argument("--json", action="store_true", help="Print JSON.")
    args = parser.parse_args(argv)
    libraries = [item.strip().lower() for item in args.libraries.split(",") if item.strip()]
    if "all" in libraries:
        libraries = [*DEFAULT_LIBRARIES]
        if args.iconfont_source:
            libraries.append("iconfont")
    invalid = [library for library in libraries if library not in [*PACKAGE_SPECS.keys(), "iconfont"]]
    if invalid:
        parser.error(f"Unsupported libraries: {', '.join(invalid)}")
    args.libraries = libraries
    return args


def print_text(payload: dict[str, Any]) -> None:
    print(f"Query: {payload['query']}")
    print(f"Expanded terms: {', '.join(payload['expandedTerms'])}")
    print(f"Results: {payload['resultCount']}")
    for index, item in enumerate(payload["results"], start=1):
        title = item.get("title") or item["name"]
        tags = ", ".join(map(str, item.get("tags", [])[:6]))
        print(f"\n{index}. [{item['library']}] {item['name']} — {title}")
        print(f"   score={item['score']} matched={', '.join(item['matchedTerms'])}")
        print(f"   category={item.get('category') or item.get('categoryCN') or '-'} risk={item['styleRisk']} license={item['license']}")
        if tags:
            print(f"   tags={tags}")
        print(f"   source={item['sourcePath']}")
        if item.get("svg"):
            print(f"   svg={item['svg']}")


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    payload = search(args)
    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print_text(payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

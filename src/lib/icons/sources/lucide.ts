import fs from "node:fs";
import path from "node:path";
import * as lucideSvgMap from "lucide-static";
import { searchPackageIconAssets, type PackageIconMeta } from "@/lib/icons/sources/package-source";
import type { IconAsset } from "@/lib/icons/types";

function kebabCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

const lucideTagsPath = path.join(process.cwd(), "node_modules", "lucide-static", "tags.json");
const tagMap = JSON.parse(fs.readFileSync(lucideTagsPath, "utf8")) as Record<string, string[]>;

const lucideIcons: PackageIconMeta[] = Object.entries(lucideSvgMap)
  .filter(([, svg]) => typeof svg === "string" && svg.includes("<svg"))
  .map(([componentName, svg]) => {
    const name = kebabCase(componentName);
    return {
      name,
      category: "outline",
      tags: tagMap[name] ?? [],
      svg,
    };
  });

export function searchLucideAssets(query: string, limit = 36): IconAsset[] {
  return searchPackageIconAssets(query, lucideIcons, {
    source: "lucide-static",
    categoryPrefix: "lucide",
    license: "ISC",
    limit,
    minScore: 2,
    styleTags: ["outline", "24px", "2px", "stroke", "lucide"],
  });
}

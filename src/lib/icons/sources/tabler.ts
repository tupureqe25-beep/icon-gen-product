import fs from "node:fs";
import path from "node:path";
import { searchPackageIconAssets, type PackageIconMeta } from "@/lib/icons/sources/package-source";
import type { IconAsset } from "@/lib/icons/types";

type TablerIconMetadata = {
  name: string;
  category?: string;
  tags?: Array<string | number>;
  styles?: {
    outline?: unknown;
  };
};

const tablerIconsDir = path.join(process.cwd(), "node_modules", "@tabler", "icons", "icons", "outline");
const tablerMetadataPath = path.join(process.cwd(), "node_modules", "@tabler", "icons", "icons.json");
const tablerIconMap = JSON.parse(fs.readFileSync(tablerMetadataPath, "utf8")) as Record<string, TablerIconMetadata>;

function readTablerIconSvg(name: string) {
  try {
    return fs.readFileSync(path.join(tablerIconsDir, `${name}.svg`), "utf8");
  } catch {
    return undefined;
  }
}

const tablerIcons: PackageIconMeta[] = Object.entries(tablerIconMap)
  .filter(([, meta]) => Boolean(meta.styles?.outline))
  .map(([name, meta]) => {
    const svg = readTablerIconSvg(name);
    if (!svg) return undefined;

    return {
      name,
      category: meta.category ?? "outline",
      tags: (meta.tags ?? []).map(String),
      svg,
    };
  })
  .filter((icon): icon is PackageIconMeta => Boolean(icon));

export function searchTablerAssets(query: string, limit = 36): IconAsset[] {
  return searchPackageIconAssets(query, tablerIcons, {
    source: "tabler-icons",
    categoryPrefix: "tabler",
    license: "MIT",
    limit,
    minScore: 2,
    styleTags: ["outline", "24px", "2px", "stroke", "tabler"],
  });
}

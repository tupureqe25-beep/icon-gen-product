import fs from "node:fs";
import path from "node:path";
import { icons as phosphorMetadata } from "@phosphor-icons/core";
import { searchPackageIconAssets, type PackageIconMeta } from "@/lib/icons/sources/package-source";
import type { IconAsset } from "@/lib/icons/types";

type PhosphorIconMetadata = {
  name: string;
  categories?: readonly string[];
  figma_category?: string;
  tags?: readonly string[];
};

const phosphorLightDir = path.join(process.cwd(), "node_modules", "@phosphor-icons", "core", "assets", "light");

function readPhosphorIconSvg(name: string) {
  try {
    return fs.readFileSync(path.join(phosphorLightDir, `${name}-light.svg`), "utf8");
  } catch {
    return undefined;
  }
}

const phosphorIcons: PackageIconMeta[] = (phosphorMetadata as unknown as readonly PhosphorIconMetadata[])
  .map((meta) => {
    const svg = readPhosphorIconSvg(meta.name);
    if (!svg) return undefined;

    return {
      name: meta.name,
      category: meta.figma_category ?? meta.categories?.[0] ?? "regular",
      tags: [...(meta.tags ?? []), ...(meta.categories ?? []), "phosphor-light", "filled-source"],
      svg,
    };
  })
  .filter((icon): icon is PackageIconMeta => Boolean(icon));

export function searchPhosphorAssets(query: string, limit = 36): IconAsset[] {
  return searchPackageIconAssets(query, phosphorIcons, {
    source: "phosphor-icons",
    categoryPrefix: "phosphor",
    license: "MIT",
    limit,
    minScore: 2,
    styleTags: ["phosphor", "light", "filled-source", "needs-outline-redraw"],
  });
}

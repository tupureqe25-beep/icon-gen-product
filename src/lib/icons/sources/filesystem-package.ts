import fs from "node:fs";
import path from "node:path";
import type { IconAsset } from "@/lib/icons/types";
import { searchPackageIconAssets, type PackageIconMeta } from "@/lib/icons/sources/package-source";

export type FilesystemSourceId = "fluent" | "material" | "antd" | "tdesign" | "carbon" | "remix";

type SourceDefinition = {
  root: string;
  source: string;
  categoryPrefix: string;
  license: string;
  styleTags: string[];
  accept: (fileName: string, absolutePath: string) => boolean;
  normalizeName: (fileName: string) => string;
};

const definitions: Record<FilesystemSourceId, SourceDefinition> = {
  fluent: {
    root: path.join(process.cwd(), "node_modules", "@fluentui", "svg-icons", "icons"),
    source: "fluent-ui",
    categoryPrefix: "fluent",
    license: "MIT",
    styleTags: ["fluent", "regular", "toolbar", "product-ui"],
    accept: (fileName) => fileName.endsWith("_24_regular.svg"),
    normalizeName: (fileName) => fileName.replace(/_24_regular\.svg$/, "").replace(/_/g, "-"),
  },
  material: {
    root: path.join(process.cwd(), "node_modules", "@material-symbols", "svg-400", "rounded"),
    source: "material-symbols",
    categoryPrefix: "material",
    license: "Apache-2.0",
    styleTags: ["material", "rounded", "conventional-ui", "filled-source"],
    accept: (fileName) => fileName.endsWith(".svg") && !fileName.endsWith("-fill.svg"),
    normalizeName: (fileName) => fileName.replace(/\.svg$/, "").replace(/_/g, "-"),
  },
  antd: {
    root: path.join(process.cwd(), "node_modules", "@ant-design", "icons-svg", "inline-svg", "outlined"),
    source: "ant-design-icons",
    categoryPrefix: "antd",
    license: "MIT",
    styleTags: ["antd", "outlined", "chinese-b2b", "admin"],
    accept: (fileName) => fileName.endsWith(".svg"),
    normalizeName: (fileName) => fileName.replace(/\.svg$/, ""),
  },
  tdesign: {
    root: path.join(process.cwd(), "node_modules", "tdesign-icons-svg", "src"),
    source: "tdesign-icons",
    categoryPrefix: "tdesign",
    license: "MIT",
    styleTags: ["tdesign", "outline", "chinese-b2b", "operation"],
    accept: (fileName) => fileName.endsWith(".svg") && !fileName.includes("-filled") && !fileName.startsWith("logo-"),
    normalizeName: (fileName) => fileName.replace(/\.svg$/, ""),
  },
  carbon: {
    root: path.join(process.cwd(), "node_modules", "@carbon", "icons", "svg", "24"),
    source: "carbon-icons",
    categoryPrefix: "carbon",
    license: "Apache-2.0",
    styleTags: ["carbon", "enterprise", "data", "analytics"],
    accept: (fileName) => fileName.endsWith(".svg") && !fileName.includes("filled") && !fileName.startsWith("logo--"),
    normalizeName: (fileName) => fileName.replace(/\.svg$/, "").replace(/--/g, "-"),
  },
  remix: {
    root: path.join(process.cwd(), "node_modules", "remixicon", "icons"),
    source: "remix-icon",
    categoryPrefix: "remix",
    license: "Apache-2.0",
    styleTags: ["remix", "line", "web-product", "filled-source"],
    accept: (fileName) => fileName.endsWith("-line.svg"),
    normalizeName: (fileName) => fileName.replace(/-line\.svg$/, ""),
  },
};

function walkSvgFiles(root: string, definition: SourceDefinition, limit = 12000) {
  if (!fs.existsSync(root)) return [];
  const result: string[] = [];
  const queue = [root];

  while (queue.length && result.length < limit) {
    const current = queue.shift();
    if (!current) continue;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) queue.push(absolutePath);
      else if (definition.accept(entry.name, absolutePath)) result.push(absolutePath);
      if (result.length >= limit) break;
    }
  }
  return result;
}

const sourceIndexes = new Map<FilesystemSourceId, PackageIconMeta[]>();

function getSourceIndex(sourceId: FilesystemSourceId) {
  const cached = sourceIndexes.get(sourceId);
  if (cached) return cached;

  const definition = definitions[sourceId];
  const icons = walkSvgFiles(definition.root, definition).map((absolutePath) => {
    const fileName = path.basename(absolutePath);
    const relative = path.relative(definition.root, absolutePath);
    const category = path.dirname(relative) === "." ? "outline" : path.dirname(relative).replace(/\\/g, "/");
    const name = definition.normalizeName(fileName);
    return {
      name,
      category,
      tags: [...name.split(/[-_]+/), ...category.split(/[\\/\s_-]+/)].filter(Boolean),
      svg: fs.readFileSync(absolutePath, "utf8"),
    };
  });
  sourceIndexes.set(sourceId, icons);
  return icons;
}

export function searchFilesystemSourceAssets(sourceId: FilesystemSourceId, query: string, limit = 24): IconAsset[] {
  const definition = definitions[sourceId];
  return searchPackageIconAssets(query, getSourceIndex(sourceId), {
    source: definition.source,
    categoryPrefix: definition.categoryPrefix,
    license: definition.license,
    limit,
    minScore: 2,
    styleTags: definition.styleTags,
  });
}

export const filesystemSourceIds = Object.keys(definitions) as FilesystemSourceId[];

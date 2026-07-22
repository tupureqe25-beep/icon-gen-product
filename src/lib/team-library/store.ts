import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { IconAsset } from "@/lib/icons/types";

export type TeamLibraryTrainingSource = "figma-canvas" | "iconfont-symbol" | "pasted-svg" | "canvas-review" | "manual";

export type TeamLibraryAsset = IconAsset & {
  libraryId: string;
  aliases: string[];
  contexts: string[];
  semanticDescription: string;
  visualElements: string[];
  trainingSource: TeamLibraryTrainingSource;
  originalSource: string;
  status: "trained" | "reviewed" | "approved";
  qualityScore?: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TeamLibraryStore = {
  version: 1;
  updatedAt: string;
  assets: TeamLibraryAsset[];
};

export type TeamLibraryInputAsset = IconAsset & {
  aliases?: string[];
  contexts?: string[];
  semanticDescription?: string;
  visualElements?: string[];
  trainingSource?: TeamLibraryTrainingSource;
  originalSource?: string;
  status?: TeamLibraryAsset["status"];
  qualityScore?: number;
};

const storePath = path.join(process.cwd(), "data", "team-icon-library.json");

const fallbackStore: TeamLibraryStore = {
  version: 1,
  updatedAt: new Date(0).toISOString(),
  assets: [],
};

function uniq(values: Array<string | undefined>) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => (value ?? "").split(/[\s,，、/|]+/))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function sanitizeId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5_-]+/gi, "-").replace(/^-+|-+$/g, "") || "team-icon";
}

function isGenericFigmaLayer(asset: TeamLibraryInputAsset) {
  return (
    asset.trainingSource === "figma-canvas" &&
    /^(rectangle|vector|group|frame|ellipse|line|polygon|boolean)(?:\s+\d+)?$/i.test(asset.name.trim())
  );
}

function inferVisualElements(asset: IconAsset) {
  const svg = asset.svg.toLowerCase();
  const elements = [
    svg.includes("<circle") || svg.includes("<ellipse") ? "circle/ellipse" : undefined,
    svg.includes("<rect") ? "rounded-rect" : undefined,
    svg.includes("<line") ? "line" : undefined,
    svg.includes("<polyline") || svg.includes("<polygon") ? "polyline" : undefined,
    svg.includes("<path") ? "path" : undefined,
  ];
  return uniq(elements).slice(0, 6);
}

function buildSemanticDescription(asset: TeamLibraryInputAsset) {
  if (asset.semanticDescription?.trim()) return asset.semanticDescription.trim();
  const tags = uniq([asset.name, asset.category, ...asset.tags]).slice(0, 8).join("、");
  return tags ? `团队成熟图标：${asset.name}；语义标签包含 ${tags}。` : `团队成熟图标：${asset.name}。`;
}

function normalizeLibraryAsset(asset: TeamLibraryInputAsset, existing?: TeamLibraryAsset): TeamLibraryAsset {
  const now = new Date().toISOString();
  const tags = uniq([asset.name, asset.category, ...asset.tags, ...(asset.aliases ?? []), ...(asset.contexts ?? [])]);
  const originalSource = asset.originalSource ?? asset.source;
  const libraryId = existing?.libraryId ?? `team-${sanitizeId(asset.id || asset.name)}-${sanitizeId(originalSource)}`;
  const aliases = uniq([...(existing?.aliases ?? []), ...(asset.aliases ?? []), asset.name, ...asset.tags]).slice(0, 24);
  const contexts = uniq([...(existing?.contexts ?? []), ...(asset.contexts ?? []), asset.category]).slice(0, 12);
  const visualElements = asset.visualElements?.length ? uniq(asset.visualElements) : inferVisualElements(asset);

  return {
    ...asset,
    id: libraryId,
    libraryId,
    name: asset.name || existing?.name || "team-icon",
    category: asset.category || existing?.category || "team-library",
    tags,
    source: "team-library",
    license: asset.license || existing?.license || "team-internal",
    svg: asset.svg || existing?.svg || "",
    aliases,
    contexts,
    semanticDescription: buildSemanticDescription(asset),
    visualElements,
    trainingSource: asset.trainingSource ?? existing?.trainingSource ?? "manual",
    originalSource,
    status: asset.status ?? existing?.status ?? "trained",
    qualityScore: asset.qualityScore ?? existing?.qualityScore,
    usageCount: existing?.usageCount ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export async function readTeamLibraryStore(): Promise<TeamLibraryStore> {
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as TeamLibraryStore;
    return {
      version: 1,
      updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
      assets: Array.isArray(parsed.assets) ? parsed.assets : [],
    };
  } catch {
    return fallbackStore;
  }
}

export async function writeTeamLibraryStore(store: TeamLibraryStore) {
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export async function upsertTeamLibraryAssets(inputAssets: TeamLibraryInputAsset[]) {
  const store = await readTeamLibraryStore();
  const assetMap = new Map(store.assets.map((asset) => [asset.libraryId, asset]));
  const sourceKeyMap = new Map(store.assets.map((asset) => [`${asset.originalSource}:${asset.name}`.toLowerCase(), asset]));
  let created = 0;
  let updated = 0;

  for (const inputAsset of inputAssets) {
    if (!inputAsset.svg?.trim() || isGenericFigmaLayer(inputAsset)) continue;
    const sourceKey = `${inputAsset.source}:${inputAsset.name}`.toLowerCase();
    const existing = assetMap.get(inputAsset.id) ?? sourceKeyMap.get(sourceKey);
    const next = normalizeLibraryAsset(inputAsset, existing);
    if (existing) updated += 1;
    else created += 1;
    assetMap.set(next.libraryId, next);
  }

  const nextStore: TeamLibraryStore = {
    version: 1,
    updatedAt: new Date().toISOString(),
    assets: Array.from(assetMap.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  };
  await writeTeamLibraryStore(nextStore);

  return {
    store: nextStore,
    created,
    updated,
    total: nextStore.assets.length,
  };
}

export async function clearTeamLibraryStore() {
  const nextStore: TeamLibraryStore = {
    version: 1,
    updatedAt: new Date().toISOString(),
    assets: [],
  };
  await writeTeamLibraryStore(nextStore);
  return nextStore;
}

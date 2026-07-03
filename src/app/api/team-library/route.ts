import { clearTeamLibraryStore, readTeamLibraryStore, upsertTeamLibraryAssets, type TeamLibraryInputAsset } from "@/lib/team-library/store";

export async function GET() {
  const store = await readTeamLibraryStore();
  return Response.json({
    source: "team-library",
    count: store.assets.length,
    updatedAt: store.updatedAt,
    assets: store.assets,
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    assets?: TeamLibraryInputAsset[];
    asset?: TeamLibraryInputAsset;
    clear?: boolean;
  };

  if (body.clear) {
    const store = await clearTeamLibraryStore();
    return Response.json({ source: "team-library", count: 0, updatedAt: store.updatedAt, assets: [] });
  }

  const assets = body.assets ?? (body.asset ? [body.asset] : []);
  if (!assets.length) {
    return Response.json({ message: "请提供要入库训练的 icon assets。" }, { status: 400 });
  }

  const result = await upsertTeamLibraryAssets(assets);
  return Response.json({
    source: "team-library",
    created: result.created,
    updated: result.updated,
    count: result.total,
    updatedAt: result.store.updatedAt,
    assets: result.store.assets,
  });
}

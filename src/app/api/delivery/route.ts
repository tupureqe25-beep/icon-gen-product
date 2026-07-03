import { buildDeliveryPackage } from "@/lib/icon-contract/generate";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { IconSpecContract } from "@/lib/icon-contract/types";

type DeliveryRequest = {
  spec?: IconSpecContract;
};

function validateSpec(spec: unknown): spec is IconSpecContract {
  if (!spec || typeof spec !== "object") return false;
  const candidate = spec as Partial<IconSpecContract>;

  return Boolean(
    candidate.meta?.name &&
      candidate.meta?.size === 24 &&
      candidate.meta?.style === "outline" &&
      candidate.meta?.color_mode === "monochrome" &&
      candidate.meta?.preview_status === "approved" &&
      candidate.strokes?.color === "#0F1218" &&
      candidate.strokes?.width === 2 &&
      Array.isArray(candidate.shapes) &&
      candidate.shapes.length > 0,
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as DeliveryRequest;

  if (!validateSpec(body.spec)) {
    return Response.json(
      {
        error: "INVALID_SPEC",
        message: "需要 approved 的 24px icon-gen-promax Icon Spec，且必须包含 #0F1218 / 2px / native shapes。",
      },
      { status: 422 },
    );
  }

  if (body.spec.validation.status !== "pass") {
    return Response.json(
      {
        error: "SPEC_GATED",
        message: "当前 Spec 仍有规范警告，不能生成生产交付包。",
        warnings: body.spec.validation.warnings,
      },
      { status: 409 },
    );
  }

  const deliveryPackage = buildDeliveryPackage(body.spec);
  const exportRoot = path.resolve(process.cwd(), "..", "exports", "iconops", deliveryPackage.id);
  const persistedFiles = [];

  await mkdir(exportRoot, { recursive: true });

  for (const file of deliveryPackage.files) {
    const fileName = path.basename(file.path);
    const absolutePath = path.join(exportRoot, fileName);
    await writeFile(absolutePath, file.content, "utf8");
    persistedFiles.push({
      path: file.path,
      absolutePath,
    });
  }

  return Response.json({
    ...deliveryPackage,
    persisted: {
      directory: exportRoot,
      files: persistedFiles,
    },
  });
}

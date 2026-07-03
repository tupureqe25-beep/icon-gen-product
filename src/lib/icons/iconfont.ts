import type { IconAsset } from "@/lib/icons/types";

function slugifyIconfontId(value: string) {
  const clean = value
    .replace(/^#/, "")
    .replace(/^icon[-_]?/i, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return clean || "iconfont-symbol";
}

function extractSymbols(input: string) {
  const matches = input.match(/<symbol[\s\S]*?<\/symbol>/g);
  return matches ?? [];
}

function readAttribute(markup: string, name: string) {
  return markup.match(new RegExp(`${name}=["']([^"']+)["']`))?.[1];
}

function symbolToSvg(symbol: string) {
  const id = readAttribute(symbol, "id") ?? "iconfont-symbol";
  const viewBox = readAttribute(symbol, "viewBox") ?? "0 0 1024 1024";
  const body = symbol.replace(/^<symbol[^>]*>/, "").replace(/<\/symbol>$/, "");

  return {
    id,
    svg: `<svg width="24" height="24" viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg">${body}</svg>`,
  };
}

export function parseIconfontSymbols(input: string, sourceName = "iconfont-symbol") {
  return extractSymbols(input).map((symbol, index) => {
    const parsed = symbolToSvg(symbol);
    const name = slugifyIconfontId(parsed.id);

    return {
      id: `${sourceName}-${index}-${name}`,
      name,
      category: "iconfont",
      tags: name.split("-").filter(Boolean),
      source: "iconfont-symbol",
      license: "source-project",
      svg: parsed.svg,
    } satisfies IconAsset;
  });
}

export function parseSvgAssets(input: string, sourceName = "pasted-svg") {
  const matches = input.match(/<svg[\s\S]*?<\/svg>/g) ?? [];

  return matches.map((svg, index) => {
    const id = readAttribute(svg, "id") ?? readAttribute(svg, "aria-label") ?? `${sourceName}-${index + 1}`;
    const name = slugifyIconfontId(id);

    return {
      id: `${sourceName}-${index}-${name}`,
      name,
      category: "svg-import",
      tags: name.split("-").filter(Boolean),
      source: "pasted-svg",
      license: "user-provided",
      svg,
    } satisfies IconAsset;
  });
}

export function looksLikeIconfontSymbols(input: string) {
  return input.includes("<symbol") && input.includes("</symbol>");
}

export function looksLikeSvgAssets(input: string) {
  return input.includes("<svg") && input.includes("</svg>");
}

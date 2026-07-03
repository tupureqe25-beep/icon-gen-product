function toPascalCase(name: string) {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function extractInnerSvg(svg: string) {
  return svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "").trim();
}

function jsxAttributes(svg: string) {
  return svg
    .replace(/stroke-width=/g, "strokeWidth=")
    .replace(/stroke-linecap=/g, "strokeLinecap=")
    .replace(/stroke-linejoin=/g, "strokeLinejoin=")
    .replace(/class=/g, "className=");
}

export function exportReactComponent(name: string, svg: string) {
  const componentName = `${toPascalCase(name)}Icon`;
  const body = jsxAttributes(extractInnerSvg(svg));

  return `import type { SVGProps } from "react";

export function ${componentName}(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      ${body}
    </svg>
  );
}
`;
}

export type PackageIcon = {
  name: string;
  svg: string;
};

export function exportReactPackage(icons: PackageIcon[]) {
  const files = icons.map((icon) => {
    const componentName = `${toPascalCase(icon.name)}Icon`;

    return {
      path: `icons/${componentName}.tsx`,
      code: exportReactComponent(icon.name, icon.svg),
      exportLine: `export { ${componentName} } from "./icons/${componentName}";`,
      registryLine: `  "${icon.name}": ${componentName},`,
      importLine: `import { ${componentName} } from "./icons/${componentName}";`,
    };
  });

  const indexCode = `${files.map((file) => file.exportLine).join("\n")}
`;
  const registryCode = `${files.map((file) => file.importLine).join("\n")}

export const icons = {
${files.map((file) => file.registryLine).join("\n")}
} as const;

export type IconName = keyof typeof icons;
`;

  return {
    files,
    indexCode,
    registryCode,
  };
}

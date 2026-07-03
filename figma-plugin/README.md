# IconOps 团队图标写入桥

This is the Figma-side writer for IconOps MVP.

## What it does

- Pulls the latest Icon Spec JSON job from the local web app.
- Creates editable Figma native nodes: component, rectangle, vector, line, ellipse.
- Applies the locked team style: 24×24, 2px stroke, round cap/join, `#0F1218`.
- Does not paste SVG and does not import images.

## Local use

1. Keep the web app running at `http://localhost:3000`.
2. In the web app, fill the Figma output bar and click `自动写入 Figma`.
3. In Figma desktop, import this folder as a development plugin.
4. Run `IconOps 团队图标写入桥`.
5. Keep `自动监听` enabled. After the web app creates a job, the plugin pulls it and writes automatically.
6. You can also click `立即拉取并写入` for manual retry.
7. Review the generated nodes with screenshot/visual gates before handoff.

## Important boundary

The browser app cannot directly create Figma canvas nodes through a Figma REST token.
The REST token can validate/read files, but write-to-canvas must happen inside a Figma Plugin API runtime.

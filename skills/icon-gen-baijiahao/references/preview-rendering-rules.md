# Preview Rendering Rules

## Purpose

Ensure user-facing icon previews are visible, reliable, and not confused with missing or broken image placeholders.

## Preview Contract

Every user-facing preview line must point to an actual renderable artifact.

Allowed preview artifacts:

- verified source screenshot, `.png`
- generated preview raster, `.png`
- generated preview SVG file, `.svg`
- inline Markdown image using an absolute local path when the app supports local images

Do not show an image placeholder if the file has not been created, cannot be read, or cannot be rendered in the current surface.

## Before Sending A Preview

Run this mental/file check:

```txt
1. preview file exists?
2. preview file size > 0?
3. preview path is absolute when shown in Markdown?
4. SVG has explicit width/height/viewBox?
5. dark-mode visibility is OK?
6. if source-locked mature icon: source screenshot or source node was actually inspected?
```

If any answer is no, do not emit `![...]({path})`.

Instead, use one of:

```txt
预览状态：暂不可渲染；原因：{missing file / source screenshot unavailable / current surface cannot render SVG}
下一步：{读取源节点 / 重新导出 png / 生成 svg 文件 / 写入 Figma 后截图校验}
```

or, for mature-library exact matches:

```txt
源图校验：已精确命中成熟库，但当前预览图未成功渲染。不能用文字或本地形态笔记替代标准版预览；需要重新读取源节点或导出截图后再继续。
```

## Mature-Library Exact Hit

For `team-reuse-needs-verification`, do not show a generic placeholder tile as `标准版预览`.

Valid standard preview must be one of:

- screenshot extracted from the actual Figma source node
- verified raster render of the actual source geometry
- verified SVG/native redraw after source screenshot inspection

If the preview cannot be rendered, still report the hit and node ID, but label the preview as unavailable.

## Semantic Direction Thumbnail

Phase 3 thumbnails are communication aids, not production previews. They may be simple sketches, but they still must be visible.

If a thumbnail cannot render:

- write `缩略图暂不可渲染`
- provide a one-line visual description
- continue only if the user can still choose by text

Do not show broken image placeholders.

## Formal SVG Preview

Phase 4B formal preview must be visually rendered or saved as a real file before asking for approval.

If inline rendering is unreliable, save both:

```txt
{icon-name}-preview.svg
{icon-name}-preview.png
```

Prefer showing the PNG in chat and keep SVG as the editable preview artifact.

## Common Causes Of Missing Preview

- the source is exact mature-library hit but the Figma source screenshot was not actually exported
- the assistant referenced a path that was never written
- relative path was used instead of absolute local path
- SVG lacks explicit size or has invisible stroke/color on dark UI
- the chat surface cannot render `file://` or raw SVG
- the assistant wrote text saying “已读取源节点” without producing a visual artifact

When any of these happens, treat it as a preview failure and fix the artifact before continuing to Icon Spec JSON or Figma drawing.

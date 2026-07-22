# Recraft-Inspired Workbench Design Guide

> Evidence note: the live Recraft project URL was blocked by Recraft sign-in plus Cloudflare verification, so the authenticated project shell could not be inspected with `agent-browser eval`. This guide combines the directly observed Recraft sign-in page with the Recraft workbench screenshots provided locally by the user. Treat exact CSS values as implementation recommendations, not copied source values.

## 1. Product Positioning

This design language is a dark creative-canvas studio, not a data dashboard. The UI should feel like a professional AI creation tool where the canvas is the main object and controls appear only when needed.

For IconOps, the core message should be:

- Describe an icon need in chat.
- Generate or retrieve high-quality options.
- Place results on an infinite canvas.
- Select a result to refine, export, or write back to Figma.

Avoid explaining too much upfront. The user should understand the product through the layout: chat on the left, canvas in the center, contextual controls around the selected icon.

## 2. Visual Theme & Atmosphere

### Overall Mood

- Dark, immersive, creator-tool atmosphere.
- Canvas-first: most of the screen is a near-black working surface.
- Controls feel like floating instruments, not form panels.
- Accent color is violet/purple, used sparingly for active states, premium actions, and model/generation emphasis.
- White is reserved for generated artboards or icon tiles, making generated content visually pop.

### Background System

- Main app background: almost black, around `#171717` to `#1B1B1B`.
- Top bar and side panels: slightly lighter charcoal, around `#242424` to `#2A2A2A`.
- Floating controls: `#2B2B2B` with thin translucent border.
- Generated artboards: pure or near-white `#FFFFFF` / `#FAFAFA`.
- Panel dividers: low-contrast gray, around `rgba(255,255,255,0.08)`.

### Light / Glow

- Use soft glow only for identity or active AI moments.
- Recraft sign-in page uses glossy 3D hero lighting; inside the workbench the style becomes restrained.
- For IconOps, use subtle violet glow behind the active prompt box or selected generation state, not behind every component.

## 3. Layout Model

### App Shell

The workbench should use a four-zone shell:

1. **Top Navigation Bar**: global mode, project name, zoom/share/export actions.
2. **Left AI Chat Rail**: generation conversation, result thumbnails, action chips, prompt input.
3. **Central Infinite Canvas**: icon cards/artboards placed freely.
4. **Contextual Right Inspector**: only visible when an icon/artboard is selected.

### Proportions

- Top bar height: about `64px` to `72px`.
- Left rail width: about `360px` to `420px` on desktop.
- Right inspector width: about `320px` to `360px`, conditional only.
- Canvas occupies all remaining space and must not feel boxed in.
- Floating vertical toolbar sits between left rail and canvas, not inside the rail.

### Initial Workbench State

When no generation has happened:

- Keep left rail minimal: title, one short hint, prompt input.
- Keep canvas mostly empty with maybe a small center identity mark or faint placement hint.
- Do not show source library grids, inspectors, or complex settings by default.

### Generated State

After prompt submission:

- Left rail shows concise status steps such as `Thinking`, `Checked team style`, `Generated 10 icons`.
- Result thumbnails appear in a compact row/grid inside the left rail.
- Main canvas receives the generated icon cards as the primary output area.
- Chat should not contain huge icon cards if the canvas already shows them.

## 4. Top Navigation

### Structure

- Left: compact brand button / logo with dropdown.
- Next: segmented mode controls: `AI chat`, `Create`, `Get started`.
- Center: project title, e.g. `Untitled` or `IconOps Project`, with subtle dropdown chevron.
- Right: zoom pill, share/export button, credit/model badge, account avatar.

### Styling

- Bar background: `#252525`.
- Height: `64px`.
- Border bottom: `1px solid rgba(255,255,255,.08)`.
- Active mode pill: violet-tinted background, around `#3B315A`, text white.
- Inactive mode: transparent, text `#E8E8E8`, hover `rgba(255,255,255,.06)`.
- Buttons use `12px` radius, compact height around `44px`.

### IconOps Adaptation

Use Recraft structure but IconOps labels:

- `AI chat`: conversation + generation.
- `Library`: source library / team library mode.
- `Figma`: write-back status and plugin bridge.
- Center: current project or batch name.
- Right: zoom, `Export`, `Write to Figma`.

## 5. Left AI Chat Rail

### Content Hierarchy

The rail should behave like a generation session, not a settings sidebar.

Recommended order:

1. Header row: menu icon, task title, `New` button.
2. Conversation/status area.
3. Generated result thumbnails.
4. Suggested action chips.
5. Bottom prompt composer.

### Message Style

- Use short, scannable messages.
- Prefer status labels over paragraphs.
- Expand details only on click.
- Avoid showing all workflow internals by default.

Examples:

- `Thinking`
- `Matched team icon rules`
- `Generated 10 candidates`
- `Found 24 Lucide references`

### Thumbnail Results

- Use 2-column or horizontal thumbnail strips.
- Thumbnail cards are simple white squares with black icon artwork.
- Each card can show selection state with violet or orange outline.
- Do not show heavy metadata in every card; expose metadata on hover or selection.

### Action Chips

Use compact rounded chips below a result group:

- `Generate 10 more`
- `Apply team style`
- `Search source library`
- `Write selected to Figma`
- `Review quality`

### Prompt Composer

- Docked at the bottom of the rail.
- Large rounded rectangle, dark surface, thin border.
- Placeholder: `Ask anything` or `描述你要的图标、批量需求或 Figma 链接`.
- Bottom row includes attachment, model, settings, send button.
- Send button should be a circular button on the right.

## 6. Central Canvas

### Canvas Feel

- Infinite, quiet, black workspace.
- No visible dashboard cards.
- Generated icons are placed as separate white artboards/cards.
- Artboards float on the canvas with generous spacing.

### Icon Tile / Artboard

- Default artboard size visually around `220–320px` depending zoom.
- Background white or near-white.
- Icon centered with consistent safe area.
- Minimal shadow; selection border carries the emphasis.

### Selection State

- Selected item uses a crisp orange outline, matching Recraft screenshots.
- Corner handles are small orange squares.
- Label above selected object: `Vector` or semantic name.
- Selection should not permanently open all controls; only context controls appear.

### Canvas Click Behavior

- Clicking a blank canvas area closes the right inspector.
- Clicking an icon opens the inspector.
- Drag/resize interactions must stay within canvas and not interfere with left rail or right inspector.

## 7. Floating Tool Palette

### Placement

- Vertical floating toolbar between left panel and canvas.
- It should visually hover on the canvas edge, not be embedded in a sidebar.

### Style

- Dark rounded capsule `#2B2B2B`.
- Border `rgba(255,255,255,.08)`.
- Shadow: subtle black blur.
- Icon buttons around `44px` tall.
- Active tool background `rgba(255,255,255,.08)`.

### Tool Set for IconOps

Keep it minimal:

- Select
- Hand / pan
- Source library
- Team library
- Text / label
- Upload / import
- Undo
- Redo

Do not show every advanced capability at once.

## 8. Right Inspector

### Visibility Rule

The inspector is contextual. It should not be visible on initial load or when nothing is selected.

Open when:

- A canvas icon is selected.
- A generated option is focused.
- A source-library icon is being reviewed.

Close when:

- User clicks blank canvas.
- User presses Esc.
- User clicks close/collapse.

### Structure

Recommended sections:

1. **Dimensions**: W/H fields.
2. **Team Rules**: style compliance summary.
3. **Prompt / Semantic**: source prompt and chosen semantic direction.
4. **Generation Settings**: collapsed by default.
5. **Actions**: refine, variations, quality review, write to Figma.
6. **Export**: sticky bottom primary button.

### Styling

- Panel background matches side rail `#252525`.
- Left border only; no floating card shadow if edge-docked.
- Section headings `14px`, semibold.
- Body text `13px`, muted gray.
- Inputs are dark rectangular pills with `12px` radius.
- Export button is large, white, high contrast.

## 9. Source Library Pattern

Source library should not look like an admin grid.

### Better Pattern

Use a generation-result style drawer:

- Search input at top.
- Tabs: `All`, `Team`, `Lucide`, `IconPark`, `Tabler`, `Phosphor`, `Iconfont`.
- Results shown as clean icon tiles, not information cards.
- Metadata appears as tiny source label only.
- Selection can be multi-select across tabs.
- Dragging a tile into canvas should preserve the source shape and then apply team rules.

### Tile Style

- Dark tile background: `#2A2A2A`.
- Inner white preview square or transparent preview zone.
- Radius `14px` to `18px`.
- Selected state: violet outline or small check indicator.
- Hover: slight lift, brighter border, no heavy shadow.

## 10. Motion & Interaction

### Motion Principles

- Motion should feel fast and tool-like, not decorative.
- Most transitions: `120–180ms`.
- Panel entrance: slide/fade, `180–220ms`.
- Canvas item creation: small scale-in and fade-in.
- Loading: center logo pulse or compact `Thinking` shimmer.

### Recommended Effects

- Prompt input focus: soft violet border/glow.
- Active mode switching: pill background slides or fades.
- Generated thumbnails: staggered fade-up, 40ms offset.
- Inspector: slide from right only when selected.
- Floating toolbar hover: icon brightens, background grows subtly.

Avoid:

- Constant stripe backgrounds.
- Large animated gradients behind functional panels.
- Too many glowing borders competing with icon quality.

## 11. Typography

### Hierarchy

- Top nav labels: `14px`, weight `600`.
- Panel titles: `16px`, weight `700`.
- Section headings: `14px`, weight `650`.
- Normal UI text: `14px`, weight `500`.
- Secondary text: `12–13px`, muted, weight `500`.
- Avoid text smaller than `12px`.

### Tone

Use concise product language:

- `Generated 10 icons`
- `Team style matched`
- `Write to Figma`
- `Search references`
- `Quality review`

Avoid long instructional paragraphs in default view.

## 12. IconOps Implementation Rules

### Preserve Functional Quality

Visual redesign must not break:

- LLM conversation and workflow logic.
- Source library search and multi-select.
- Canvas drag/resize/select/delete.
- Team-style application.
- Figma plugin bridge/write-back.
- Icon quality review and generation constraints.

### Recraft-Like Structural Changes

For IconOps, prioritize these changes:

1. Remove permanent three-column feeling.
2. Make right inspector conditional.
3. Move source library into drawer/rail/modal behavior instead of a large always-visible grid.
4. Put generated options on canvas first, not in chat first.
5. Keep chat as command/session history, not full visual output storage.
6. Use floating tool palette for canvas actions.
7. Make action chips contextual after a generation result.

### Quality-First Icon Display

- All icon previews should use the same team-rule renderer if possible.
- Do not mix source-library raw style and AI-generated style without labeling.
- Source icon placement should preserve original geometry before normalization.
- Team normalization should be visually evident but not deform the icon.
- Failed/low-quality candidates should be hidden or marked as needing review, not shown equally.

## 13. Prompt Guide for Future UI Work

Use this prompt when asking an agent to redesign the IconOps workbench:

> Redesign the IconOps workbench as a Recraft-inspired dark AI creative canvas. Keep the homepage as a minimal centered prompt, but after entering the app use a dark top bar, left AI chat rail, central infinite canvas, floating vertical tool palette, and conditional right inspector. The canvas is primary; generated icon candidates appear on the canvas as clean white artboards. The left rail shows concise session steps, result thumbnails, action chips, and a bottom prompt composer. The source library should feel like a visual result drawer with compact tiles, not an admin card grid. The inspector only appears when a canvas item is selected and closes on blank canvas click. Preserve all generation, source search, team-style, canvas, and Figma write-back logic. Use restrained violet accents, orange selection handles, charcoal surfaces, 12–16px typography, and fast subtle motion.


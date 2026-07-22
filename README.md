# icon-gen-promax MVP

A dialogue-driven prototype for running the `icon-gen-promax` skill as a product UI.

## Product Positioning

This is not a generic icon library search tool. It wraps the real `icon-gen-promax` workflow for a comic-platform 24px outline icon system:

```text
Brief → Semantic Plan → SVG Preview Approval → Icon Spec JSON → Figma Native Nodes → Screenshot Gate
```

## Fixed Platform Defaults

- Canvas: `24 x 24`
- Color: `#0F1218`
- Style: monochrome rounded outline
- Stroke: `2px`, round cap/join
- Padding: `2px`
- Corner radius: `4px` default
- Output: editable Figma-native component/frame
- SVG: preview-only, never final Figma output

## What Works

- Chat-style agent route for deciding the current skill phase.
- Semantic option gate before preview generation.
- SVG preview area with explicit approval state.
- ProMax gatekeeper panel for workflow, fixed spec, quality gates, Figma handoff, and reference workflow.
- Honest fallback mode when no model API is configured.

## Enable Real Agent Conversation

Create `.env.local`:

```bash
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=your_model
```

Without these variables, the app uses a local `icon-gen-promax` fallback. The fallback simulates the phase gates but is not real model reasoning.

## Account And Encrypted Figma Token

The local product includes email/password accounts with an HttpOnly session cookie. After login, a submitted Figma Token is encrypted on the server with AES-256-GCM and only its masked status is returned to the browser.

Set a stable encryption secret before deployment:

```bash
ICONOPS_ENCRYPTION_KEY=replace_with_a_long_random_secret
```

Local accounts, sessions, and encrypted credentials are stored under `.data/`, which is excluded from Git. This file store is suitable for local and single-instance demos. A multi-instance Vercel deployment should replace it with a persistent database and managed secret/key service while keeping the same API boundary.

## Run Locally

```bash
npm run dev
```

If npm bin links are unavailable in this local install, run Next directly:

```bash
node node_modules/next/dist/bin/next dev
```

Open `http://localhost:3000`.

## Validate

```bash
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js src --max-warnings=0
node node_modules/next/dist/bin/next build --webpack
```

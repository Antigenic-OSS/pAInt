# Quickstart: Visual Dev Editor

**Branch**: `001-visual-dev-editor` | **Date**: 2026-02-14

## Prerequisites

- **Bun** >= 1.0 installed (`curl -fsSL https://bun.sh/install | bash`)
- **Node.js** >= 18 (Bun handles most tasks, but Next.js may use Node internally)
- A running localhost project to inspect (any framework: Next.js, Vite, CRA, Astro, etc.)
- **Optional**: Claude Code CLI installed for the API integration feature (`npm install -g @anthropic-ai/claude-code`)

## Setup

```bash
# Clone the repository
git clone <repo-url> dev-editor
cd dev-editor

# Install dependencies
bun install

# Start the development server
bun dev
```

The editor opens at `http://localhost:4000` (or the next available port).

## First Use

1. Open `http://localhost:4000` in your browser
2. Type your project's URL (e.g., `http://localhost:3000`) into the address bar at the top
3. Click **Connect** — the center preview loads your project
4. Hover over elements to see blue highlights
5. Click an element to select it — the left panel highlights the tree node, the right panel shows its styles
6. Edit properties in the right panel Design tab — changes apply live in the preview
7. Open the **Changes** tab to see tracked modifications
8. Click **Copy Changelog** to export for Claude Code

## Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install all dependencies |
| `bun dev` | Start the development server |
| `bun run build` | Build for production |
| `bun run lint` | Run linter (when configured) |

## Project Structure Overview

```
src/
├── app/            # Next.js pages and API routes
├── components/     # React components (Editor, panels, top bar)
├── hooks/          # Custom React hooks
├── store/          # Zustand store and slices
├── types/          # TypeScript type definitions
├── lib/            # Utilities (constants, parsers)
└── inspector/      # Script injected into target iframe
```

## Architecture at a Glance

- **Three-column layout**: Left panel (DOM tree) | Center (iframe preview) | Right panel (style editor + changes)
- **Reverse proxy**: `/api/proxy/[...path]` forwards requests to the target dev server and injects the inspector script
- **postMessage**: All communication between editor and iframe uses `window.postMessage`
- **Zustand store**: 5 slices — `uiSlice`, `elementSlice`, `treeSlice`, `changeSlice`, `claudeSlice`
- **Dark mode only**: Single dark theme, no toggle

## Verification Checklist

After setup, verify:

1. `bun dev` starts without errors
2. Browser shows the editor at `http://localhost:4000` in dark mode
3. Three-column layout is visible with an empty center placeholder
4. Target URL input is visible and focused in the top bar
5. Typing `http://localhost:3000` and pressing Enter connects to a running project
6. Connection dot turns green when connected

## Claude Code Integration (Optional)

To enable the "Send to Claude Code" feature:

1. Install Claude CLI: `npm install -g @anthropic-ai/claude-code`
2. Run `claude` once in your terminal to authenticate
3. In the editor, click "Send to Claude Code" — the setup flow will prompt for your project root path
4. Review generated diffs in the right panel, then click "Apply All"

If Claude CLI is not installed, the editor still works fully — just use "Copy Changelog" to manually paste into Claude Code.

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Connection dot stays red | Verify your target dev server is running on the URL you entered |
| Blank iframe after connect | Check browser console for proxy errors; ensure the target serves HTML at its root |
| Inspector not injecting | Verify the proxy is returning HTML responses (not redirects) |
| Changes lost after refresh | Changes persist in localStorage — check that browser storage is not full or disabled |
| Claude CLI errors | Run `claude --version` in terminal to verify installation and auth |

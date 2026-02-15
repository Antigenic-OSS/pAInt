# Dev Editor

A visual design editor for localhost web projects. Inspect elements, edit styles, drag-and-drop reposition, and generate changelogs for [Claude Code](https://claude.ai/claude-code) — all from a Webflow-style dark UI.

## Features

- **Visual Element Inspection** — Hover to highlight, click to select any element on your page. Bidirectional sync between the preview and the DOM tree.
- **Style Editing** — Edit typography, colors, spacing, borders, and layout from a properties panel. Changes preview instantly in the iframe.
- **Responsive Breakpoints** — Switch between Mobile (375px), Tablet (768px), and Desktop (1280px) to test and tweak styles per breakpoint.
- **Drag & Drop** — Free Position mode to move elements anywhere, or Reorder mode to rearrange siblings in flex/grid containers.
- **Change Tracking** — Every edit is recorded with original and new values. Undo individual changes or clear all at once.
- **Changelog Export** — One-click copy of a structured changelog designed to paste directly into Claude Code for automatic source file updates.
- **Claude Code Integration** — Send changelogs directly to Claude Code CLI for analysis and one-click apply to your source files.
- **Multi-Page Editing** — Navigate between pages without leaving the editor. Changes persist per-page.
- **DOM Layers Tree** — Webflow-style collapsible navigator panel showing the full page structure with keyboard navigation.

## Prerequisites

- [Bun](https://bun.sh) runtime installed
- A localhost project running on any port (Next.js, Vite, Astro, CRA, etc.)

## Quick Start

```bash
# Install dependencies
bun install

# Start the Dev Editor (runs on http://localhost:4000)
bun dev
```

Then:

1. Make sure your target project's dev server is running (e.g., `http://localhost:3000`)
2. Open `http://localhost:4000` in your browser
3. Select your project's localhost port from the dropdown and click **Connect**
4. Your page loads in the center preview — start inspecting and editing

## Connecting to Your Project

### Method 1: Automatic (Reverse Proxy) — Recommended

When you click **Connect**, the Dev Editor loads your target page through a built-in reverse proxy that automatically injects the inspector script. No setup needed — works out of the box.

### Method 2: Manual Script Tag

If the inspector isn't auto-detected after 5 seconds, a banner appears with a script tag to copy:

```html
<script src="https://dev-editor-flow.vercel.app/dev-editor-inspector.js"></script>
```

Paste this into your project's root HTML layout (e.g., `layout.tsx`, `index.html`). The editor connects once the page reloads. This is useful when:

- The proxy can't inject the script (non-standard HTML responses)
- Your target runs on a different machine or network
- You want the inspector to persist across hot reloads without the proxy

## Use Cases

### 1. Visual Style Tweaking

Select any element, then adjust colors, spacing, typography, borders, and layout from the right panel. Every change previews instantly in the iframe — no code edits needed until you're satisfied.

### 2. Responsive Design Testing

Switch between Mobile, Tablet, and Desktop breakpoints in the top bar. Make per-breakpoint adjustments and export them all in a single changelog.

### 3. Layout Debugging

Use the left panel DOM tree to navigate the page structure. Click any node to highlight it in the preview. Inspect and adjust flexbox/grid properties, spacing, and positioning.

### 4. Drag-and-Drop Repositioning

Toggle **Free Position** mode to drag elements to new coordinates, or **Reorder** mode to rearrange children within flex/grid containers by dragging them between siblings.

### 5. Claude Code Workflow

The primary output of Dev Editor is a structured changelog that Claude Code understands:

```
Open Dev Editor → Connect to your localhost project
       ↓
Inspect and select elements (hover/click in preview or Layers tree)
       ↓
Edit styles in the right panel (typography, spacing, colors, layout)
       ↓
Test across breakpoints (Mobile / Tablet / Desktop)
       ↓
Review tracked changes in the Changes tab
       ↓
Export changelog → Paste into Claude Code → Changes applied to source files
```

Click **Copy Changelog** to get a formatted log for your clipboard, or **Send to Claude Code** for direct CLI integration that analyzes diffs and applies them to your source files.

### 6. Multi-Page Editing

Navigate between pages using the PageSelector dropdown. Changes are persisted per-page in localStorage and included in a combined changelog export.

## UI Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Top Bar: [URL Dropdown] [Connect] [Mobile|Tablet|Desktop]  │
├────────┬──────────────────────────────┬─────────────────────┤
│        │                              │                     │
│ Layers │       Preview (iframe)       │   Design / Changes  │
│  Tree  │                              │     Properties      │
│        │   Your localhost project     │      Panel          │
│        │   rendered here              │                     │
│        │                              │                     │
├────────┴──────────────────────────────┴─────────────────────┤
│                    Three-column dark UI                      │
└─────────────────────────────────────────────────────────────┘
```

- **Left Panel** — DOM tree navigator (Layers). Click nodes to select elements.
- **Center** — Live preview of your project loaded through the reverse proxy.
- **Right Panel** — Design tab (style properties) and Changes tab (tracked edits + export).

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **State**: Zustand 5 (slices: element, change, UI, tree, claude)
- **Communication**: `window.postMessage` between editor and iframe inspector

## Commands

```bash
bun install          # Install dependencies
bun dev              # Start dev server (localhost:4000)
bun run build        # Production build
bun run start        # Start production server
bun run lint         # Run ESLint
```

## How It Works

1. **Reverse Proxy** — A Next.js API route (`/api/proxy/`) fetches your localhost page, strips client-side scripts (to prevent framework interference), and injects the inspector script.
2. **Inspector Script** — Runs inside the iframe. Handles hover highlighting, element selection, style extraction, drag & drop, and DOM tree serialization.
3. **postMessage Bridge** — The editor and inspector communicate exclusively via `window.postMessage`. No direct iframe DOM access.
4. **Change Tracking** — Every style edit is recorded with CSS selector paths, original values, and new values. Persisted to localStorage keyed by target URL.
5. **Changelog Export** — Generates a structured, human-readable format with built-in instructions for Claude Code to apply changes to source files.

## Security

- **Localhost only** — URL validation rejects non-local addresses. The proxy will not forward to external hosts.
- **Script stripping** — All `<script>` tags are removed from proxied HTML to prevent target-page JS from interfering with the editor.
- **No shell injection** — Claude CLI is spawned via `Bun.spawn` / `execFile` only, never through shell strings.

## License

Private project.

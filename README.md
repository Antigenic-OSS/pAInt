# pAInt

A visual design editor for localhost web projects. Inspect elements, edit styles, manage CSS variables, and generate changelogs for [Claude Code](https://claude.ai/claude-code) — all from a Webflow-style dark UI.

## Features

- **Visual Element Inspection** — Hover to highlight, click to select any element. Bidirectional sync between the preview and the DOM tree.
- **Style Editing** — Typography, colors, spacing, borders, shadows, backgrounds, layout, position, size, and appearance. Changes preview instantly.
- **SVG Editing** — Edit fill/stroke colors on SVG elements with save-as-variable support.
- **CSS Variables** — View, edit, and manage CSS custom properties from the Variables panel.
- **Gradient Editor** — Visual gradient editing for backgrounds.
- **Responsive Breakpoints** — Mobile (375px), Tablet (768px), Desktop (1280px) with per-breakpoint style edits.
- **Component Detection** — Scan projects to detect React components and map them to DOM elements.
- **Add Elements** — Insert new HTML elements from the Add Element panel.
- **Embedded Terminal** — Run shell commands directly from the left panel (xterm.js + node-pty).
- **Change Tracking** — Every edit recorded with original/new values. Undo individual changes or clear all.
- **Changelog Export** — One-click copy of a structured changelog designed to paste directly into Claude Code.
- **Claude Code Integration** — Send changelogs to Claude Code CLI for analysis and one-click apply to source files.
- **AI Scan** — AI-powered analysis of your project structure and changes.
- **Multi-Page Editing** — Navigate between pages without leaving the editor. Changes persist per-page.
- **DOM Layers Tree** — Webflow-style collapsible navigator with keyboard navigation.
- **Project Scanning** — Auto-detect Tailwind config and CSS variables from your project.
- **Setup Guide** — Built-in docs page at `/docs` with framework-specific connection instructions.

## Prerequisites

- [Bun](https://bun.sh) runtime installed
- A localhost project running on any port (Next.js, Vite, Astro, CRA, etc.)

## Quick Start

```bash
# Install dependencies
bun install

# Start the pAInt (runs on http://localhost:4000)
bun dev
```

Then:

1. Make sure your target project's dev server is running (e.g., `http://localhost:3000`)
2. Open `http://localhost:4000` in your browser
3. Select your project's localhost port from the dropdown and click **Connect**
4. Your page loads in the center preview — start inspecting and editing

## Connecting to Your Project

### Method 1: Automatic (Reverse Proxy) — Recommended

When you click **Connect**, the pAInt loads your target page through a built-in reverse proxy that automatically injects the inspector script. No setup needed — works out of the box.

### Method 2: Manual Script Tag

If the inspector isn't auto-detected after 5 seconds, a banner appears with a script tag to copy:

```html
<script src="https://dev-editor-flow.vercel.app/dev-editor-inspector.js"></script>
```

Paste this into your project's root HTML layout (e.g., `layout.tsx`, `index.html`). The editor connects once the page reloads.

### Method 3: Vercel Deployment (Bridge Mode)

When the pAInt is deployed to Vercel, run the local bridge server to proxy your localhost pages:

```bash
bun run bridge       # Bridge server on http://localhost:4002
```

The bridge server handles proxy requests, project scanning, and Claude CLI execution on your local machine while the editor UI runs on Vercel.

## Use Cases

### Visual Style Tweaking

Select any element, then adjust colors, spacing, typography, borders, shadows, and layout from the right panel. Every change previews instantly in the iframe.

### Responsive Design Testing

Switch between Mobile, Tablet, and Desktop breakpoints in the top bar. Make per-breakpoint adjustments and export them all in a single changelog.

### Layout Debugging

Use the left panel DOM tree to navigate the page structure. Click any node to highlight it in the preview. Inspect and adjust flexbox/grid properties, spacing, and positioning.

### CSS Variable Management

Use the Variables panel to view and edit CSS custom properties defined in your project. Save color values as variables for reuse.

### Claude Code Workflow

The primary output of pAInt is a structured changelog that Claude Code understands:

```
Open pAInt → Connect to your localhost project
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

## UI Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│  Top Bar: [URL Dropdown] [Connect] [Mobile|Tablet|Desktop]          │
├───┬────────┬──────────────────────────────┬──────────────────────────┤
│   │        │                              │                          │
│ I │ Layers │       Preview (iframe)       │  Design / Variables /    │
│ C │ Pages  │                              │  Changes / Claude /      │
│ O │ Comps  │   Your localhost project     │  Console                 │
│ N │ Add    │   rendered here              │                          │
│ S │ Term   │                              │                          │
│   │        │                              │                          │
├───┴────────┴──────────────────────────────┴──────────────────────────┤
│                    Three-column dark UI                               │
└──────────────────────────────────────────────────────────────────────┘
```

- **Icon Sidebar** — Quick access to Layers, Pages, Components, Add Element, and Terminal panels.
- **Left Panel** — DOM tree navigator, page list, component browser, element inserter, or embedded terminal.
- **Center** — Live preview of your project loaded through the reverse proxy.
- **Right Panel** — Design (style properties), Variables (CSS custom properties), Changes (tracked edits + export), Claude (CLI integration), Console (log output).

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **State**: Zustand 5 (9 slices: element, change, UI, tree, claude, cssVariable, component, console, terminal)
- **Terminal**: xterm.js + node-pty
- **Communication**: `window.postMessage` between editor and iframe inspector

## Commands

```bash
bun install          # Install dependencies
bun dev              # Start dev server (localhost:4000)
bun run bridge       # Start bridge server for Vercel deployment (localhost:4002)
bun run dev:terminal # Start terminal server
bun run dev:all      # Start all services (terminal + bridge + next)
bun run build        # Production build
bun run start        # Start production server
bun run lint         # Run ESLint
```

## How It Works

1. **Reverse Proxy** — A Next.js API route (`/api/proxy/`) fetches your localhost page, strips client-side scripts (to prevent framework interference), and injects the inspector script.
2. **Inspector Script** — Runs inside the iframe. Handles hover highlighting, element selection, style extraction, and DOM tree serialization.
3. **postMessage Bridge** — The editor and inspector communicate exclusively via `window.postMessage`. No direct iframe DOM access.
4. **Change Tracking** — Every style edit is recorded with CSS selector paths, original values, and new values. Persisted to localStorage keyed by target URL.
5. **Changelog Export** — Generates a structured, human-readable format with built-in instructions for Claude Code to apply changes to source files.
6. **Bridge Server** — When deployed to Vercel, a lightweight Bun HTTP server runs locally to proxy localhost pages, scan projects, and execute Claude CLI commands.
7. **Project Scanning** — Detects Tailwind config, CSS variables, and React components in your project to provide context-aware editing.

## Security

- **Localhost only** — URL validation rejects non-local addresses. The proxy will not forward to external hosts.
- **Script stripping** — All `<script>` tags are removed from proxied HTML to prevent target-page JS from interfering with the editor.
- **No shell injection** — Claude CLI is spawned via `Bun.spawn` / `execFile` only, never through shell strings.

## Contributing and Support

- Contributing guide: `CONTRIBUTING.md`
- Code of conduct: `CODE_OF_CONDUCT.md`
- Security reporting: `SECURITY.md`
- Support and maintainer details: `SUPPORT.md`

## License

Licensed under Apache License 2.0. See `LICENSE`.

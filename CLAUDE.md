# Dev Editor — Development Guidelines

Visual design editor for localhost web projects. Inspect elements,
edit styles, drag-and-drop reposition, and generate changelogs for
Claude Code — all from a Webflow-style three-column dark UI.

## How to Use

### Quick Start

1. Start the Dev Editor: `bun dev` (runs on `http://localhost:4000` by default)
2. Start your target project's dev server (e.g., `http://localhost:3000`)
3. Open the Dev Editor in your browser
4. Select your target's localhost port from the dropdown in the top bar and click **Connect**
5. The target page loads in the center iframe — start inspecting and editing

### Connecting to Your Project

There are **two ways** to connect the Dev Editor to your project:

#### Method 1: Automatic (Reverse Proxy) — Recommended
When you click **Connect**, the Dev Editor loads your target page through a built-in reverse proxy. The proxy automatically injects the inspector script into the HTML — no setup needed. This is the default behavior and works out of the box.

#### Method 2: Manual Script Tag
If the automatic connection takes longer than 5 seconds (the inspector script hasn't been detected), you'll see a banner:

> **Inspector script not detected**
> Add this script tag to your project's HTML layout:
> `<script src="https://dev-editor-flow.vercel.app/dev-editor-inspector.js"></script>`

Click **Copy**, paste the script tag into your project's root HTML layout (e.g., `layout.tsx`, `index.html`), and the editor will connect once the page reloads. This method is useful when the proxy can't inject the script (e.g., non-standard HTML responses, or running the editor and target on separate machines).

### Use Cases

1. **Visual Style Tweaking** — Select any element on your page, then adjust colors, spacing, typography, borders, and layout from the right panel. Changes preview instantly in the iframe.

2. **Responsive Design Testing** — Switch between Mobile (375px), Tablet (768px), and Desktop (1280px) breakpoints in the top bar. Make per-breakpoint style adjustments and export them all at once.

3. **Layout Debugging** — Use the left panel DOM tree (Layers) to navigate the page structure. Click any node to highlight it in the preview. Inspect flexbox/grid properties and adjust layout in the right panel.

4. **Drag-and-Drop Repositioning** — Toggle **Free Position** mode to drag elements to new positions, or **Reorder** mode to rearrange siblings within flex/grid containers.

5. **Change Tracking & Export** — Every style edit is tracked with original → new values. Review all changes in the Changes tab, undo individual edits, or export a structured changelog.

6. **Claude Code Integration** — Click **Copy Changelog** to get a formatted log you can paste into Claude Code, which reads it and applies the CSS changes to your actual source files. Or use **Send to Claude Code** for direct CLI integration (analyze diffs, then apply).

7. **Multi-Page Editing** — Navigate between pages using the PageSelector dropdown without leaving the editor. Changes are persisted per-page and included in a combined changelog export.

### Typical Workflow

```
Open Dev Editor → Connect to localhost project
       ↓
Inspect elements (hover/click in preview or click in Layers tree)
       ↓
Edit styles in the right panel (typography, spacing, colors, layout)
       ↓
Test across breakpoints (Mobile / Tablet / Desktop)
       ↓
Review tracked changes in the Changes tab
       ↓
Export changelog → Paste into Claude Code → Changes applied to source files
```

## Tech Stack

- **Runtime / Package Manager**: Bun (`bun dev`, `bun run build`, `bun install`)
- **Framework**: Next.js 15 App Router (TypeScript)
- **Styling**: Tailwind CSS — `class` dark mode strategy, CSS custom properties
- **State**: Zustand with slices (`elementSlice`, `changeSlice`, `uiSlice`, `treeSlice`, `claudeSlice`)
- **Communication**: `window.postMessage` between editor (parent) and inspector (iframe)
- **Persistence**: `localStorage` (changes keyed by target URL, recent URLs, settings)

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout, dark mode, providers
│   ├── page.tsx                # Main editor (three-column layout)
│   ├── globals.css             # Tailwind entry + dark mode variables
│   └── api/
│       ├── proxy/[[...path]]/route.ts  # Reverse proxy to target localhost (strips scripts)
│       └── claude/
│           ├── analyze/route.ts       # Claude CLI read-only analysis
│           ├── apply/route.ts         # Claude CLI write mode
│           └── status/route.ts        # CLI availability check
├── components/
│   ├── Editor.tsx              # Three-column shell
│   ├── TopBar.tsx              # URL input, breakpoints, drag toggle, apply
│   ├── TargetSelector.tsx      # Localhost URL bar + connect + status dot
│   ├── BreakpointTabs.tsx      # Mobile | Tablet | Desktop
│   ├── PageSelector.tsx        # Page navigation dropdown
│   ├── DragModeToggle.tsx      # Off / Free Position / Reorder
│   ├── PreviewFrame.tsx        # Iframe container
│   ├── left-panel/             # Navigator/Layers tree
│   ├── right-panel/            # Design tab + Changes tab + Claude panel
│   └── common/                 # Shared UI (ResizablePanel, ColorPicker, etc.)
├── hooks/                      # useTargetUrl, usePostMessage, useChangeTracker, etc.
├── store/                      # Zustand store + slices
├── types/                      # TypeScript type definitions
├── lib/                        # Utilities (constants, CSS parsing, prompt builder, diff parser)
└── inspector/                  # Injected into iframe via proxy
    ├── inspector.ts            # Entry point
    ├── DOMTraverser.ts
    ├── ElementSelector.ts
    ├── HoverHighlighter.ts
    ├── SelectionHighlighter.ts
    ├── StyleExtractor.ts
    ├── ViewportController.ts
    ├── messaging.ts
    └── drag/                   # DragHandler + strategies
```

## Commands

```bash
bun install          # Install dependencies
bun dev              # Start dev server
bun run build        # Production build
bun run lint         # Lint (when configured)
```

## Dark Mode Color Palette

```
Background (panels):  #1e1e1e    Accent (selection):  #4a9eff
Background (inputs):  #2a2a2a    Accent (hover):      #3a8aef
Borders:              #3a3a3a    Success:             #4ade80
Text (primary):       #e0e0e0    Warning:             #fbbf24
Text (secondary):     #a0a0a0    Error:               #f87171
Text (muted):         #666666    Panel dividers:      #2d2d2d
Top bar background:   #171717
```

## Architecture Rules

1. **Dark mode only** — no light theme, no theme toggle.
2. **Iframe + reverse proxy** — target page loaded via `/api/proxy/[[...path]]`. Inspector script injected by proxy into HTML responses. **All `<script>` tags are stripped** from proxied HTML (except `type="application/ld+json"`) to prevent target-page client JS from interfering. SSR HTML + CSS is sufficient for visual editing; the inspector script is injected separately.
3. **postMessage only** — editor and iframe inspector communicate exclusively via `window.postMessage`. No direct iframe DOM access.
4. **Localhost only** — URL validation rejects non-local addresses. Proxy MUST NOT forward to external hosts.
5. **Zustand single store** — all shared state in one store with slices. No React Context for state management.
6. **Strategy pattern for drag** — `DragHandler` delegates to `FreePositionStrategy` or `SiblingReorderStrategy`. New modes follow the same pattern.
7. **Changelog is truth** — every visual change MUST be recorded with original→new values and CSS selector paths.
8. **Bun everywhere** — all commands use Bun. No npm/yarn/pnpm.
9. **No shell exec** — Claude CLI spawned via `Bun.spawn` or `execFile` only. Never `exec` with shell strings.
10. **Singleton message listener** — `usePostMessage` hook registers ONE global `window.addEventListener('message', ...)` via a module-level singleton. Multiple components may call the hook but only one listener exists. This prevents duplicate message processing.
11. **Middleware matches assets only** — Next.js middleware MUST only match `/_next/static/:path*` and `/_next/image`. Never match page-level paths — doing so pollutes the editor's HMR route tree and causes reload loops.
12. **HMR isolation** — Proxy short-circuits `.hot-update.*`, `webpack-hmr`, and `turbopack-hmr` requests with empty 200/204 responses. `page.tsx` suppresses unhandled HMR rejection errors as a safety net.

## Implementation Phases

| Phase | Focus | Dependencies |
|-------|-------|-------------|
| 1 | Foundation (scaffolding, proxy, dark mode, three-column layout, URL input) | None |
| 2 | Left Panel — DOM Inspection + Layers | Phase 1 |
| 3 | Right Panel — Properties Editor (all sections + live preview) | Phase 2 |
| 4 | Change Tracking + Changelog Export | Phase 3 |
| 5 | Top Bar — Responsive Breakpoints + Page Navigation | Phase 4 |
| 6 | Polish (keyboard shortcuts, search, error handling) | Phase 5 |
| 7 | Drag & Drop Repositioning (free position + sibling reorder) | Phase 6 |
| 8 | Claude Code API Integration (log analysis + diff viewer) | Phase 7 |

Phases MUST be completed in order. Do not implement later-phase features before dependencies are done.

## Code Style

- TypeScript strict mode
- Functional components with hooks (no class components)
- Server Components for layout; Client Components (`'use client'`) for interactive panels
- Tailwind utility classes for styling — no CSS modules or CSS-in-JS
- Named exports for components; default export only for page/layout files
- Types in `src/types/`; constants in `src/lib/constants.ts`
- Inspector code in `src/inspector/` — this runs inside the iframe, not the editor

## Key postMessage Types

| Message | Direction | Purpose |
|---------|-----------|---------|
| `INSPECTOR_READY` | iframe → editor | Inspector loaded and ready |
| `SELECT_ELEMENT` | editor → iframe | Request element selection |
| `ELEMENT_SELECTED` | iframe → editor | Element was selected |
| `PREVIEW_CHANGE` | editor → iframe | Apply style change |
| `REVERT_CHANGE` | editor → iframe | Undo a style change |
| `DOM_UPDATED` | iframe → editor | DOM mutation detected |
| `SET_BREAKPOINT` | editor → iframe | Change viewport width |
| `DRAG_MODE_CHANGED` | editor → iframe | Toggle drag mode |
| `POSITION_CHANGED` | iframe → editor | Free-position drag complete |
| `ELEMENT_REORDERED` | iframe → editor | Sibling reorder complete |

## Security

- Proxy: localhost-only validation, no external forwarding
- Claude API routes: `projectRoot` must be absolute, exist, and be under `$HOME`
- CLI spawn: `execFile` / `Bun.spawn` only (no shell injection)
- Analyze: `--allowedTools Read` (read-only)
- Apply: `--allowedTools Read,Edit` (no Bash)
- Changelog sanitization: strip control chars, enforce 50KB max

## Documentation

- `docs/features.md` — Complete feature specifications
- `docs/implementation-plan.md` — Architecture, file structure, phase details
- `docs/user-flows.md` — 11 detailed user flow scenarios
- `docs/visual-editor-extensions.md` — Competitive landscape and comparison
- `.specify/memory/constitution.md` — Project constitution (governance)

## Active Technologies
- TypeScript 5.x (strict mode), JavaScript (ES5 for inspector script)
- Next.js 15 (App Router), React 19, Zustand 5, Tailwind CSS 4
- localStorage (browser-only, keyed by target URL)
- TypeScript 5.x (strict mode) + Next.js 15 (App Router), React 19, Zustand 5, Tailwind CSS 4 (005-rebuild-text-section)
- N/A (changes tracked in Zustand store + localStorage) (005-rebuild-text-section)

## Known Issues & Root Causes

### Infinite Iframe Reload (RESOLVED)
**Root cause**: When a target page (e.g. a Next.js app) is loaded through the proxy,
its client-side router hydrates, sees `/api/proxy/` as the URL pathname (not a valid
route in the target app), and triggers `window.location.href = '/'`. Browsers do NOT
allow intercepting `window.location` property assignments — no amount of JavaScript
patching (`Object.defineProperty`, `Proxy`) can prevent this navigation.

**Fix**: Strip ALL `<script>` tags from proxied HTML in `src/app/api/proxy/[[...path]]/route.ts`.
The SSR-rendered HTML + CSS is complete for visual editing. The inspector script
(injected separately by the proxy) handles element selection and style editing.

**Contributing factors fixed**:
- `usePostMessage` had 6+ duplicate event listeners (singleton pattern fix)
- Middleware matched page-level paths, polluting HMR route tree (reduced matcher scope)
- Target app HMR requests (hot-update, webpack-hmr) returned 404s (short-circuit in proxy)
- React Strict Mode double-mounted PreviewFrame, setting `iframe.src` twice (`lastSrcRef` guard)

## Recent Changes
- 005-rebuild-text-section: Added TypeScript 5.x (strict mode) + Next.js 15 (App Router), React 19, Zustand 5, Tailwind CSS 4
- All feature branches (001–004) merged to `main` and deleted. Development continues on `main`.

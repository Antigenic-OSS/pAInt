# pAInt — Development Guidelines

Visual design editor for localhost web projects. Inspect elements,
edit styles, manage CSS variables, and generate changelogs for
Claude Code — all from a visual-editor-style three-column dark UI.

## How to Use

### Quick Start

1. Start pAInt: `bun dev` (runs on `http://localhost:4000` by default)
2. Start your target project's dev server (e.g., `http://localhost:3000`)
3. Open pAInt in your browser
4. Select your target's localhost port from the dropdown in the top bar and click **Connect**
5. The target page loads in the center iframe — start inspecting and editing

### Connecting to Your Project

There are **three ways** to connect pAInt to your project:

#### Method 1: Automatic (Service Worker Proxy) — Recommended
When you click **Connect**, pAInt loads your target page through a Service Worker proxy. The proxy automatically intercepts requests, injects the inspector script, and strips security headers — all in the browser. No script tags or project modifications needed. Your page's scripts and client-side rendering work normally.

#### Method 2: Vercel Deployment (Bridge Mode)
When pAInt is deployed to Vercel, run the local bridge server (`bun run bridge`) on port 4002. The bridge handles proxy requests, project scanning, and Claude CLI execution on the user's machine.

### Typical Workflow

```
Open pAInt → Connect to localhost project
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
- **Styling**: Tailwind CSS 4 — `class` dark mode strategy, CSS custom properties
- **State**: Zustand 5 with slices (`elementSlice`, `changeSlice`, `uiSlice`, `treeSlice`, `claudeSlice`, `cssVariableSlice`, `componentSlice`, `consoleSlice`, `terminalSlice`)
- **Terminal**: xterm.js + node-pty
- **Communication**: `window.postMessage` between editor (parent) and inspector (iframe)
- **Persistence**: `localStorage` (changes keyed by target URL, recent URLs, settings)

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                     # Root layout, dark mode, providers
│   ├── page.tsx                       # Main editor (three-column layout)
│   ├── globals.css                    # Tailwind entry + dark mode variables
│   ├── docs/                          # Setup guide page (/docs)
│   │   ├── page.tsx
│   │   ├── DocsClient.tsx
│   │   └── layout.tsx
│   └── api/
│       ├── proxy/[[...path]]/route.ts # Reverse proxy to target localhost
│       ├── claude/
│       │   ├── analyze/route.ts       # Claude CLI read-only analysis
│       │   ├── apply/route.ts         # Claude CLI write mode
│       │   ├── scan/route.ts          # AI-powered project scan
│       │   ├── pick-folder/route.ts   # Folder picker
│       │   └── status/route.ts        # CLI availability check
│       ├── project-scan/
│       │   ├── route.ts               # Project structure scanning
│       │   ├── css-variables/route.ts # CSS variable extraction
│       │   └── tailwind-config/route.ts # Tailwind config detection
│       └── project/scan/route.ts      # Project directory scanning
├── components/
│   ├── Editor.tsx                     # Three-column shell
│   ├── TopBar.tsx                     # URL input, breakpoints, actions
│   ├── TargetSelector.tsx             # Localhost URL bar + connect + status dot
│   ├── BreakpointTabs.tsx             # Mobile | Tablet | Desktop
│   ├── ResponsiveToolbar.tsx          # Responsive controls toolbar
│   ├── PageSelector.tsx               # Page navigation dropdown
│   ├── PreviewFrame.tsx               # Iframe container
│   ├── ConnectModal.tsx               # Connection setup modal
│   ├── ChangeSummaryModal.tsx         # Change summary overlay
│   ├── ProjectFolderBanner.tsx        # Project folder selection banner
│   ├── left-panel/
│   │   ├── LeftPanel.tsx              # Left panel container
│   │   ├── IconSidebar.tsx            # Icon sidebar (Layers/Pages/Components/Add/Terminal)
│   │   ├── LayersPanel.tsx            # DOM tree navigator
│   │   ├── LayerNode.tsx              # Individual tree node
│   │   ├── LayerSearch.tsx            # Tree search
│   │   ├── PagesPanel.tsx             # Page navigation
│   │   ├── ComponentsPanel.tsx        # React component browser
│   │   ├── AddElementPanel.tsx        # HTML element inserter
│   │   ├── icons.tsx                  # Panel icons
│   │   └── terminal/
│   │       ├── TerminalPanel.tsx      # Embedded xterm.js terminal
│   │       └── ScanOverlay.tsx        # Scan progress overlay
│   ├── right-panel/
│   │   ├── RightPanel.tsx             # Right panel container
│   │   ├── PanelTabs.tsx              # Tab switcher (Design/Variables/Changes/Claude/Console)
│   │   ├── ElementLogBox.tsx          # Element info display
│   │   ├── design/                    # Style editing sections
│   │   │   ├── DesignPanel.tsx        # Design tab container
│   │   │   ├── TextSection.tsx        # Typography editing
│   │   │   ├── BackgroundSection.tsx  # Background + gradients
│   │   │   ├── BorderSection.tsx      # Border editing
│   │   │   ├── ShadowBlurSection.tsx  # Shadow + blur effects
│   │   │   ├── LayoutSection.tsx      # Flexbox/grid layout
│   │   │   ├── SizeSection.tsx        # Width/height
│   │   │   ├── PositionSection.tsx    # Position + z-index
│   │   │   ├── AppearanceSection.tsx  # Opacity, overflow, cursor
│   │   │   ├── SVGSection.tsx         # SVG fill/stroke editing
│   │   │   ├── PropertiesSection.tsx  # Raw CSS properties
│   │   │   ├── GradientEditor.tsx     # Visual gradient editor
│   │   │   ├── CSSRawView.tsx         # Raw CSS viewer
│   │   │   ├── DesignCSSTabToggle.tsx # Design/CSS view toggle
│   │   │   ├── ElementBreadcrumb.tsx  # Element path breadcrumb
│   │   │   ├── icons.tsx
│   │   │   └── inputs/               # Shared design input components
│   │   ├── variables/
│   │   │   └── VariablesPanel.tsx     # CSS variable management
│   │   ├── changes/
│   │   │   ├── ChangesPanel.tsx       # Change tracking + export
│   │   │   ├── ChangeEntry.tsx        # Individual change row
│   │   │   ├── ChangelogActions.tsx   # Copy/send changelog actions
│   │   │   └── AiScanResultPanel.tsx  # AI scan results
│   │   ├── claude/
│   │   │   ├── ClaudeIntegrationPanel.tsx  # Claude CLI panel
│   │   │   ├── SetupFlow.tsx          # First-time setup
│   │   │   ├── ProjectRootSelector.tsx # Project root config
│   │   │   ├── DiffViewer.tsx         # Diff display
│   │   │   ├── DiffCard.tsx           # Single diff card
│   │   │   ├── ApplyConfirmModal.tsx  # Apply confirmation
│   │   │   ├── ClaudeProgressIndicator.tsx # Progress bar
│   │   │   ├── ClaudeErrorState.tsx   # Error display
│   │   │   └── ResultsSummary.tsx     # Results overview
│   │   └── console/
│   │       └── ConsolePanel.tsx       # Console log output
│   └── common/                        # Shared UI components
│       ├── ResizablePanel.tsx
│       ├── ColorPicker.tsx
│       ├── VariableColorPicker.tsx
│       ├── UnitInput.tsx
│       ├── CollapsibleSection.tsx
│       ├── EditablePre.tsx
│       ├── ScanAnimation.tsx
│       ├── ToastContainer.tsx
│       └── ErrorBoundary.tsx
├── hooks/
│   ├── useTargetUrl.ts
│   ├── usePostMessage.ts
│   ├── useChangeTracker.ts
│   ├── useSelectedElement.ts
│   ├── useDOMTree.ts
│   ├── useClaudeAPI.ts
│   ├── useProjectScan.ts
│   ├── useBridge.ts
│   ├── useKeyboardShortcuts.ts
│   └── useResizable.ts
├── store/
│   ├── index.ts                       # Combined store (9 slices)
│   ├── elementSlice.ts
│   ├── changeSlice.ts
│   ├── uiSlice.ts
│   ├── treeSlice.ts
│   ├── claudeSlice.ts
│   ├── cssVariableSlice.ts
│   ├── componentSlice.ts
│   ├── consoleSlice.ts
│   └── terminalSlice.ts
├── types/
│   ├── element.ts
│   ├── messages.ts
│   ├── changelog.ts
│   ├── claude.ts
│   ├── tree.ts
│   ├── component.ts
│   ├── cssVariables.ts
│   ├── gradient.ts
│   ├── shadow.ts
│   └── file-system-access.d.ts
├── lib/
│   ├── constants.ts
│   ├── utils.ts
│   ├── apiBase.ts
│   ├── promptBuilder.ts
│   ├── diffParser.ts
│   ├── classifyElement.ts
│   ├── componentMatcher.ts
│   ├── projectScanner.ts
│   ├── clientProjectScanner.ts
│   ├── cssVariableUtils.ts
│   ├── gradientParser.ts
│   ├── shadowParser.ts
│   ├── textShadowUtils.ts
│   ├── tailwindClassParser.ts
│   ├── claude-bin.ts
│   ├── claude-stream.ts
│   ├── folderPicker.ts
│   └── validatePath.ts
├── inspector/                         # Injected into iframe via proxy
│   ├── inspector.ts                   # Entry point
│   ├── DOMTraverser.ts
│   ├── ElementSelector.ts
│   ├── HoverHighlighter.ts
│   ├── SelectionHighlighter.ts
│   ├── StyleExtractor.ts
│   └── messaging.ts
├── bridge/                            # Bridge server for Vercel deployment
│   ├── server.ts                      # HTTP server (port 4002)
│   ├── proxy-handler.ts               # Proxy request handler
│   └── api-handlers.ts               # API request handler
├── server/
│   └── terminal-server.ts            # Terminal WebSocket server (node-pty)
└── proxy.ts                            # Asset-only request proxying
```

## Commands

```bash
bun install          # Install dependencies
bun dev              # Start dev server (port 4000)
bun run bridge       # Start bridge server for Vercel deployment (port 4002)
bun run dev:terminal # Start terminal server
bun run dev:all      # Start all services (terminal + bridge + next)
bun run build        # Production build
bun run start        # Start production server (port 4000)
bun run lint         # Lint
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
6. **Changelog is truth** — every visual change MUST be recorded with original→new values and CSS selector paths.
7. **Bun everywhere** — all commands use Bun. No npm/yarn/pnpm.
8. **No shell exec** — Claude CLI spawned via `Bun.spawn` or `execFile` only. Never `exec` with shell strings.
9. **Singleton message listener** — `usePostMessage` hook registers ONE global `window.addEventListener('message', ...)` via a module-level singleton. Multiple components may call the hook but only one listener exists. This prevents duplicate message processing.
10. **Proxy matches assets only** — Next.js proxy matches `/_next/` paths and common asset directories (`/fonts/`, `/webfonts/`, `/assets/`, `/images/`, `/icons/`, `/media/`, `/static/`, `/public/`). Inside the function, requests are filtered by file extension (`ASSET_EXT_RE`) and referer/fetch-dest to only proxy iframe-originated asset requests. Never match page-level paths — doing so pollutes the editor's HMR route tree and causes reload loops.
11. **HMR isolation** — Proxy short-circuits `.hot-update.*`, `webpack-hmr`, and `turbopack-hmr` requests with empty 200/204 responses. `page.tsx` suppresses unhandled HMR rejection errors as a safety net.

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
- `/docs` route — Built-in setup guide with framework-specific instructions

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

## Active Technologies
- TypeScript (Next.js 15 App Router), vanilla JavaScript (Service Worker) + Next.js 15, Zustand 5, Browser Service Worker API (008-sw-proxy)
- In-memory (SW runtime) for target URL mappings; localStorage (existing) for UI state (008-sw-proxy)

## Recent Changes
- 008-sw-proxy: Added TypeScript (Next.js 15 App Router), vanilla JavaScript (Service Worker) + Next.js 15, Zustand 5, Browser Service Worker API

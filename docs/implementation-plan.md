# pAInt - Next.js Visual Editor Web App

## Context

You have multiple Next.js + Tailwind CSS projects in `/Users/jehcyadorna/My React Project/`. You want a standalone web app that acts as a visual editor for any localhost project - inspect elements, edit styles visually, drag and drop elements to reposition them, and either generate a changelog for Claude Code or send it directly to Claude Code CLI for automated analysis and code generation.

## Architecture Overview

```
+---------------------------------------------------+
|              Next.js App (pAInt)              |
|              Dark Mode | Bun Runtime               |
|                                                     |
|  +-----------+  +-------------+  +-------------+  |
|  | Left      |  | Center      |  | Right       |  |
|  | Panel     |  | Iframe      |  | Panel       |  |
|  | (Layers/  |  | Preview     |  | (Design/    |  |
|  |  Navigator|  | (proxied    |  |  Changes)   |  |
|  |  ~240px)  |  |  target)    |  |  ~300px)    |  |
|  +-----+-----+  +------+------+  +------+------+  |
|        |     postMessage     |          |          |
|        +<------------------->+          |          |
|        +<-------- Zustand store ------->+          |
|                                                     |
+---+-------------------------------------------------+
    |
    | API Routes
    |
+---+-------------------------------------------------+
|  /api/proxy/[...path]             <- Reverse proxy  |
|  /api/claude/analyze              <- Claude CLI r/o  |
|  /api/claude/apply                <- Claude CLI w    |
|  /api/claude/status               <- CLI check       |
+-----------------------------------------------------+
                |
          child_process.execFile
                |
        +-------+-------+
        | claude CLI     |
        +----------------+
```

## UX Layout (Webflow-Style Three-Column)

```
+-------------------------------------------------------------------------------------------+
| [Logo] pAInt   [ http://localhost:3000   ▾ ] [Connect]  [●]   [ M | T | D ]          |
|  Page: [Homepage v]   [DRAG▾]   [APPLY]                                                   |
+-------------+-------------------------------------------------------------+---------------+
|             |                                           |               |
| LEFT PANEL  |          CENTER PREVIEW                   | RIGHT PANEL   |
| (Navigator) |          (Iframe)                         | (Style Editor)|
|             |                                           |               |
| ▸ html      |                                           | [Design]      |
|   ▸ head    |     Proxied target page                   | [Changes (3)] |
|   ▾ body    |     rendered here                         |               |
|     ▾ main  |                                           | ── Size ──    |
|       ▸ nav |                                           | W: [auto]     |
|       ▾ section.hero                                    | H: [auto]     |
|         ● h1|                                           |               |
|         ▸ p |                                           | ── Spacing ── |
|       ▸ section.features                                | [box model]   |
|       ▸ footer                                          |               |
|             |                                           | ── Typo ──    |
| [Search...] |                                           | Font: [Inter] |
|             |                                           | Size: [24px]  |
+-------------+-------------------------------------------+---------------+
```

- **Left Panel** (~240px, resizable, collapsible) - Navigator/Layers DOM tree
- **Center** (flexible, fills remaining space) - Iframe preview of the target page
- **Right Panel** (~300px, resizable, collapsible) - Style editor with Design and Changes tabs
- **Top Bar** - Target URL input (prominent address bar with Connect button + connection status dot), responsive breakpoint tabs, page dropdown, drag toggle, apply button
- **Dark mode** by default throughout all panels and the top bar

## Dark Mode Design System

```
Background (panels):    #1e1e1e
Background (inputs):    #2a2a2a
Borders:                #3a3a3a
Text (primary):         #e0e0e0
Text (secondary):       #a0a0a0
Text (muted):           #666666
Accent (selection):     #4a9eff
Accent (hover):         #3a8aef
Success:                #4ade80
Warning:                #fbbf24
Error:                  #f87171
Panel dividers:         #2d2d2d
Top bar background:     #171717
```

## File Structure

```
dev-editor/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout with dark mode, providers
│   │   ├── page.tsx                    # Main editor page (three-column layout)
│   │   ├── api/
│   │   │   ├── proxy/
│   │   │   │   └── [...path]/
│   │   │   │       └── route.ts        # Reverse proxy to target localhost
│   │   │   └── claude/
│   │   │       ├── analyze/
│   │   │       │   └── route.ts        # Spawn claude CLI (read-only analysis)
│   │   │       ├── apply/
│   │   │       │   └── route.ts        # Spawn claude CLI (write mode, resume session)
│   │   │       └── status/
│   │   │           └── route.ts        # Check if claude CLI is available
│   │   └── globals.css                 # Tailwind entry + dark mode variables
│   ├── components/
│   │   ├── Editor.tsx                  # Three-column layout: left + center + right
│   │   ├── TopBar.tsx                  # Top bar: logo, target URL, breakpoints, drag, apply
│   │   ├── TargetSelector.tsx          # Localhost URL address bar: text input + Connect btn + status dot + recent URLs dropdown
│   │   ├── BreakpointTabs.tsx          # [Mobile] [Tablet] [Desktop] centered tabs
│   │   ├── PageSelector.tsx            # Page/component dropdown
│   │   ├── DragModeToggle.tsx          # Toggle: Off / Free Position / Reorder
│   │   ├── PreviewFrame.tsx            # Iframe container with responsive sizing
│   │   ├── left-panel/
│   │   │   ├── LeftPanel.tsx           # Collapsible left panel container
│   │   │   ├── LayersPanel.tsx         # DOM tree view (Webflow Navigator style)
│   │   │   ├── LayerNode.tsx           # Recursive tree node with element icons
│   │   │   └── LayerSearch.tsx         # Search/filter bar for the tree
│   │   ├── right-panel/
│   │   │   ├── RightPanel.tsx          # Collapsible right panel with tab switcher
│   │   │   ├── PanelTabs.tsx           # [Design] [Changes] tab bar
│   │   │   ├── design/
│   │   │   │   ├── DesignPanel.tsx     # Scrollable properties editor
│   │   │   │   ├── ElementBreadcrumb.tsx # Element path breadcrumb at top
│   │   │   │   ├── SizeSection.tsx
│   │   │   │   ├── SpacingSection.tsx  # Visual box model
│   │   │   │   ├── TypographySection.tsx
│   │   │   │   ├── BorderSection.tsx
│   │   │   │   ├── ColorSection.tsx
│   │   │   │   ├── LayoutSection.tsx
│   │   │   │   ├── PositionSection.tsx # X/Y coordinates, position type
│   │   │   │   └── PropertyInput.tsx   # Reusable input (number+unit, color)
│   │   │   ├── changes/
│   │   │   │   ├── ChangesPanel.tsx
│   │   │   │   ├── ChangeEntry.tsx
│   │   │   │   └── ChangelogActions.tsx # Copy changelog + Send to Claude Code
│   │   │   └── claude/
│   │   │       ├── ClaudeIntegrationPanel.tsx  # idle/loading/results/error
│   │   │       ├── ProjectRootSelector.tsx
│   │   │       ├── ClaudeProgressIndicator.tsx
│   │   │       ├── DiffViewer.tsx
│   │   │       ├── DiffCard.tsx
│   │   │       ├── ResultsSummary.tsx
│   │   │       ├── ClaudeErrorState.tsx
│   │   │       └── SetupFlow.tsx
│   │   └── common/
│   │       ├── CollapsibleSection.tsx
│   │       ├── ColorPicker.tsx
│   │       ├── ResizablePanel.tsx      # Drag-to-resize panel wrapper
│   │       └── UnitInput.tsx
│   ├── hooks/
│   │   ├── useTargetUrl.ts             # Manage target URL: connect, disconnect, auto-reconnect, recent URLs
│   │   ├── usePostMessage.ts           # postMessage communication with iframe
│   │   ├── useSelectedElement.ts
│   │   ├── useChangeTracker.ts
│   │   ├── useClaudeAPI.ts             # Hook wrapping fetch calls to /api/claude/*
│   │   ├── useDOMTree.ts
│   │   └── useResizable.ts            # Panel resize logic (left + right)
│   ├── store/
│   │   ├── index.ts                    # Zustand store
│   │   ├── elementSlice.ts
│   │   ├── changeSlice.ts              # Extended: position + reorder change types
│   │   ├── uiSlice.ts                  # targetUrl, connectionStatus, recentUrls, dragMode, breakpoint, panel visibility
│   │   ├── treeSlice.ts
│   │   └── claudeSlice.ts             # Claude integration state: status, results, errors
│   ├── types/
│   │   ├── messages.ts                 # postMessage event types
│   │   ├── element.ts
│   │   ├── changelog.ts
│   │   ├── tree.ts
│   │   ├── drag.ts                     # DragMode, DragState, PositionChange, ReorderChange
│   │   └── claude.ts                   # ClaudeRequest, ClaudeResponse, ParsedDiff, DiffHunk
│   ├── lib/
│   │   ├── constants.ts                # Message types, breakpoints, CSS props, dark mode tokens
│   │   ├── utils.ts                    # CSS parsing, selector generation
│   │   ├── promptBuilder.ts            # Constructs analysis/apply prompts from changelog data
│   │   └── diffParser.ts              # Parses Claude's structured diff response -> ParsedDiff[]
│   └── inspector/
│       ├── inspector.ts                # Entry point: injected into iframe via proxy
│       ├── DOMTraverser.ts             # Serialize DOM tree
│       ├── ElementSelector.ts          # Click-to-select (yields to DragHandler when active)
│       ├── HoverHighlighter.ts         # Blue overlay on hover (suppressed during drag)
│       ├── SelectionHighlighter.ts
│       ├── StyleExtractor.ts           # getComputedStyle reader
│       ├── ViewportController.ts       # Constrain page width per breakpoint
│       ├── messaging.ts                # postMessage bridge to parent editor
│       └── drag/
│           ├── DragHandler.ts          # Orchestrator: mode toggle, mouse events, strategy delegation
│           ├── FreePositionStrategy.ts # Free positioning: position/top/left + guide lines
│           ├── SiblingReorderStrategy.ts # DOM reorder: drop indicators, insertBefore
│           ├── DragOverlay.ts          # Overlays: ghost, guide lines, drop indicators
│           └── types.ts                # Inspector-side drag types
├── public/
│   └── icons/                          # App icons
├── next.config.ts                      # Next.js config (rewrites for proxy if needed)
├── tailwind.config.ts                  # Dark mode config (class strategy)
├── tsconfig.json
├── bun.lock                            # Bun lockfile
├── package.json                        # Scripts use bun (bun dev, bun run build)
└── postcss.config.js
```

## Key Technical Decisions

1. **Bun runtime & package manager** - All commands use Bun: `bun install`, `bun dev`, `bun run build`. Faster installs, faster dev server startup, native TypeScript support.
2. **Target URL input as the entry point** - A prominent address bar in the top bar where the user types any localhost URL. This is the first thing the user interacts with — the editor is inert until connected. Recent URLs are persisted in `localStorage` for quick switching. Connection status shown via colored dot (green/orange/red).
3. **Three-column Webflow-style layout** - Left panel (Navigator/Layers), center (iframe preview), right panel (Design/Changes). Both side panels are independently resizable and collapsible.
4. **Dark mode by default** - Tailwind `class` dark mode strategy with CSS custom properties for the dark color palette. No light mode toggle needed — dark is the only theme.
5. **Iframe + Reverse Proxy** - The target localhost page is loaded in an iframe. A Next.js API route (`/api/proxy/[...path]`) reverse-proxies requests to the target dev server, making the iframe same-origin. The proxy target is dynamically set based on the URL the user entered.
6. **Inspector script injection** - The proxy injects a `<script>` tag into the HTML response that loads the inspector code.
7. **postMessage for communication** - The editor (parent window) and the inspector (iframe) communicate via `window.postMessage`.
8. **Zustand for state** - Lightweight (~1KB). Slices: element, change, UI (includes targetUrl, connectionStatus, recentUrls, panel visibility, breakpoint, dragMode), tree, claude.
9. **Element paths as CSS selectors** - e.g. `section.hero > h1` - stable, human-readable, and directly usable in the changelog.
10. **Previews via inline styles** - Inspector script applies `element.style.setProperty(prop, value, 'important')` for instant visual feedback.
11. **Next.js API routes for Claude CLI** - Server-side endpoints spawn `claude` CLI via `Bun.spawn` or `child_process.execFile`. No separate infrastructure needed.
12. **Strategy pattern for drag modes** - `DragHandler` orchestrator delegates to `FreePositionStrategy` or `SiblingReorderStrategy`. Clean separation, modes never interfere.
13. **localStorage for persistence** - Changes (keyed by target URL), recent URLs, project settings, panel sizes, and history are stored in `localStorage`.

## Reverse Proxy Design

The proxy API route (`/api/proxy/[...path]`) does the following:

1. Receives requests from the iframe (same origin as the editor)
2. Forwards them to the target localhost dev server (e.g., `http://localhost:3000`)
3. For HTML responses: injects the inspector `<script>` tag before `</body>`
4. For other assets (CSS, JS, images): passes through unchanged
5. Rewrites absolute URLs in HTML/CSS to route through the proxy

```typescript
// /api/proxy/[...path]/route.ts (simplified)
export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  const targetUrl = `http://${targetHost}/${params.path.join('/')}`;
  const response = await fetch(targetUrl);

  if (response.headers.get('content-type')?.includes('text/html')) {
    let html = await response.text();
    html = html.replace('</body>', `<script src="/inspector.js"></script></body>`);
    return new Response(html, { headers: response.headers });
  }

  return response;
}
```

## Changelog Export Format (for Claude Code)

```
=== DEV EDITOR CHANGELOG ===
Project: http://localhost:3000
Page: /homepage
Generated: 2026-02-14T10:30:00Z
Breakpoint: Desktop (1280px)

--- Changes ---

Element: section.hero > h1
  font-size: 24px -> 32px
  font-weight: 400 -> 700
  padding: 16px -> 24px 32px
  border-radius: 0px -> 8px

Element: section.hero > p.subtitle
  color: rgb(102, 102, 102) -> rgb(51, 51, 51)
  font-size: 16px -> 18px

--- Summary ---
2 elements modified, 6 properties changed

--- Position Changes ---

Element: section.hero > h1
  position: static -> relative
  top: 0px -> 24px
  left: 0px -> -12px

--- Reorder Changes ---

Reorder: section.hero > .card-grid
  Moved child .card:nth-child(3) from index 2 to index 0

--- Instructions ---
Please apply the above CSS changes to the corresponding elements
in the project source files. Convert values to Tailwind classes
where appropriate.
```

## Implementation Phases

### Phase 1: Foundation
- Project scaffolding (`bun init`, package.json, Next.js config, Tailwind, TypeScript)
- Dark mode setup: Tailwind config with CSS custom properties for dark palette
- Root layout with dark background and three-column editor shell
- Left panel skeleton (collapsible, resizable, ~240px)
- Right panel skeleton (collapsible, resizable, ~300px, with Design/Changes tabs)
- Center iframe preview area (fills remaining space)
- **Top bar with Target URL input:**
  - `TargetSelector.tsx` — text input field where user types a localhost URL (e.g., `http://localhost:3000`)
  - Connect button to initiate the proxy connection
  - Connection status dot: green (connected), orange (connecting), red (disconnected)
  - Recent URLs dropdown — saved in `localStorage`, shown on focus/click
  - URL validation — only allows `localhost` or `127.0.0.1` origins
  - On Connect: iframe `src` is set to `/api/proxy/` which proxies to the entered URL
  - `useTargetUrl` hook — manages target URL state, connection lifecycle, auto-reconnect on disconnect
  - `uiSlice.targetUrl` + `uiSlice.connectionStatus` in Zustand store
- Breakpoint tabs, drag toggle, apply button placeholders in top bar
- Reverse proxy API route (`/api/proxy/[...path]`) — forwards requests to the target URL, injects inspector script into HTML responses
- Inspector script skeleton (sends `INSPECTOR_READY` via postMessage)
- `ResizablePanel` component with drag handles
- Build pipeline: `bun dev` / `bun run build`
- **Test**: App loads in dark mode, three-column layout renders, type `http://localhost:3000` in the target URL input, click Connect, iframe shows the proxied page, green dot appears, recent URLs dropdown shows the URL on next visit

### Phase 2: Left Panel — DOM Inspection + Layers
- DOMTraverser - serialize DOM to tree
- HoverHighlighter - overlay following cursor inside iframe
- ElementSelector - capture-phase click handler
- SelectionHighlighter - persistent outline on selected element
- LayersPanel + recursive LayerNode components (Webflow Navigator style with element icons)
- LayerSearch - search/filter bar at top of left panel
- Bidirectional selection sync (click preview -> highlights tree, click tree -> highlights preview)
- MutationObserver for live tree updates
- postMessage bridge for all inspector <-> editor communication
- **Test**: Hover highlights in iframe, click selects, left panel layers tree shows full DOM, search filters nodes

### Phase 3: Right Panel — Properties Editor
- DesignPanel with collapsible sections in the right panel
- ElementBreadcrumb at top of Design tab (e.g., `body > main > section.hero > h1`)
- SizeSection (width, height, overflow + unit selectors)
- SpacingSection (visual box model diagram, editable margin/padding)
- TypographySection (font family dropdown, size, weight, line-height, alignment)
- BorderSection (width, radius with linked/unlinked corners, color, style)
- ColorSection (background + text color with inline picker)
- LayoutSection (display, flex/grid controls)
- PositionSection (X/Y coordinates, position type)
- Reusable PropertyInput and UnitInput components
- Real-time preview: each edit sends PREVIEW_CHANGE via postMessage to inspector
- **Test**: Select element, right panel shows properties in Design tab, edit properties, see live changes in iframe preview

### Phase 4: Change Tracking + Changelog
- Change tracking store (add/update/remove/clear)
- ChangesPanel in right panel's Changes tab, grouped by element
- Undo single change (revert in preview + remove from list)
- Clear all with confirmation
- ChangelogActions - format changelog + copy to clipboard
- Badge count on Changes tab in right panel
- APPLY button in top bar -> switches right panel to Changes tab
- Persist changes in localStorage
- **Test**: Make changes, right panel Changes tab tracks them, copy changelog, paste into Claude Code

### Phase 5: Top Bar — Responsive Breakpoints + Page Navigation
- BreakpointTabs centered in top bar: [Mobile 375] [Tablet 768] [Desktop 1280]
- Iframe container resizes to simulate breakpoints (centered in preview area)
- PageSelector dropdown (scan iframe page links, navigate between pages)
- Inspector re-injects on navigation, refreshes tree
- Breakpoint context included in changelog export
- **Test**: Switch breakpoints via top bar, iframe resizes, layout reflows, changelog notes breakpoint

### Phase 6: Polish
- Handle iframe page navigation (re-inject inspector, refresh tree)
- Connection status handling (reconnect prompt if inspector disconnects)
- Keyboard shortcuts (Escape to deselect, arrows for tree nav, `Cmd+[` / `Cmd+]` to toggle panels)
- Panel collapse/expand animations
- Panel size persistence in localStorage
- Error boundaries, loading states
- Tailwind-aware changelog format (detect utility classes, suggest replacements)

### Phase 7: Drag & Drop Repositioning
- `DragHandler.ts` orchestrator with strategy pattern
- `FreePositionStrategy.ts` - position: relative + top/left changes, guide line snapping
- `SiblingReorderStrategy.ts` - DOM reorder via insertBefore(), drop indicator lines
- `DragOverlay.ts` - Overlays for ghost element, guide lines, drop indicators (inside iframe)
- `DragModeToggle.tsx` in top bar (Off / Free Position / Reorder dropdown)
- Extend `changeSlice` for `PositionChange` and `ReorderChange`
- Extend `uiSlice` with `dragMode: 'off' | 'free' | 'reorder'`
- Wire postMessage: `DRAG_MODE_CHANGED`, `POSITION_CHANGED`, `ELEMENT_REORDERED`
- `ElementSelector.ts` yields control to DragHandler when drag mode active
- `HoverHighlighter.ts` suppressed during active drag
- `requestAnimationFrame` throttling + cached sibling rects for smooth 60fps drag
- **Test**: Toggle drag mode via top bar, free-drag an element, switch to reorder mode, drag among siblings, check right panel Changes tab shows both types

### Phase 8: Claude Code API Integration
- **8a: API Route Foundation**
  - `/api/claude/status` - Check if `claude` CLI is available on the server
  - `/api/claude/analyze` - Spawn `claude` CLI with read-only tools, return analysis results
  - `/api/claude/apply` - Resume session with write permissions, apply diffs to source files
  - Uses `Bun.spawn` or `child_process.execFile` to prevent shell injection
- **8b: Prompt Builder + Diff Parser**
  - `src/lib/promptBuilder.ts` - Builds analysis prompt
  - `src/lib/diffParser.ts` - Parses structured diff response into `ParsedDiff[]`
- **8c: Right Panel UI**
  - `claudeSlice.ts` - Zustand state: status, results, errors, projectRoot
  - `ClaudeIntegrationPanel.tsx` - Renders inside the right panel's Changes tab
  - `ProjectRootSelector.tsx` - Sets project filesystem path (stored in localStorage)
  - `DiffViewer.tsx` - Syntax-highlighted diffs (dark mode colors)
  - `DiffCard.tsx` - Per-file wrapper
  - `ResultsSummary.tsx` - Summary + "Apply All" / "Copy All Diffs" buttons
  - `ClaudeErrorState.tsx` - Error-specific UI
  - `SetupFlow.tsx` - First-run: verify CLI, set project root
  - `ChangelogActions.tsx` - "Copy Changelog" + "Send to Claude Code"
- **8d: Two-Step Workflow**
  - Analyze (read-only): `claude -p "<prompt>" --output-format json --allowedTools Read`
  - Apply: `claude -p "<apply prompt>" --resume <sessionId> --allowedTools Read,Edit`
  - Confirmation dialog before applying
- **8e: Polish**
  - Streaming response support for long-running analyses
  - Keyboard shortcut (Cmd+Shift+Enter) for "Send to Claude Code"
  - History of past analyses in localStorage
  - Connection status indicator in top bar (green/orange/red dot)
- **Test**: Configure project root, make visual changes, click "Send to Claude Code" in right panel, review diffs, click "Apply", verify source files updated

## Security Considerations

### API Routes
- Validates `projectRoot` is absolute, exists, and is under `$HOME`
- Uses `Bun.spawn` or `execFile` (not `exec`) to prevent shell injection
- Analyze mode: `--allowedTools Read` (read-only)
- Apply mode: `--allowedTools Read,Edit` (no Bash)
- No API keys or secrets exposed to the client (Claude CLI handles its own auth)
- Proxy only forwards to localhost/127.0.0.1 origins (no SSRF to external hosts)

### Prompt Safety
- Changelog content sanitized: strip control chars, enforce max length (50KB)
- System prompt via `--append-system-prompt` is separate from user content
- Claude Code's own safety mechanisms provide an additional layer

## Verification

1. `bun run build` produces clean `.next/` output
2. `bun dev` starts the development server
3. App loads in dark mode with three-column layout and empty center placeholder
4. **Target URL input** is visible and focused in the top bar
5. Type `http://localhost:3000` and press Enter -> dot turns orange (connecting), then green (connected)
6. Center iframe loads the proxied page, left panel populates with DOM tree
7. Type a non-localhost URL -> validation prevents connection
8. Click the URL input dropdown -> recent URLs appear for quick switching
9. Left panel shows collapsible/resizable Navigator, right panel shows Design/Changes tabs
10. Hover elements in iframe -> blue highlight overlay appears
11. Click element -> selected in left panel tree, right panel Design tab shows properties
12. Edit a property in right panel -> live preview in iframe
13. Check right panel Changes tab -> change recorded with original -> new values
14. Switch breakpoints via top bar -> iframe resizes
15. Click "Copy Changelog" -> paste into Claude Code -> changes described accurately
16. Toggle drag mode via top bar -> drag element -> verify position properties update in right panel
17. Configure project root in settings
18. Click "Send to Claude Code" -> progress indicator -> diffs rendered in right panel DiffViewer
19. Click "Apply" -> source files updated -> refresh preview to verify

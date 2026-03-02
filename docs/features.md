# pAInt - Features

## UI Theme

- **Dark mode by default** - Dark background (`#1e1e1e`), muted borders (`#2d2d2d`), light text (`#e0e0e0`)
- design-editor-inspired design language with subtle panel separators
- High-contrast selection highlights and hover states for accessibility on dark backgrounds

## Core Features

### 1. Target URL Input (Connect to Any Localhost Project)
- **URL address bar** in the top bar where the user types or pastes any localhost URL (e.g., `http://localhost:3000`, `http://localhost:5173`, `http://127.0.0.1:8080`)
- **Instant connection** - Press Enter or click Connect, and the target page loads in the center iframe via the reverse proxy
- **Recent URLs dropdown** - Previously used target URLs are saved in `localStorage` and shown as a dropdown for quick switching
- **Connection status indicator** - Green dot (connected), orange dot (connecting), red dot (disconnected) next to the URL input
- **Auto-reconnect** - If the target dev server restarts, the editor detects the disconnect and auto-retries connection
- **Port flexibility** - Works with any port and any framework: Next.js (3000), Vite (5173), Create React App (3000), Astro (4321), etc.
- **Validation** - Only allows localhost/127.0.0.1 URLs for security (no external URLs)
- This is the **entry point** for the entire editor — nothing works until a target URL is connected

### 2. Visual Element Inspection (requires connected target)
- **Hover Highlighting** - Blue overlay appears on any element as you hover over it inside the center iframe preview
- **Click-to-Select** - Capture-phase click handler to select any element on the previewed page
- **Selection Highlighting** - Persistent outline on the currently selected element
- **DOM Tree Serialization** - Full DOM serialized into a navigable tree structure via injected inspector script

### 3. Left Panel — Navigator (Layers)
- visual-editor-style collapsible/expandable DOM tree in the **left panel** (~240px wide, resizable)
- Recursive tree nodes showing the full page structure with element type icons
- **Bidirectional selection sync** - Click an element in the preview and it highlights in the tree; click a node in the tree and it highlights in the preview
- **Live tree updates** via MutationObserver (reflects DOM changes in real time)
- Search and filter bar at the top of the left panel
- Keyboard navigation (arrow keys to traverse tree, Escape to deselect)
- Collapsible panel — toggle via icon button or keyboard shortcut

### 4. Right Panel — Style Editor (Design + Changes)
- visual-editor-style **right panel** (~300px wide, resizable) with two tabs: **Design** and **Changes**
- **Design Tab** - Visual properties editor for the selected element:
  - **Size Section** - Width, height, overflow with unit selectors
  - **Spacing Section** - Visual box model diagram with editable margin and padding values
  - **Typography Section** - Font family dropdown, size, weight, line-height, text alignment
  - **Border Section** - Width, radius (linked/unlinked corners), color, border style
  - **Color Section** - Background and text color with inline color picker
  - **Layout Section** - Display mode, flexbox and grid controls
  - **Position Section** - X/Y coordinates, position type
  - **Reusable Inputs** - PropertyInput and UnitInput components for consistent number+unit and color editing
- **Changes Tab** - Tracked modifications with undo and export actions
- **Real-Time Preview** - Every edit instantly applies to the previewed page via inline styles (`element.style.setProperty` with `!important`)

### 5. Top Bar — Responsive Breakpoints & Controls
- **Target URL input** — prominent address bar for entering the localhost URL (see Feature 1 above)
- **Breakpoint tabs** centered at the top of the toolbar: Mobile (375px) | Tablet (768px) | Desktop (1280px)
- Page navigation dropdown, drag mode toggle, and APPLY button
- Iframe container resizes to constrain the preview width per breakpoint
- Layout reflows in real time when switching breakpoints
- Breakpoint context automatically included in changelog exports

### 6. Change Tracking & Changelog
- Tracks all style modifications with original and new values
- Changes grouped by element (using CSS selector paths like `section.hero > h1`)
- **Undo single change** - Revert a specific property on the page and remove it from the list
- **Clear all changes** with confirmation dialog
- Badge count on the Changes tab showing number of pending changes
- Changes persisted in `localStorage` (survive page refresh)
- APPLY button in top bar jumps to the Changes tab in the right panel

### 7. Changelog Export (Claude Code Integration)
- One-click "Copy Changelog" to clipboard
- Structured, human-readable format designed to paste directly into Claude Code
- Includes: project URL, page path, timestamp, breakpoint context
- Lists each element's changed properties with `original -> new` values
- Summary line (e.g., "2 elements modified, 6 properties changed")
- Built-in instructions asking Claude to apply changes and convert to Tailwind classes where appropriate

### 8. Page Navigation
- PageSelector dropdown scans links on the current preview page
- Navigate between pages within the target project without leaving the editor
- Handles page navigation gracefully (re-injects inspector script, refreshes tree)

### 9. Drag & Drop Repositioning
- **Two drag modes** with an explicit toggle button in the top bar (Off / Free Position / Reorder)
- **Free Position Mode** - Drag any selected element freely on the page
  - Sets `position: relative` + `top`/`left` offsets (keeps element in document flow)
  - Guide lines snap to parent edges and sibling centers
  - Entire drag tracked as a single grouped position change (one undo action)
- **Sibling Reorder Mode** - Drag elements within their parent container to reorder
  - Drop indicator line shows insertion point between siblings
  - Moves DOM node via `parent.insertBefore()` (useful for flex/grid layouts)
  - Tracked as a structural "reorder" change (separate from style changes)
- **Strategy pattern architecture** - `DragHandler` orchestrator delegates to `FreePositionStrategy` or `SiblingReorderStrategy`
- Native mouse events in capture phase (not HTML5 Drag API) for full visual feedback control
- `requestAnimationFrame` throttling + cached sibling rects for smooth 60fps drag
- Hover highlighting suppressed during active drag to reduce visual noise

### 10. Claude Code API Integration (Log Analysis)
- **Analyze changelogs with Claude Code** - Instead of just copying, send changelogs directly to the server for Claude Code CLI analysis
- **Next.js API route bridge** - Server-side endpoint spawns `claude` CLI process on-demand
  - No separate server or daemon to run
  - Runs within the Next.js dev/production server
  - Zero extra infrastructure beyond Bun runtime
- **Two-step workflow:**
  1. **Analyze** (read-only) - Claude reads project source files and generates code diffs (Tailwind classes, CSS modules, etc.)
  2. **Apply** - Resume session with write permissions to apply changes to source files
- **Diff viewer** in right panel - Syntax-highlighted, per-file diff cards with green/red line coloring
- **Project root configuration** - User configures the filesystem path for the target project
- **Setup flow** - First-run experience: verify CLI, set project root
- **Error handling** - Specific UI states for: CLI not found, auth needed, timeout, parse failure
- **Graceful degradation** - "Copy Changelog" still works if Claude integration is not configured

## Architecture Features

### Next.js Web Application
- **Three-column layout** - Left panel (Navigator/Layers) | Center (Iframe Preview) | Right panel (Design/Changes)
- **Dark mode UI** - Dark theme by default with design-editor-inspired styling
- **Inspector Script** - Injected into the iframe via the proxy; handles DOM inspection, hover/selection highlighting, drag & drop
- **Reverse Proxy** - Next.js API route proxies the target localhost dev server, enabling same-origin iframe access
- **API Routes** - Server-side endpoints for Claude CLI integration and proxy

### Technical Highlights
- **Next.js 15 App Router** - Server components, API routes, and client-side interactivity
- **Bun** - Runtime and package manager (`bun dev`, `bun run build`, `bun install`)
- **Iframe + Proxy architecture** - Target page loaded via reverse proxy for same-origin DOM access
- **postMessage communication** - Bidirectional messaging between the editor and the iframe inspector script
- **Zustand state management** (~1KB) with dedicated slices: element, change, UI, tree, claude
- **CSS selector paths** for element identification - stable, human-readable, reusable in changelogs
- **Injected overlays** - Hover/selection/drag highlights rendered inside the iframe
- **Strategy pattern for drag modes** - Clean separation between free positioning and sibling reorder logic

## Polish & UX Features

- Dark mode by default
- Error boundaries and loading states
- Element breadcrumb trail at the top of the Design tab in the right panel
- Tailwind-aware changelog format (detects utility classes, suggests replacements)
- Works with any localhost dev server (Next.js, Vite, Create React App, etc.)
- Resizable left and right panels with drag handles
- Both panels collapsible via toggle buttons or keyboard shortcuts

## Implementation Phases

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 1 | Foundation (scaffolding, proxy, dark mode, three-column layout) | TODO |
| Phase 2 | Left Panel — DOM Inspection + Layers | TODO |
| Phase 3 | Right Panel — Properties Editor (all sections + live preview) | TODO |
| Phase 4 | Change Tracking + Changelog Export | TODO |
| Phase 5 | Top Bar — Responsive Breakpoints + Page Navigation | TODO |
| Phase 6 | Polish (keyboard shortcuts, search, error handling) | TODO |
| Phase 7 | Drag & Drop Repositioning (free position + sibling reorder) | TODO |
| Phase 8 | Claude Code API Integration (log analysis + diff viewer) | TODO |

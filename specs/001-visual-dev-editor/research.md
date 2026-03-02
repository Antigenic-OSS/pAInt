# Research: Visual pAInt

**Branch**: `001-visual-dev-editor` | **Date**: 2026-02-14

## Technology Decisions

### 1. Runtime & Package Manager: Bun

**Decision**: Use Bun as both runtime and package manager.
**Rationale**: Bun provides native TypeScript execution, faster installs than npm/yarn/pnpm, built-in bundling capabilities, and `Bun.spawn` for safe subprocess execution (needed for Claude CLI integration). The project runs entirely on localhost so Node.js compatibility edge cases are minimal.
**Alternatives considered**:
- **Node.js + npm**: Mature ecosystem but slower installs, no native TS, requires separate bundler config for inspector script.
- **Node.js + pnpm**: Faster than npm but still requires `child_process` for subprocess work. No significant advantage over Bun for a single-project setup.

### 2. Framework: Next.js 15 App Router

**Decision**: Next.js 15 with App Router for the editor application.
**Rationale**: App Router provides Server Components for the layout shell, Client Components for interactive panels, and API Routes for the reverse proxy and Claude CLI bridge — all in one project. No need for a separate backend server. The catch-all route pattern (`[...path]`) is ideal for the reverse proxy.
**Alternatives considered**:
- **Vite + Express**: Would work but requires two separate processes (frontend + proxy server). Next.js unifies them.
- **Remix**: API route support is strong but the loader/action pattern doesn't align with the proxy use case as cleanly as Next.js catch-all API routes.
- **Astro**: Excellent for content sites but lacks the client-heavy interactivity model needed for a real-time editor.

### 3. State Management: Zustand

**Decision**: Zustand with slice pattern (element, change, ui, tree, claude).
**Rationale**: Zustand is ~1KB, requires no providers or context wrappers, supports slice composition for modular state, and integrates cleanly with React hooks. The three-column layout requires synchronized state across panels — Zustand's subscribe model makes cross-panel reactivity straightforward.
**Alternatives considered**:
- **React Context**: Works for simple cases but leads to re-render cascading when multiple contexts update simultaneously (e.g., selecting an element updates tree, element, and UI state).
- **Redux Toolkit**: Overkill for a single-user local tool. Boilerplate overhead with no benefit.
- **Jotai**: Atom-based model is elegant but the slice pattern in Zustand better maps to the panel-based architecture.

### 4. Styling: Tailwind CSS with CSS Custom Properties

**Decision**: Tailwind CSS 4 with `class` dark mode strategy and CSS custom properties for the color palette.
**Rationale**: Tailwind's utility classes enable rapid UI development. CSS custom properties define the dark palette once in `globals.css` and are referenced throughout. The `class` strategy allows the dark theme to be applied at the root level without media query dependency.
**Alternatives considered**:
- **CSS Modules**: More isolation but slower iteration for a design-heavy editor UI.
- **styled-components / Emotion**: CSS-in-JS adds runtime overhead and conflicts with Server Components.
- **Vanilla CSS**: Feasible but slower to iterate on the 40+ component files.

### 5. Editor-Iframe Communication: postMessage

**Decision**: `window.postMessage` for all communication between the editor (parent) and the inspector (iframe).
**Rationale**: The reverse proxy makes the iframe same-origin, so postMessage works without CORS issues. It provides a clean, asynchronous, event-driven protocol. Each message has a typed `type` field for dispatch. This keeps the inspector fully sandboxed — no direct DOM access from the editor frame.
**Alternatives considered**:
- **Direct iframe DOM access**: Same-origin allows `iframe.contentDocument` access, but this tightly couples the editor to the iframe's DOM structure and makes the inspector non-modular.
- **BroadcastChannel**: Works for same-origin tabs but adds unnecessary complexity over postMessage for a parent-child frame relationship.

### 6. Reverse Proxy: Next.js API Route

**Decision**: Next.js catch-all API route (`/api/proxy/[...path]`) as the reverse proxy.
**Rationale**: Eliminates CORS and same-origin issues by making the iframe load from the editor's origin. The proxy can intercept HTML responses to inject the inspector script. Dynamic proxy target (based on user-entered URL) is stored in the Zustand store and passed via headers or query params.
**Alternatives considered**:
- **Next.js rewrites (next.config.ts)**: Cannot dynamically change the proxy target at runtime.
- **Separate Express proxy**: Adds infrastructure. Next.js API routes are sufficient.
- **Service Worker**: Could intercept fetch requests but doesn't work for the initial HTML document load in an iframe.

### 7. Inspector Script Bundling

**Decision**: Bundle `src/inspector/` as a standalone IIFE script served via the proxy.
**Rationale**: The inspector runs inside the target page's iframe — it cannot import from the editor's module system. It must be a single self-contained script injected via a `<script>` tag. The build step compiles TypeScript inspector files into one JS bundle.
**Alternatives considered**:
- **Inline script in proxy response**: Works but limits code size and makes debugging harder.
- **Dynamic import**: Not possible across origins even with same-origin proxy (module scripts have different loading semantics in injected contexts).

### 8. Drag & Drop: Native Mouse Events + Strategy Pattern

**Decision**: Native `mousedown`/`mousemove`/`mouseup` events in capture phase with a Strategy pattern dispatcher.
**Rationale**: The HTML5 Drag API provides limited visual feedback (no custom ghost, no guide lines, no drop indicators between siblings). Native mouse events give full control over rendering. Capture phase ensures the events are intercepted before the target page's own handlers. The Strategy pattern cleanly separates Free Position and Sibling Reorder modes.
**Alternatives considered**:
- **HTML5 Drag API**: Limited custom rendering, no guide line support, inconsistent cross-browser behavior for drop indicators.
- **@dnd-kit / react-beautiful-dnd**: These run in the React tree — the drag happens inside the iframe (different execution context), so React-based DnD libraries cannot be used directly.

### 9. Claude CLI Integration: Bun.spawn / execFile

**Decision**: Spawn `claude` CLI via `Bun.spawn` (preferred) or `child_process.execFile` (fallback).
**Rationale**: `Bun.spawn` provides safe argument-based process spawning without shell interpretation, preventing command injection. The CLI handles its own authentication, so no API keys are needed server-side. Two-step workflow (analyze read-only, then apply with write) matches Claude Code's `--resume` session model.
**Alternatives considered**:
- **Direct Anthropic API**: Would bypass Claude Code's file-aware tooling (Read, Edit). The CLI provides project context that the raw API does not.
- **`child_process.exec`**: Uses shell string interpolation — injection risk. Rejected per constitution.

### 10. Persistence: localStorage

**Decision**: All client-side persistence via `localStorage`, keyed by target URL.
**Rationale**: The editor is a single-user local tool. There is no multi-device sync requirement. localStorage is synchronous, zero-dependency, and persists across page refreshes. Changes, recent URLs, panel sizes, project settings, and Claude analysis history all fit comfortably within the 5MB localStorage limit.
**Alternatives considered**:
- **IndexedDB**: More powerful but async-only, requires a wrapper library (idb), and the data volume doesn't justify the complexity.
- **Server-side SQLite**: Adds infrastructure for a problem that doesn't exist (the editor is local-only).

## Resolved Unknowns

All technical context fields from the plan template have been resolved. No NEEDS CLARIFICATION markers remain.

| Field | Resolution |
|-------|-----------|
| Language/Version | TypeScript 5.x (strict) |
| Primary Dependencies | Next.js 15, React 19, Zustand 5, Tailwind CSS 4 |
| Storage | localStorage (no database) |
| Testing | Manual per-phase verification |
| Target Platform | Desktop browsers (Chrome, Firefox, Safari, Edge) |
| Project Type | Single Next.js web app |
| Performance Goals | <100ms preview, 60fps drag, <3s connect |
| Constraints | Localhost-only, dark mode only, Bun-only |
| Scale/Scope | Single-user, 1 page, 4 API routes, ~60 files |

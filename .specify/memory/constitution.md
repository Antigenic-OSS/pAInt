<!--
  Sync Impact Report
  ==================
  Version change: 1.0.0 → 1.1.0
  Modified principles:
    - II. Iframe + Reverse Proxy Architecture — expanded with Script Stripping,
      HMR Isolation, and Middleware Scope sub-sections based on infinite-reload
      bug fix (target page's Next.js router hydrating and triggering unblockable
      window.location.href navigation).
  Added sections: None
  Removed sections: None
  Templates status:
    - .specify/templates/plan-template.md — ✅ compatible
    - .specify/templates/spec-template.md — ✅ compatible
    - .specify/templates/tasks-template.md — ✅ compatible
    - .specify/templates/agent-file-template.md — ✅ compatible
  Follow-up TODOs: None
-->

# Dev Editor Constitution

## Core Principles

### I. Dark Mode Only

Dev Editor ships a single dark theme. There MUST NOT be a light mode
toggle or theme switcher. All UI surfaces — panels, top bar, inputs,
dialogs, overlays — MUST use the dark color palette defined in the
design system (`#1e1e1e` backgrounds, `#e0e0e0` text, `#4a9eff`
accent). This reduces design surface area, ensures visual consistency,
and keeps the editor aligned with developer tool conventions.

### II. Iframe + Reverse Proxy Architecture

The target page MUST be loaded inside an iframe via a Next.js API route
reverse proxy (`/api/proxy/[[...path]]`). The proxy injects the inspector
script into HTML responses. Direct DOM access from the editor frame is
forbidden — all communication between editor and preview MUST use
`window.postMessage`. This preserves same-origin access without CORS
hacks while keeping the inspector sandboxed.

**Script Stripping (mandatory)**: The proxy MUST strip ALL `<script>` tags
from proxied HTML responses (except `<script type="application/ld+json">`
for structured data). This prevents the target page's client-side JavaScript
— especially framework routers (Next.js App Router, React Router, etc.) —
from hydrating and triggering hard navigation via `window.location.href`,
which browsers do not allow intercepting. SSR HTML + CSS is sufficient for
visual style editing. The separately-injected inspector script handles all
element selection and editing functionality. Script preload/modulepreload
`<link>` tags for scripts MUST also be stripped.

**HMR Isolation**: The proxy MUST short-circuit requests for hot-update
files (`.hot-update.json`, `.hot-update.js`), `webpack-hmr`, and
`__turbopack_hmr`/`turbopack-hmr` endpoints — returning empty responses
(200/204) instead of forwarding them to the target. This prevents the
target's HMR system from interfering with the editor's own HMR.

**Middleware Scope**: Next.js middleware MUST only match asset paths
(`/_next/static/:path*`, `/_next/image`) — never page-level paths.
Matching page paths causes Next.js to track them in its HMR route tree,
producing "unrecognized HMR message" errors and potential reload loops.

### III. Localhost Only

Dev Editor MUST only connect to `localhost` or `127.0.0.1` origins.
URL validation MUST reject any non-local address before the proxy
forwards a request. This is a security boundary — the reverse proxy
MUST NOT be used as an open relay to external hosts.

### IV. Phase-Driven Implementation

Features MUST be implemented in the defined 8-phase order (Foundation →
Left Panel → Right Panel → Change Tracking → Top Bar → Polish →
Drag & Drop → Claude Integration). Each phase builds on the previous.
Skipping phases or implementing later-phase features before their
dependencies are complete is not permitted. Within a phase, tasks
marked `[P]` MAY run in parallel.

### V. Zustand Single Store

All client-side state MUST live in a single Zustand store composed of
slices (`elementSlice`, `changeSlice`, `uiSlice`, `treeSlice`,
`claudeSlice`). No component-local state for data that is shared
across panels. React Context MUST NOT be used as a state management
layer. This ensures predictable state flow and makes the three-column
panel synchronization straightforward.

### VI. Strategy Pattern for Extensible Behaviors

Drag modes MUST be implemented via the Strategy pattern
(`DragHandler` → `FreePositionStrategy` | `SiblingReorderStrategy`).
New drag behaviors or inspector behaviors MUST follow this pattern
rather than adding conditional branches. This keeps each mode isolated,
independently testable, and prevents cross-mode interference.

### VII. Changelog as the Source of Truth

Every visual change — style edits, position changes, DOM reorders —
MUST be captured in the changelog data structure with original and new
values. The changelog format MUST be human-readable, include CSS
selector paths, and be directly usable as input to Claude Code CLI.
Changes not recorded in the changelog do not exist from the user's
perspective.

## Technical Constraints

- **Runtime**: Bun MUST be used as both runtime and package manager.
  All scripts in `package.json` MUST use `bun` commands
  (`bun dev`, `bun run build`, `bun install`).
- **Framework**: Next.js 15 App Router. Server Components for layout,
  Client Components for interactive panels. API Routes for proxy and
  Claude CLI bridge.
- **Styling**: Tailwind CSS with `class` dark mode strategy and CSS
  custom properties for the dark palette. No CSS-in-JS libraries.
- **State**: Zustand (~1KB). No Redux, MobX, or Jotai.
- **Inspector Communication**: `window.postMessage` only. No shared
  memory, no direct iframe DOM access from the parent frame.
- **Claude CLI**: Spawned via `Bun.spawn` or `child_process.execFile`.
  MUST NOT use `exec` or shell strings to prevent injection.
  Analyze mode: `--allowedTools Read`. Apply mode:
  `--allowedTools Read,Edit`. No Bash tool.
- **Persistence**: `localStorage` for changes (keyed by target URL),
  recent URLs, project settings, and panel sizes. No database.
- **Security**: Proxy validates localhost-only origins. API routes
  validate `projectRoot` is absolute, exists, and is under `$HOME`.
  Changelog content sanitized (strip control chars, max 50KB).

## Development Workflow

- **Specification First**: Features MUST have documentation in `/docs`
  or a spec file before implementation begins. Code without a
  corresponding spec or plan is not accepted.
- **Branch Naming**: Feature branches MUST follow `###-feature-name`
  format (e.g., `001-foundation`, `002-left-panel`).
- **Commit Discipline**: Commit after each task or logical group.
  Commit messages MUST describe the change, not the file.
- **Testing**: Each implementation phase defines its own test criteria
  in the implementation plan. Phase completion MUST be verified against
  those criteria before moving to the next phase.
- **File Organization**: Source code MUST follow the file structure
  defined in `docs/implementation-plan.md`. New files MUST be placed
  in the correct directory per that structure.
- **No Over-Engineering**: Implement only what the current phase
  requires. Do not add abstractions, utilities, or config for
  hypothetical future needs (YAGNI).

## Governance

This constitution supersedes all ad-hoc practices. Amendments require:

1. A documented rationale explaining why the change is necessary.
2. Verification that the change does not break existing phase
   dependencies or architectural invariants.
3. Update to this file with incremented version number and amended
   date.

All code reviews and PR approvals MUST verify compliance with these
principles. Complexity beyond what a principle permits MUST be
justified in a Complexity Tracking table (see plan template).

Use `CLAUDE.md` at the repository root for runtime development
guidance that supplements this constitution.

**Version**: 1.1.0 | **Ratified**: 2026-02-14 | **Last Amended**: 2026-02-14

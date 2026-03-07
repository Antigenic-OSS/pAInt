# Implementation Plan: Service Worker Proxy

**Branch**: `008-sw-proxy` | **Date**: 2026-03-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-sw-proxy/spec.md`

## Summary

Replace the script-stripping reverse proxy with a Service Worker-based proxy that intercepts all iframe network requests at the browser level, proxying them to the target localhost server while preserving all `<script>` tags. This enables full client-rendered content (React, Vue, etc.), CSS-in-JS styles, and interactive elements in the preview iframe. The existing reverse proxy remains as a fallback for browsers without SW support.

## Technical Context

**Language/Version**: TypeScript (Next.js 15 App Router), vanilla JavaScript (Service Worker)
**Primary Dependencies**: Next.js 15, Zustand 5, Browser Service Worker API
**Storage**: In-memory (SW runtime) for target URL mappings; localStorage (existing) for UI state
**Testing**: Manual browser testing (connect to Next.js target, verify rendering/interaction)
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge — all support Service Workers)
**Project Type**: Web application (single project)
**Performance Goals**: Target pages render within 5 seconds, matching direct browser load
**Constraints**: SW cannot intercept WebSocket/EventSource; iframe same-origin with editor
**Scale/Scope**: Single-user local development tool

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Dark Mode Only | PASS | No UI changes affect theming |
| II. Iframe + Reverse Proxy | **VIOLATION** | SW proxy does NOT strip scripts. See Complexity Tracking. |
| III. Localhost Only | PASS | SW only proxies to localhost targets; validation unchanged |
| IV. Phase-Driven Implementation | PASS | This is a standalone infrastructure improvement |
| V. Zustand Single Store | PASS | New state added to existing uiSlice |
| VI. Strategy Pattern | N/A | No drag behaviors involved |
| VII. Changelog as Source of Truth | PASS | Change tracking unaffected |

**Gate result**: VIOLATION on Principle II (Script Stripping). Justified in Complexity Tracking below.

## Project Structure

### Documentation (this feature)

```text
specs/008-sw-proxy/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research findings
├── data-model.md        # Data model for SW state
├── quickstart.md        # Developer quickstart guide
├── contracts/           # API contracts
│   └── sw-proxy-api.md  # SW proxy URL format, message API, store API
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
public/
└── sw-proxy/
    └── sw.js                              # Service Worker script (NEW)

src/
├── lib/
│   └── serviceWorkerRegistration.ts       # SW registration + readiness (NEW)
├── store/
│   └── uiSlice.ts                         # Add swProxyReady state (MODIFY)
├── components/
│   └── PreviewFrame.tsx                   # Add SW URL builder (MODIFY)
├── app/
│   ├── page.tsx                           # Trigger SW registration (MODIFY)
│   └── api/
│       └── proxy/[[...path]]/route.ts     # Existing fallback (UNCHANGED)
└── hooks/
    └── usePostMessage.ts                  # No changes needed (same-origin)
```

**Structure Decision**: Single project. All changes fit within the existing `src/` and `public/` directories. No new top-level directories needed.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Constitution II: Script stripping bypassed in SW mode | Script stripping causes the core UX problem — missing client-rendered content, broken interactions, no CSS-in-JS. The SW proxy solves the same safety problems (reload loops, hydration failures) through transparent network interception instead of code removal. | Keeping script stripping means pAInt can never show the actual rendered output of modern web apps. The alternative (keep stripping) preserves safety but defeats the product's purpose for JS-heavy apps. The existing proxy with stripping remains as a fallback, so the constitutional rule is not removed — it's augmented. |

## Implementation Phases

### Phase 1: SW Infrastructure (Foundation)

**Files**: `public/sw-proxy/sw.js`, `src/lib/serviceWorkerRegistration.ts`, `src/store/uiSlice.ts`

1. Add `swProxyReady` and `setSwProxyReady` to `uiSlice.ts`
2. Create `public/sw-proxy/sw.js` with:
   - `install` event: fetch and cache inspector code from `/dev-editor-inspector.js`, call `skipWaiting()`
   - `activate` event: call `clients.claim()`
   - `fetch` event handler (skeleton): intercept `/sw-proxy/` scope, pass through others
   - Target URL extraction from `__sw_target` query param
   - Per-clientId target URL mapping
3. Create `src/lib/serviceWorkerRegistration.ts` with:
   - `registerSwProxy()`: register SW, await activation, set store state
   - `isSwProxyReady()`: synchronous readiness check
   - `unregisterSwProxy()`: cleanup

### Phase 2: HTML Transformation (Core Logic)

**Files**: `public/sw-proxy/sw.js`

1. Implement HTML response handling in the SW fetch handler:
   - Fetch from target origin
   - Strip security headers (8 headers from STRIP_HEADERS set)
   - Strip CSP `<meta>` tags from HTML body
   - Remove existing `<script src="...dev-editor-inspector.js">` tags (prevent duplicates)
   - Inject navigation blocker after `<head>` (adapted from proxy route)
   - Inject cached inspector code before `</body>`
   - Do NOT strip `<script>` tags
2. Implement navigation blocker for SW mode:
   - `history.replaceState` to fix URL path (strip `/sw-proxy/` prefix)
   - WebSocket/EventSource mocks for HMR isolation
   - Navigation API intercept to prevent iframe escape
   - `fetch`/`XHR` patches to route through SW scope
   - `proxyResUrl()` rewriting to `/sw-proxy/` paths
   - Resource URL property interceptors (img.src, script.src, etc.)
   - MutationObserver for dynamically-added elements
   - Error/unhandledrejection suppression for HMR noise

### Phase 3: Subresource Proxying

**Files**: `public/sw-proxy/sw.js`

1. Implement subresource request handling:
   - Look up target origin from clientId mapping
   - Rewrite request URL: strip `/sw-proxy/` prefix, prepend target origin
   - Forward request to target with original headers
   - Strip CORS-blocking headers from response
   - Handle CSS responses: rewrite `url()` references to go through SW scope
2. Implement HMR short-circuiting:
   - Match `.hot-update.*`, `webpack-hmr`, `turbopack-hmr` patterns
   - Return empty 200/204 responses

### Phase 4: Editor Integration

**Files**: `src/components/PreviewFrame.tsx`, `src/app/page.tsx`

1. Add `buildSwProxyUrl()` to PreviewFrame.tsx
2. Update `buildIframeUrl()` to check `isSwProxyReady()` and prefer SW mode
3. Add `registerSwProxy()` call to `page.tsx` useEffect (fire-and-forget)
4. Import `isSwProxyReady` from registration module

### Phase 5: Testing & Polish

1. Test with Next.js target app (client components, CSS-in-JS)
2. Test with plain HTML target
3. Test fallback (disable SW in DevTools, verify `/api/proxy/` works)
4. Test multi-tab with different targets
5. Test inspector features: hover, select, style edit, change tracking, changelog export
6. Test page navigation within target
7. Test target server restart (reconnection)

## Key Technical Decisions

1. **SW file location**: `public/sw-proxy/sw.js` (not `public/sw-proxy.js`) because browser specs require the SW script to be within the directory it controls
2. **Inspector code**: Fetched from `/dev-editor-inspector.js` at SW install time and cached in memory — avoids duplicating 60KB of code
3. **Target URL communication**: Via `__sw_target` query parameter on navigation requests — avoids race conditions with postMessage
4. **Per-clientId mapping**: Uses `event.clientId` in fetch handler to support multiple tabs with different targets
5. **Fallback strategy**: `isSwProxyReady()` check in `buildIframeUrl()` — transparent to the rest of the codebase

## Risks

1. **Client-side router navigation**: Even with URL correction via replaceState, some routers may detect the mismatch between the actual origin (localhost:4000) and expected origin (localhost:3000). Mitigated by the Navigation API intercept.
2. **Hydration failures**: If any JS chunks fail to load through the SW, React hydration will fail and wipe the page. Mitigated by comprehensive subresource proxying.
3. **Inspector conflicts with target JS**: Target page JS may modify the DOM in ways that conflict with the inspector's overlays or selection mechanism. This is an inherent tension — existing issue, not introduced by SW.

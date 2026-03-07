# Research: Service Worker Proxy

**Feature**: 008-sw-proxy
**Date**: 2026-03-07

## R-001: Service Worker Scope Requirements

**Decision**: Place the SW script at `public/sw-proxy/sw.js` so it can control scope `/sw-proxy/`.

**Rationale**: Browser specs enforce that a SW's maximum scope is the directory containing the script. A SW at `/sw-proxy.js` would have max scope `/`, not `/sw-proxy/`. The script must reside *within* the directory it intends to control.

**Alternatives considered**:
- Place at `/sw-proxy.js` and register with `scope: '/'` — too broad, would intercept editor's own requests
- Place at `/sw-proxy.js` with `scope: '/sw-proxy/'` — rejected by browser (scope wider than script directory)
- Use `Service-Worker-Allowed` response header to override scope restriction — adds server config complexity unnecessarily

## R-002: SW Fetch Interception for Iframes

**Decision**: Use `event.clientId` in the SW fetch handler to track which iframe client made each request, mapping to the correct target URL.

**Rationale**: When an iframe loads a URL under the SW's scope, the SW intercepts all its fetch requests. `event.clientId` identifies the specific client (iframe), and `self.clients.get(clientId)` returns the client object with `frameType: 'nested'` for iframes. This enables per-iframe target URL tracking.

**Alternatives considered**:
- Pass target URL in every request via custom header — requires patching all fetch/XHR in the target page, fragile
- Use a single global target URL — breaks multi-tab support
- Use the Referer header — unreliable, can be stripped

## R-003: Inspector Code Sourcing Strategy

**Decision**: Have the SW fetch the inspector code from `/dev-editor-inspector.js` (the existing public file) at SW install time and cache it in memory. Do NOT duplicate the 60KB inline IIFE.

**Rationale**: The project already maintains `public/dev-editor-inspector.js` (60KB, 1860 lines) as a standalone inspector script. The SW can fetch this once during installation and cache the text for injection into HTML responses. This avoids duplicating the code and keeps the SW file small.

**Alternatives considered**:
- Duplicate the IIFE inline in `sw.js` — creates a 60KB+ file that's hard to maintain and diverges from the proxy's inline version
- Fetch on every HTML request — wasteful, adds latency
- Import as ES module — SW can't import from different scope

## R-004: Navigation Blocker Adaptation

**Decision**: Adapt the navigation blocker from the proxy route with these changes: (1) URL prefix `/sw-proxy/` instead of `/api/proxy/`, (2) remove cookie setter (SW handles all requests), (3) remove `_devproxy` marker for `/_next/` paths (SW intercepts all), (4) keep all other patches (history.replaceState, WS/ES mocks, Navigation API intercept, fetch/XHR rewrite, resource URL rewriting).

**Rationale**: The navigation blocker solves real problems (URL correction, HMR isolation, navigation containment) that exist regardless of how the page is proxied. The SW eliminates the need for cookie-based request identification but doesn't change the fundamental iframe containment challenges.

**Alternatives considered**:
- Remove the navigation blocker entirely — breaks HMR isolation and URL correction
- Let the SW handle URL rewriting without client-side patches — SW can't intercept `window.location` assignments or WebSocket connections

## R-005: Constitution Conflict — Script Stripping

**Decision**: The SW proxy mode does NOT strip scripts, which directly violates Constitution Section II ("Script Stripping (mandatory)"). This violation is justified because:

1. The constitutional rule exists to prevent infinite reload loops and hydration failures
2. The SW proxy solves the same problems through a different mechanism (transparent network interception + URL correction)
3. Script stripping causes the core problem this feature addresses (missing content, broken interactions)
4. The existing proxy with script stripping remains as a fallback — the rule is not removed, just augmented with an alternative

**Recommendation**: After implementation is validated, amend the constitution to reflect that the SW proxy is an accepted alternative to script stripping.

## R-006: Next.js Routing Conflicts

**Decision**: No conflicts with `/sw-proxy/` path. Next.js file-based routing only creates routes for files under `src/app/`. A static file at `public/sw-proxy/sw.js` is served by Next.js's static file serving without creating a route entry.

**Rationale**: Confirmed by examining `next.config.mjs` and the `src/app/` directory structure. No `src/app/sw-proxy/` directory exists or needs to exist. The SW is served as a static asset.

**Alternatives considered**:
- Serve the SW via an API route (`/api/sw/route.ts`) — unnecessary complexity, static file works
- Use a custom server — against project conventions (Next.js only)

## R-007: Headers to Strip in SW Responses

**Decision**: Strip the same 8 headers currently stripped by the proxy route: `content-encoding`, `transfer-encoding`, `cross-origin-embedder-policy`, `cross-origin-opener-policy`, `cross-origin-resource-policy`, `content-security-policy`, `content-security-policy-report-only`, `x-frame-options`.

**Rationale**: These headers prevent iframe embedding or cause CORS issues. The SW must strip them for the same reasons the server-side proxy does.

**Alternatives considered**: None — this is a direct port of existing behavior.

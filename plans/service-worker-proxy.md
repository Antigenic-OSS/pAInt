# Plan: Service Worker Proxy for pAInt

## Context

pAInt strips ALL `<script>` tags from proxied HTML to prevent infinite reload loops caused by client-side routers seeing `/api/proxy/` URLs and Next.js hydration failures (missing chunks 404). This means only SSR/static HTML is visible — no client-rendered content, no CSS-in-JS, no interactions.

A Service Worker registered on the editor origin (localhost:4000) can intercept ALL fetch requests from an iframe loaded under its scope. The SW fetches from the actual target (localhost:3000) transparently, injecting the inspector + navigation patches but **keeping scripts intact**. JS chunks load correctly because the SW proxies them. The current `/api/proxy/` route remains as a fallback for browsers without SW support.

## Files to Create

### 1. `public/sw-proxy.js` — Service Worker

The SW file must live in `public/` to be served at root scope.

**Responsibilities:**
- Listen for `fetch` events under `/sw-proxy/` scope
- Extract target URL from `__sw_target` query param on initial HTML request
- Store target URL per `clientId` for subsequent resource requests
- For HTML requests (navigate mode):
  - Fetch from target origin
  - Strip security headers (CSP, X-Frame-Options, COEP, CORP)
  - Inject navigation blocker at top of `<head>` (adapted from current proxy — `history.replaceState`, WS/ES mocks, Navigation API intercept, fetch/XHR patches, resource URL rewriting)
  - Inject inspector script before `</body>` (reuse the same IIFE from current proxy)
  - **Do NOT strip `<script>` tags** — this is the whole point
  - Strip CSP `<meta>` tags
- For JS/CSS/image/font requests: proxy to target, strip CORS-blocking headers
- For HMR requests (`.hot-update`, `webpack-hmr`, `turbopack-hmr`): return empty 200/204
- On `activate`: call `self.clients.claim()` for immediate control
- On `install`: call `self.skipWaiting()` for immediate activation

**Key differences from current nav blocker:**
- URL prefix is `/sw-proxy/` instead of `/api/proxy/`
- `proxyResUrl()` rewrites to `/sw-proxy/` paths
- No cookie setter needed (SW handles all requests)
- No `_devproxy` marker for `/_next/` paths needed

**Inspector code:** The inspector IIFE (~62KB) currently lives inline in `route.ts`. For the SW, we have two options:
- Option A: Duplicate the IIFE string in `sw-proxy.js` (simple but large file)
- Option B: Have the SW fetch the inspector code from `/api/sw-inspector` endpoint (cleaner)
- **Chosen: Option A** — keep it self-contained, the inspector code rarely changes, and it avoids an extra network request on every page load

### 2. `src/lib/serviceWorkerRegistration.ts` — Registration Logic

**Exports:**
- `registerSwProxy(): Promise<boolean>` — registers SW, waits for activation, returns success
- `isSwProxyReady(): boolean` — synchronous check
- `unregisterSwProxy(): Promise<void>` — cleanup

**Logic:**
1. Check `'serviceWorker' in navigator`
2. Register `/sw-proxy.js` with `scope: '/sw-proxy/'`
3. Wait for `navigator.serviceWorker.ready`
4. Handle `installing` → `activated` lifecycle
5. Set `swProxyReady` in Zustand store
6. On failure: log warning, fall back to current proxy silently

## Files to Modify

### 3. `src/store/uiSlice.ts`

Add to `UISlice` interface and implementation:
- `swProxyReady: boolean` (default: `false`)
- `setSwProxyReady: (ready: boolean) => void`

### 4. `src/components/PreviewFrame.tsx`

Add `buildSwProxyUrl()`:
```ts
function buildSwProxyUrl(targetUrl: string, pagePath: string): string {
  const path = pagePath === '/' ? '' : pagePath
  const encoded = encodeURIComponent(targetUrl)
  return `/sw-proxy${path}?__sw_target=${encoded}`
}
```

Update `buildIframeUrl()`:
```ts
if (isEditorOnLocalhost()) {
  if (isSwProxyReady()) {
    return buildSwProxyUrl(targetUrl, pagePath)
  }
  return buildProxyUrl(targetUrl, pagePath) // fallback
}
```

### 5. `src/app/page.tsx`

Add SW registration call in the existing `useEffect`:
```ts
import { registerSwProxy } from '@/lib/serviceWorkerRegistration'

useEffect(() => {
  if (window.self !== window.top) { ... return }
  loadPersistedUI()
  loadPersistedClaude()
  registerSwProxy() // fire-and-forget, sets store state when ready
  ...
}, [])
```

### 6. `src/app/api/proxy/[[...path]]/route.ts` — No changes

Keep as-is. It serves as the fallback for browsers without SW support.

## Implementation Order

1. `src/store/uiSlice.ts` — add `swProxyReady` state
2. `public/sw-proxy.js` — create the Service Worker
3. `src/lib/serviceWorkerRegistration.ts` — registration logic
4. `src/components/PreviewFrame.tsx` — add SW URL builder + readiness check
5. `src/app/page.tsx` — trigger registration on mount

## Key Design Decisions

- **Target URL via query param** (`__sw_target`): Avoids race conditions between `postMessage` and the first fetch. Each iframe load carries the target URL. SW stores per `clientId` for subsequent requests.
- **Keep current proxy as fallback**: No breaking changes. SW is an enhancement.
- **Same-origin communication**: SW-proxied iframe is on localhost:4000 (same origin as editor), so `postMessage` and `usePostMessage.ts` work without changes.
- **Inspector injection in SW**: The SW reads HTML as text, injects scripts, returns new Response. Same pattern as current proxy.
- **`clients.claim()` + `skipWaiting()`**: Ensures SW takes control immediately, even on first visit.

## What This Fixes

| Issue | Current (script-stripped) | With SW (scripts kept) |
|-------|--------------------------|------------------------|
| Client-rendered components | Missing | Visible |
| CSS-in-JS styles | Missing | Applied |
| Click handlers | Broken | Working |
| Dropdowns/modals/tabs | Broken | Working |
| Lazy-loaded content | Missing | Loads |
| Web fonts via JS | Missing | Loaded |
| Dynamic class additions | Missing | Applied |

## What Stays the Same

- Inspector injection and postMessage communication
- Navigation blocker (replaceState, WS/ES mocks, Navigation API intercept)
- HMR isolation
- Element selection, style editing, change tracking
- Changelog export

## Risks & Mitigations

1. **React hydration mismatch**: `history.replaceState` runs in `<head>` before hydration, so router sees correct URL. JS chunks load via SW proxy. Should work.
2. **Multiple tabs with different targets**: SW tracks target per `clientId`. Each iframe gets its own client.
3. **SW not ready on first load**: `registerSwProxy()` awaits activation. `buildIframeUrl()` checks readiness, falls back to old proxy if not ready.
4. **Target page `window.location` navigation**: Navigation blocker still intercepts via Navigation API. SW adds second layer for fetch interception.
5. **Cookies scoped to target origin**: SW can forward `Set-Cookie` headers. May need manual cookie relay for auth-dependent pages — address in follow-up if needed.

## Verification

1. `bun dev` — start pAInt on localhost:4000
2. Start a Next.js app on localhost:3000 with client components
3. Connect pAInt → verify iframe loads via `/sw-proxy/`
4. Verify React components render (not just SSR HTML)
5. Verify CSS-in-JS styles appear
6. Verify click handlers work (buttons, dropdowns)
7. Verify element inspection still works (hover, click, select)
8. Verify style editing + change tracking works
9. Disable SW (incognito) → verify fallback to `/api/proxy/` works
10. Check DevTools > Application > Service Workers for registration status

# Release Notes — v0.3.1

**Version**: `0.3.1`
**Date**: 2026-03-08

---

## What's New

### Service Worker Proxy — Full Client-Rendered Previews

pAInt now uses a Service Worker to proxy target pages instead of stripping all `<script>` tags. This means the preview iframe shows **fully rendered, interactive content** — not just the SSR HTML shell.

**Before**: Target page scripts were stripped, so client-rendered components (charts, animations, 3D scenes, dropdowns) appeared empty or broken.

**After**: All JavaScript runs normally. React hydrates, CSS-in-JS styles apply, and interactive elements work as expected.

---

## Key Features

### Full JavaScript Preservation
- Client-rendered components (React, Vue, Svelte) render completely
- CSS-in-JS libraries (styled-components, Tailwind runtime, Emotion) work out of the box
- 3D engines (Spline, Three.js, GSAP) and animation libraries render fully
- Lazy-loaded content and dynamic class additions work as expected

### Auth Flow Support
- New **Login first** button lets you authenticate on the target app before editing
- Auth mode (`__sw_auth`) loads a lightweight nav script for login flows
- Cookies and session state persist through the proxy — log in once, then edit

### Automatic Fallback
- If the Service Worker doesn't connect within 8 seconds, pAInt automatically falls back to the original reverse proxy (`/api/proxy/`)
- SW version check detects stale workers from previous versions and forces clean re-registration

### Inspector Overlay Survival
- `MutationObserver` re-attaches hover and selection overlays when React hydration removes them from the DOM
- Overlays now survive framework takeover without polling or per-event checks

### Navigator Tree Improvements
- DOM tree expands all nodes by default on initial load and page navigation
- User-collapsed nodes are remembered across tree refreshes
- Tree auto-expands and scrolls to the selected element when clicking in the preview

---

## Architecture

```
Browser                          pAInt Server
┌──────────────────────┐         ┌────────────────────┐
│  iframe /sw-proxy/   │         │                    │
│    ↕ fetch events     │         │  /api/sw-fetch/    │
│  Service Worker (sw)  │ ──────→ │  (server proxy)    │ ──→ localhost:N
│    intercepts all     │         │  forwards headers  │
│    requests           │         │  + cookies         │
└──────────────────────┘         └────────────────────┘
```

- **`/sw-proxy/sw.js`** — Service Worker that intercepts all iframe requests and routes them through the server
- **`/api/sw-fetch/`** — Next.js API route that proxies requests to the target localhost, forwarding all headers and cookies
- **`serviceWorkerRegistration.ts`** — Registration, version checking, and readiness tracking

---

## Files Changed

| Area | Files |
|------|-------|
| Service Worker | `public/sw-proxy/sw.js` |
| Server Proxy | `src/app/api/sw-fetch/[[...path]]/route.ts` |
| Registration | `src/lib/serviceWorkerRegistration.ts` |
| Preview Frame | `src/components/PreviewFrame.tsx` |
| Inspector | `public/dev-editor-inspector.js` |
| Connect UI | `src/components/ConnectModal.tsx`, `src/components/TargetSelector.tsx` |
| Navigator | `src/store/treeSlice.ts`, `src/components/left-panel/LayersPanel.tsx`, `LayerNode.tsx` |
| State | `src/store/uiSlice.ts` |
| Post Message | `src/hooks/usePostMessage.ts` |
| Config | `next.config.mjs` |
| Docs | `src/app/docs/page.tsx`, `src/app/docs/DocsClient.tsx` |

---

## Bug Fixes

- **Charts not rendering**: Nav blocker silently blocked `dev-editor-inspector.js` src, stalling React hydration. Fixed by redirecting to `data:text/javascript,//noop` so `onload` fires.
- **Reconnect stuck on "connecting"**: SW intercepted `/api/proxy` fallback navigation as a subresource. Fixed by skipping fallback navigations.
- **Inspector code lost on SW restart**: `inspectorCode` global was lost when browser terminated/restarted the SW. Fixed by re-fetching on activation.
- **Client-side nav breaking out of SW scope**: `history.replaceState` moved the URL outside `/sw-proxy/`. Fixed with `_isSoftNav` flag to distinguish `pushState` from `location.href` in the Navigation API handler.
- **HMR WebSocket errors**: Rewrote HMR WebSocket/EventSource URLs to target server instead of mocking them.

---

## Breaking Changes

None. The old reverse proxy (`/api/proxy/`) remains as an automatic fallback.

---

## How to Test

1. `bun dev` — start pAInt on port 4000
2. Start a target project (e.g., Next.js on port 3000)
3. Connect via the top bar — SW proxy activates automatically
4. Verify: client components render, interactive elements work, inspector overlays appear on hover/click
5. Test auth: click "Login first", authenticate, then switch to edit mode
6. Test fallback: disable Service Workers in DevTools → reconnect → should fall back to API proxy

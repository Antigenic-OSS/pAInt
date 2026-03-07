# Quickstart: Service Worker Proxy

**Feature**: 008-sw-proxy

## What Changed

pAInt now uses a Service Worker to proxy target pages in the preview iframe. Instead of stripping all JavaScript from the target page, the SW transparently intercepts network requests and injects the inspector — keeping target scripts intact. This means client-rendered content, CSS-in-JS styles, and interactive elements now work in the preview.

## For Developers

### How It Works

1. When pAInt loads, it registers a Service Worker at `/sw-proxy/sw.js`
2. When you connect to a target (e.g., `localhost:3000`), the iframe loads `/sw-proxy/?__sw_target=http://localhost:3000`
3. The SW intercepts this request, fetches the page from `localhost:3000`, injects the inspector, and returns it
4. All subsequent requests (JS chunks, CSS, images) are also intercepted and proxied by the SW
5. The target page's JavaScript runs normally — React hydrates, CSS-in-JS applies, event handlers attach

### Fallback Behavior

If the browser doesn't support Service Workers, or the SW fails to activate, pAInt automatically falls back to the existing reverse proxy (`/api/proxy/`). The fallback strips scripts (SSR-only preview) but all inspector features still work.

### Testing

```bash
bun dev                    # Start pAInt on localhost:4000
# Start your target app on another port (e.g., localhost:3000)
# Connect via pAInt UI
# Check DevTools > Application > Service Workers for registration status
```

### Key Files

| File | Purpose |
|------|---------|
| `public/sw-proxy/sw.js` | Service Worker — fetch interception, HTML transformation |
| `src/lib/serviceWorkerRegistration.ts` | Registration, lifecycle, readiness tracking |
| `src/components/PreviewFrame.tsx` | SW-aware iframe URL building |
| `src/store/uiSlice.ts` | `swProxyReady` state |
| `src/app/api/proxy/[[...path]]/route.ts` | Fallback proxy (unchanged) |

### Limitations

- WebSocket connections from the target app pass through directly (SW can't intercept WebSockets)
- Cookies scoped to the target origin may not be available (the iframe is on the editor's origin)
- The SW must be active before the iframe loads — first-visit has a brief registration delay

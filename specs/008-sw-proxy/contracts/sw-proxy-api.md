# API Contract: Service Worker Proxy

**Feature**: 008-sw-proxy
**Date**: 2026-03-07

## Service Worker Registration API

### Register

```
navigator.serviceWorker.register('/sw-proxy/sw.js', { scope: '/sw-proxy/' })
```

**Returns**: `ServiceWorkerRegistration` promise

### Readiness Check

```
navigator.serviceWorker.ready  // Resolves when SW is controlling the page
```

## SW Proxy URL Format

### Initial Page Load (Navigation)

```
GET /sw-proxy/{page-path}?__sw_target={encoded-target-url}
```

**Parameters**:
- `{page-path}`: Target page path (e.g., `/`, `/about`, `/dashboard`)
- `__sw_target`: URL-encoded target origin + base URL (e.g., `http%3A%2F%2Flocalhost%3A3000`)

**Example**:
```
GET /sw-proxy/?__sw_target=http%3A%2F%2Flocalhost%3A3000
GET /sw-proxy/about?__sw_target=http%3A%2F%2Flocalhost%3A3000
```

**Response**: Target page HTML with:
- Inspector script injected before `</body>`
- Navigation blocker injected after `<head>`
- Security headers stripped
- CSP meta tags stripped
- Original `<script>` tags preserved

### Subresource Requests

All subresource requests from the iframe (JS, CSS, images, fonts) are automatically intercepted by the SW. No special URL format needed — the SW resolves the target origin from the clientId mapping established during the navigation request.

```
GET /sw-proxy/_next/static/chunks/app/page-abc123.js
→ SW proxies to: http://localhost:3000/_next/static/chunks/app/page-abc123.js
```

### HMR Requests (Short-circuited)

```
GET /sw-proxy/_next/static/webpack/hot-update.json  → 200 empty
GET /sw-proxy/__webpack_hmr                         → 204 empty
GET /sw-proxy/__turbopack_hmr                       → 204 empty
```

## SW Message API

### Editor → Service Worker

```javascript
navigator.serviceWorker.controller.postMessage({
  type: 'SET_TARGET',
  clientId: string,      // iframe's client ID (optional, for explicit mapping)
  targetUrl: string      // e.g., 'http://localhost:3000'
})
```

**Note**: This is a secondary mechanism. The primary target URL communication is via the `__sw_target` query parameter on the navigation request.

## Response Header Stripping

The SW strips these headers from all proxied responses:

| Header | Reason |
|--------|--------|
| `content-encoding` | Response already decoded by fetch |
| `transfer-encoding` | Not applicable for SW responses |
| `cross-origin-embedder-policy` | Blocks iframe embedding |
| `cross-origin-opener-policy` | Blocks iframe embedding |
| `cross-origin-resource-policy` | Blocks cross-origin resource loading |
| `content-security-policy` | Blocks injected inspector script |
| `content-security-policy-report-only` | May block injected scripts |
| `x-frame-options` | Blocks iframe embedding |

## Zustand Store API

### New State

```typescript
interface UISlice {
  // ... existing fields
  swProxyReady: boolean
  setSwProxyReady: (ready: boolean) => void
}
```

### Registration Module

```typescript
// src/lib/serviceWorkerRegistration.ts
export function registerSwProxy(): Promise<boolean>
export function isSwProxyReady(): boolean
export function unregisterSwProxy(): Promise<void>
```

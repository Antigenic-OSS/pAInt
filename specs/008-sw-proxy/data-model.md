# Data Model: Service Worker Proxy

**Feature**: 008-sw-proxy
**Date**: 2026-03-07

## Entities

### Target URL Mapping (SW Runtime)

Stored in-memory within the Service Worker. Not persisted across SW restarts.

| Field | Type | Description |
|-------|------|-------------|
| clientId | string | Browser-assigned identifier for the iframe client |
| targetOrigin | string | Target server origin (e.g., `http://localhost:3000`) |
| targetUrl | string | Full target URL including path |
| registeredAt | number | Timestamp when mapping was created |

**Lifecycle**: Created when the SW intercepts a navigation request with `__sw_target` query param. Removed when the client is destroyed (tab/iframe closed).

**Relationships**: One-to-one with an iframe client. Multiple mappings can exist simultaneously (multi-tab support).

### SW Proxy Readiness (Zustand Store)

Added to the existing `uiSlice` in the Zustand store.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| swProxyReady | boolean | false | Whether the SW is registered and actively controlling the scope |

**State transitions**:
- `false` → `true`: SW registered and activated successfully
- `true` → `false`: SW becomes unavailable or is unregistered

### Inspector Cache (SW Runtime)

| Field | Type | Description |
|-------|------|-------------|
| inspectorCode | string | Cached inspector IIFE script text fetched from `/dev-editor-inspector.js` |
| navBlockerTemplate | string | Navigation blocker script template with placeholder tokens for target URL injection |

**Lifecycle**: Populated during SW `install` event. Persisted in SW memory until SW is terminated.

## State Diagrams

### SW Registration Lifecycle

```
Browser Load → Check SW Support
  ├─ Not supported → swProxyReady = false (use fallback proxy)
  └─ Supported → Register SW
       ├─ Install event → Fetch inspector code, cache it, skipWaiting()
       ├─ Activate event → clients.claim()
       └─ Ready → swProxyReady = true
```

### Request Handling Flow (per fetch event)

```
Fetch event received
  ├─ Not under /sw-proxy/ scope → Pass through (not intercepted)
  └─ Under /sw-proxy/ scope
       ├─ HMR request → Return empty 200/204
       ├─ Navigation (HTML) request
       │    ├─ Extract __sw_target from query → Store in clientId mapping
       │    ├─ Fetch from target origin
       │    ├─ Strip security headers
       │    ├─ Strip CSP meta tags
       │    ├─ Inject navigation blocker at <head>
       │    ├─ Inject inspector before </body>
       │    └─ Return modified response
       └─ Subresource (JS/CSS/img/font) request
            ├─ Look up target origin from clientId mapping
            ├─ Rewrite URL to target origin
            ├─ Fetch from target
            ├─ Strip CORS-blocking headers
            └─ Return response
```

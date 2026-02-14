# Research: Direct Iframe Loading

**Feature Branch**: `004-direct-iframe`
**Date**: 2026-02-15

## R1: Cross-Origin Iframe postMessage

**Decision**: Accept any localhost/127.0.0.1 origin in the editor's message handler; send messages targeting the target URL's specific origin.

**Rationale**: The current system uses same-origin messaging (editor and iframe share `window.location.origin` via the proxy). Switching to direct iframe means different origins (e.g., `http://localhost:4000` editor vs `http://localhost:3001` target). The `postMessage` API natively supports cross-origin communication — no CORS headers needed. Origin validation on receive prevents spoofing; targeted origin on send prevents message leaks.

**Alternatives considered**:
- **Wildcard `*` origin for both send and receive**: Simpler but insecure — any page could inject messages into the editor. Rejected.
- **Shared secret token in each message**: Adds complexity without benefit since localhost origin check is sufficient for local development tool. Rejected.

## R2: Inspector Script Delivery Mechanism

**Decision**: Serve `dev-editor-inspector.js` from Next.js `public/` directory. Users add a `<script>` tag to their project's HTML layout.

**Rationale**: Next.js automatically serves files from `public/` at the root path with correct MIME types and caching. This requires zero server configuration. The `<script>` tag approach is the simplest integration — one line in the target project's `<head>` or `<body>`. The script auto-detects the editor origin from `document.currentScript.src`.

**Alternatives considered**:
- **Browser extension**: More seamless (no code changes to target) but significantly higher development cost and platform lock-in. Could be a future enhancement. Rejected for MVP.
- **Bookmarklet**: Injected at runtime, no project changes needed. But fragile across page navigations, cannot persist across reloads. Rejected.
- **npm package**: Target project installs `@dev-editor/inspector`. Higher friction for setup but better for production builds with tree-shaking. Rejected for MVP — `<script>` tag is simpler.

## R3: Iframe Guard Pattern

**Decision**: Use `if (window.parent === window) return;` at the top of the inspector IIFE.

**Rationale**: When `window.parent === window`, the page is not in an iframe. This is the standard iframe detection pattern used by analytics and widget SDKs. It ensures zero overhead when the target page is loaded directly in a browser (not through the editor).

**Alternatives considered**:
- **Check `window.frameElement`**: Returns `null` for cross-origin iframes (browser security restriction). Would incorrectly exit even when inside the editor iframe. Rejected.
- **Check referrer header**: Unreliable — browsers may strip or omit referrers. Rejected.

## R4: SPA Navigation Detection

**Decision**: Use `popstate` event listener and Navigation API `navigatesuccess` event to detect client-side navigation.

**Rationale**: SPAs navigate without full page reloads. `popstate` fires on history back/forward. The Navigation API's `navigatesuccess` fires on all navigation types (push, replace, traverse) in supporting browsers. Together they cover React Router, Next.js App Router, and other SPA routing libraries.

**Alternatives considered**:
- **MutationObserver on `<title>` or URL polling**: Polling is wasteful; title changes don't reliably indicate navigation. Rejected.
- **Monkey-patch `history.pushState` / `replaceState`**: Works but fragile — frameworks may use internal APIs. The Navigation API is the standards-based replacement. Rejected as primary approach (Navigation API preferred).
- **Intercept all `<a>` clicks**: Doesn't cover programmatic navigation. Rejected.

## R5: Sandbox Attribute Removal

**Decision**: Remove the `sandbox` attribute from the iframe.

**Rationale**: The current iframe has `sandbox="allow-same-origin allow-scripts allow-forms allow-popups"`. With direct cross-origin loading, `sandbox` can interfere with the inspector's DOM access and postMessage communication. Cross-origin iframes are already naturally isolated by the browser's same-origin policy — the inspector within the target page cannot access the editor's DOM and vice versa. The `sandbox` attribute adds no security value in this architecture.

**Alternatives considered**:
- **Keep sandbox with expanded permissions**: Would need to enumerate every permission the inspector needs. Adds maintenance burden with no security benefit (cross-origin isolation already provides sandboxing). Rejected.

## R6: Proxy Retention Strategy

**Decision**: Keep the proxy route (`/api/proxy/[[...path]]`) in the codebase as-is, unused.

**Rationale**: Some users may not be able to modify their target project (e.g., inspecting third-party apps, read-only codebases). The proxy provides a fallback for those cases. No code changes needed to preserve it. A future toggle could let users switch between direct and proxy modes.

**Alternatives considered**:
- **Delete the proxy entirely**: Simpler codebase but removes a fallback option. Rejected.
- **Add a UI toggle for proxy/direct mode now**: Increases scope of this feature. Can be added later. Rejected for now.

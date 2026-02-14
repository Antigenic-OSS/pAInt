# Plan: Direct Iframe (No Proxy) Architecture

## Status: TODO

## Context

The Dev Editor currently loads target pages through a reverse proxy (`/api/proxy/...`), which fetches HTML from the target server, strips scripts, rewrites all asset URLs, injects navigation blockers, and inlines the inspector IIFE. This causes complexity: HMR conflicts, reload loops, script stripping means no React fiber data for component detection, and ~600 lines of URL rewriting logic.

**Goal**: Load the target page directly in the iframe (`http://localhost:3001`) with no proxy. The inspector becomes a standalone script the user adds to their project via a `<script>` tag. This eliminates the proxy layer entirely while keeping all existing features working via cross-origin `postMessage`.

## Step 1: Create standalone inspector script

**Create**: `public/dev-editor-inspector.js`

Extract the inspector IIFE from `src/app/api/proxy/[[...path]]/route.ts` (lines 12–652, the `getInspectorCode()` function) into a standalone JS file.

Key modifications from the inlined version:
- **Origin detection**: Replace `var parentOrigin = window.location.origin` with auto-detection from `document.currentScript.src` (e.g., `new URL(document.currentScript.src).origin` → `http://localhost:4000`)
- **Iframe guard**: Add `if (window.parent === window) return;` at the top — script does nothing if not in an iframe
- **Remove proxy path stripping**: In the `REQUEST_PAGE_LINKS` handler, remove the block that strips `/api/proxy` prefix from link paths (lines ~543-546)
- **Add navigation observers**: Add `popstate` and `navigatesuccess` listeners to detect SPA navigation and send `PAGE_NAVIGATE` to the editor

The `public/` directory doesn't exist yet — create it. Next.js auto-serves files from `public/` at the root path.

## Step 2: Update `usePostMessage.ts` for cross-origin

**Modify**: `src/hooks/usePostMessage.ts`

Two changes:

**A. Origin check (line 26)**: Currently rejects messages from different origins. Change to accept any localhost origin:
```
// Before:  if (event.origin !== window.location.origin) return;
// After:   accept any localhost/127.0.0.1 origin
```

Add a helper:
```ts
function isLocalhostOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch { return false; }
}
```

**B. `sendViaIframe` (line 22)**: Currently posts with `'*'`. For better security, derive target origin from the store's `targetUrl`:
```ts
const targetUrl = useEditorStore.getState().targetUrl;
const origin = targetUrl ? new URL(targetUrl).origin : '*';
iframe.contentWindow.postMessage(message, origin);
```

## Step 3: Update `PreviewFrame.tsx` for direct loading

**Modify**: `src/components/PreviewFrame.tsx`

- **iframe src (line 28)**: Change from proxy URL to direct target URL:
  ```
  // Before: `/api/proxy${pagePath}?${PROXY_HEADER}=${encodeURIComponent(targetUrl)}`
  // After:  `${targetUrl}${pagePath === '/' ? '' : pagePath}`
  ```
- **Remove `sandbox` attribute (line 95)**: Cross-origin iframe is already naturally isolated. The inspector needs full DOM access within the target page, and sandbox can interfere.
- **Remove `PROXY_HEADER` import** — no longer needed in this file.

## Step 4: Create setup instructions component

**Create**: `src/components/SetupInstructions.tsx`

A small UI that appears when the editor can't connect (inspector not installed in target project):
- **Trigger**: If `connectionStatus` stays `'connecting'` for 5+ seconds, show instructions
- **Content**: Copyable `<script src="http://localhost:4000/dev-editor-inspector.js"></script>` snippet with a "Copy" button
- **Auto-dismiss**: Hides when `INSPECTOR_READY` is received (`connectionStatus` → `'connected'`)
- **Style**: Dark theme, positioned below the URL bar, compact

## Step 5: Integrate setup instructions in TopBar

**Modify**: `src/components/TopBar.tsx`

Import and render `<SetupInstructions />` below the `TargetSelector`. Only shows when needed (connection timeout logic is internal to the component).

## Step 6: Keep proxy as optional fallback

**No deletions** to `src/app/api/proxy/[[...path]]/route.ts` or `src/middleware.ts`.

The proxy stays for users who can't modify their target project. The middleware is already a no-op when no proxy cookie is set (direct mode), so no changes needed there.

For now, direct iframe is the only mode (no UI toggle). The proxy route simply sits unused. A connection mode toggle can be added later if needed.

## Files Summary

| File | Action |
|------|--------|
| `public/dev-editor-inspector.js` | Create — standalone inspector (~640 lines) |
| `src/components/SetupInstructions.tsx` | Create — setup UX component |
| `src/hooks/usePostMessage.ts` | Modify — cross-origin origin check + targeted postMessage |
| `src/components/PreviewFrame.tsx` | Modify — direct iframe src, remove sandbox |
| `src/components/TopBar.tsx` | Modify — render SetupInstructions |

Files unchanged: All store slices, all right-panel components, all other hooks, all consumer files of `sendToInspector`.

## Verification

1. Start the editor: `bun dev` (runs on port 4000)
2. Start a target Next.js app on another port (e.g., 3001)
3. Add `<script src="http://localhost:4000/dev-editor-inspector.js"></script>` to the target app's layout
4. In the editor, enter `http://localhost:3001` and click Connect
5. Verify: connection status goes green, DOM tree appears in left panel, element selection works, style editing works, component detection works, page navigation works
6. Verify: removing the script tag from target → setup instructions appear after 5s

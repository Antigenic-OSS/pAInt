# postMessage API Contract: Direct Iframe

**Feature Branch**: `004-direct-iframe`
**Date**: 2026-02-15

## Overview

All existing message types remain unchanged. This document describes the **transport-level changes** to how messages are sent and received when using direct iframe loading instead of the proxy.

## Origin Validation

### Editor (receiving messages from inspector)

**Before (proxy mode)**: Same-origin check
```
if (event.origin !== window.location.origin) return;
```

**After (direct mode)**: Localhost origin check
```
Accept if event.origin hostname is 'localhost' or '127.0.0.1'
Reject all other origins
```

### Editor (sending messages to inspector)

**Before (proxy mode)**: Wildcard target
```
iframe.contentWindow.postMessage(message, '*')
```

**After (direct mode)**: Targeted origin from store
```
iframe.contentWindow.postMessage(message, targetOrigin)
// where targetOrigin = new URL(store.targetUrl).origin
```

### Inspector (receiving messages from editor)

**Before (proxy mode)**: Same-origin check
```
if (e.origin !== parentOrigin) return;
// where parentOrigin = window.location.origin (same as editor due to proxy)
```

**After (direct mode)**: Editor origin from script src
```
if (e.origin !== parentOrigin) return;
// where parentOrigin = new URL(document.currentScript.src).origin
```

### Inspector (sending messages to editor)

**Before (proxy mode)**: Same-origin target
```
window.parent.postMessage(message, parentOrigin)
// where parentOrigin = window.location.origin
```

**After (direct mode)**: Editor origin from script src
```
window.parent.postMessage(message, parentOrigin)
// where parentOrigin = new URL(document.currentScript.src).origin
```

## Message Types (unchanged)

All existing message types from `src/types/messages.ts` remain exactly the same. No new message types are introduced by this feature. The `PAGE_NAVIGATE` message already exists and will now be sent from the inspector's `popstate`/`navigatesuccess` listeners instead of from the proxy's navigation interceptor.

### Inspector → Editor

| Type | Trigger |
|------|---------|
| `INSPECTOR_READY` | Inspector script initialized |
| `ELEMENT_SELECTED` | User clicks element |
| `ELEMENT_HOVERED` | User hovers element |
| `DOM_TREE` | Response to `REQUEST_DOM_TREE` |
| `DOM_UPDATED` | MutationObserver detected change |
| `PAGE_LINKS` | Response to `REQUEST_PAGE_LINKS` |
| `HEARTBEAT_RESPONSE` | Response to `HEARTBEAT` |
| `CSS_VARIABLES` | Response to `REQUEST_CSS_VARIABLES` |
| `COMPONENTS_DETECTED` | Response to `REQUEST_COMPONENTS` |
| `VARIANT_APPLIED` | Response to `APPLY_VARIANT` |
| `PAGE_NAVIGATE` | SPA navigation detected (popstate/navigatesuccess) |

### Editor → Inspector

| Type | Trigger |
|------|---------|
| `SELECT_ELEMENT` | User clicks tree node / component |
| `PREVIEW_CHANGE` | User modifies CSS property |
| `REVERT_CHANGE` | User reverts a property |
| `REVERT_ALL` | User reverts all changes |
| `SET_BREAKPOINT` | User changes breakpoint |
| `REQUEST_DOM_TREE` | After `INSPECTOR_READY` |
| `REQUEST_PAGE_LINKS` | After `INSPECTOR_READY` |
| `HEARTBEAT` | Periodic health check |
| `REQUEST_CSS_VARIABLES` | After `INSPECTOR_READY` |
| `SET_SELECTION_MODE` | User toggles select/preview mode |
| `REQUEST_COMPONENTS` | After `INSPECTOR_READY` + on DOM updates |
| `APPLY_VARIANT` | User selects component variant |
| `REVERT_VARIANT` | User reverts variant |

## PAGE_LINKS Change

The `REQUEST_PAGE_LINKS` handler in the inspector no longer needs to strip `/api/proxy` prefixes from link paths, since links in the target page now have their actual paths (not proxy-rewritten ones).

**Before**: Strip proxy prefix
```
if (linkPath.indexOf('/api/proxy') === 0) {
  linkPath = linkPath.substring(10) || '/';
}
```

**After**: No stripping needed (removed).

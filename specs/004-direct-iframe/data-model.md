# Data Model: Direct Iframe Loading

**Feature Branch**: `004-direct-iframe`
**Date**: 2026-02-15

## Entities

### Inspector Script State (runtime, in-iframe)

The inspector script maintains internal state within the target page's JavaScript context. This is not persisted — it exists only while the page is loaded in the iframe.

| Field | Type | Description |
|-------|------|-------------|
| `parentOrigin` | `string` | Editor's origin, auto-detected from `document.currentScript.src` |
| `selectedElement` | `Element \| null` | Currently selected DOM element |
| `selectionModeEnabled` | `boolean` | Whether click-to-select is active (default: `true`) |
| `selectionOverlay` | `HTMLDivElement` | Fixed-position highlight overlay |
| `previousTreeJSON` | `string` | Cached serialized DOM tree for change detection |
| `mutationPending` | `boolean` | Throttle flag for MutationObserver |

### Connection Status (existing, no changes)

Already in `uiSlice` — `connectionStatus: 'disconnected' | 'connecting' | 'connected'`. No schema changes needed. The state transitions remain the same:

```
disconnected → (user clicks Connect) → connecting → (INSPECTOR_READY received) → connected
connected → (heartbeat timeout / iframe unload) → disconnected
connected → (PAGE_NAVIGATE received) → connecting → (INSPECTOR_READY) → connected
```

### Setup Instructions State (new, component-local)

This state is local to the `SetupInstructions` component — not in the Zustand store (it's UI-only, not shared across panels).

| Field | Type | Description |
|-------|------|-------------|
| `showInstructions` | `boolean` | Whether to display the setup instructions panel |
| `copied` | `boolean` | Whether the copy button was recently clicked (for feedback) |

The `showInstructions` flag is driven by a 5-second timer that starts when `connectionStatus === 'connecting'` and resets when status changes. It reads `connectionStatus` from the Zustand store via selector.

## No New Store Slices

This feature does not add new Zustand slices. All existing slices (`elementSlice`, `changeSlice`, `uiSlice`, `treeSlice`, `claudeSlice`, `componentSlice`) remain unchanged. The `connectionStatus` field in `uiSlice` continues to drive the same transitions.

## No New Persistence

No new `localStorage` keys. The existing `dev-editor:changes:*` and `dev-editor:recent-urls` keys work identically — they are keyed by target URL which is unchanged (still `http://localhost:3001`).

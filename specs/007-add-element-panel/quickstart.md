# Quickstart: Add Element Panel

**Feature**: 007-add-element-panel | **Date**: 2026-02-26

## What Changed

A new "Add Element" tab in the left panel provides a palette of HTML element types that users can drag-and-drop or click-to-insert into the preview iframe.

## Files Added

| File | Purpose |
|------|---------|
| `src/components/left-panel/AddElementPanel.tsx` | Element palette UI with 9 element types in 2 categories |

## Files Modified

| File | Change |
|------|--------|
| `src/types/messages.ts` | Added `InsertElementMessage`, `RemoveInsertedElementMessage`, `ElementInsertedMessage` |
| `src/lib/constants.ts` | Added `INSERT_ELEMENT`, `REMOVE_INSERTED_ELEMENT`, `ELEMENT_INSERTED` message constants |
| `src/store/uiSlice.ts` | Extended `activeLeftTab` type with `'add-element'` |
| `src/components/left-panel/icons.tsx` | Added `AddElementIcon` SVG component |
| `src/components/left-panel/IconSidebar.tsx` | Added 5th tab between Components and Terminal |
| `src/components/left-panel/LeftPanel.tsx` | Added routing for `add-element` tab content |
| `src/hooks/usePostMessage.ts` | Handles `ELEMENT_INSERTED` messages, creates change entries |
| `src/hooks/useChangeTracker.ts` | Undo/redo/revert support for `__element_inserted__` |
| `src/components/right-panel/changes/ChangesPanel.tsx` | Displays "element inserted" in change log |
| `src/app/api/proxy/[[...path]]/route.ts` | Inspector: `INSERT_ELEMENT`, `REMOVE_INSERTED_ELEMENT` handlers + DnD listeners |
| `public/dev-editor-inspector.js` | Standalone inspector: same handlers and DnD listeners |

## How to Test

### Prerequisites
1. Start the pAInt: `bun dev`
2. Start a target project dev server (e.g., `http://localhost:3000`)
3. Connect the editor to the target

### Test: Click-to-Insert
1. Select any element in the preview or Layers tree
2. Click the **Add Element** tab (+ icon) in the left panel icon sidebar
3. Click any element type (e.g., "p - Text paragraph")
4. Verify: A new `<p>` element appears inside the selected element in the preview
5. Verify: The Layers tree updates to show the new element
6. Verify: The Changes tab shows "element inserted"

### Test: Drag and Drop
1. Open the Add Element tab
2. Drag an element type (e.g., "div - Generic container") from the palette
3. Drag over the preview iframe — a blue dashed outline should appear over the hovered element
4. Drop onto a container element
5. Verify: The new element is inserted as a child of the drop target
6. Verify: The Layers tree and Changes tab update

### Test: Void Element Handling
1. Drag an element and drop it on an `<img>` or `<input>`
2. Verify: The element is inserted as a sibling **after** the void element (not as a child)

### Test: Undo
1. Insert an element (via drag or click)
2. In the Changes tab, click "Undo" on the insertion entry (or press Ctrl+Z)
3. Verify: The element is removed from the preview and layers tree

### Test: Disconnected State
1. Disconnect from the target
2. Click the Add Element tab
3. Verify: Shows "Connect to inspect" message (same as other inspector tabs)

## Architecture Notes

- **Sentinel property**: Insertions tracked as `StyleChange` with `property: '__element_inserted__'`, following the established pattern of `__element_deleted__` and `__text_content__`
- **Drag data format**: Custom MIME type `application/x-dev-editor-element` prevents interference with native browser drag-and-drop
- **Data attribute**: Inserted elements are marked with `data-dev-editor-inserted="true"` for identification
- **MutationObserver**: The existing observer automatically detects DOM changes from insertions/removals and sends `DOM_UPDATED`, which updates the Layers tree

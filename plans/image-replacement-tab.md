# Plan: Image Replacement Tab in Left Panel

## Context

When a user selects an `<img>` element, there's no way to replace its source image. This plan adds an "Images" tab to the left panel that shows all images from the target project's `public/` directory as a thumbnail grid, letting the user click one to swap it in. The change is tracked in the changelog so Claude CLI can apply it to source code.

## Files to Create (2)

### 1. `src/app/api/images/route.ts` — API to scan public dir
- GET endpoint, takes `projectRoot` query param
- Validates path (absolute, exists, under `$HOME`) — same checks as Claude API routes
- Recursively scans `<projectRoot>/public/` for image files (`.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`, `.avif`, `.ico`)
- Returns `{ images: [{ relativePath, fileName, extension }], total, truncated }` (cap at 500)

### 2. `src/components/left-panel/ImagesPanel.tsx` — Images tab UI
- Fetches images from `/api/images?projectRoot=...` on mount
- Search filter at top (by filename)
- Thumbnail grid (3 columns), served via proxy URLs
- Blue border on image matching current element's `src`
- Click thumbnail → sends `SET_ATTRIBUTE` to inspector, records change with `__image_src__` property
- Empty states: no projectRoot → "Set project root in Claude tab", no images → "No images found", no `<img>` selected → grid visible but click disabled
- Default export for React.lazy()

## Files to Modify (7)

### 3. `src/types/messages.ts` — Add message types
- Add `SetAttributeMessage` (`SET_ATTRIBUTE` with selectorPath, attribute, value)
- Add `RevertAttributeMessage` (`REVERT_ATTRIBUTE` with selectorPath, attribute, originalValue)
- Add both to `EditorToInspectorMessage` union

### 4. `src/app/api/proxy/[[...path]]/route.ts` — Inspector handlers
- Add `SET_ATTRIBUTE` case in inspector's message switch (~line 634): `el.setAttribute(attribute, value)`, then `selectElement(el)` to re-sync editor
- Add `REVERT_ATTRIBUTE` case: same but restores original value
- For `src` on `<img>`, also set `el.src = value` to force reload

### 5. `src/store/uiSlice.ts` — Expand tab type
- Change `activeLeftTab` type from `'layers' | 'pages' | 'components'` to `'layers' | 'pages' | 'components' | 'images'`
- Same for `setActiveLeftTab` signature

### 6. `src/components/left-panel/LeftPanel.tsx` — Add Images tab
- Update local `LeftTab` type to include `'images'`
- Add `{ id: 'images', label: 'Images' }` to tabs array
- Lazy-load `ImagesPanel` with `React.lazy()`
- Add rendering branch in tab content

### 7. `src/hooks/usePostMessage.ts` — Auto-switch on image selection
- In `ELEMENT_SELECTED` handler: if `tagName === 'img'`, set `activeLeftTab` to `'images'`

### 8. `src/hooks/useChangeTracker.ts` — Handle `__image_src__` undo/redo/revert
- `revertChange()`: if property is `__image_src__`, send `REVERT_ATTRIBUTE` message
- `performUndo()`: send `REVERT_ATTRIBUTE` or `SET_ATTRIBUTE` for `__image_src__`
- `performRedo()`: send `SET_ATTRIBUTE` for `__image_src__`
- `revertAll()`: revert image changes before clearing (like text changes)

### 9. `src/components/right-panel/changes/ChangesPanel.tsx` — Display image changes
- In per-change display: add `__image_src__` case showing `image src: "old" → "new"`
- In `buildElementSection`: add `__image_src__` case with readable label

## Implementation Order

1. Message types (`messages.ts`)
2. Store type update (`uiSlice.ts`)
3. API endpoint (`api/images/route.ts`)
4. Inspector handlers (`proxy route.ts`)
5. Change tracker (`useChangeTracker.ts`)
6. ImagesPanel component
7. LeftPanel integration
8. Auto-switch on selection (`usePostMessage.ts`)
9. ChangesPanel display updates

## Verification

1. `bun run build` — no type errors
2. Connect to a localhost project with images in `public/`
3. Select an `<img>` element → Images tab auto-activates, thumbnails load
4. Click a thumbnail → image swaps in preview, change appears in Changes tab
5. Undo (Cmd+Z) → image reverts
6. Copy changelog → includes image src change with correct paths
7. Clear changes → image reverts to original

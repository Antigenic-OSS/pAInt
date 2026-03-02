# Research: Add Element Panel

**Feature**: 007-add-element-panel | **Date**: 2026-02-26

## Research Topics

### 1. Cross-iframe HTML5 Drag and Drop

**Decision**: Use native HTML5 Drag and Drop API with `dataTransfer.setData()` on drag start in the editor palette, and `dragover`/`drop` event listeners inside the iframe's inspector script.

**Rationale**: HTML5 DnD events naturally propagate into same-origin iframes. Since the target page is loaded through the proxy (same origin), the browser forwards drag events from the parent frame into the iframe. No postMessage coordination is needed for the drag/hover phase — only for reporting the final insertion.

**Alternatives considered**:
- **postMessage-based drag coordination**: Editor tracks mouse position, sends coordinates to inspector on each mousemove. Rejected: adds latency, complex coordinate translation between frames, and creates tightly-coupled state synchronization.
- **Mouse event proxy overlay**: Place a transparent overlay over the iframe during drag, capture mouse events, relay to inspector. Rejected: the overlay would intercept drop events, preventing native DnD from reaching the iframe.

### 2. Element Insertion into Target DOM

**Decision**: Inspector creates elements via `document.createElement()` and appends them as children of the drop target (or as siblings after void elements). Each inserted element is marked with `data-dev-editor-inserted="true"` for identification.

**Rationale**: Direct DOM manipulation in the inspector is the simplest approach and consistent with how the inspector already handles text editing and element deletion. The data attribute allows distinguishing editor-inserted elements from original content.

**Alternatives considered**:
- **innerHTML manipulation**: Rejected — destroys existing event listeners and DOM state.
- **Serialized HTML via postMessage**: Editor sends HTML string, inspector inserts via `insertAdjacentHTML`. Rejected — unnecessary complexity when `createElement` works directly.

### 3. Void Element Handling (Non-container Targets)

**Decision**: When the drop target is a void element (`img`, `input`, `br`, `hr`, etc.), insert the new element as a sibling after the target rather than as a child.

**Rationale**: Void elements cannot have children. The HTML spec defines them as elements whose content model is "nothing". Attempting `appendChild` on a void element would technically work in most browsers but produces invalid HTML. Inserting as a next sibling is the most intuitive behavior — the user dropped "near" the void element, so placing the new element right after it preserves spatial intent.

**Alternatives considered**:
- **Reject the drop entirely**: Show an error message. Rejected — frustrating UX; the user clearly wants to add an element near the target.
- **Insert as child of the void element's parent at the void element's position**: Similar to sibling-after but requires more index tracking. Rejected — sibling-after achieves the same result more simply.

### 4. Change Tracking Pattern for Insertions

**Decision**: Use the existing sentinel property pattern (`__element_inserted__`) consistent with `__element_deleted__` and `__text_content__`. The `originalValue` field stores `parent:{selectorPath}|index:{n}` metadata for changelog export. The `newValue` is `'inserted'`.

**Rationale**: Reusing the existing change tracking infrastructure means no new store slices, no new persistence format, and automatic compatibility with the Changes tab, undo/redo stack, and changelog export.

**Alternatives considered**:
- **Separate `elementInsertions` array in the store**: A dedicated data structure with richer typing. Rejected — would require parallel persistence logic, parallel undo/redo stack, and parallel changelog export. The sentinel property pattern is well-established and sufficient.
- **Track as a style change on the parent element**: e.g., `parent.property = 'children'`. Rejected — doesn't map to the selector-based change model (the change is about the new element, not the parent).

### 5. Click-to-Insert vs. Drag-and-Drop Priority

**Decision**: Both interactions are implemented in the same component. Click-to-insert sends an `INSERT_ELEMENT` postMessage to the inspector with the currently selected element as parent. Drag-and-drop uses HTML5 DnD with the inspector handling drop events.

**Rationale**: Click-to-insert is trivial to implement alongside drag (it's one `sendViaIframe` call per click) and provides immediate value for users who already have an element selected. The cost of implementing both is negligible vs. either alone.

**Alternatives considered**:
- **Drag-only, add click later**: Rejected — click-to-insert is simpler to implement than drag and provides value even if drag has issues.
- **Click-only, no drag**: Rejected — drag-and-drop is the primary specified interaction and provides spatial targeting that click cannot.

### 6. Drop Indicator Visual Design

**Decision**: Fixed-position div overlay in the inspector with `border: 2px dashed #4a9eff` and `background: rgba(74,158,255,0.08)`. Positioned using `getBoundingClientRect()` of the hovered drop target. Hidden with `display: none` when not dragging.

**Rationale**: Matches the existing accent color (`#4a9eff`). Dashed border is the universal visual convention for "drop here". Semi-transparent background provides area indication without obscuring content. Uses the same overlay technique as the existing hover and selection highlighters.

**Alternatives considered**:
- **Insertion line indicator**: A thin horizontal line showing exact insertion point between siblings. Rejected for v1 — requires more complex position calculation (top/bottom halves of elements). The container highlight is sufficient for initial implementation.
- **Ghost element preview**: Show a translucent preview of the element being inserted. Rejected — adds visual complexity and doesn't meaningfully improve the interaction for empty/placeholder elements.

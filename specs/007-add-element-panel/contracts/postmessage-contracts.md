# PostMessage Contracts: Add Element Panel

**Feature**: 007-add-element-panel | **Date**: 2026-02-26

This feature uses postMessage as the communication protocol (no REST/GraphQL APIs). Below are the message contracts.

## Editor → Inspector Messages

### INSERT_ELEMENT

Sent when the user clicks an element type in the palette (click-to-insert mode).

```typescript
interface InsertElementMessage {
  type: 'INSERT_ELEMENT';
  payload: {
    tagName: string;              // e.g., 'div', 'h1', 'p'
    parentSelectorPath: string;   // CSS selector path of the target parent
    placeholderText?: string;     // Optional text content for text elements
  };
}
```

**Trigger**: User clicks an element type in the AddElementPanel while an element is selected.

**Inspector behavior**:
1. Resolve `parentSelectorPath` to a DOM element
2. If target is a void element, redirect to target's parent (sibling-after mode)
3. Create element with `document.createElement(tagName)`
4. Set `data-dev-editor-inserted="true"` attribute
5. Set `textContent` if `placeholderText` provided
6. Append to parent (or insert after void element's sibling)
7. Respond with `ELEMENT_INSERTED`

### REMOVE_INSERTED_ELEMENT

Sent when the user undoes an element insertion.

```typescript
interface RemoveInsertedElementMessage {
  type: 'REMOVE_INSERTED_ELEMENT';
  payload: {
    selectorPath: string;  // CSS selector path of the element to remove
  };
}
```

**Trigger**: User clicks Undo on an `__element_inserted__` change, or performs Ctrl+Z / Revert All.

**Inspector behavior**:
1. Resolve `selectorPath` to a DOM element
2. Remove it from its parent via `parentElement.removeChild()`
3. MutationObserver fires → `DOM_UPDATED` sent automatically

## Inspector → Editor Messages

### ELEMENT_INSERTED

Sent after the inspector successfully inserts a new element into the DOM.

```typescript
interface ElementInsertedMessage {
  type: 'ELEMENT_INSERTED';
  payload: {
    selectorPath: string;         // CSS selector path of the new element
    parentSelectorPath: string;   // CSS selector path of the actual parent
    tagName: string;              // Tag name of the inserted element
    insertionIndex: number;       // Position among parent's children
    placeholderText: string;      // Text content (empty string if none)
  };
}
```

**Trigger**: Either `INSERT_ELEMENT` message or native HTML5 drop event.

**Editor behavior**:
1. Push undo action (`wasNewChange: true`)
2. Save element snapshot
3. Add `StyleChange` with `property: '__element_inserted__'`
4. DOM tree updates automatically via `DOM_UPDATED` from MutationObserver

## Drag and Drop Contract (HTML5 native)

### DataTransfer Format

```
MIME type: 'application/x-dev-editor-element'
Data: JSON string
```

```typescript
interface DragData {
  tag: string;              // HTML tag name
  placeholderText: string;  // Placeholder text content
}
```

### Inspector Event Handlers

| Event | Handler |
|-------|---------|
| `dragover` | Check for `application/x-dev-editor-element` in dataTransfer types. `preventDefault()` to allow drop. Show drop indicator overlay on hovered element. |
| `dragleave` | Hide drop indicator when drag leaves the document. |
| `drop` | Parse drag data. Create and insert element. Send `ELEMENT_INSERTED`. Hide indicator. |

### Drop Indicator

```
Element: Fixed-position div
Style: border: 2px dashed #4a9eff; background: rgba(74,158,255,0.08)
Position: Matches getBoundingClientRect() of the hovered drop target
Z-index: 2147483645 (below inspector overlays at 2147483646)
Visibility: display: none when not dragging
```

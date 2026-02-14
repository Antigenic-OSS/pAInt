# postMessage API Contract

**Branch**: `001-visual-dev-editor` | **Date**: 2026-02-14

All messages between the editor (parent window) and the inspector (iframe) use `window.postMessage`. Each message is a JSON object with a `type` field as the discriminator.

## Message Direction: Inspector → Editor

### INSPECTOR_READY

Sent when the inspector script has loaded and initialized inside the iframe.

```typescript
{
  type: 'INSPECTOR_READY'
}
```

**Trigger**: Inspector script `DOMContentLoaded` or injection complete.
**Editor response**: Set `connectionStatus` to `'connected'`, request DOM tree.

---

### ELEMENT_SELECTED

Sent when the user clicks an element in the iframe preview.

```typescript
{
  type: 'ELEMENT_SELECTED',
  payload: {
    selectorPath: string,      // e.g., "section.hero > h1"
    tagName: string,           // e.g., "h1"
    className: string | null,
    id: string | null,
    computedStyles: Record<string, string>,
    boundingRect: {
      x: number, y: number,
      width: number, height: number,
      top: number, right: number, bottom: number, left: number
    }
  }
}
```

---

### ELEMENT_HOVERED

Sent when the user hovers over an element (for tree highlight sync).

```typescript
{
  type: 'ELEMENT_HOVERED',
  payload: {
    selectorPath: string | null  // null when hover exits all elements
  }
}
```

---

### DOM_UPDATED

Sent when MutationObserver detects DOM changes.

```typescript
{
  type: 'DOM_UPDATED',
  payload: {
    tree: TreeNode,                  // Full re-serialized DOM tree
    removedSelectors: string[]       // Selectors of removed elements
  }
}
```

---

### DOM_TREE

Sent in response to a `REQUEST_DOM_TREE` message from the editor.

```typescript
{
  type: 'DOM_TREE',
  payload: {
    tree: TreeNode    // Full serialized DOM tree from root
  }
}
```

---

### POSITION_CHANGED

Sent when a free-position drag completes.

```typescript
{
  type: 'POSITION_CHANGED',
  payload: {
    elementSelector: string,
    originalPosition: { position: string, top: string, left: string },
    newPosition: { position: string, top: string, left: string }
  }
}
```

---

### ELEMENT_REORDERED

Sent when a sibling reorder drag completes.

```typescript
{
  type: 'ELEMENT_REORDERED',
  payload: {
    parentSelector: string,
    childSelector: string,
    originalIndex: number,
    newIndex: number
  }
}
```

---

### PAGE_LINKS

Sent in response to `REQUEST_PAGE_LINKS` from the editor.

```typescript
{
  type: 'PAGE_LINKS',
  payload: {
    links: Array<{ href: string, text: string }>
  }
}
```

---

### HEARTBEAT_RESPONSE

Sent in response to a `HEARTBEAT` message from the editor.

```typescript
{
  type: 'HEARTBEAT_RESPONSE'
}
```

---

## Message Direction: Editor → Inspector

### SELECT_ELEMENT

Request the inspector to select a specific element (e.g., when user clicks a tree node).

```typescript
{
  type: 'SELECT_ELEMENT',
  payload: {
    selectorPath: string
  }
}
```

---

### PREVIEW_CHANGE

Apply a style change to an element in the preview.

```typescript
{
  type: 'PREVIEW_CHANGE',
  payload: {
    selectorPath: string,
    property: string,        // e.g., "font-size"
    value: string            // e.g., "32px"
  }
}
```

**Inspector behavior**: Calls `element.style.setProperty(property, value, 'important')`.

---

### REVERT_CHANGE

Remove an inline style override from an element.

```typescript
{
  type: 'REVERT_CHANGE',
  payload: {
    selectorPath: string,
    property: string
  }
}
```

**Inspector behavior**: Calls `element.style.removeProperty(property)`.

---

### REVERT_ALL

Remove all inline style overrides from all elements.

```typescript
{
  type: 'REVERT_ALL'
}
```

---

### SET_BREAKPOINT

Constrain the page to a specific viewport width.

```typescript
{
  type: 'SET_BREAKPOINT',
  payload: {
    width: number    // 375, 768, or 1280
  }
}
```

---

### DRAG_MODE_CHANGED

Notify the inspector of a drag mode change.

```typescript
{
  type: 'DRAG_MODE_CHANGED',
  payload: {
    mode: 'off' | 'free' | 'reorder'
  }
}
```

---

### REQUEST_DOM_TREE

Request a full DOM tree serialization.

```typescript
{
  type: 'REQUEST_DOM_TREE'
}
```

---

### REQUEST_PAGE_LINKS

Request all navigation links on the current page.

```typescript
{
  type: 'REQUEST_PAGE_LINKS'
}
```

---

### HEARTBEAT

Ping the inspector to verify it's alive.

```typescript
{
  type: 'HEARTBEAT'
}
```

---

## Message Validation

All messages MUST:
- Be valid JSON objects
- Include a `type` field matching one of the types above
- Include a `payload` field when the type requires it
- Use `origin` checking: editor only accepts messages from its own origin

## TreeNode Schema (shared)

```typescript
interface TreeNode {
  id: string;              // CSS selector path
  tagName: string;
  className: string | null;
  elementId: string | null;
  children: TreeNode[];
}
```

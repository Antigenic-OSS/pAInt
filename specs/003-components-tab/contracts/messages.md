# Message Contracts: Components Tab

**Feature Branch**: `003-components-tab`
**Date**: 2026-02-14
**Protocol**: window.postMessage (JSON payloads)

## New Message Types

### Editor → Inspector

#### REQUEST_COMPONENTS

Request the inspector to scan the DOM for recognizable UI components.

```typescript
{
  type: 'REQUEST_COMPONENTS';
  payload: {
    rootSelectorPath?: string;  // Optional: scope scan to subtree. If omitted, scans full page.
  };
}
```

**Trigger**: Sent on INSPECTOR_READY (500ms delay), on tab activation, and on DOM_UPDATED (debounced 1s).

---

#### APPLY_VARIANT

Apply a variant change to a detected component in the iframe.

```typescript
{
  type: 'APPLY_VARIANT';
  payload: {
    selectorPath: string;           // Target component's selector path
    type: 'class' | 'pseudo';       // Variant mechanism
    addClassName?: string;           // Class to add (for class type)
    removeClassNames?: string[];     // Classes to remove first (for class type)
    pseudoStyles?: Record<string, string>;  // Inline styles to apply (for pseudo type)
    revertPseudo?: boolean;          // If true, remove previously applied pseudo styles
  };
}
```

**Trigger**: User changes a variant dropdown in the ComponentsPanel.

**Behavior**:
- For `class` type: removes `removeClassNames` from element, then adds `addClassName`
- For `pseudo` type: applies `pseudoStyles` as inline styles with `!important`
- After applying, inspector reads new computedStyles and sends VARIANT_APPLIED

---

#### REVERT_VARIANT

Revert a previously applied variant change.

```typescript
{
  type: 'REVERT_VARIANT';
  payload: {
    selectorPath: string;
    removeClassName?: string;           // Class to remove (if class variant was applied)
    restoreClassName?: string;          // Original class to restore
    revertPseudo?: boolean;             // Remove pseudo inline styles
    pseudoProperties?: string[];        // Which inline style properties to remove
  };
}
```

**Trigger**: User deselects component, selects different component, or switches variant in same group.

---

### Inspector → Editor

#### COMPONENTS_DETECTED

Response to REQUEST_COMPONENTS with the list of detected components.

```typescript
{
  type: 'COMPONENTS_DETECTED';
  payload: {
    components: DetectedComponent[];  // Array of detected components (see data-model.md)
  };
}
```

**Guarantees**:
- `components` array may be empty (no components found)
- Each component has a unique `selectorPath`
- Components are ordered by DOM position (document order)
- Detection completes within 500ms for pages with up to 500 elements

---

#### VARIANT_APPLIED

Confirmation that a variant was applied, with updated style information.

```typescript
{
  type: 'VARIANT_APPLIED';
  payload: {
    selectorPath: string;
    computedStyles: Record<string, string>;      // Full recomputed styles
    cssVariableUsages: Record<string, string>;    // Updated CSS variable usages
    boundingRect: { top: number; left: number; width: number; height: number };
  };
}
```

**Guarantees**:
- Sent only after the variant change has been applied to the DOM
- `computedStyles` reflects the element's state after the change
- The right panel auto-updates because it subscribes to `computedStyles` in the store

---

## Message Flow Diagrams

### Component Detection Flow

```
Editor                          Inspector
  |                                |
  |--- INSPECTOR_READY ---------->|  (existing, triggers flow)
  |                                |
  |--- REQUEST_COMPONENTS ------->|  (500ms after ready)
  |                                |
  |<-- COMPONENTS_DETECTED -------|  (scan results)
  |                                |
  |    [User selects element]      |
  |--- SELECT_ELEMENT ----------->|  (existing message)
  |<-- ELEMENT_SELECTED ----------|  (existing message)
  |                                |
  |--- REQUEST_COMPONENTS ------->|  (re-scan with root scope)
  |<-- COMPONENTS_DETECTED -------|
```

### Variant Switching Flow

```
Editor                          Inspector
  |                                |
  |--- APPLY_VARIANT ------------->|  { type: 'class', addClassName: 'btn-lg', removeClassNames: ['btn-md'] }
  |                                |  Inspector: el.classList.remove('btn-md'), el.classList.add('btn-lg')
  |<-- VARIANT_APPLIED ------------|  { computedStyles: {...}, boundingRect: {...} }
  |                                |
  |    [User switches to another]  |
  |--- REVERT_VARIANT ------------>|  { removeClassName: 'btn-lg', restoreClassName: 'btn-md' }
  |--- APPLY_VARIANT ------------->|  { type: 'class', addClassName: 'btn-sm', removeClassNames: ['btn-md'] }
  |<-- VARIANT_APPLIED ------------|
```

### Pseudo-State Simulation Flow

```
Editor                          Inspector
  |                                |
  |--- APPLY_VARIANT ------------->|  { type: 'pseudo', pseudoStyles: { color: '#fff', background: '#007bff' } }
  |                                |  Inspector: el.style.setProperty('color', '#fff', 'important')
  |<-- VARIANT_APPLIED ------------|  { computedStyles: {...} }
  |                                |
  |    [User deselects pseudo]     |
  |--- REVERT_VARIANT ------------>|  { revertPseudo: true, pseudoProperties: ['color', 'background'] }
  |                                |  Inspector: el.style.removeProperty('color'), el.style.removeProperty('background')
```

## Integration with Existing Messages

These new messages extend the existing message system without modifying current flows:

| Existing Message | New Interaction |
|-----------------|-----------------|
| INSPECTOR_READY | Now also triggers REQUEST_COMPONENTS (delayed 500ms) |
| DOM_UPDATED | Now also triggers debounced REQUEST_COMPONENTS (1s) |
| ELEMENT_SELECTED | ComponentsPanel reads updated selectorPath from store |
| SELECT_ELEMENT | ComponentsPanel sends this when user clicks a component entry |

No existing message payloads or behaviors are changed.

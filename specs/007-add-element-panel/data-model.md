# Data Model: Add Element Panel

**Feature**: 007-add-element-panel | **Date**: 2026-02-26

## Entities

### ElementType (UI-only, not persisted)

Represents a draggable item in the Add Element palette.

| Field | Type | Description |
|-------|------|-------------|
| `tag` | `string` | HTML tag name (`div`, `section`, `h1`–`h6`, `p`) |
| `label` | `string` | Display label in the palette |
| `description` | `string` | Brief description shown next to the tag |
| `placeholderText` | `string` | Text content for text elements (empty for structural) |

**Categories**:
- **Structure**: `div` (Generic container), `section` (Semantic section)
- **Text**: `h1`–`h6` (Headings), `p` (Paragraph)

**Defined as**: Constant array `ELEMENT_CATEGORIES` in `AddElementPanel.tsx`. Not stored in Zustand or localStorage.

### ElementInsertion (tracked via StyleChange)

Represents a recorded element insertion, stored using the existing `StyleChange` interface with sentinel property `__element_inserted__`.

| StyleChange Field | Value for Insertions |
|---|---|
| `id` | Unique generated ID |
| `elementSelector` | Selector path of the **inserted** element |
| `property` | `'__element_inserted__'` (sentinel) |
| `originalValue` | `'parent:{parentSelectorPath}\|index:{insertionIndex}'` |
| `newValue` | `'inserted'` |
| `breakpoint` | Active breakpoint at time of insertion |
| `timestamp` | `Date.now()` |
| `changeScope` | Current change scope (`'all'` or `'breakpoint-only'`) |

**Companion snapshot** (via `ElementSnapshot`):

| ElementSnapshot Field | Value for Insertions |
|---|---|
| `selectorPath` | Selector path of the inserted element |
| `tagName` | Tag name of the inserted element |
| `className` | `null` (new elements have no classes) |
| `elementId` | `null` (new elements have no ID) |
| `attributes` | `{}` (empty) |
| `innerText` | Placeholder text or `null` |
| `computedStyles` | `{}` (empty — styles applied after insertion) |
| `pagePath` | Current page path |
| `changeScope` | Current change scope |
| `sourceInfo` | `null` (no source mapping for dynamically inserted elements) |

## Relationships

```
ElementType (palette item)
    ↓ drag-and-drop or click
INSERT_ELEMENT message
    ↓ postMessage to inspector
DOM insertion in iframe
    ↓ inspector responds
ELEMENT_INSERTED message
    ↓ postMessage to editor
StyleChange + ElementSnapshot (stored in Zustand changeSlice)
    ↓ auto-persisted
localStorage (keyed by target URL)
```

## State Transitions

### Insertion Lifecycle

```
[Palette] → drag start / click
    ↓
[Inspector] → INSERT_ELEMENT received → createElement → appendChild/insertBefore
    ↓
[Inspector] → ELEMENT_INSERTED sent → DOM_UPDATED (via MutationObserver)
    ↓
[Editor] → StyleChange created → ElementSnapshot saved → undoStack pushed
    ↓
[Changes Tab] → insertion visible → undo available
```

### Undo Lifecycle

```
[Changes Tab] → click Undo / Ctrl+Z
    ↓
[Editor] → popUndo → REMOVE_INSERTED_ELEMENT sent
    ↓
[Inspector] → querySelector → removeChild
    ↓
[Inspector] → DOM_UPDATED (via MutationObserver)
    ↓
[Editor] → StyleChange removed → ElementSnapshot cleaned
```

## Validation Rules

- `tagName` must be one of the 9 supported tags (`div`, `section`, `h1`–`h6`, `p`)
- `parentSelectorPath` must resolve to a valid DOM element in the inspector
- Void elements (`img`, `input`, `br`, `hr`, `area`, `base`, `col`, `embed`, `link`, `meta`, `param`, `source`, `track`, `wbr`) cannot be parents — insertion redirects to sibling-after mode
- Insertions only allowed when editor is connected (`connectionStatus === 'connected'`)
- Click-to-insert requires a selected element (`selectorPath` must be non-null)

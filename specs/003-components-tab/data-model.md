# Data Model: Components Tab

**Feature Branch**: `003-components-tab`
**Date**: 2026-02-14

## Entities

### DetectedComponent

Represents a UI element recognized as a component during DOM scanning.

| Field | Type | Description |
|-------|------|-------------|
| selectorPath | string | CSS selector path uniquely identifying this element in the DOM |
| name | string | Human-readable component name (e.g., "Button", "Navigation", "Card") |
| tagName | string | HTML tag name (lowercase) |
| detectionMethod | enum | How the component was identified: `semantic-html`, `custom-element`, `aria-role`, `class-pattern`, `data-attribute` |
| className | string or null | Element's CSS class string |
| elementId | string or null | Element's ID attribute |
| innerText | string or null | Truncated text content (first 50 chars) for display context |
| boundingRect | BoundingRect | Position and dimensions {top, left, width, height} |
| variants | VariantGroup[] | Detected variant groups (may be empty) |
| childComponentCount | number | Count of detected components among this element's descendants |

**Validation rules**:
- `selectorPath` must be non-empty and unique within the detected set
- `name` derived from detection maps (not user-editable at detection time)
- `tagName` must be a valid HTML element tag
- `detectionMethod` must be one of the five enumerated values
- `boundingRect` values must be non-negative numbers

---

### VariantGroup

A category of switchable options for a component. Groups organize related visual alternatives.

| Field | Type | Description |
|-------|------|-------------|
| groupName | string | Category name: "Size", "Color", "State", or "Pseudo States" |
| type | enum | `class` (CSS class switching) or `pseudo` (pseudo-state simulation) |
| options | VariantOption[] | Available choices within this group |
| activeIndex | number | Index of the currently active option (0-based) |

**Validation rules**:
- `groupName` must be one of the four recognized categories
- `options` must contain at least 2 items (a single option isn't a variant)
- `activeIndex` must be within bounds: 0 <= activeIndex < options.length

---

### VariantOption

A single switchable choice within a variant group.

| Field | Type | Description |
|-------|------|-------------|
| label | string | Display label (e.g., "sm", "lg", "primary", "hover") |
| className | string or null | CSS class to add (for `class` type variants) |
| removeClassNames | string[] or null | CSS classes to remove when this option is applied (for `class` type) |
| pseudoState | string or null | Pseudo-state name (for `pseudo` type variants): "hover", "focus", "active" |
| pseudoStyles | Record<string, string> or null | Computed styles to apply inline when simulating this pseudo-state |

**Validation rules**:
- `label` must be non-empty
- For `class` type: `className` must be set
- For `pseudo` type: `pseudoState` must be set, `pseudoStyles` must be non-empty

---

### ComponentExtractionEntry

A changelog record created when the user marks a component for extraction. Stored as a specialized StyleChange with sentinel property key.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier (UUID) |
| elementSelector | string | CSS selector path of the component |
| property | string | Always `__component_creation__` (sentinel key) |
| originalValue | string | Empty string (no original value for creation) |
| newValue | string | JSON-encoded object: `{ name, variants: [{ groupName, options }], timestamp }` |
| breakpoint | string | Current active breakpoint at time of creation |
| timestamp | number | Unix timestamp |

**Validation rules**:
- `property` must exactly equal `__component_creation__`
- `newValue` must be valid JSON when parsed
- `elementSelector` must match a known detected component's selectorPath

---

### ComponentSlice State (Zustand)

State managed by the component store slice.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| detectedComponents | DetectedComponent[] | [] | Components found on current page |
| selectedComponentPath | string or null | null | Selector path of focused component in list |
| componentSearchQuery | string | "" | Filter query for component list |
| createdComponents | Record<string, CreatedComponent> | {} | Map of selectorPath → extraction metadata |

**CreatedComponent** (value in createdComponents record):

| Field | Type | Description |
|-------|------|-------------|
| name | string | Component name at time of creation |
| selectorPath | string | CSS selector path |
| timestamp | number | When it was marked for extraction |

---

## Entity Relationships

```
DetectedComponent 1──* VariantGroup 1──* VariantOption
       │
       │ (selectorPath match)
       ▼
ComponentExtractionEntry (stored in StyleChange[])
       │
       │ (selectorPath lookup)
       ▼
CreatedComponent (in componentSlice.createdComponents)
```

- A `DetectedComponent` has zero or more `VariantGroup`s
- Each `VariantGroup` has two or more `VariantOption`s
- When a component is marked for extraction, a `ComponentExtractionEntry` is added to the changeSlice
- The `createdComponents` record tracks which components have been extracted (prevents duplicates)
- The `selectorPath` field is the join key across all entities

## State Transitions

### Component Detection Lifecycle

```
Page Loaded → INSPECTOR_READY
    ↓
Request Scan → REQUEST_COMPONENTS
    ↓
Inspector Scans DOM → detectSingleComponent() per element
    ↓
Results Sent → COMPONENTS_DETECTED
    ↓
Store Updated → setDetectedComponents()
    ↓
[DOM_UPDATED event] → debounced re-scan (1s) → back to Request Scan
```

### Variant Application Lifecycle

```
User Selects Variant Option
    ↓
Editor Sends → APPLY_VARIANT { selectorPath, type, addClassName/pseudoStyles }
    ↓
Inspector Applies Change (class swap or inline pseudo styles)
    ↓
Inspector Reads New Computed Styles
    ↓
Inspector Sends → VARIANT_APPLIED { selectorPath, computedStyles, boundingRect }
    ↓
Store Updated → updateComputedStyles() (right panel auto-refreshes)
    ↓
[User selects different variant or deselects]
    ↓
Editor Sends → REVERT_VARIANT { selectorPath, restore original }
    ↓
Inspector Reverts Changes
```

### Component Extraction Lifecycle

```
User Clicks "Create as Component"
    ↓
addStyleChange({ property: '__component_creation__', newValue: JSON.stringify({...}) })
    ↓
addCreatedComponent({ name, selectorPath, timestamp })
    ↓
Button UI → "Created" state (green checkmark, disabled)
    ↓
[Export Changelog]
    ↓
formatChangelog() → separate "Component Extractions" section
```

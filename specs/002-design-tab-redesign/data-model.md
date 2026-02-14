# Data Model: Right Panel Design Tab Redesign

**Feature Branch**: `002-design-tab-redesign`
**Date**: 2026-02-14

## Entities

This feature is a UI-only redesign. No new database tables, API endpoints, or persistent data structures are introduced. The entities below are **UI component interfaces and CSS parser types** that structure the in-memory data flowing through the redesigned panel.

---

### CompactInput Props

Replaces `PropertyInput` for all numeric CSS property inputs.

| Field       | Type                                | Required | Description                                          |
|-------------|-------------------------------------|----------|------------------------------------------------------|
| label       | string                              | No       | Prefix character shown inside input (e.g., "W", "X") |
| placeholder | string                              | No       | Placeholder text when no label                       |
| value       | string                              | Yes      | Current CSS value (e.g., "16px", "auto")             |
| property    | string                              | Yes      | CSS property name for onChange callback               |
| onChange     | (property: string, value: string) => void | Yes | Change handler, same contract as PropertyInput       |
| units       | string[]                            | No       | Available units, default: ['px','%','em','rem','auto'] |
| min         | number                              | No       | Minimum numeric value                                |
| max         | number                              | No       | Maximum numeric value                                |
| step        | number                              | No       | Step for arrow key increment, default: 1             |
| className   | string                              | No       | Additional CSS classes                               |

**Validation**: Uses existing `parseCSSValue`/`formatCSSValue`. "auto" disables numeric input.

---

### IconToggleGroup Props

Row of mutually exclusive icon buttons.

| Field    | Type                                  | Required | Description                        |
|----------|---------------------------------------|----------|------------------------------------|
| options  | { value: string; icon: ReactNode; tooltip?: string }[] | Yes | Available options with icons |
| value    | string                                | Yes      | Currently selected value           |
| onChange | (value: string) => void               | Yes      | Selection change handler           |

**State**: No internal state — fully controlled component.

---

### LinkedInputPair Props

Linked/unlinked 4-sided CSS property editor (padding, margin).

| Field      | Type                                       | Required | Description                              |
|------------|--------------------------------------------|----------|------------------------------------------|
| label      | string                                     | Yes      | Section label (e.g., "Padding")          |
| values     | { top: string; right: string; bottom: string; left: string } | Yes | Current values per side |
| properties | { top: string; right: string; bottom: string; left: string } | Yes | CSS property names per side |
| onChange    | (property: string, value: string) => void  | Yes      | Per-property change handler              |
| units      | string[]                                   | No       | Available units                          |

**Internal state**: `isLinked: boolean` (auto-detected from equal values).

**Linked behavior**: Changing horizontal value fires `onChange` for both `left` and `right`. Changing vertical value fires for both `top` and `bottom`.

---

### ColorInput Props

Compact color picker row with CSS variable token support.

| Field        | Type                              | Required | Description                                |
|--------------|-----------------------------------|----------|--------------------------------------------|
| value        | string                            | Yes      | Resolved color value (e.g., "#ff0000")     |
| property     | string                            | Yes      | CSS property name                          |
| onChange      | (property: string, value: string) => void | Yes | Change handler                      |
| varExpression | string                           | No       | CSS var() expression if variable-backed    |
| onDetach     | () => void                        | No       | Callback when user detaches from variable  |
| onReattach   | (expr: string) => void            | No       | Callback when user reattaches to variable  |

**Internal logic**: Reads `cssVariableUsages` and `isPropertyDetached` from store. Delegates to `VariableColorPicker` or `ColorPicker` internally.

---

### SectionHeader Props

Enhanced collapsible section wrapper with action slot.

| Field       | Type       | Required | Description                              |
|-------------|------------|----------|------------------------------------------|
| title       | string     | Yes      | Section title                            |
| defaultOpen | boolean    | No       | Initial collapsed state, default: true   |
| actions     | ReactNode  | No       | Right-side action icons (e.g., +, token) |
| children    | ReactNode  | Yes      | Section content                          |

**Replaces**: `CollapsibleSection` in all design sections. `CollapsibleSection` remains available for other panels.

---

### GradientStop

Single color stop in a gradient.

| Field    | Type   | Description                            |
|----------|--------|----------------------------------------|
| color    | string | CSS color value (hex, rgb, rgba, etc.) |
| position | number | Position as percentage (0-100)         |
| opacity  | number | Opacity (0-1), default: 1             |

---

### GradientData

Structured representation of a CSS gradient.

| Field  | Type                                      | Description                                     |
|--------|-------------------------------------------|-------------------------------------------------|
| type   | 'linear' \| 'radial' \| 'conic'          | Gradient type                                   |
| angle  | number                                    | Angle in degrees (linear only), default: 90     |
| stops  | GradientStop[]                            | Color stops, minimum 2                          |

**Serialization**: `linear-gradient(${angle}deg, ${stops.map(s => `${color} ${position}%`).join(', ')})`

---

### ShadowData

Single box-shadow layer.

| Field  | Type    | Description                            |
|--------|---------|----------------------------------------|
| x      | number  | Horizontal offset in px                |
| y      | number  | Vertical offset in px                  |
| blur   | number  | Blur radius in px, default: 0          |
| spread | number  | Spread radius in px, default: 0        |
| color  | string  | CSS color value                        |
| inset  | boolean | Whether shadow is inset, default: false |

**Serialization**: `${inset ? 'inset ' : ''}${x}px ${y}px ${blur}px ${spread}px ${color}`

Multiple shadows joined by `, `.

---

## State Flow Diagram

```
computedStyles (from store)
    ↓
Section Component (reads relevant properties)
    ↓
CompactInput / IconToggleGroup / LinkedInputPair / ColorInput
    ↓
onChange(property, value)
    ↓
useChangeTracker.applyChange(property, value)
    ↓
├─→ PREVIEW_CHANGE postMessage → Inspector → inline style
├─→ addStyleChange() → store.styleChanges[]
├─→ saveElementSnapshot() [first change only]
└─→ localStorage persistence (300ms debounce)
```

No new store slices, actions, or persistence changes required.

---

## CSS Property Groups (Constants Update)

New groups to add to `CSS_PROPERTIES` in `src/lib/constants.ts`:

| Group      | Properties                                              |
|------------|---------------------------------------------------------|
| shadow     | `box-shadow`                                            |
| appearance | `opacity`                                               |
| flex-item  | `flex-grow`, `flex-shrink`, `flex-basis`, `align-self`, `order` |
| transform  | `transform`                                             |
| filter     | `filter`                                                |

Existing groups remain unchanged. `ALL_EDITABLE_PROPERTIES` regenerated from all groups.

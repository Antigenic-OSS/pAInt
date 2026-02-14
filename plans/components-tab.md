# Plan: Components Tab in Left Panel

## Context

The left panel currently has two tabs: **Layers** (DOM tree) and **Pages** (page navigation). The user wants a third **Components** tab that provides component-level awareness when inspecting elements. When an element is selected, the tab detects whether the element or any of its children are recognizable UI components (buttons, cards, inputs, navs, etc.), lists them, and allows switching between component variants (sizes, colors, states, hover) with real-time preview. A "Create as Component" action adds extraction instructions to the changelog.

---

## Implementation

### 1. New types (`src/types/component.ts`) — NEW FILE

Define `DetectedComponent`, `ComponentVariantGroup`, `ComponentVariantOption`:

- `DetectedComponent`: selectorPath, name, tagName, detectionMethod (`semantic-html` | `custom-element` | `aria-role` | `class-pattern` | `data-attribute`), className, elementId, innerText, boundingRect, variants array, childComponentCount
- `ComponentVariantGroup`: groupName ("Size" | "Color" | "State" | "Pseudo States"), type (`class` | `pseudo`), options array, activeIndex
- `ComponentVariantOption`: label, className (for class variants), removeClassNames, pseudoState, pseudoStyles (for pseudo variants)

### 2. New message types (`src/types/messages.ts`) — MODIFY

Add 5 new message interfaces to the existing union types:

**Inspector -> Editor:**
- `COMPONENTS_DETECTED` — payload: `{ components: DetectedComponent[] }`
- `VARIANT_APPLIED` — payload: `{ selectorPath, computedStyles, cssVariableUsages, boundingRect }`

**Editor -> Inspector:**
- `REQUEST_COMPONENTS` — payload: `{ rootSelectorPath?: string }`
- `APPLY_VARIANT` — payload: `{ selectorPath, type, addClassName?, removeClassNames?, pseudoStyles?, revertPseudo? }`
- `REVERT_VARIANT` — payload: `{ selectorPath, removeClassName?, restoreClassName?, revertPseudo?, pseudoProperties? }`

### 3. Constants update (`src/lib/constants.ts`) — MODIFY

Add the 5 new message type keys to `MESSAGE_TYPES`.

### 4. Component slice (`src/store/componentSlice.ts`) — NEW FILE

New Zustand slice with state:
- `detectedComponents: DetectedComponent[]`
- `selectedComponentPath: string | null`
- `componentSearchQuery: string`
- `createdComponents: Record<string, { name, selectorPath, timestamp }>`

Actions: `setDetectedComponents`, `setSelectedComponentPath`, `setComponentSearchQuery`, `addCreatedComponent`, `removeCreatedComponent`, `updateComponentVariantActiveIndex`, `clearComponents`

Wire into store in `src/store/index.ts`.

### 5. Inspector-side component detection (`src/app/api/proxy/[[...path]]/route.ts`) — MODIFY

Add ~200 lines of ES5-compatible JS inside the `getInspectorCode()` function:

**a) Component detection maps:**
- `SEMANTIC_COMPONENTS` — maps tags to names: `button` -> "Button", `nav` -> "Navigation", `input` -> "Input", `header` -> "Header", `footer` -> "Footer", `dialog` -> "Dialog", `a` -> "Link", `img` -> "Image", `form` -> "Form", etc.
- `ARIA_ROLE_MAP` — maps roles: `button` -> "Button", `navigation` -> "Navigation", `tab` -> "Tab", `dialog` -> "Dialog", etc.
- `CLASS_PATTERNS` — regex patterns: `/\bbtn\b/i` -> "Button", `/\bcard\b/i` -> "Card", `/\bmodal\b/i` -> "Modal", `/\bdropdown\b/i` -> "Dropdown", `/\bbadge\b/i` -> "Badge", etc.

**b) `detectSingleComponent(el)`** — checks element against detection maps in priority order: data-component attr > custom element (tag with hyphen) > semantic HTML > ARIA role > class pattern.

**c) `detectClassVariants(el)`** — scans all stylesheets for classes sharing a base prefix with the element's current classes, grouping into Size (xs/sm/md/lg/xl), Color (primary/secondary/success/danger), and State (active/disabled/loading) variant groups.

**d) `detectPseudoVariants(el)`** — compares `getComputedStyle(el)` vs `getComputedStyle(el, ':hover')` etc. for key visual properties (color, background-color, border-color, opacity, transform, box-shadow). If differences exist, creates a "Pseudo States" variant group.

**e) `scanForComponents(rootElement)`** — walks DOM tree from root, calls `detectSingleComponent` on each element, collects results with variants.

**f) Message handlers:** Add `REQUEST_COMPONENTS`, `APPLY_VARIANT`, `REVERT_VARIANT` cases to the existing message switch. `APPLY_VARIANT` applies class changes or pseudo-style overrides, then sends back `VARIANT_APPLIED` with updated computedStyles so the right panel updates.

**g) Auto-scan:** After `INSPECTOR_READY`, auto-scan components with a 500ms delay. Also re-scan (debounced 1s) on `DOM_UPDATED` from MutationObserver.

### 6. Message routing (`src/hooks/usePostMessage.ts`) — MODIFY

- Add store selectors for `setDetectedComponents`, `updateComputedStyles`
- In `INSPECTOR_READY` handler: add `sendToInspector({ type: 'REQUEST_COMPONENTS' })`
- Add `COMPONENTS_DETECTED` case: calls `setDetectedComponents(msg.payload.components)`
- Add `VARIANT_APPLIED` case: if `selectorPath` matches current selection, updates `computedStyles` and `cssVariableUsages` in store — this automatically syncs the right panel design editor since all design sections subscribe to `computedStyles`

### 7. ComponentsPanel UI (`src/components/left-panel/ComponentsPanel.tsx`) — NEW FILE

**Layout:**
```
Search input (filter by name/tag/class)
Component count header ("N components found")
Scrollable list of ComponentItem entries:
  [Icon] Component Name (tagName)
  [Variant dropdown: Size]    [sm] [md] [lg]
  [Variant dropdown: Color]   [primary] [secondary]
  [Variant dropdown: Pseudo]  [hover] [focus] [active]
  [+ Create Component] button
```

**Behavior:**
- When **nothing is selected**: shows all components on the page (full scan)
- When **element is selected**: shows the selected element (if it's a component) + all component children. Non-component parents show "No component detected — select a component element or a parent with component children"
- **Click** a component item -> sends `SELECT_ELEMENT` to inspector (reuses existing selection flow). Inspector highlights the element, sends `ELEMENT_SELECTED` back, right panel updates.
- **Variant dropdown change** -> sends `APPLY_VARIANT` to inspector. Inspector applies class/pseudo changes, sends `VARIANT_APPLIED` with new computedStyles. Right panel auto-updates.
- **"Create Component" button** -> adds a special `__component_creation__` entry to the change slice (changelog). Marks the component as "created" in the component slice (button changes to green checkmark "Created").

Follows the same dark-mode styling patterns as `PagesPanel.tsx` (CSS variables, inline styles, text-xs, 10px labels).

### 8. Left panel tab update (`src/components/left-panel/LeftPanel.tsx`) — MODIFY

- Change `LeftTab` type to `'layers' | 'pages' | 'components'`
- Add third tab `{ id: 'components', label: 'Comps' }` (abbreviated for space at 180px min width)
- Import and render `ComponentsPanel` when `activeTab === 'components'`
- Conditional rendering: layers | pages | components

### 9. Changelog integration (`src/lib/utils.ts`) — MODIFY

Update `formatChangelog` to handle `__component_creation__` entries:
- Separate them from style changes
- Add a "## Component Extractions" section in the changelog with:
  - Component name, selector, suggested file path
  - Detected variants as suggested props
  - Instructions to extract into a reusable component

### 10. Changes panel update (`src/components/right-panel/changes/ChangesPanel.tsx`) — MODIFY

Render `__component_creation__` changes with a distinct UI (component icon, "Create [Name] component" label) instead of the default CSS property change format.

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/types/component.ts` | CREATE | Component type definitions |
| `src/store/componentSlice.ts` | CREATE | Zustand component slice |
| `src/components/left-panel/ComponentsPanel.tsx` | CREATE | Components tab UI |
| `src/types/messages.ts` | MODIFY | 5 new message interfaces + union updates |
| `src/lib/constants.ts` | MODIFY | New MESSAGE_TYPES entries |
| `src/store/index.ts` | MODIFY | Wire componentSlice into store |
| `src/app/api/proxy/[[...path]]/route.ts` | MODIFY | Inspector component detection + variant handling (~200 lines) |
| `src/hooks/usePostMessage.ts` | MODIFY | Handle COMPONENTS_DETECTED, VARIANT_APPLIED, request on ready |
| `src/components/left-panel/LeftPanel.tsx` | MODIFY | Add 3rd tab, render ComponentsPanel |
| `src/lib/utils.ts` | MODIFY | formatChangelog handles component creation entries |

---

## Verification

1. **Build check**: `bun run build` — no type errors
2. **Dev server**: `bun dev` — connect to a localhost project
3. **Tab visible**: Components tab appears next to Layers and Pages
4. **Detection**: Select a button/input/card — Components tab lists it
5. **Child detection**: Select a container with buttons inside — children listed
6. **Click to select**: Click a component in the list — iframe highlights it, right panel shows its styles
7. **Variant switching**: Change size/color dropdown — element changes in iframe, right panel updates
8. **Pseudo states**: Select "hover" — element shows hover styles, right panel reflects them
9. **Create Component**: Click button — entry appears in Changes tab and changelog
10. **Page navigation**: Switch pages — components re-scan automatically

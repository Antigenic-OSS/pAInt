# Feature Specification: Components Tab

**Feature Branch**: `003-components-tab`
**Created**: 2026-02-14
**Status**: Draft
**Input**: User description: "Components tab in left panel — detect UI components from selected elements, list them, switch between variants with live preview, and create component extraction entries in the changelog. Must not be heavy to load."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Detected Components (Priority: P1)

A designer or developer loads a localhost page in pAInt and clicks the "Components" tab in the left panel. The tab scans the visible page and lists recognizable UI components (buttons, cards, inputs, navigation elements, etc.). Each component entry shows its name and type. The user can search/filter the list by name, tag, or class. Clicking a component in the list selects it in the iframe and updates the right panel with its styles.

**Why this priority**: This is the core value of the feature — without component detection and listing, no other functionality works. It provides immediate awareness of the component structure of any page.

**Independent Test**: Can be fully tested by connecting to any localhost page with standard HTML elements (buttons, inputs, navigation). The Components tab should populate with detected components, and clicking one should highlight it in the iframe.

**Acceptance Scenarios**:

1. **Given** a page is loaded in the iframe, **When** the user clicks the "Components" tab, **Then** the tab displays a list of detected components found on the page within 1 second.
2. **Given** the Components tab is active, **When** the user types a search query, **Then** the list filters to show only components matching the query by name, tag, or class.
3. **Given** components are listed, **When** the user clicks a component entry, **Then** the iframe highlights and selects that element, and the right panel updates to show its styles.
4. **Given** an element is already selected in the iframe, **When** the user switches to the Components tab, **Then** the tab shows the selected element (if it's a component) plus any component children within it.
5. **Given** a selected element has no component children and is not itself a component, **When** the Components tab is viewed, **Then** a helpful empty state message is shown ("No components detected — select an element with recognizable components").

---

### User Story 2 - Switch Component Variants (Priority: P2)

With a component selected, the user sees available variant options grouped by category (Size, Color, State, Pseudo States). The user can switch between variants using dropdown controls. Changing a variant immediately updates the element's appearance in the iframe and refreshes the right panel's style values — all without a page reload.

**Why this priority**: Variant switching is the main interactive power of this tab. It lets users explore how a component looks in different states without manually editing classes or CSS, providing fast visual iteration.

**Independent Test**: Can be tested by selecting a component that has recognizable CSS class variants (e.g., `btn-sm`, `btn-lg`, `btn-primary`, `btn-secondary`). Switching the size or color variant should visually change the element in the iframe.

**Acceptance Scenarios**:

1. **Given** a button component with size variants (sm, md, lg) is selected, **When** the user switches the Size dropdown from "md" to "lg", **Then** the button in the iframe visually grows and the right panel reflects the new computed styles.
2. **Given** a component with pseudo-state differences (hover, focus) is selected, **When** the user activates the "hover" pseudo variant, **Then** the element displays its hover styles and the right panel updates accordingly.
3. **Given** a variant has been applied, **When** the user selects a different variant in the same group, **Then** the previous variant is cleanly reverted before the new one is applied (no class accumulation).
4. **Given** a variant has been applied, **When** the user navigates away from the component (selects a different element), **Then** the variant change is reverted and the element returns to its original state.

---

### User Story 3 - Create Component Extraction Entry (Priority: P3)

After identifying a component, the user clicks a "Create as Component" button. This adds a component extraction entry to the changelog (Changes tab), recording the component's name, location, and detected variants as suggested props. The button changes to a "Created" state to prevent duplicate entries.

**Why this priority**: This bridges the gap between visual inspection and code generation. While detection and variant switching provide immediate value, component extraction is the workflow step that feeds into downstream code generation by Claude.

**Independent Test**: Can be tested by selecting a detected component, clicking "Create as Component", then switching to the Changes tab to verify the extraction entry appears with the correct component name and selector.

**Acceptance Scenarios**:

1. **Given** a detected component is displayed in the Components tab, **When** the user clicks "Create as Component", **Then** a component extraction entry is added to the changelog with the component's name, selector path, and detected variants as suggested props.
2. **Given** a component extraction entry has been created, **When** the user views the "Create as Component" button for that component, **Then** the button shows a "Created" state (e.g., green checkmark) and is disabled to prevent duplicates.
3. **Given** component extraction entries exist in the changelog, **When** the user exports the changelog, **Then** the entries appear in a dedicated "Component Extractions" section with name, selector, and suggested props.

---

### User Story 4 - Auto-Rescan on Page Changes (Priority: P4)

When the user navigates to a different page or the DOM updates (e.g., a route change triggers new content), the component list automatically refreshes to reflect the new page content. The rescan is debounced to avoid excessive processing.

**Why this priority**: Keeps the component list accurate without manual intervention, but is a quality-of-life enhancement rather than core functionality.

**Independent Test**: Can be tested by navigating between pages using the Pages panel and verifying that the Components tab updates its list to reflect the new page's components.

**Acceptance Scenarios**:

1. **Given** the Components tab is active, **When** the user navigates to a different page, **Then** the component list refreshes within 2 seconds to show the new page's components.
2. **Given** the DOM is mutated (elements added/removed), **When** 1 second has passed since the last mutation, **Then** the component list refreshes to reflect the change.

---

### Edge Cases

- What happens when a page has zero recognizable components? The tab shows a friendly empty state with guidance.
- What happens when a page has hundreds of components? The list renders efficiently using virtualization or pagination — no scrolling jank or lag.
- What happens when variant class names conflict across different components? Variant detection is scoped per-component, not globally, to avoid cross-contamination.
- What happens when stylesheets are loaded asynchronously? The variant detection gracefully handles missing stylesheet data and rescans when new styles become available.
- What happens when the user switches tabs rapidly between Layers/Pages/Components? Only the active tab's content is rendered; switching does not trigger redundant scans.
- What happens when the selected element is removed from the DOM? The component list clears or shows an appropriate empty state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST add a "Components" tab (labeled "Comps") to the left panel alongside existing Layers and Pages tabs.
- **FR-002**: System MUST detect recognizable UI components from the current page by analyzing semantic HTML elements, custom elements, ARIA roles, CSS class patterns, and data attributes.
- **FR-003**: System MUST display detected components as a scrollable, searchable list showing component name and element type.
- **FR-004**: Users MUST be able to filter the component list by typing a search query that matches component name, tag name, or CSS class.
- **FR-005**: Users MUST be able to click a component entry to select it in the iframe, triggering the existing element selection flow (highlight + right panel style update).
- **FR-006**: System MUST detect class-based variants by scanning stylesheets for classes sharing a base prefix with the component's current classes, grouped into categories: Size, Color, and State.
- **FR-007**: System MUST detect pseudo-state variants (hover, focus, active) by comparing computed styles between default and pseudo states.
- **FR-008**: Users MUST be able to switch between detected variants via dropdown controls, with the change immediately reflected in the iframe and right panel.
- **FR-009**: System MUST cleanly revert a variant when switching to another variant in the same group or when deselecting the component.
- **FR-010**: Users MUST be able to mark a detected component for extraction via a "Create as Component" action, which adds an entry to the changelog.
- **FR-011**: System MUST prevent duplicate component extraction entries for the same component (button transitions to a "Created" state).
- **FR-012**: System MUST include component extraction entries in the exported changelog under a dedicated section with component name, selector, and suggested props.
- **FR-013**: System MUST automatically rescan for components when the page changes or the DOM is significantly mutated, debounced to avoid excessive processing.
- **FR-014**: System MUST render the component list efficiently — pages with 100+ components must not cause visible lag or slow down the editor.
- **FR-015**: System MUST use lazy/deferred loading for the Components tab panel so that it does not add to the initial editor load time when the tab is not active.
- **FR-016**: Component detection scanning MUST complete within 500ms for pages with up to 500 DOM elements, and MUST NOT block the main thread for more than 100ms at a time for larger pages.
- **FR-017**: When nothing is selected, the Components tab MUST show all components found on the page (full scan). When an element is selected, it MUST show the selected element (if a component) plus component children.

### Key Entities

- **Detected Component**: A UI element recognized as a component — has a name, element type, detection method (semantic HTML, custom element, ARIA role, class pattern, or data attribute), location in the DOM, and a list of available variants.
- **Variant Group**: A category of switchable options for a component (e.g., "Size", "Color", "State", "Pseudo States"). Each group contains multiple options, one of which is currently active.
- **Variant Option**: A single switchable choice within a variant group — identified by a label and the class name or pseudo-state it represents.
- **Component Extraction Entry**: A changelog record created when the user marks a component for extraction — includes component name, selector path, and detected variants as suggested props.

## Assumptions

- pAInt already has a working left panel with Layers and Pages tabs, element selection via postMessage, and a right panel that auto-updates when `computedStyles` change in the store.
- The inspector script (injected via proxy) can scan the DOM and access stylesheets for variant detection. Cross-origin stylesheets that block `cssRules` access are gracefully skipped.
- Component detection is heuristic-based — it will not achieve 100% accuracy for all design systems, but should cover common patterns (Bootstrap, Tailwind UI, Material, semantic HTML).
- The existing changelog/change-tracking system can be extended to support a new entry type for component extractions.
- Performance constraint: The entire Components tab feature (detection + UI rendering) must not perceptibly slow down editor startup or normal operation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The Components tab appears and is functional within 1 second of clicking it for the first time, even on pages with 200+ elements.
- **SC-002**: Component detection correctly identifies at least 80% of recognizable semantic HTML and ARIA-role components (buttons, inputs, navigation, forms, images, links, dialogs) on a standard page.
- **SC-003**: Variant switching updates the iframe element and right panel styles within 300ms of user interaction.
- **SC-004**: The editor's initial load time increases by no more than 50ms with the Components tab feature installed (lazy loading ensures minimal startup cost).
- **SC-005**: Users can complete the full flow — detect a component, switch a variant, and create an extraction entry — in under 30 seconds.
- **SC-006**: The component list remains responsive (no visible jank during scrolling or filtering) with up to 150 components listed.
- **SC-007**: Searching/filtering the component list returns results within 100ms of typing.

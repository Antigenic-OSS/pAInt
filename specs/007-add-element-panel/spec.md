# Feature Specification: Add Element Panel

**Feature Branch**: `007-add-element-panel`
**Created**: 2026-02-26
**Status**: Draft
**Input**: User description: "Add a new feature Add element this is a new tab in the left panel user can drag and drop a div element, section element, heading and paragraph"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Drag and Drop Elements onto the Preview (Priority: P1)

A user connected to their localhost project wants to add new HTML elements to the page. They open the "Add Element" tab in the left panel, which displays a palette of available element types: `<div>`, `<section>`, `<h1>`–`<h6>`, and `<p>`. The user drags an element from the palette and drops it onto a target location in the preview iframe. The element is inserted into the DOM at the drop position, and the layers tree updates to reflect the new element.

**Why this priority**: This is the core feature — without drag-and-drop insertion, the panel has no value. It enables users to visually compose page structure without writing code.

**Independent Test**: Can be fully tested by connecting to a localhost project, switching to the Add Element tab, dragging a `<div>` onto the preview, and verifying the element appears in both the preview and the layers tree.

**Acceptance Scenarios**:

1. **Given** the editor is connected to a target page, **When** the user drags a `<div>` element from the Add Element palette and drops it onto a container in the preview iframe, **Then** a new `<div>` is inserted as a child of that container and is visible in the preview.
2. **Given** the user has dragged an element to the preview, **When** they hover over different containers before dropping, **Then** a visual drop indicator highlights the target container and shows where the element will be inserted.
3. **Given** an element has been dropped into the preview, **When** the user looks at the layers tree, **Then** the new element appears in the correct position in the tree hierarchy.

---

### User Story 2 - Element Palette with Available Element Types (Priority: P1)

A user opens the "Add Element" tab and sees a clear, organized palette of draggable element types grouped by category. Structural elements (`<div>`, `<section>`) are grouped together, and text elements (`<h1>`–`<h6>`, `<p>`) are grouped together. Each element type shows its tag name and a brief description or icon so the user knows what they're adding.

**Why this priority**: The palette is the entry point for the entire feature — users need to see and understand what elements are available before they can drag them.

**Independent Test**: Can be tested by opening the Add Element tab and verifying all specified element types are displayed, visually distinct, and grouped logically.

**Acceptance Scenarios**:

1. **Given** the editor is connected to a target page, **When** the user clicks the "Add Element" tab in the left panel, **Then** a palette of available element types is displayed, grouped into "Structure" (`<div>`, `<section>`) and "Text" (`<h1>`–`<h6>`, `<p>`).
2. **Given** the palette is visible, **When** the user hovers over an element type, **Then** it shows a visual hover state indicating it is draggable.
3. **Given** the editor is NOT connected, **When** the user clicks the "Add Element" tab, **Then** a message displays instructing them to connect first (consistent with other inspector tabs).

---

### User Story 3 - Change Tracking for Added Elements (Priority: P2)

After adding elements to the page, the user wants those additions tracked so they can be exported in the changelog. Every element insertion is recorded with the parent element, tag type, and insertion position. The user can review added elements in the Changes tab and undo individual insertions.

**Why this priority**: Change tracking is essential for pAInt's core workflow (edit → review → export to Claude Code), but the feature is still useful for visual prototyping without it.

**Independent Test**: Can be tested by adding an element, switching to the Changes tab, verifying the addition is listed, undoing it, and confirming the element is removed from the preview.

**Acceptance Scenarios**:

1. **Given** the user has dragged a `<section>` element into the preview, **When** they open the Changes tab, **Then** the element insertion is listed with the parent selector, tag name, and timestamp.
2. **Given** an element insertion is listed in the Changes tab, **When** the user clicks "Undo" on that change, **Then** the added element is removed from the preview and the layers tree updates.
3. **Given** multiple elements have been added across different locations, **When** the user exports the changelog, **Then** all element insertions are included with sufficient detail (parent selector, tag, position) for Claude Code to reproduce them.

---

### User Story 4 - Click to Insert at Selected Element (Priority: P3)

As an alternative to drag-and-drop, the user can select a parent element in the layers tree or preview, then click an element type in the Add Element palette to insert it as the last child of the selected element. This provides a quicker workflow for users who already know where they want to insert.

**Why this priority**: This is a convenience enhancement. Drag-and-drop covers the primary use case, but click-to-insert is faster for power users who work heavily with the layers tree.

**Independent Test**: Can be tested by selecting a `<div>` in the layers tree, clicking `<p>` in the palette, and verifying a paragraph is appended inside the selected div.

**Acceptance Scenarios**:

1. **Given** a container element is selected in the preview or layers tree, **When** the user clicks a `<p>` element in the Add Element palette, **Then** a new `<p>` is appended as the last child of the selected container.
2. **Given** no element is currently selected, **When** the user clicks an element type in the palette, **Then** a tooltip or message prompts them to select a parent element first.

---

### Edge Cases

- What happens when the user drops an element onto a non-container element (e.g., an `<img>` or `<input>`)? The element should be inserted as a sibling after the target, not as a child.
- What happens when the user drops an element onto the `<body>` element? The element should be appended as the last child of `<body>`.
- What happens when the user drags an element but drops it outside the preview iframe? The drag operation should be cancelled with no side effects.
- What happens when the DOM updates (e.g., a mutation from the target page) while dragging? The drag should be cancelled gracefully.
- What happens when the user tries to add an element while disconnected? The palette should show a "Connect to inspect" message, same as other inspector tabs.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display an "Add Element" tab in the left panel alongside existing tabs (Navigator, Pages, Comps, Terminal).
- **FR-002**: The Add Element palette MUST include the following element types: `<div>`, `<section>`, `<h1>`, `<h2>`, `<h3>`, `<h4>`, `<h5>`, `<h6>`, and `<p>`.
- **FR-003**: Element types MUST be grouped into categories: "Structure" (`<div>`, `<section>`) and "Text" (`<h1>`–`<h6>`, `<p>`).
- **FR-004**: Users MUST be able to drag element types from the palette and drop them onto containers in the preview iframe to insert new elements.
- **FR-005**: System MUST display a visual drop indicator when the user hovers a dragged element over a valid drop target in the preview iframe.
- **FR-006**: System MUST insert the new element into the target page DOM at the indicated drop position.
- **FR-007**: System MUST update the layers tree to reflect newly inserted elements.
- **FR-008**: System MUST record each element insertion as a tracked change with parent selector, tag name, and insertion index.
- **FR-009**: Users MUST be able to undo element insertions from the Changes tab, which removes the element from the preview.
- **FR-010**: Element insertions MUST be included in the exported changelog with sufficient detail for reproduction.
- **FR-011**: The Add Element tab MUST only show content when the editor is connected to a target page.
- **FR-012**: Users MUST be able to click an element type in the palette to insert it as the last child of the currently selected element (alternative to drag-and-drop).
- **FR-013**: When dropping onto a non-container element (e.g., `<img>`, `<input>`, void elements), the system MUST insert the new element as a sibling after the target instead of as a child.

### Key Entities

- **Element Type**: Represents a draggable item in the palette. Has a tag name (e.g., `div`, `section`, `h1`, `p`), display label, category (Structure or Text), and an icon.
- **Element Insertion**: Represents a tracked addition to the page. Contains the parent element's selector path, the tag name of the inserted element, the insertion index (position among siblings), and a timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add any of the 9 supported element types to the preview page in under 5 seconds per element.
- **SC-002**: 100% of element insertions are tracked and visible in the Changes tab immediately after insertion.
- **SC-003**: Undoing an element insertion removes the element from both the preview and the layers tree within 1 second.
- **SC-004**: The exported changelog includes all element insertions with enough detail that they can be reproduced by reading the changelog alone.
- **SC-005**: The Add Element tab is accessible and functional within 1 click from any other left panel tab.

## Assumptions

- Heading elements include all levels (`<h1>` through `<h6>`) since the user mentioned "heading" generically and all levels are commonly needed.
- The feature does not include adding attributes, classes, or inline styles to newly created elements at insertion time — elements are inserted with default/empty content. Styling is done after insertion using the existing right panel design tools.
- Text elements (`<h1>`–`<h6>`, `<p>`) are inserted with placeholder text content (e.g., "Heading" or "Paragraph") so they are visible in the preview.
- The drag-and-drop interaction works by initiating the drag in the editor UI and communicating with the inspector script to handle the drop target detection and element insertion within the iframe.

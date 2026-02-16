# Feature Specification: Improve Navigator Layers Panel

**Feature Branch**: `006-improve-navigator-layers`
**Created**: 2026-02-16
**Status**: Draft
**Input**: User description: "Improve Navigator to show HTML5 semantic tag names, purple-pink component colors, amber for edited elements, faster accordion, and image filenames"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Semantic HTML Tag Labels (Priority: P1)

As a user inspecting a page in the Navigator, I want to see HTML5 semantic tag names (e.g., `footer`, `header`, `main`, `section`, `h1`–`h6`, `span`, `table`, `nav`) as the primary label for each element instead of the first CSS class name, so I can immediately understand the page structure like I would in a code editor's JSX view.

**Why this priority**: This is the core change — the Navigator currently displays CSS class names (e.g., `border-t`, `max-w-7xl`, `flex`) which are meaningless for understanding page structure. Showing semantic tags is the single biggest improvement for navigability.

**Independent Test**: Can be tested by connecting to any page with semantic HTML elements and verifying each node in the Layers tree shows its HTML tag name as the primary label.

**Acceptance Scenarios**:

1. **Given** a page with a `<footer>` element with classes `border-t py-8`, **When** the user views the Navigator tree, **Then** the label reads `footer` (not `border-t`).
2. **Given** a `<h2>` element with class `text-xl font-bold`, **When** displayed in the tree, **Then** the label reads `h2`.
3. **Given** a `<section>` element with no classes, **When** displayed in the tree, **Then** the label reads `section`.
4. **Given** a `<div>` element with class `flex gap-4`, **When** displayed in the tree, **Then** the label reads `div.flex` (tag + first class as qualifier since div is generic).
5. **Given** a `<span>` element with class `text-xs`, **When** displayed, **Then** the label reads `span`.
6. **Given** an element with an `id` attribute, **When** displayed, **Then** the label shows the tag name followed by `#id` (e.g., `div#hero`).

---

### User Story 2 - Purple-Pink Component Colors (Priority: P1)

As a user, I want semantic/component-level elements (nav, header, footer, main, aside, article, section) to be displayed in a purple-pink color in the Navigator tree, matching the color scheme used in modern code editors like Cursor, so that landmark elements visually stand out from generic containers.

**Why this priority**: Tied with P1 because color-coding is essential to quickly scanning the tree. Currently these elements are green, but the user wants them purple-pink to match their editor's visual language.

**Independent Test**: Can be tested by connecting to a page and verifying that semantic/component elements (header, footer, nav, section, etc.) render with a purple-pink icon and label color.

**Acceptance Scenarios**:

1. **Given** a `<footer>` element in the tree, **When** the user views it, **Then** the icon and label are rendered in a purple-pink color (approximately `#c084fc` to `#e879f9` range).
2. **Given** a `<div>` element in the tree, **When** the user views it, **Then** the icon and label remain the default neutral color (not purple-pink).
3. **Given** a component element is selected, **When** the user clicks it, **Then** the selection highlight color (blue accent) takes priority over the purple-pink color.

---

### User Story 3 - Amber Color for Edited Elements (Priority: P2)

As a user, I want elements that have been edited (have tracked style changes) to appear with an amber/orange color in the Navigator tree, so I can quickly see which parts of the page I've modified without switching to the Changes tab.

**Why this priority**: Provides important visual feedback about edit state. Depends on the change tracking system already in place.

**Independent Test**: Can be tested by selecting an element, making a style change, and verifying the corresponding tree node changes to amber color.

**Acceptance Scenarios**:

1. **Given** a `<footer>` element with no style changes, **When** the user views the tree, **Then** it appears in its default color (purple-pink for components, neutral for divs).
2. **Given** the user has changed the `background-color` of a `<footer>`, **When** viewing the tree, **Then** the footer node's label turns amber (approximately `#fbbf24`).
3. **Given** the user reverts all changes on an element, **When** viewing the tree, **Then** the node returns to its original color.
4. **Given** a parent `<div>` has no changes but a child `<span>` does, **When** viewing the tree, **Then** only the `<span>` node is amber — the parent remains unchanged.

---

### User Story 4 - Image Element Filenames (Priority: P2)

As a user, I want `<img>` elements in the Navigator to show the image filename extracted from the `src` attribute (e.g., `img logo.png`), so I can identify which image is which without clicking each one.

**Why this priority**: Images are common elements and currently show as generic labels. Filenames provide immediate identification.

**Independent Test**: Can be tested by connecting to a page with images and verifying each img node displays its filename.

**Acceptance Scenarios**:

1. **Given** an `<img>` with `src="/images/logo.png"`, **When** displayed in the tree, **Then** the label reads `img logo.png`.
2. **Given** an `<img>` with `src="https://cdn.example.com/assets/hero-banner.jpg?v=2"`, **When** displayed, **Then** the label reads `img hero-banner.jpg` (strips path and query params).
3. **Given** an `<img>` with no `src` attribute, **When** displayed, **Then** the label reads `img`.
4. **Given** an `<img>` with `alt="Company Logo"` but no meaningful filename (e.g., `src="data:image/png;base64,..."`), **When** displayed, **Then** the label reads `img` (falls back to tag name, does not show base64 data).

---

### User Story 5 - Faster Accordion Expand/Collapse (Priority: P1)

As a user, I want the tree accordion (expand/collapse of child nodes) to respond instantly and animate smoothly when I click the toggle arrow, because currently it feels heavy or sometimes doesn't respond.

**Why this priority**: Core usability issue — if expanding/collapsing nodes is laggy, the entire Navigator becomes frustrating to use.

**Independent Test**: Can be tested by rapidly toggling expand/collapse on nodes with many children and verifying smooth, instant response.

**Acceptance Scenarios**:

1. **Given** a node with 20+ children, **When** the user clicks the expand arrow, **Then** children appear within 100ms with no visible jank or frame drops.
2. **Given** an expanded node with deeply nested children, **When** the user clicks collapse, **Then** children hide instantly.
3. **Given** the user rapidly toggles a node 5 times in quick succession, **When** the animations complete, **Then** the final state correctly reflects odd (expanded) or even (collapsed) number of clicks.
4. **Given** a tree with 200+ total nodes, **When** the user expands/collapses any node, **Then** the interaction remains responsive with no blocking or lag.

---

### Edge Cases

- What happens when an element has no tag name, no class, and no id? Display the tag name (`div`, `span`, etc.) as fallback.
- What happens with custom web components (e.g., `<my-widget>`)? Display the full tag name as the label.
- What if an image `src` contains only a path with no filename (e.g., `src="/api/image/123"`)? Display `img` with the last path segment: `img 123`.
- What if multiple elements are edited and then a "Reset All" is performed? All amber indicators should revert to default colors.
- What happens with very long filenames? Truncate with ellipsis after ~20 characters.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Navigator MUST display the HTML5 semantic tag name as the primary label for all elements (e.g., `footer`, `header`, `h1`, `section`, `span`, `table`, `nav`, `ul`, `li`, `form`, `input`, `button`, `a`).
- **FR-002**: For generic `<div>` elements, Navigator MUST display `div` followed by the first class name as a qualifier (e.g., `div.flex`, `div.container`). If no class exists, display `div` alone.
- **FR-003**: For elements with an `id`, Navigator MUST append `#id` to the tag name (e.g., `footer#site-footer`, `div#hero`).
- **FR-004**: Semantic/component elements (nav, header, footer, main, aside, article, section) MUST be displayed in a purple-pink color for both icon and label text.
- **FR-005**: Elements with tracked style changes MUST be displayed in amber color (`#fbbf24`), overriding the default or purple-pink color.
- **FR-006**: When all style changes on an element are reverted, the element MUST return to its original color.
- **FR-007**: Selected elements MUST use the blue accent color, taking priority over both purple-pink and amber colors.
- **FR-008**: `<img>` elements MUST display the filename extracted from the `src` attribute (last segment of the URL path, stripped of query parameters).
- **FR-009**: Image labels with base64 data URIs or empty `src` MUST fall back to displaying `img` alone.
- **FR-010**: Accordion expand/collapse MUST respond within 100ms of user click with no visible jank.
- **FR-011**: Accordion state changes MUST not cause re-renders of sibling or unrelated nodes in the tree.
- **FR-012**: The color priority order MUST be: selected (blue accent) > edited (amber) > component (purple-pink) > default (neutral).

### Key Entities

- **TreeNode**: Represents a DOM element in the layer tree. Key attributes: tag name, class name, element id, children, expanded state. Extended with: image src for img elements.
- **StyleChange**: Represents an edit tracked by the change system. Links to an element via its selector path.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can identify the HTML structure of a page (header, footer, nav, sections) by reading the Navigator tree without inspecting individual elements — at least 90% of semantic elements show their tag name as the primary label.
- **SC-002**: Users can visually distinguish component/landmark elements from generic containers in under 1 second by their purple-pink color.
- **SC-003**: Users can identify which elements have been edited by scanning the tree for amber-colored nodes, without opening the Changes tab.
- **SC-004**: Users can identify images by filename in the Navigator without clicking on each image element.
- **SC-005**: Accordion expand/collapse completes within 100ms for trees with up to 500 nodes, with no frame drops below 30fps.

## Assumptions

- The purple-pink color will be in the `#c084fc` to `#e879f9` range (Tailwind purple-400 to fuchsia-400). Exact shade to be determined during implementation.
- The amber color for edited elements uses `#fbbf24` (Tailwind amber-400), consistent with the existing warning color in the editor palette.
- Image filenames are extracted from the `src` attribute only — `srcset` and `<picture>` source elements are not parsed for filenames.
- The accordion performance improvement focuses on avoiding unnecessary re-renders rather than adding CSS animations (the current 0.15s arrow rotation transition is sufficient).
- The `TreeNode` type may need an additional field (e.g., `imgSrc`) to carry the image source from the inspector to the editor.

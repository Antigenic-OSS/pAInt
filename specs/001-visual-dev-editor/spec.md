# Feature Specification: Visual pAInt

**Feature Branch**: `001-visual-dev-editor`
**Created**: 2026-02-14
**Status**: Draft
**Input**: User description: "Visual dev editor for localhost web projects — inspect elements, edit styles visually, drag-and-drop reposition, and generate changelogs for Claude Code"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Connect & Preview (Priority: P1)

A developer has a running localhost project (any framework — Next.js, Vite, CRA, Astro, etc.). They open pAInt, type their localhost URL into the address bar, click Connect, and see their live site rendered inside the editor's center preview panel. The left panel populates with a DOM tree and the right panel is ready for property editing.

**Why this priority**: Nothing else in the editor works until a target page is loaded. This is the foundational entry point that unlocks all subsequent features.

**Independent Test**: Start a localhost dev server, open pAInt, enter the URL, press Connect. Verify the page renders in the center iframe, the connection dot turns green, the DOM tree appears in the left panel, and the URL is saved to recent URLs.

**Acceptance Scenarios**:

1. **Given** pAInt is open with no target connected, **When** the developer enters `http://localhost:3000` and clicks Connect, **Then** the center preview loads the proxied page, the connection dot turns green, and the left panel shows the DOM tree.
2. **Given** the developer previously connected to `http://localhost:3000`, **When** they click the URL input dropdown, **Then** the recent URL appears and can be selected for quick reconnection.
3. **Given** the developer enters `https://google.com`, **When** they click Connect, **Then** validation rejects the URL with "Only localhost URLs are supported."
4. **Given** the target dev server is not running, **When** the developer connects, **Then** the dot turns red and a message reads "Cannot connect — check that your dev server is running."

---

### User Story 2 — Inspect & Select Elements (Priority: P1)

A developer hovers over elements in the center preview to see blue overlay highlights, then clicks to select an element. The selection syncs bidirectionally — clicking in the preview highlights the tree node in the left panel; clicking a tree node highlights the element in the preview. The right panel populates with computed style properties.

**Why this priority**: Element selection is the prerequisite for all editing features. Without inspect and select, the style editor, change tracking, and drag-and-drop have no target to operate on.

**Independent Test**: Connect to a target page, hover over elements in the preview (verify blue highlights), click an element (verify persistent selection highlight), verify the left panel tree scrolls to the corresponding node, and verify the right panel Design tab shows style properties.

**Acceptance Scenarios**:

1. **Given** a target page is loaded, **When** the developer hovers over a heading in the preview, **Then** a blue overlay highlights the heading.
2. **Given** a target page is loaded, **When** the developer clicks a heading in the preview, **Then** the heading gets a persistent selection highlight, the left panel tree scrolls to and highlights the matching node, and the right panel Design tab shows the element's computed styles.
3. **Given** a target page is loaded, **When** the developer clicks a node in the left panel tree, **Then** the corresponding element in the preview receives a selection highlight and scrolls into view.
4. **Given** an element is selected, **When** the developer presses Escape, **Then** the selection clears from the preview, left panel, and right panel.

---

### User Story 3 — Edit Styles Visually (Priority: P1)

A developer selects an element and edits its style properties through the right panel Design tab — numeric values (font-size, padding), colors (background, text), layout modes (flex, grid), and spacing (box model). Every edit applies instantly in the preview via inline styles.

**Why this priority**: Visual style editing is the core value proposition. It transforms the editor from a read-only inspector into an interactive design tool.

**Independent Test**: Select an element, change its font-size in the Typography section, verify the text grows in the preview. Change its background color via the color picker, verify the color updates in real time.

**Acceptance Scenarios**:

1. **Given** a heading element is selected, **When** the developer changes font-size from 24px to 32px in the right panel, **Then** the heading in the preview instantly grows larger.
2. **Given** a section element is selected, **When** the developer changes background color via the color picker, **Then** the section's background updates in real time as the developer drags the picker.
3. **Given** a container element is selected, **When** the developer changes display from block to flex in the Layout section, **Then** flex-specific controls appear and children reflow immediately in the preview.
4. **Given** an element is selected, **When** the developer edits the top padding in the Spacing section from 16px to 24px, **Then** the padding updates instantly in the preview.

---

### User Story 4 — Track & Export Changes (Priority: P2)

A developer makes multiple style edits across several elements. All changes are tracked in the right panel Changes tab with original and new values, grouped by element. The developer can undo individual changes, clear all changes, or export a formatted changelog designed for pasting into Claude Code.

**Why this priority**: Without change tracking and export, visual edits are ephemeral. This story closes the loop from visual tweaking to source code updates.

**Independent Test**: Make 3 style changes across 2 elements, verify the Changes tab shows all changes grouped by element with a badge count of 3. Click "Copy Changelog," paste into a text editor, verify the structured format includes element selectors, property changes, and instructions for Claude Code.

**Acceptance Scenarios**:

1. **Given** the developer changes font-size and font-weight on a heading, **When** they open the Changes tab, **Then** both changes appear grouped under the heading's CSS selector path with original and new values.
2. **Given** 3 changes are tracked, **When** the developer clicks undo on one change, **Then** that property reverts in the preview, the change is removed from the list, and the badge count decrements to 2.
3. **Given** changes exist, **When** the developer clicks "Clear All" and confirms, **Then** all inline style overrides are removed from the preview and the Changes tab shows an empty state.
4. **Given** changes exist across 2 elements, **When** the developer clicks "Copy Changelog," **Then** the clipboard contains a structured changelog with project URL, page path, timestamp, breakpoint context, element selectors, property changes with original-to-new values, a summary line, and instructions for Claude Code.

---

### User Story 5 — Responsive Breakpoint Testing (Priority: P2)

A developer switches between Mobile (375px), Tablet (768px), and Desktop (1280px) breakpoint tabs in the top bar. The preview iframe resizes accordingly, the page layout reflows, and changes made at a specific breakpoint are tagged with that breakpoint context in the changelog.

**Why this priority**: Responsive testing is essential for modern web development, and breakpoint tagging ensures the changelog is actionable for media-query-based code changes.

**Independent Test**: Click the Mobile tab, verify the preview constrains to 375px width and the page reflows. Make a change, export the changelog, verify the breakpoint context reads "Mobile (375px)."

**Acceptance Scenarios**:

1. **Given** the editor is on Desktop breakpoint, **When** the developer clicks the Mobile (375px) tab, **Then** the preview iframe constrains to 375px width (centered) and the page layout reflows.
2. **Given** the developer is on Mobile breakpoint, **When** they edit a style property, **Then** the change is tracked with "Mobile (375px)" breakpoint context.
3. **Given** changes were made at Mobile breakpoint, **When** the developer exports the changelog, **Then** the breakpoint field reads "Mobile (375px)."

---

### User Story 6 — Navigate Between Pages (Priority: P2)

A developer uses the PageSelector dropdown in the top bar to navigate between pages within the target project. The preview updates, the inspector re-injects, and the DOM tree refreshes. Changes from previous pages persist and are included in the combined changelog export.

**Why this priority**: Real projects have multiple pages. Multi-page editing support ensures the editor is useful beyond single-page tweaks.

**Independent Test**: Connect to a multi-page project, select a different page from the dropdown, verify the preview loads the new page, the left panel tree refreshes, and previously tracked changes from the first page still appear in the changelog export.

**Acceptance Scenarios**:

1. **Given** the developer is viewing the homepage, **When** they select "/about" from the PageSelector dropdown, **Then** the preview navigates to the proxied /about page, the left panel tree refreshes, and the inspector re-injects.
2. **Given** changes were made on the homepage, **When** the developer navigates to /about and back to /, **Then** the homepage changes are still available in the Changes tab (persisted).
3. **Given** changes exist on two different pages, **When** the developer exports the changelog, **Then** changes from both pages are included.

---

### User Story 7 — Drag & Drop Repositioning (Priority: P3)

A developer toggles between Free Position mode (drag elements to arbitrary positions) and Sibling Reorder mode (drag elements to reorder within a container). Position and reorder changes are tracked in the changelog alongside style changes.

**Why this priority**: Drag-and-drop is an advanced visual editing capability that builds on top of the core inspect/edit/track flow. It adds significant power but is not required for the MVP.

**Independent Test**: Enable Free Position mode, drag an element to a new position, verify position properties update in the right panel and a grouped position change appears in the Changes tab. Switch to Reorder mode, drag a card to a new position among siblings, verify the DOM reorders and a reorder entry appears.

**Acceptance Scenarios**:

1. **Given** Free Position mode is active and an element is selected, **When** the developer drags it 24px down and 12px left, **Then** the element moves on the page, the Position section shows updated coordinates, and the Changes tab records a grouped position change (position, top, left).
2. **Given** Reorder mode is active, **When** the developer drags the 3rd card to the 1st position, **Then** the DOM reorders, the layout reflows, the left panel tree updates, and the Changes tab records the reorder with original and new index.
3. **Given** the developer turns drag mode Off, **Then** normal click-to-select behavior resumes and all position/reorder changes remain tracked.

---

### User Story 8 — Claude Code API Integration (Priority: P3)

A developer sends their changelog directly to Claude Code via the built-in API integration. Claude analyzes the project source files, generates code diffs (converting to Tailwind classes, updating CSS modules), and the developer reviews syntax-highlighted diffs in the right panel before applying changes to source files.

**Why this priority**: Direct Claude Code integration is the premium workflow that automates the manual copy-paste-apply cycle. It requires the full change tracking pipeline to be in place first.

**Independent Test**: Configure project root, make visual changes, click "Send to Claude Code," verify a progress indicator appears, review the returned diffs in the DiffViewer, click "Apply All," verify source files are updated.

**Acceptance Scenarios**:

1. **Given** Claude CLI is available and project root is configured, **When** the developer clicks "Send to Claude Code" with pending changes, **Then** a progress spinner appears, and after analysis completes, the right panel shows a summary card and syntax-highlighted diff cards for each affected file.
2. **Given** diffs are displayed, **When** the developer clicks "Apply All" and confirms, **Then** Claude CLI applies the changes to source files, and the dev server hot-reloads the preview.
3. **Given** Claude CLI is not installed, **When** the developer clicks "Send to Claude Code," **Then** a setup flow appears with steps to install the CLI and set the project root.
4. **Given** Claude CLI is available but not configured, **When** the developer clicks "Send to Claude Code" for the first time, **Then** a setup flow prompts for CLI verification and project root path.

---

### Edge Cases

- **Target dev server restarts**: The editor detects the disconnect, shows a red connection dot and "Disconnected — retrying...", then auto-reconnects when the server comes back.
- **Selected element removed from DOM**: If the currently selected element is removed by a dynamic update, the selection clears and the right panel shows "Selected element was removed from the page."
- **Live DOM mutations**: MutationObserver keeps the left panel tree in sync with dynamic changes (client-side navigation, React state updates).
- **Non-draggable elements**: `<body>`, `<html>`, and fixed/sticky elements cannot be dragged — a tooltip explains why.
- **Drag during DOM mutation**: If the selected element is removed during an active drag, the drag cancels gracefully.
- **Claude CLI timeout**: If analysis exceeds 120 seconds, the UI suggests trying with fewer changes.
- **Malformed Claude response**: Raw response text is shown with a "Copy to Clipboard" fallback.
- **Page refresh in iframe**: The inspector re-injects on reload. Live preview overrides are lost but tracked changes persist and can be re-applied.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a target URL input in the top bar where users enter any localhost URL to connect.
- **FR-002**: System MUST validate that URLs are localhost or 127.0.0.1 only before proxying.
- **FR-003**: System MUST render the target page inside the center preview via a reverse proxy that injects the inspector script.
- **FR-004**: System MUST display a connection status indicator (green/orange/red) next to the URL input.
- **FR-005**: System MUST persist recently used target URLs and display them in a dropdown for quick switching.
- **FR-006**: System MUST display a navigable DOM tree in the left panel reflecting the target page's structure.
- **FR-007**: System MUST highlight elements on hover in the preview with a blue overlay.
- **FR-008**: System MUST support click-to-select on elements in both the preview and the left panel tree with bidirectional sync.
- **FR-009**: System MUST populate the right panel Design tab with computed style properties for the selected element.
- **FR-010**: System MUST apply style edits in real time via inline styles on the target page.
- **FR-011**: System MUST provide visual editing controls for size, spacing (box model), typography, border, color, layout (flex/grid), and position properties.
- **FR-012**: System MUST track all style modifications with original and new values, grouped by element, in the Changes tab.
- **FR-013**: System MUST allow undoing individual changes and clearing all changes with confirmation.
- **FR-014**: System MUST generate a structured, human-readable changelog suitable for Claude Code.
- **FR-015**: System MUST support responsive breakpoint tabs (Mobile 375px, Tablet 768px, Desktop 1280px) that resize the preview.
- **FR-016**: System MUST support page navigation within the target project via a PageSelector dropdown.
- **FR-017**: System MUST support free-position drag (relative positioning) and sibling reorder drag (DOM node reordering).
- **FR-018**: System MUST track position and reorder changes in the changelog alongside style changes.
- **FR-019**: System MUST provide an API integration that sends changelogs to Claude Code CLI for analysis and returns code diffs.
- **FR-020**: System MUST display syntax-highlighted diffs and allow the user to apply them to source files.
- **FR-021**: System MUST persist changes, recent URLs, project settings, and panel sizes across page refreshes.
- **FR-022**: System MUST auto-reconnect when the target dev server restarts.
- **FR-023**: System MUST keep the DOM tree in sync with live mutations.

### Key Entities

- **TargetConnection**: Represents the connection to a localhost dev server — URL, connection status (connected/connecting/disconnected), recent URLs history.
- **SelectedElement**: The currently inspected element — CSS selector path, computed styles, DOM position in tree.
- **StyleChange**: A single property modification — element selector, property name, original value, new value, breakpoint context.
- **PositionChange**: A free-position drag result — element selector, position/top/left values (original and new), grouped as a single action.
- **ReorderChange**: A sibling reorder result — parent selector, child selector, original index, new index.
- **Changelog**: The aggregate export — project URL, page path, timestamp, breakpoint, all changes grouped by element, summary counts.
- **ClaudeAnalysis**: Result of sending a changelog to Claude Code — session ID, parsed diffs per file, summary, apply status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can connect to any localhost dev server and see the live preview within 3 seconds of clicking Connect.
- **SC-002**: Hover highlighting responds within 50ms of cursor movement (perceived as instant).
- **SC-003**: Style edits apply to the preview within 100ms of input change (perceived as real-time).
- **SC-004**: Users can complete the full workflow (connect, inspect, edit 3 properties, export changelog) in under 2 minutes on first use.
- **SC-005**: Exported changelogs are accepted by Claude Code without manual reformatting in 95%+ of cases.
- **SC-006**: Drag-and-drop repositioning maintains 60fps visual performance during the drag gesture.
- **SC-007**: All tracked changes survive a page refresh and can be re-exported.
- **SC-008**: The editor gracefully recovers from target server restarts without losing tracked changes.
- **SC-009**: Users who have not installed Claude CLI can still use the full visual editing and changelog copy workflow without errors or blocking prompts.
- **SC-010**: Three-column layout remains usable at browser window widths of 1024px and above.

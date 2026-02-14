---
description: "Task list for Visual Dev Editor feature implementation"
---

# Tasks: Visual Dev Editor

**Input**: Design documents from `/specs/001-visual-dev-editor/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the spec. Manual verification per phase.

**Organization**: Tasks grouped by user story (8 stories across 3 priority tiers).

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single Next.js project: `src/` at repository root
- Config files at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project scaffolding, config, shared types, and Zustand store skeleton

- [x] T001 Initialize Next.js 15 project with Bun: `bun create next-app`, configure `package.json` scripts (`bun dev`, `bun run build`)
- [x] T002 Configure Tailwind CSS 4 with `class` dark mode strategy in `tailwind.config.ts` and dark palette CSS custom properties in `src/app/globals.css`
- [x] T003 Configure TypeScript strict mode in `tsconfig.json`
- [x] T004 [P] Create postMessage type definitions in `src/types/messages.ts` (all 17 message types from postMessage contract)
- [x] T005 [P] Create element type definitions in `src/types/element.ts` (SelectedElement, BoundingRect)
- [x] T006 [P] Create tree type definitions in `src/types/tree.ts` (TreeNode interface)
- [x] T007 [P] Create changelog type definitions in `src/types/changelog.ts` (StyleChange, Breakpoint enum)
- [x] T008 [P] Create drag type definitions in `src/types/drag.ts` (DragMode, PositionChange, ReorderChange)
- [x] T009 [P] Create Claude type definitions in `src/types/claude.ts` (ClaudeRequest, ClaudeResponse, ParsedDiff, DiffHunk, ClaudeError)
- [x] T010 [P] Create constants file in `src/lib/constants.ts` (message types, breakpoints, CSS properties list, dark mode tokens, localStorage keys)
- [x] T011 [P] Create utility functions in `src/lib/utils.ts` (CSS selector generation, CSS value parsing, URL validation for localhost)
- [x] T012 Create Zustand store skeleton with slice composition in `src/store/index.ts`
- [x] T013 [P] Implement uiSlice in `src/store/uiSlice.ts` (targetUrl, connectionStatus, recentUrls, breakpoint, dragMode, panel visibility/width, activeRightTab)
- [x] T014 [P] Implement elementSlice in `src/store/elementSlice.ts` (selectorPath, tagName, className, id, computedStyles, boundingRect)
- [x] T015 [P] Implement treeSlice in `src/store/treeSlice.ts` (rootNode, searchQuery, highlightedNodeId)
- [x] T016 [P] Implement changeSlice in `src/store/changeSlice.ts` (styleChanges, positionChanges, reorderChanges, add/remove/clear actions)
- [x] T017 [P] Implement claudeSlice in `src/store/claudeSlice.ts` (status, projectRoot, cliAvailable, sessionId, parsedDiffs, error)

**Checkpoint**: Project builds with `bun dev`, all types and store compile without errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T018 Create root layout with dark mode class and font setup in `src/app/layout.tsx`
- [x] T019 Create main editor page with three-column layout shell in `src/app/page.tsx`
- [x] T020 Create Editor component (three-column flex container: left + center + right) in `src/components/Editor.tsx`
- [x] T021 Create ResizablePanel component with drag handles in `src/components/common/ResizablePanel.tsx`
- [x] T022 Implement useResizable hook (panel resize logic, min/max constraints, localStorage persistence) in `src/hooks/useResizable.ts`
- [x] T023 Create reverse proxy API route in `src/app/api/proxy/[...path]/route.ts` (forward to target, inject inspector script into HTML, validate localhost-only, passthrough non-HTML assets)
- [x] T024 Create inspector entry point in `src/inspector/inspector.ts` (initialize modules, send INSPECTOR_READY via postMessage)
- [x] T025 Create inspector messaging bridge in `src/inspector/messaging.ts` (postMessage send/receive with origin checking, message type dispatch)
- [x] T026 Implement usePostMessage hook in `src/hooks/usePostMessage.ts` (listen for iframe messages, origin validation, dispatch to store actions)
- [x] T027 Configure inspector script bundling (IIFE output) in build pipeline so proxy can serve it

**Checkpoint**: App loads in dark mode, three-column layout renders with resizable panels, proxy forwards requests to a target localhost, inspector script injects and sends INSPECTOR_READY.

---

## Phase 3: User Story 1 — Connect & Preview (Priority: P1)

**Goal**: Developer can enter a localhost URL and see their project rendered in the editor's center preview.

**Independent Test**: Start a localhost dev server, open Dev Editor, enter the URL, click Connect. Verify the page renders, the connection dot turns green, and the URL is saved to recent URLs.

### Implementation for User Story 1

- [x] T028 [US1] Create TopBar component shell (logo, URL input area, placeholder buttons) in `src/components/TopBar.tsx`
- [x] T029 [US1] Create TargetSelector component (text input, Connect button, connection status dot, recent URLs dropdown, localhost validation) in `src/components/TargetSelector.tsx`
- [x] T030 [US1] Implement useTargetUrl hook (connect, disconnect, auto-reconnect lifecycle, recent URLs management, localStorage persistence) in `src/hooks/useTargetUrl.ts`
- [x] T031 [US1] Create PreviewFrame component (iframe container, set src to proxy URL on connect, responsive sizing) in `src/components/PreviewFrame.tsx`
- [x] T032 [US1] Create left panel skeleton (collapsible container, ~240px, empty state "Connect to inspect") in `src/components/left-panel/LeftPanel.tsx`
- [x] T033 [US1] Create right panel skeleton (collapsible container, ~300px, Design/Changes tabs, empty state "Select an element") in `src/components/right-panel/RightPanel.tsx`
- [x] T034 [US1] Create PanelTabs component (Design / Changes tab switcher with badge slot) in `src/components/right-panel/PanelTabs.tsx`
- [x] T035 [US1] Wire connection status: INSPECTOR_READY message sets connectionStatus to connected in uiSlice, triggers REQUEST_DOM_TREE
- [x] T036 [US1] Implement disconnection detection and auto-reconnect (heartbeat polling, red dot + "Disconnected — retrying..." message)

**Checkpoint**: Developer can type `http://localhost:3000`, click Connect, see the page in the center iframe, green dot appears, URL persists in recent URLs dropdown.

---

## Phase 4: User Story 2 — Inspect & Select Elements (Priority: P1)

**Goal**: Developer can hover to highlight elements and click to select them with bidirectional sync between preview and tree.

**Independent Test**: Hover over elements in preview (blue highlights), click an element (persistent highlight, tree syncs, right panel shows computed styles), click tree node (preview syncs).

### Implementation for User Story 2

- [x] T037 [P] [US2] Create DOMTraverser in `src/inspector/DOMTraverser.ts` (serialize DOM to TreeNode structure, handle text nodes, skip script/style elements)
- [x] T038 [P] [US2] Create HoverHighlighter in `src/inspector/HoverHighlighter.ts` (blue overlay following cursor via mousemove in capture phase, send ELEMENT_HOVERED)
- [x] T039 [P] [US2] Create ElementSelector in `src/inspector/ElementSelector.ts` (capture-phase click handler, prevent default, send ELEMENT_SELECTED with computed styles)
- [x] T040 [P] [US2] Create SelectionHighlighter in `src/inspector/SelectionHighlighter.ts` (persistent outline on selected element, clear on deselect)
- [x] T041 [P] [US2] Create StyleExtractor in `src/inspector/StyleExtractor.ts` (getComputedStyle reader, extract relevant CSS properties for the Design tab)
- [x] T042 [US2] Wire inspector modules in `src/inspector/inspector.ts` (initialize DOMTraverser, HoverHighlighter, ElementSelector, SelectionHighlighter, StyleExtractor; handle incoming SELECT_ELEMENT and REQUEST_DOM_TREE messages)
- [x] T043 [US2] Create LayersPanel component (recursive DOM tree view, Webflow Navigator style) in `src/components/left-panel/LayersPanel.tsx`
- [x] T044 [US2] Create LayerNode component (expandable/collapsible tree node, element icon, click to select, highlight on active) in `src/components/left-panel/LayerNode.tsx`
- [x] T045 [US2] Create LayerSearch component (search/filter bar at top of left panel, filter tree nodes by tag/class/id) in `src/components/left-panel/LayerSearch.tsx`
- [x] T046 [US2] Implement useDOMTree hook (receive DOM_TREE and DOM_UPDATED messages, update treeSlice, handle MutationObserver updates) in `src/hooks/useDOMTree.ts`
- [x] T047 [US2] Implement useSelectedElement hook (receive ELEMENT_SELECTED, update elementSlice, send SELECT_ELEMENT for tree-click sync) in `src/hooks/useSelectedElement.ts`
- [x] T048 [US2] Wire bidirectional selection sync: click in preview → highlight tree node + scroll into view; click tree node → send SELECT_ELEMENT to inspector + highlight in preview
- [x] T049 [US2] Implement Escape key handler to deselect (clear selection in elementSlice, send deselect to inspector)
- [x] T050 [US2] Add MutationObserver to inspector in `src/inspector/DOMTraverser.ts` (detect DOM changes, re-serialize tree, send DOM_UPDATED, handle removed selected element)

**Checkpoint**: Hover shows blue highlights, click selects with persistent outline, left panel tree syncs bidirectionally, right panel shows "Select an element" with computed styles when selected.

---

## Phase 5: User Story 3 — Edit Styles Visually (Priority: P1)

**Goal**: Developer selects an element and edits style properties through the right panel Design tab with live preview.

**Independent Test**: Select an element, change font-size in Typography section (text grows in preview), change background color (updates in real time).

### Implementation for User Story 3

- [x] T051 [P] [US3] Create CollapsibleSection component (expandable/collapsible section wrapper with title) in `src/components/common/CollapsibleSection.tsx`
- [x] T052 [P] [US3] Create PropertyInput component (reusable number+unit input with increment/decrement) in `src/components/right-panel/design/PropertyInput.tsx`
- [x] T053 [P] [US3] Create UnitInput component (value input with unit selector dropdown: px, %, em, rem, auto) in `src/components/common/UnitInput.tsx`
- [x] T054 [P] [US3] Create ColorPicker component (dark-themed inline color picker for background/text colors) in `src/components/common/ColorPicker.tsx`
- [x] T055 [US3] Create DesignPanel component (scrollable container hosting all property sections) in `src/components/right-panel/design/DesignPanel.tsx`
- [x] T056 [US3] Create ElementBreadcrumb component (element path at top of Design tab, e.g., `body > main > section.hero > h1`) in `src/components/right-panel/design/ElementBreadcrumb.tsx`
- [x] T057 [P] [US3] Create SizeSection component (width, height, overflow with unit selectors) in `src/components/right-panel/design/SizeSection.tsx`
- [x] T058 [P] [US3] Create SpacingSection component (visual box model diagram with editable margin/padding values) in `src/components/right-panel/design/SpacingSection.tsx`
- [x] T059 [P] [US3] Create TypographySection component (font family dropdown, size, weight, line-height, text alignment) in `src/components/right-panel/design/TypographySection.tsx`
- [x] T060 [P] [US3] Create BorderSection component (width, radius with linked/unlinked corners, color, border style) in `src/components/right-panel/design/BorderSection.tsx`
- [x] T061 [P] [US3] Create ColorSection component (background + text color swatches with inline ColorPicker) in `src/components/right-panel/design/ColorSection.tsx`
- [x] T062 [P] [US3] Create LayoutSection component (display mode dropdown, flex controls: direction/justify/align/gap, grid controls) in `src/components/right-panel/design/LayoutSection.tsx`
- [x] T063 [P] [US3] Create PositionSection component (X/Y coordinates, position type dropdown) in `src/components/right-panel/design/PositionSection.tsx`
- [x] T064 [US3] Wire PREVIEW_CHANGE: each property edit sends postMessage to inspector, inspector calls `element.style.setProperty(prop, value, 'important')`
- [x] T065 [US3] Wire REVERT_CHANGE in inspector: handle `element.style.removeProperty(property)` and REVERT_ALL to clear all inline overrides

**Checkpoint**: Select an element, right panel Design tab shows all property sections populated with computed values, edit any property → live preview updates in iframe.

---

## Phase 6: User Story 4 — Track & Export Changes (Priority: P2)

**Goal**: All style edits are tracked with original/new values, undoable, and exportable as a structured changelog.

**Independent Test**: Make 3 style changes across 2 elements, verify Changes tab shows grouped changes with badge count, copy changelog to clipboard, verify structured format.

### Implementation for User Story 4

- [x] T066 [US4] Implement useChangeTracker hook (intercept style edits, capture original value before change, create StyleChange entries, add to changeSlice) in `src/hooks/useChangeTracker.ts`
- [x] T067 [US4] Create ChangesPanel component (list of tracked changes grouped by element selector, empty state when no changes) in `src/components/right-panel/changes/ChangesPanel.tsx`
- [x] T068 [US4] Create ChangeEntry component (single change row: property name, original→new values, undo button) in `src/components/right-panel/changes/ChangeEntry.tsx`
- [x] T069 [US4] Create ChangelogActions component (Copy Changelog button, Clear All button with confirmation dialog) in `src/components/right-panel/changes/ChangelogActions.tsx`
- [x] T070 [US4] Implement changelog formatting in `src/lib/utils.ts` (generate structured text: header with project URL/page/timestamp/breakpoint, changes grouped by element, summary line, Claude Code instructions)
- [x] T071 [US4] Wire undo single change: click undo → send REVERT_CHANGE to inspector → remove from changeSlice
- [x] T072 [US4] Wire Clear All: confirmation dialog → send REVERT_ALL to inspector → clear all changes in changeSlice
- [x] T073 [US4] Wire badge count on Changes tab in PanelTabs (show changeCount from changeSlice)
- [x] T074 [US4] Wire APPLY button in TopBar: click → switch activeRightTab to 'changes'
- [x] T075 [US4] Implement localStorage persistence for changes (save/load keyed by `dev-editor:changes:{url}:{path}`)

**Checkpoint**: Make changes, Changes tab tracks them with badge count, undo reverts in preview, Copy Changelog produces structured text, changes survive page refresh.

---

## Phase 7: User Story 5 — Responsive Breakpoint Testing (Priority: P2)

**Goal**: Developer can switch breakpoints and changes are tagged with breakpoint context.

**Independent Test**: Click Mobile tab, preview constrains to 375px, make a change, export changelog shows "Mobile (375px)".

### Implementation for User Story 5

- [x] T076 [US5] Create BreakpointTabs component (Mobile 375 | Tablet 768 | Desktop 1280 centered tabs, active state styling) in `src/components/BreakpointTabs.tsx`
- [x] T077 [US5] Create ViewportController in `src/inspector/ViewportController.ts` (constrain page width per breakpoint, handle SET_BREAKPOINT message)
- [x] T078 [US5] Wire breakpoint switching: click tab → update activeBreakpoint in uiSlice → resize iframe container width → send SET_BREAKPOINT to inspector
- [x] T079 [US5] Wire breakpoint context into changelog: include activeBreakpoint in each StyleChange and in the changelog export header

**Checkpoint**: Switch breakpoints, iframe resizes, layout reflows, changelog includes breakpoint context.

---

## Phase 8: User Story 6 — Navigate Between Pages (Priority: P2)

**Goal**: Developer can navigate between pages in the target project without losing tracked changes.

**Independent Test**: Navigate from homepage to /about, verify preview and tree refresh, navigate back, verify homepage changes are still tracked.

### Implementation for User Story 6

- [x] T080 [US6] Create PageSelector component (dropdown showing available pages, scan links from current page) in `src/components/PageSelector.tsx`
- [x] T081 [US6] Wire REQUEST_PAGE_LINKS / PAGE_LINKS: on page load, inspector scans `<a>` tags for internal links, sends list to editor for PageSelector dropdown
- [x] T082 [US6] Wire page navigation: select page from dropdown → update iframe src → inspector re-injects on new page → DOM tree refreshes → previous page changes remain in localStorage

**Checkpoint**: Navigate between pages, tree refreshes, changes from previous page persist, multi-page changelog exports correctly.

---

## Phase 9: User Story 7 — Drag & Drop Repositioning (Priority: P3)

**Goal**: Developer can drag elements to reposition (free position) or reorder (sibling reorder) with tracked changes.

**Independent Test**: Enable Free Position mode, drag an element, verify position change tracked. Switch to Reorder, drag among siblings, verify reorder change tracked.

### Implementation for User Story 7

- [x] T083 [US7] Create DragModeToggle component (Off / Free Position / Reorder dropdown in top bar) in `src/components/DragModeToggle.tsx`
- [x] T084 [US7] Create DragHandler orchestrator in `src/inspector/drag/DragHandler.ts` (mode toggle, mousedown/mousemove/mouseup in capture phase, delegate to active strategy, suppress HoverHighlighter during drag)
- [x] T085 [US7] Create drag types in `src/inspector/drag/types.ts` (inspector-side DragState, SnapGuide, DropIndicator)
- [x] T086 [P] [US7] Create FreePositionStrategy in `src/inspector/drag/FreePositionStrategy.ts` (set position: relative + top/left, guide line snapping to parent edges and sibling centers, requestAnimationFrame throttling)
- [x] T087 [P] [US7] Create SiblingReorderStrategy in `src/inspector/drag/SiblingReorderStrategy.ts` (insertBefore DOM reorder, drop indicator lines between siblings, cached sibling rects)
- [x] T088 [US7] Create DragOverlay in `src/inspector/drag/DragOverlay.ts` (render ghost element, guide lines, drop indicators inside iframe)
- [x] T089 [US7] Wire DRAG_MODE_CHANGED: toggle in TopBar → update dragMode in uiSlice → send DRAG_MODE_CHANGED to inspector → DragHandler activates/deactivates strategy
- [x] T090 [US7] Wire POSITION_CHANGED: free drag complete → inspector sends POSITION_CHANGED → editor adds PositionChange to changeSlice
- [x] T091 [US7] Wire ELEMENT_REORDERED: sibling reorder complete → inspector sends ELEMENT_REORDERED → editor adds ReorderChange to changeSlice → treeSlice updates
- [x] T092 [US7] Extend changelog formatting in `src/lib/utils.ts` to include Position Changes and Reorder Changes sections
- [x] T093 [US7] Wire ElementSelector to yield to DragHandler when drag mode is active (click-to-select still works but mousedown initiates drag on selected element)

**Checkpoint**: Toggle drag mode, free-drag repositions with guide lines, reorder mode reorders siblings with drop indicators, all changes tracked and included in changelog.

---

## Phase 10: User Story 8 — Claude Code API Integration (Priority: P3)

**Goal**: Developer can send changelog to Claude Code CLI for analysis and apply generated diffs to source files.

**Independent Test**: Configure project root, click "Send to Claude Code", review diffs in DiffViewer, click "Apply All", verify source files updated.

### Implementation for User Story 8

- [x] T094 [P] [US8] Create `/api/claude/status` route in `src/app/api/claude/status/route.ts` (check if `claude` CLI exists in PATH, return version or error)
- [x] T095 [P] [US8] Create `/api/claude/analyze` route in `src/app/api/claude/analyze/route.ts` (validate changelog + projectRoot, spawn claude CLI with `--allowedTools Read`, parse response, return diffs)
- [x] T096 [P] [US8] Create `/api/claude/apply` route in `src/app/api/claude/apply/route.ts` (validate sessionId + projectRoot, spawn claude CLI with `--resume` and `--allowedTools Read,Edit`, return result)
- [x] T097 [US8] Create promptBuilder in `src/lib/promptBuilder.ts` (construct analysis prompt from changelog data, construct apply prompt for resume)
- [x] T098 [US8] Create diffParser in `src/lib/diffParser.ts` (parse Claude CLI structured output into ParsedDiff[] with hunks and line counts)
- [x] T099 [US8] Implement useClaudeAPI hook in `src/hooks/useClaudeAPI.ts` (fetch /api/claude/status, /analyze, /apply; update claudeSlice; handle errors)
- [x] T100 [US8] Create SetupFlow component (first-run: verify CLI step, set project root step) in `src/components/right-panel/claude/SetupFlow.tsx`
- [x] T101 [US8] Create ProjectRootSelector component (filesystem path input, validate on server, persist to localStorage) in `src/components/right-panel/claude/ProjectRootSelector.tsx`
- [x] T102 [US8] Create ClaudeIntegrationPanel component (state machine UI: idle/loading/results/error) in `src/components/right-panel/claude/ClaudeIntegrationPanel.tsx`
- [x] T103 [US8] Create ClaudeProgressIndicator component (spinner with "Analyzing with Claude Code..." text) in `src/components/right-panel/claude/ClaudeProgressIndicator.tsx`
- [x] T104 [P] [US8] Create DiffViewer component (scrollable list of DiffCards) in `src/components/right-panel/claude/DiffViewer.tsx`
- [x] T105 [P] [US8] Create DiffCard component (per-file collapsible diff with syntax-highlighted green/red lines on dark background) in `src/components/right-panel/claude/DiffCard.tsx`
- [x] T106 [US8] Create ResultsSummary component (summary card + "Apply All" / "Copy All Diffs" buttons) in `src/components/right-panel/claude/ResultsSummary.tsx`
- [x] T107 [US8] Create ClaudeErrorState component (error-specific UI for CLI_NOT_FOUND, AUTH_REQUIRED, TIMEOUT, PARSE_FAILURE) in `src/components/right-panel/claude/ClaudeErrorState.tsx`
- [x] T108 [US8] Wire "Send to Claude Code" button in ChangelogActions: click → check CLI status → if not configured show SetupFlow → if ready send to /analyze → show results in ClaudeIntegrationPanel
- [x] T109 [US8] Wire "Apply All" button: click → confirmation dialog → send to /apply → update UI on success/failure
- [x] T110 [US8] Ensure graceful degradation: "Copy Changelog" always works regardless of Claude CLI availability, "Send to Claude Code" shows setup prompt if CLI not configured

**Checkpoint**: Configure project root, make changes, Send to Claude Code shows progress then diffs, Apply All modifies source files, Copy Changelog still works without CLI.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T111 Implement keyboard shortcuts (Escape to deselect, arrow keys for tree nav, Cmd+[ / Cmd+] to toggle panels) across editor
- [x] T112 Add panel collapse/expand animations for left and right panels
- [x] T113 Implement panel size persistence to localStorage on resize
- [x] T114 Add error boundaries and loading states to all panels in `src/app/page.tsx`
- [x] T115 Implement Tailwind-aware changelog format in `src/lib/utils.ts` (detect utility class equivalents, suggest Tailwind replacements in instructions)
- [x] T116 Add auto-reconnect with retry backoff in useTargetUrl (detect heartbeat failure, show "Disconnected — retrying...", retry with exponential backoff)
- [x] T117 Handle selected element removal: if MutationObserver detects removal, clear selection, show "Selected element was removed from the page"
- [x] T118 Run quickstart.md validation (verify all setup steps produce expected results)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 Connect & Preview (Phase 3)**: Depends on Phase 2
- **US2 Inspect & Select (Phase 4)**: Depends on Phase 3 (needs connected target)
- **US3 Edit Styles (Phase 5)**: Depends on Phase 4 (needs selected element)
- **US4 Track & Export (Phase 6)**: Depends on Phase 5 (needs style edits to track)
- **US5 Breakpoints (Phase 7)**: Depends on Phase 6 (needs changelog to tag with breakpoint)
- **US6 Page Navigation (Phase 8)**: Depends on Phase 3 (needs connected target); can run in parallel with US4/US5
- **US7 Drag & Drop (Phase 9)**: Depends on Phase 6 (needs change tracking for position/reorder)
- **US8 Claude Integration (Phase 10)**: Depends on Phase 6 (needs changelog to send)
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: After Foundational — no other story dependencies
- **US2 (P1)**: After US1 — needs connected target for DOM inspection
- **US3 (P1)**: After US2 — needs selected element for property editing
- **US4 (P2)**: After US3 — needs style edits to track
- **US5 (P2)**: After US4 — needs change tracking with breakpoint context
- **US6 (P2)**: After US1 — can run in parallel with US4/US5 (only needs connection)
- **US7 (P3)**: After US4 — needs change tracking for position/reorder changes
- **US8 (P3)**: After US4 — needs changelog data to send to Claude CLI

### Within Each User Story

- Types/models before hooks/services
- Hooks before components
- Inspector modules before editor-side wiring
- Core implementation before integration wiring

### Parallel Opportunities

- Phase 1: T004–T011 (all type definitions and lib files) can run in parallel
- Phase 1: T013–T017 (all Zustand slices) can run in parallel
- Phase 4: T037–T041 (all inspector modules) can run in parallel
- Phase 5: T051–T054 (common components) can run in parallel
- Phase 5: T057–T063 (all Design sections) can run in parallel
- Phase 9: T086–T087 (drag strategies) can run in parallel
- Phase 10: T094–T096 (API routes) can run in parallel; T104–T105 (diff components) can run in parallel

---

## Parallel Example: Phase 1 Setup

```bash
# Launch all type definitions in parallel:
Task: "Create postMessage types in src/types/messages.ts"      # T004
Task: "Create element types in src/types/element.ts"            # T005
Task: "Create tree types in src/types/tree.ts"                  # T006
Task: "Create changelog types in src/types/changelog.ts"        # T007
Task: "Create drag types in src/types/drag.ts"                  # T008
Task: "Create Claude types in src/types/claude.ts"              # T009
Task: "Create constants in src/lib/constants.ts"                # T010
Task: "Create utils in src/lib/utils.ts"                        # T011

# Then launch all store slices in parallel:
Task: "Implement uiSlice in src/store/uiSlice.ts"              # T013
Task: "Implement elementSlice in src/store/elementSlice.ts"     # T014
Task: "Implement treeSlice in src/store/treeSlice.ts"           # T015
Task: "Implement changeSlice in src/store/changeSlice.ts"       # T016
Task: "Implement claudeSlice in src/store/claudeSlice.ts"       # T017
```

## Parallel Example: Phase 5 Design Sections

```bash
# Launch all Design sections in parallel (different files, no dependencies):
Task: "Create SizeSection in src/components/right-panel/design/SizeSection.tsx"           # T057
Task: "Create SpacingSection in src/components/right-panel/design/SpacingSection.tsx"     # T058
Task: "Create TypographySection in src/components/right-panel/design/TypographySection.tsx" # T059
Task: "Create BorderSection in src/components/right-panel/design/BorderSection.tsx"       # T060
Task: "Create ColorSection in src/components/right-panel/design/ColorSection.tsx"         # T061
Task: "Create LayoutSection in src/components/right-panel/design/LayoutSection.tsx"       # T062
Task: "Create PositionSection in src/components/right-panel/design/PositionSection.tsx"   # T063
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: US1 Connect & Preview
4. Complete Phase 4: US2 Inspect & Select
5. Complete Phase 5: US3 Edit Styles
6. **STOP and VALIDATE**: Can connect, inspect, and visually edit any localhost project

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 → Connect to any localhost project (MVP entry point)
3. US2 → Inspect and select elements (read-only value)
4. US3 → Edit styles in real time (core value!)
5. US4 → Track and export changes (workflow complete)
6. US5 + US6 → Breakpoints + page navigation (breadth)
7. US7 → Drag & drop (advanced editing)
8. US8 → Claude Code integration (automation)
9. Polish → Keyboard shortcuts, animations, error handling

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story checkpoint verifies independent functionality
- Commit after each task or logical group
- The 8 user stories map to the 8 implementation phases defined in docs/implementation-plan.md
- Inspector code (src/inspector/) runs inside the iframe — it is bundled separately from the editor React code
- Total: 118 tasks across 11 phases

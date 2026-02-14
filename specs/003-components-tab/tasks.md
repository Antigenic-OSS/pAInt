# Tasks: Components Tab

**Input**: Design documents from `/specs/003-components-tab/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/messages.md

**Tests**: No automated tests — manual verification per quickstart.md checklist.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- Single project: `src/` at repository root (Next.js App Router structure)

---

## Phase 1: Setup (Type Definitions)

**Purpose**: Define all new types, message interfaces, and constants. No runtime code — just the type foundation that all subsequent phases depend on.

- [x] T001 [P] Create DetectedComponent, VariantGroup, VariantOption, and ComponentVariantOption type definitions in src/types/component.ts. Include DetectionMethod enum type (`'semantic-html' | 'custom-element' | 'aria-role' | 'class-pattern' | 'data-attribute'`), BoundingRect type, and CreatedComponent type. Reference data-model.md for field definitions and validation rules.
- [x] T002 [P] Add 5 new message interfaces to src/types/messages.ts: `RequestComponentsMessage` (Editor→Inspector, payload: `{ rootSelectorPath?: string }`), `ApplyVariantMessage` (Editor→Inspector, payload per contracts/messages.md), `RevertVariantMessage` (Editor→Inspector), `ComponentsDetectedMessage` (Inspector→Editor, payload: `{ components: DetectedComponent[] }`), `VariantAppliedMessage` (Inspector→Editor, payload: `{ selectorPath, computedStyles, cssVariableUsages, boundingRect }`). Add all 5 to the appropriate direction union types (`InspectorToEditorMessage`, `EditorToInspectorMessage`).
- [x] T003 [P] Add 5 new entries to MESSAGE_TYPES constant in src/lib/constants.ts: `REQUEST_COMPONENTS`, `APPLY_VARIANT`, `REVERT_VARIANT`, `COMPONENTS_DETECTED`, `VARIANT_APPLIED`. Follow existing `as const` pattern.

---

## Phase 2: Foundational (Store + Core Inspector Detection + Message Routing)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented. Creates the store slice, inspector-side component detection, and editor-side message routing.

- [x] T004 [P] Create componentSlice as Zustand StateCreator in src/store/componentSlice.ts. State: `detectedComponents: DetectedComponent[]` (default []), `selectedComponentPath: string | null` (default null), `componentSearchQuery: string` (default ''), `createdComponents: Record<string, CreatedComponent>` (default {}). Actions: `setDetectedComponents`, `setSelectedComponentPath`, `setComponentSearchQuery`, `addCreatedComponent`, `removeCreatedComponent`, `updateComponentVariantActiveIndex(selectorPath: string, groupIndex: number, optionIndex: number)`, `clearComponents`. Follow the StateCreator<ComponentSlice, [], [], ComponentSlice> pattern from existing slices (e.g., cssVariableSlice.ts).
- [x] T005 Import ComponentSlice and createComponentSlice in src/store/index.ts. Add ComponentSlice to the EditorStore union type and spread createComponentSlice into the store creator. Follow the same pattern as existing slices.
- [x] T006 Add component detection maps and detectSingleComponent() function to getInspectorCode() in src/app/api/proxy/[[...path]]/route.ts. All code must be ES5-compatible (var, no arrow functions, no template literals). Add three maps: `SEMANTIC_COMPONENTS` (button→"Button", nav→"Navigation", input→"Input", header→"Header", footer→"Footer", dialog→"Dialog", a→"Link", img→"Image", form→"Form", select→"Select", textarea→"Textarea", table→"Table", aside→"Sidebar", main→"Main Content", section→"Section"), `ARIA_ROLE_MAP` (button→"Button", navigation→"Navigation", tab→"Tab", tablist→"Tab List", dialog→"Dialog", alert→"Alert", menu→"Menu", menuitem→"Menu Item", search→"Search"), `CLASS_PATTERNS` (array of [regex, name] pairs: /\bbtn\b/i→"Button", /\bcard\b/i→"Card", /\bmodal\b/i→"Modal", /\bdropdown\b/i→"Dropdown", /\bbadge\b/i→"Badge", /\bnav\b/i→"Navigation", /\balert\b/i→"Alert", /\btabs?\b/i→"Tab"). Implement `detectSingleComponent(el)` checking in priority order: data-component attribute → custom element (tag contains hyphen) → semantic HTML → ARIA role → class pattern. Return null if no match.
- [x] T007 Add scanForComponents(rootElement) function to getInspectorCode() in src/app/api/proxy/[[...path]]/route.ts. Must be ES5-compatible. Walk DOM tree from rootElement using a flat elements array (querySelectorAll('*')). Process elements in batches of 50 using requestIdleCallback (with setTimeout fallback for browsers without requestIdleCallback). For each element, call detectSingleComponent(). Collect results as DetectedComponent objects with selectorPath (reuse existing generateSelectorPath), name, tagName, detectionMethod, className, elementId, innerText (first 50 chars), boundingRect (getBoundingClientRect), empty variants array (variant detection added in US2), and childComponentCount. Send COMPONENTS_DETECTED message with full results when complete.
- [x] T008 Add REQUEST_COMPONENTS message handler case to the existing message switch in getInspectorCode() in src/app/api/proxy/[[...path]]/route.ts. On receiving REQUEST_COMPONENTS: if payload.rootSelectorPath is set, find that element and pass to scanForComponents; otherwise scan document.body. Must be ES5-compatible.
- [x] T009 Add COMPONENTS_DETECTED message handler to the handleMessage function in src/hooks/usePostMessage.ts. On receiving COMPONENTS_DETECTED: call `store.setDetectedComponents(msg.payload.components)`. Also add REQUEST_COMPONENTS dispatch inside the existing INSPECTOR_READY handler — after the existing REQUEST_DOM_TREE/REQUEST_PAGE_LINKS/REQUEST_CSS_VARIABLES calls, add `setTimeout(() => sendViaIframe({ type: MESSAGE_TYPES.REQUEST_COMPONENTS, payload: {} }), 500)` for the 500ms delayed initial scan.

**Checkpoint**: Foundation ready — component detection works end-to-end (inspector scans, editor receives, store updated). User story implementation can now begin.

---

## Phase 3: User Story 1 — Browse Detected Components (Priority: P1) MVP

**Goal**: Users can see a "Comps" tab in the left panel, click it to see detected components, search/filter the list, and click a component to select it in the iframe.

**Independent Test**: Connect to any localhost page with buttons, inputs, and navigation. Click "Comps" tab. Verify components are listed. Type in search to filter. Click a component entry — iframe highlights it, right panel shows its styles.

### Implementation for User Story 1

- [x] T010 [US1] Create ComponentsPanel component in src/components/left-panel/ComponentsPanel.tsx. Must be a 'use client' component. Include: search input at top (bound to componentSearchQuery from store via useEditorStore), component count header ("N components found"), and scrollable list of component items. Each item shows an icon (use inline SVG, 12x12), component name, and tagName in parentheses. Style following PagesPanel.tsx dark-mode patterns: inline styles with CSS variables (--text-primary, --text-secondary, --text-muted, --accent, --bg-input, --border), text-xs, 10px labels. Search input: className="w-full text-xs py-1 px-2", background var(--bg-input), border var(--border). List container: className="flex-1 overflow-y-auto". Component items: hover background rgba(74,158,255,0.08).
- [x] T011 [US1] Add click-to-select behavior to ComponentsPanel in src/components/left-panel/ComponentsPanel.tsx. Import usePostMessage hook. On component item click: call sendToInspector({ type: MESSAGE_TYPES.SELECT_ELEMENT, payload: { selectorPath: component.selectorPath } }). This reuses the existing selection flow — inspector highlights element, sends ELEMENT_SELECTED, right panel auto-updates. Also set selectedComponentPath in store to visually mark the active item (accent background). Use useCallback for the click handler.
- [x] T012 [US1] Extend LeftTab type in src/components/left-panel/LeftPanel.tsx to `'layers' | 'pages' | 'components'`. Update the tabs array to add `{ id: 'components', label: 'Comps' }`. Import ComponentsPanel via `React.lazy(() => import('./ComponentsPanel'))`. Wrap the ComponentsPanel render branch in `<Suspense fallback={<div style={{ color: 'var(--text-muted)', padding: '8px', fontSize: '11px' }}>Loading...</div>}>`. Update the conditional rendering: layers → LayersPanel, pages → PagesPanel, components → lazy ComponentsPanel.
- [x] T013 [US1] Add selection-scoped display and empty state to ComponentsPanel in src/components/left-panel/ComponentsPanel.tsx. Read selectorPath from useEditorStore. When selectorPath is set: filter detectedComponents to show the selected element (if it's a component) plus components whose selectorPath starts with the selected element's path (children). When selectorPath is null: show all detected components. When the filtered list is empty: show a centered message "No components detected" with secondary text "Select an element with recognizable components" using var(--text-muted) styling. When connectionStatus is not 'connected': show "Connect to inspect" message matching the LeftPanel pattern.

**Checkpoint**: User Story 1 is complete. Users can browse, search, and select components. The Comps tab is lazy-loaded for minimal startup impact.

---

## Phase 4: User Story 2 — Switch Component Variants (Priority: P2)

**Goal**: Detected components display variant dropdowns (Size, Color, State, Pseudo States). Switching a variant immediately updates the element in the iframe and the right panel.

**Independent Test**: Select a button component with recognizable class variants (btn-sm/btn-md/btn-lg, btn-primary/btn-secondary). Switch the Size dropdown — element visually changes. Activate "hover" pseudo variant — element shows hover styles. Switch back — element reverts cleanly.

### Implementation for User Story 2

- [x] T014 [P] [US2] Add detectClassVariants(el) function to getInspectorCode() in src/app/api/proxy/[[...path]]/route.ts. ES5-compatible. For each class on the element, extract a base prefix (e.g., "btn" from "btn-primary"). Scan all accessible document.styleSheets (try/catch for cross-origin CORS errors, skip on failure). For each stylesheet rule, check if the selector contains a class matching the base prefix with a different suffix. Group found variants into categories: Size (suffixes matching xs/sm/md/lg/xl/2xl), Color (primary/secondary/success/danger/warning/info/light/dark), State (active/disabled/loading/selected/checked). Each group becomes a VariantGroup with type 'class'. Each option stores the className to add and removeClassNames to swap. Set activeIndex to the option matching the element's current class. Only create groups with 2+ options.
- [x] T015 [P] [US2] Add detectPseudoVariants(el) function to getInspectorCode() in src/app/api/proxy/[[...path]]/route.ts. ES5-compatible. Compare getComputedStyle(el) vs getComputedStyle(el, ':hover'), getComputedStyle(el, ':focus'), getComputedStyle(el, ':active') on these visual properties: color, backgroundColor, borderColor, opacity, transform, boxShadow, textDecoration, outline. For each pseudo-state that differs in at least one property, create a VariantOption with pseudoState name, pseudoStyles record of the differing properties and their pseudo values. If any pseudo options found, create a "Pseudo States" VariantGroup with type 'pseudo' and a "default" option at index 0 (activeIndex 0). Wrap in try/catch — return empty array on error.
- [x] T016 [US2] Integrate variant detection into scanForComponents and add APPLY_VARIANT + REVERT_VARIANT handlers to the message switch in src/app/api/proxy/[[...path]]/route.ts. In scanForComponents: after detectSingleComponent succeeds, call detectClassVariants(el) and detectPseudoVariants(el), merge results into the component's variants array. APPLY_VARIANT handler: find element by selectorPath. For type 'class': iterate removeClassNames and call classList.remove(), then classList.add(addClassName). For type 'pseudo': iterate pseudoStyles and call el.style.setProperty(prop, value, 'important'). If revertPseudo: iterate pseudoStyles keys and call el.style.removeProperty(). After applying: read new computedStyles via existing getComputedStylesForElement(), read cssVariableUsages via detectCSSVariablesOnElement(), read boundingRect. Send VARIANT_APPLIED message back. REVERT_VARIANT handler: find element. If removeClassName: classList.remove(). If restoreClassName: classList.add(). If revertPseudo: iterate pseudoProperties and removeProperty(). All ES5-compatible.
- [x] T017 [US2] Add VARIANT_APPLIED message handler to handleMessage in src/hooks/usePostMessage.ts. On receiving VARIANT_APPLIED: if msg.payload.selectorPath matches current store.selectorPath, call store.updateComputedStyles(msg.payload.computedStyles) and store.setCSSVariableUsages(msg.payload.cssVariableUsages). This ensures the right panel design sections auto-update since they subscribe to computedStyles.
- [x] T018 [US2] Add variant dropdown controls to ComponentsPanel in src/components/left-panel/ComponentsPanel.tsx. Below each component item that has variants, render a row of variant group dropdowns. Each dropdown: label (groupName, 10px, var(--text-muted)), select element with options (VariantOption labels). Style: background var(--bg-input), border var(--border), color var(--text-primary), text-xs, padding 2px 4px, border-radius 3px. On change: read selected optionIndex. If variant type is 'class': sendToInspector APPLY_VARIANT with addClassName and removeClassNames from the selected option. If type is 'pseudo' and not default: send APPLY_VARIANT with pseudoStyles. If selecting "default" pseudo: send REVERT_VARIANT with revertPseudo=true. Update activeIndex in store via updateComponentVariantActiveIndex.
- [x] T019 [US2] Add variant revert-on-deselect logic to ComponentsPanel in src/components/left-panel/ComponentsPanel.tsx. Use a useRef to track the previously selected component's selectorPath and any active non-default variants. In a useEffect watching selectorPath changes: when selectorPath changes away from a component that had active variants, send REVERT_VARIANT for each active variant group to restore the element to its original state. Clear the ref. This prevents "ghost" variant changes persisting after the user selects a different element.

**Checkpoint**: User Story 2 complete. Variant switching works end-to-end with clean revert behavior.

---

## Phase 5: User Story 3 — Create Component Extraction Entry (Priority: P3)

**Goal**: Users can click "Create as Component" on any detected component. An extraction entry appears in the Changes tab and exported changelog.

**Independent Test**: Select a detected component. Click "Create as Component". Button changes to green "Created" state. Switch to Changes tab — extraction entry visible with component icon. Export changelog — "Component Extractions" section with name, selector, and suggested props.

### Implementation for User Story 3

- [x] T020 [US3] Add "Create as Component" button to each component item in ComponentsPanel in src/components/left-panel/ComponentsPanel.tsx. Read createdComponents from store. If component.selectorPath exists in createdComponents: show green checkmark icon (var(--success) #4ade80) with "Created" text, button disabled. Otherwise: show "+ Create" button, styled with border var(--border), background transparent, color var(--text-secondary), text-xs, padding 2px 6px, border-radius 3px, hover background rgba(74,158,255,0.1). On click: construct a StyleChange with property '__component_creation__', elementSelector = component.selectorPath, originalValue = '', newValue = JSON.stringify({ name: component.name, variants: component.variants.map(g => ({ groupName: g.groupName, options: g.options.map(o => o.label) })), timestamp: Date.now() }). Call store.addStyleChange(change). Call store.addCreatedComponent({ name: component.name, selectorPath: component.selectorPath, timestamp: Date.now() }).
- [x] T021 [US3] Update formatChangelog() in src/lib/utils.ts to handle __component_creation__ entries. Before the existing "Style Changes" section generation: filter styleChanges into two arrays — regular changes (property !== '__component_creation__') and component extractions (property === '__component_creation__'). If component extractions exist: add a "## Component Extractions" section after the header. For each extraction: parse newValue JSON. Output "### [name] Component", "- Selector: `[elementSelector]`", "- Suggested file: `src/components/[kebab-case-name].tsx`", "- Suggested props:" followed by each variant group as a prop line (e.g., "  - size: sm | md | lg"). Then generate the existing style changes section with only the regular changes. Ensure the summary line at the bottom counts both types.
- [x] T022 [US3] Update ChangesPanel rendering in src/components/right-panel/changes/ChangesPanel.tsx to handle __component_creation__ entries. When rendering the styleChanges list: if a change has property === '__component_creation__': render with a distinct UI — a component icon (inline SVG, cube/box shape, 14x14, stroke var(--accent)), label "Create [name] component" (parse name from newValue JSON), and the elementSelector as secondary text. Style to visually distinguish from CSS property changes — use a subtle left border with var(--accent) color. Existing CSS property changes render unchanged.

**Checkpoint**: User Story 3 complete. Component extraction entries flow through the entire system — creation, display in Changes tab, and export.

---

## Phase 6: User Story 4 — Auto-Rescan on Page Changes (Priority: P4)

**Goal**: Component list automatically refreshes when the DOM changes or the user navigates to a different page.

**Independent Test**: With Comps tab active, navigate to a different page via the Pages panel. Verify the component list updates to reflect the new page. Verify no redundant rescans occur during rapid tab switching.

### Implementation for User Story 4

- [x] T023 [US4] Add debounced rescan on DOM_UPDATED and component clear on page navigation in src/hooks/usePostMessage.ts. In the DOM_UPDATED handler: after the existing tree update logic, add a debounced REQUEST_COMPONENTS dispatch — use a module-level timer variable, clearTimeout on each DOM_UPDATED, then setTimeout 1000ms to send REQUEST_COMPONENTS. In the page navigation flow (when connectionStatus changes to 'connecting'): call store.clearComponents() so stale components from the previous page are removed immediately. The INSPECTOR_READY handler (from T009) already dispatches REQUEST_COMPONENTS with 500ms delay, so the new page's components will be detected automatically.

**Checkpoint**: User Story 4 complete. Component list stays in sync with page content.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Build verification and final validation.

- [x] T024 Verify build passes with no type errors by running bun run build. Fix any TypeScript errors in new or modified files.
- [x] T025 Run quickstart.md verification checklist: connect to localhost page, click Comps tab (appears within 1s), components listed, click component (iframe highlights, right panel updates), change variant dropdown (element updates), click Create as Component (entry in Changes tab), export changelog (Component Extractions section present).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately. All 3 tasks are parallel.
- **Foundational (Phase 2)**: Depends on Setup completion. T004 is parallel with T006-T008. T005 depends on T004. T006→T007→T008 are sequential. T009 depends on T008.
- **US1 (Phase 3)**: Depends on Foundational (Phase 2). T010→T011→T013 are sequential (same file). T012 is independent (different file, can parallel with T010).
- **US2 (Phase 4)**: Depends on Foundational (Phase 2). Can start in parallel with US1 for inspector-side tasks (T014, T015), but T018-T019 depend on T010 (ComponentsPanel must exist first).
- **US3 (Phase 5)**: Depends on US1 (needs ComponentsPanel). T020 modifies ComponentsPanel. T021-T022 can parallel with T020.
- **US4 (Phase 6)**: Depends on Foundational (Phase 2) only. Can start after Phase 2.
- **Polish (Phase 7)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only — no dependencies on other stories
- **US2 (P2)**: Depends on Foundational. Inspector tasks (T014-T016) independent of US1. UI tasks (T018-T019) depend on US1 (ComponentsPanel must exist).
- **US3 (P3)**: Depends on US1 (needs ComponentsPanel for the Create button). T021-T022 are independent of US1.
- **US4 (P4)**: Depends on Foundational only — no dependencies on other stories

### Within Each User Story

- Types/constants before store before inspector before UI
- Inspector detection before message routing
- Core UI before interactive features (variants, create button)

### Parallel Opportunities

- Phase 1: T001, T002, T003 all parallel (different files)
- Phase 2: T004 parallel with T006 (different files: store vs proxy route)
- Phase 4: T014 and T015 parallel (different functions in same file, no dependencies on each other)
- Phase 5: T021 and T022 parallel with T020 (different files: utils.ts, ChangesPanel.tsx vs ComponentsPanel.tsx)
- US4 (T023) can start as early as Phase 2 completion — independent of US1/US2/US3

---

## Parallel Example: Phase 1 Setup

```
# All three can run simultaneously:
Task T001: "Create component types in src/types/component.ts"
Task T002: "Add message interfaces in src/types/messages.ts"
Task T003: "Add MESSAGE_TYPES entries in src/lib/constants.ts"
```

## Parallel Example: User Story 2 Inspector Tasks

```
# Both detection functions can be implemented simultaneously:
Task T014: "Add detectClassVariants() in route.ts"
Task T015: "Add detectPseudoVariants() in route.ts"
# Then T016 integrates both (sequential after T014+T015)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (3 tasks, all parallel)
2. Complete Phase 2: Foundational (6 tasks)
3. Complete Phase 3: User Story 1 (4 tasks)
4. **STOP and VALIDATE**: Comps tab visible, components detected, search works, click-to-select works
5. This delivers core value — component awareness — with ~13 tasks

### Incremental Delivery

1. Setup + Foundational → Detection pipeline works (9 tasks)
2. Add US1 → Browse & select components (13 tasks total) **MVP!**
3. Add US2 → Variant switching with live preview (19 tasks total)
4. Add US3 → Component extraction to changelog (22 tasks total)
5. Add US4 → Auto-rescan on changes (23 tasks total)
6. Polish → Build verification (25 tasks total)
7. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Inspector code (route.ts) must be ES5-compatible — no arrow functions, no template literals, no const/let
- ComponentsPanel uses React.lazy for zero startup cost (FR-015, SC-004)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently

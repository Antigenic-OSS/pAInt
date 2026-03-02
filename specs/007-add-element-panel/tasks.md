# Tasks: Add Element Panel

**Input**: Design documents from `/specs/007-add-element-panel/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/postmessage-contracts.md, quickstart.md

**Tests**: Not requested in spec — test tasks omitted. Verification via manual acceptance scenarios in quickstart.md.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root
- Inspector script inlined in `src/app/api/proxy/[[...path]]/route.ts` and `public/dev-editor-inspector.js`

---

## Phase 1: Setup (Message Infrastructure)

**Purpose**: Define the communication protocol types and constants needed by all user stories

- [x] T001 [P] Add `InsertElementMessage`, `RemoveInsertedElementMessage`, `ElementInsertedMessage` interfaces to `src/types/messages.ts` and add them to the `EditorToInspectorMessage` and `InspectorToEditorMessage` union types
- [x] T002 [P] Add `INSERT_ELEMENT`, `REMOVE_INSERTED_ELEMENT`, `ELEMENT_INSERTED` constants to `MESSAGE_TYPES` in `src/lib/constants.ts`

---

## Phase 2: Foundational (Store & UI Shell)

**Purpose**: Extend the left panel tab system to support the new tab — MUST complete before any user story

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Extend `activeLeftTab` type to include `'add-element'` in `src/store/uiSlice.ts` (update both the interface property type and the `setActiveLeftTab` parameter type)
- [x] T004 [P] Add `AddElementIcon` SVG component (square with centered plus) to `src/components/left-panel/icons.tsx`
- [x] T005 [P] Add `'add-element'` tab entry to the `tabs` array in `src/components/left-panel/IconSidebar.tsx` between Components and Terminal, importing `AddElementIcon` from `./icons`
- [x] T006 Add `'add-element'` to the `LeftTab` type, `TAB_LABELS` record, and tab content routing in `src/components/left-panel/LeftPanel.tsx` — import `AddElementPanel` from `./AddElementPanel` and render it when `activeTab === 'add-element'`

**Checkpoint**: The Add Element tab icon appears in the left sidebar. Clicking it shows the tab header "Add Element". Content area is empty (panel not yet created). When disconnected, shows "Connect to inspect" (FR-011).

---

## Phase 3: User Story 1 + User Story 2 — Element Palette & Drag-and-Drop (Priority: P1) MVP

**Goal**: Display an organized palette of 9 element types and enable drag-and-drop insertion into the preview iframe

**Independent Test**: Connect to a localhost project, open the Add Element tab, verify all 9 elements are shown in Structure/Text groups (US2). Drag a `<div>` onto the preview, verify it appears in both the preview and layers tree (US1).

### Implementation

- [x] T007 [US1] [US2] Create `src/components/left-panel/AddElementPanel.tsx` with:
  - `ELEMENT_CATEGORIES` constant: Structure (`div`, `section`) and Text (`h1`–`h6`, `p`) with tag, label, description, and placeholderText per `data-model.md`
  - `ElementItem` sub-component: renders each palette item with monospace tag badge (`--bg-tertiary`, `--accent`) and description; `draggable` attribute; `onDragStart` sets `dataTransfer` with MIME type `application/x-dev-editor-element` and JSON payload `{tag, placeholderText}` per `contracts/postmessage-contracts.md`
  - `AddElementPanel` component: iterates `ELEMENT_CATEGORIES`, renders category headers (uppercase, `--text-muted`, 10px) and `ElementItem` list; hover state uses `--bg-hover`
- [x] T008 [US1] Add drag-and-drop event handlers to the inspector script in `src/app/api/proxy/[[...path]]/route.ts`:
  - Create a fixed-position `dropIndicator` div (`border: 2px dashed #4a9eff`, `background: rgba(74,158,255,0.08)`, `z-index: 2147483645`, `display: none`)
  - `dragover` listener (capture): check for `application/x-dev-editor-element` in `dataTransfer.types`, `preventDefault()`, position `dropIndicator` over `elementFromPoint` target, skip inspector overlay elements
  - `dragleave` listener (capture): hide `dropIndicator` when drag exits document
  - `drop` listener (capture): parse drag data JSON, resolve drop target via `elementFromPoint`, handle void elements (redirect to sibling-after), `createElement` + `setAttribute('data-dev-editor-inserted', 'true')` + set `textContent` if placeholderText, `appendChild` or `insertBefore`, send `ELEMENT_INSERTED` message with `selectorPath`, `parentSelectorPath`, `tagName`, `insertionIndex`, `placeholderText`
- [x] T009 [US1] Add `INSERT_ELEMENT` message handler to the inspector `switch` block in `src/app/api/proxy/[[...path]]/route.ts`: resolve `parentSelectorPath`, handle void elements (sibling-after), `createElement`, set `data-dev-editor-inserted`, set `textContent`, append/insert, send `ELEMENT_INSERTED` response
- [x] T010 [P] [US1] Add the same drag-and-drop event handlers (T008) and `INSERT_ELEMENT` handler (T009) to `public/dev-editor-inspector.js` — identical logic, placed before the message handler section
- [x] T011 [US1] Handle `ELEMENT_INSERTED` message in `src/hooks/usePostMessage.ts` `handleMessage` switch: extract payload fields, call `store.pushUndo` (wasNewChange: true), `store.saveElementSnapshot` (null className/id/attributes, empty computedStyles), `store.addStyleChange` with `property: '__element_inserted__'` and `originalValue: 'parent:{parentSelectorPath}|index:{insertionIndex}'`
- [x] T012 [US1] In `src/hooks/usePostMessage.ts`, update the `INSPECTOR_READY` persisted-changes replay loop to skip `__element_inserted__` and `__element_deleted__` changes (they cannot be replayed as `PREVIEW_CHANGE` messages)

**Checkpoint**: All 9 element types visible in grouped palette. Dragging from palette to iframe shows blue dashed drop indicator. Dropping inserts element into DOM. Layers tree updates automatically via existing `DOM_UPDATED`/`MutationObserver`. Void element targets redirect to sibling-after. Dropping outside iframe cancels with no side effects.

---

## Phase 4: User Story 3 — Change Tracking (Priority: P2)

**Goal**: Track all element insertions in the Changes tab with undo/revert support and changelog export

**Independent Test**: Insert an element, open Changes tab, verify insertion is listed. Click Undo — element is removed from preview and layers tree. Export changelog — insertion is included.

### Implementation

- [x] T013 [US3] Add `REMOVE_INSERTED_ELEMENT` message handler to the inspector `switch` block in `src/app/api/proxy/[[...path]]/route.ts`: resolve `selectorPath`, call `parentElement.removeChild()`
- [x] T014 [P] [US3] Add the same `REMOVE_INSERTED_ELEMENT` handler to `public/dev-editor-inspector.js`
- [x] T015 [US3] Update `performUndo` in `src/hooks/useChangeTracker.ts`: add `__element_inserted__` check before existing `__element_deleted__` check — send `REMOVE_INSERTED_ELEMENT` message with `selectorPath` from `action.elementSelector`. Update the computedStyles guard to also exclude `__element_inserted__`.
- [x] T016 [US3] Update `performRedo` in `src/hooks/useChangeTracker.ts`: add `__element_inserted__` check — since the removed element no longer exists in DOM, trigger iframe reload as fallback. Update the computedStyles guard to also exclude `__element_inserted__`.
- [x] T017 [US3] Update the `revertChange` callback in `src/hooks/useChangeTracker.ts`: add `__element_inserted__` check that sends `REMOVE_INSERTED_ELEMENT` message before the existing `__element_deleted__` check
- [x] T018 [US3] Update `revertAll` callback and standalone `performRevertAll` in `src/hooks/useChangeTracker.ts`: add loop over `__element_inserted__` changes sending `REMOVE_INSERTED_ELEMENT` for each
- [x] T019 [US3] Update `src/components/right-panel/changes/ChangesPanel.tsx`:
  - In both changelog format functions: add `__element_inserted__` check before `__element_deleted__` that outputs `element inserted ({tagName})`
  - In the `displayVal` computation: exclude `__element_inserted__` from live style lookup
  - In the per-change render: add `__element_inserted__` check rendering `<span style={{ color: 'var(--accent)' }}>element inserted</span>`

**Checkpoint**: Changes tab shows "element inserted" entries with accent color. Clicking Undo removes the element from preview. Revert All removes all inserted elements. Exported changelog includes insertion details.

---

## Phase 5: User Story 4 — Click to Insert (Priority: P3)

**Goal**: Enable click-to-insert as an alternative to drag-and-drop — clicking a palette item appends the element as last child of the currently selected element

**Independent Test**: Select a `<div>` in layers tree, click `<p>` in the palette, verify a paragraph appears inside the selected div. With no element selected, verify guidance message is shown.

### Implementation

- [x] T020 [US4] Add click-to-insert handler to `src/components/left-panel/AddElementPanel.tsx`: `handleInsert` callback reads `selectorPath` from store, calls `sendViaIframe` with `INSERT_ELEMENT` message using `selectorPath` as `parentSelectorPath` and the element's `tag`/`placeholderText`. Wire `onClick` on each `ElementItem`.
- [x] T021 [US4] Add "select parent first" guidance in `src/components/left-panel/AddElementPanel.tsx`: when `selectorPath` is null, render a hint message (`--text-muted`, `--bg-tertiary` background) instructing the user to select a parent element first or drag an element onto the preview

**Checkpoint**: Clicking a palette item with an element selected inserts child element. With no selection, hint message is visible. Both click and drag insertion paths produce tracked changes.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verification and cleanup across all stories

- [x] T022 Validate all acceptance scenarios from `specs/007-add-element-panel/quickstart.md` — run each test procedure manually
- [x] T023 Verify build succeeds with `bun run build` — no TypeScript errors or warnings

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T003 needs the types from T001)
- **US1+US2 (Phase 3)**: Depends on Phase 2 (needs the tab routing and store type)
- **US3 (Phase 4)**: Depends on Phase 3 (change tracking needs `ELEMENT_INSERTED` handling from T011)
- **US4 (Phase 5)**: Depends on Phase 2 (needs the palette from T007, but T007 is in Phase 3; however click-to-insert also uses `INSERT_ELEMENT` from T009). Practically depends on Phase 3.
- **Polish (Phase 6)**: Depends on all phases complete

### User Story Dependencies

- **US1 + US2 (P1)**: Combined because the palette (US2) is the entry point for drag-and-drop (US1). Cannot test US1 without US2.
- **US3 (P2)**: Depends on US1 — needs element insertions to exist before tracking/undoing them. Can be implemented after US1+US2 checkpoint.
- **US4 (P3)**: Depends on US1+US2 — needs the palette and INSERT_ELEMENT infrastructure. Can be implemented after US1+US2 checkpoint, in parallel with US3.

### Within Each User Story

- Inspector handlers before editor message handling
- Editor message handling before UI integration
- Core insertion before undo/revert

### Parallel Opportunities

- T001 and T002 can run in parallel (different files)
- T004 and T005 can run in parallel (different files)
- T008/T009 and T010 can run in parallel (proxy route vs. public inspector)
- T013 and T014 can run in parallel (proxy route vs. public inspector)
- US3 (Phase 4) and US4 (Phase 5) can run in parallel after Phase 3 checkpoint

---

## Parallel Example: Phase 3 (US1 + US2)

```bash
# Step 1: Create palette component (US2 entry point + US1 drag setup)
Task: T007 "Create AddElementPanel.tsx with palette UI and drag handlers"

# Step 2: Inspector changes can be parallelized
Task: T008 "Add DnD handlers to proxy inspector" [parallel with T010]
Task: T010 "Add DnD handlers to public inspector" [parallel with T008]

# Step 3: After inspector handlers are ready
Task: T009 "Add INSERT_ELEMENT handler to proxy inspector"
Task: T011 "Handle ELEMENT_INSERTED in usePostMessage.ts"
Task: T012 "Skip __element_inserted__ in INSPECTOR_READY replay"
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup (2 tasks, ~5 min)
2. Complete Phase 2: Foundational (4 tasks, ~10 min)
3. Complete Phase 3: US1 + US2 (6 tasks, ~30 min)
4. **STOP and VALIDATE**: Drag elements from palette to preview, verify insertion and layers tree update
5. This is a functional MVP — users can add elements visually

### Incremental Delivery

1. Setup + Foundational → Tab visible with "Connect to inspect" message
2. Add US1 + US2 → Drag-and-drop element insertion works (MVP!)
3. Add US3 → Changes tracked, undoable, exportable to changelog
4. Add US4 → Click-to-insert alternative for power users
5. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Inspector code is ES5 (no arrow functions, no const/let, no template literals)
- Both `route.ts` (proxy) and `public/dev-editor-inspector.js` must receive identical inspector logic changes
- MutationObserver handles layers tree updates automatically — no explicit tree refresh needed after insertion
- The `data-dev-editor-inserted="true"` attribute distinguishes editor-inserted elements from original DOM content

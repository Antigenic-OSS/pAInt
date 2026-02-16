# Tasks: Improve Navigator Layers Panel

**Input**: Design documents from `/specs/006-improve-navigator-layers/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Not requested — manual testing only.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Update shared types and data layer that all user stories depend on

- [x] T001 Add `imgSrc: string | null` field to `TreeNode` interface in `src/types/tree.ts`
- [x] T002 Remove `isExpanded` field from `TreeNode` interface in `src/types/tree.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Refactor the tree store and inspector to support all user stories

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Refactor `treeSlice` — replace `isExpanded` in tree with `expandedNodeIds: Set<string>` state field in `src/store/treeSlice.ts`
- [x] T004 Rewrite `toggleNodeExpanded()` to toggle node ID in/out of `expandedNodeIds` Set (O(1)) in `src/store/treeSlice.ts`
- [x] T005 Rewrite `expandToNode()` to parse ancestor IDs from selector path and add all to `expandedNodeIds` Set in `src/store/treeSlice.ts`
- [x] T006 Remove recursive `toggleExpanded()` and `expandAncestors()` helper functions from `src/store/treeSlice.ts`
- [x] T007 Update `serializeTree()` to extract `imgSrc: element.getAttribute('src')` for `<img>` elements in `src/inspector/DOMTraverser.ts`

**Checkpoint**: Foundation ready — type changes and store refactor complete, user stories can begin

---

## Phase 3: User Story 1 — Semantic HTML Tag Labels (Priority: P1) MVP

**Goal**: Show HTML5 semantic tag names as primary labels instead of CSS class names

**Independent Test**: Connect to any page with semantic HTML — verify footer shows `footer`, h2 shows `h2`, div shows `div.flex`, elements with id show `tag#id`

### Implementation for User Story 1

- [x] T008 [US1] Add `extractImageFilename()` helper function in `src/components/left-panel/LayerNode.tsx` — strips query params, extracts last path segment, returns empty for data URIs
- [x] T009 [US1] Rewrite `getDisplayLabel()` in `src/components/left-panel/LayerNode.tsx` — new priority: body → "Body", img with src → `img filename`, tag with id → `tag#id`, div with class → `div.firstClass`, all others → tag name
- [x] T010 [US1] Update tag badge logic in `src/components/left-panel/LayerNode.tsx` — remove redundant tag badge when label already shows the tag name, keep class qualifier only for div elements

**Checkpoint**: Navigator shows semantic tag names as primary labels for all elements

---

## Phase 4: User Story 2 — Purple-Pink Component Colors (Priority: P1)

**Goal**: Replace green color with purple-pink for semantic/landmark elements (nav, header, footer, main, aside, article, section)

**Independent Test**: Connect to a page — verify header/footer/nav/section elements show purple-pink icon and label color, div elements remain neutral

### Implementation for User Story 2

- [x] T011 [US2] Rename `GREEN_CATEGORIES` to `COMPONENT_CATEGORIES` in `src/components/left-panel/LayerNode.tsx`
- [x] T012 [US2] Change component color from `#4ade80` (green) to `#c084fc` (purple-400) for both `iconColor` and `labelColor` in `src/components/left-panel/LayerNode.tsx`

**Checkpoint**: Component/landmark elements display in purple-pink, divs stay neutral, selection blue takes priority

---

## Phase 5: User Story 3 — Amber Color for Edited Elements (Priority: P2)

**Goal**: Elements with tracked style changes appear amber in the tree so edits are visible without opening the Changes tab

**Independent Test**: Select an element, change a style property, verify tree node turns amber. Revert — verify it returns to original color.

### Implementation for User Story 3

- [x] T013 [US3] Derive `changedSelectors: Set<string>` from `styleChanges` via `useMemo` in `src/components/left-panel/LayersPanel.tsx`
- [x] T014 [US3] Pass `changedSelectors` as prop to `LayerNode` in `src/components/left-panel/LayersPanel.tsx`
- [x] T015 [US3] Add `changedSelectors` prop to `LayerNodeProps` interface and update color resolution to check `changedSelectors.has(node.id)` for amber `#fbbf24` in `src/components/left-panel/LayerNode.tsx`
- [x] T016 [US3] Implement color priority order: selected (blue) > edited (amber) > component (purple-pink) > default (neutral) in `src/components/left-panel/LayerNode.tsx`

**Checkpoint**: Edited elements show amber, reverted elements return to default, color priority is correct

---

## Phase 6: User Story 4 — Image Element Filenames (Priority: P2)

**Goal**: `<img>` elements display the image filename extracted from `src` (e.g., `img logo.png`)

**Independent Test**: Connect to a page with images — verify each img shows its filename, data URIs show just `img`

### Implementation for User Story 4

- [x] T017 [US4] Verify `getDisplayLabel()` correctly handles `imgSrc` field for img elements — `img filename` for URL sources, plain `img` for data URIs and missing src, in `src/components/left-panel/LayerNode.tsx`

**Checkpoint**: Image nodes show filenames, data URIs fall back to `img`, long names truncated

---

## Phase 7: User Story 5 — Faster Accordion Expand/Collapse (Priority: P1)

**Goal**: Accordion responds instantly (<100ms) by reading expansion state from the flat Set instead of recursive tree cloning

**Independent Test**: Rapidly toggle expand/collapse on nodes with 20+ children — should be instant with no lag

### Implementation for User Story 5

- [x] T018 [US5] Update `LayerNode` to read `isExpanded` from `useEditorStore(s => s.expandedNodeIds.has(node.id))` instead of `node.isExpanded` in `src/components/left-panel/LayerNode.tsx`
- [x] T019 [US5] Wrap `LayerNode` component export with `React.memo` for memoization in `src/components/left-panel/LayerNode.tsx`

**Checkpoint**: Accordion toggles instantly, no lag on 200+ node trees, selection/highlighting still works

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Build verification and edge case handling

- [x] T020 Run `bun run build` to verify no TypeScript errors or build failures
- [x] T021 Verify search functionality still works with new label format in `src/components/left-panel/LayerNode.tsx` — update `matchesSearch()` if needed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (type changes)
- **US1 (Phase 3)**: Depends on Phase 2 (store refactor complete)
- **US2 (Phase 4)**: Depends on Phase 2 — can run in parallel with US1
- **US3 (Phase 5)**: Depends on Phase 4 (needs color system in place)
- **US4 (Phase 6)**: Depends on Phase 2 + T008 (needs imgSrc and filename helper)
- **US5 (Phase 7)**: Depends on Phase 2 (needs expandedNodeIds Set)
- **Polish (Phase 8)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (Semantic Labels)**: Phase 2 → can start immediately after foundation
- **US2 (Purple-Pink Colors)**: Phase 2 → can start in parallel with US1
- **US3 (Amber Edited)**: Phase 4 (US2) → needs color system established first
- **US4 (Image Filenames)**: Phase 2 + T008 → depends on filename helper from US1
- **US5 (Faster Accordion)**: Phase 2 → can start in parallel with US1/US2

### Parallel Opportunities

Within Phase 2 (Foundational):
- T003-T006 (treeSlice refactor) sequential — same file
- T007 (DOMTraverser) can run in parallel with T003-T006

After Phase 2 completes:
- US1 (T008-T010), US2 (T011-T012), and US5 (T018-T019) can start in parallel
- US3 (T013-T016) starts after US2 completes
- US4 (T017) starts after T008 completes

---

## Implementation Strategy

### MVP First (US1 + US2 + US5)

1. Complete Phase 1: Type changes (T001-T002)
2. Complete Phase 2: Store refactor + inspector (T003-T007)
3. Complete Phase 3: Semantic labels (T008-T010)
4. Complete Phase 4: Purple-pink colors (T011-T012)
5. Complete Phase 7: Faster accordion (T018-T019)
6. **STOP and VALIDATE**: Core Navigator improvements working

### Incremental Delivery

7. Add US3: Amber for edited (T013-T016)
8. Add US4: Image filenames (T017)
9. Polish: Build check + search verification (T020-T021)

---

## Notes

- All tasks affect only 5 files total — high locality, low blast radius
- No new dependencies needed — pure refactor of existing code
- The store refactor (Phase 2) is the riskiest change — test thoroughly before proceeding
- `React.memo` (T019) should be applied last to avoid interference during development
- Commit after each phase completion for easy rollback

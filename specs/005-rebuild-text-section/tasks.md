# Tasks: Rebuild Typography / Text Section

**Input**: Design documents from `/specs/005-rebuild-text-section/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Not requested — no test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root (Next.js App Router)

---

## Phase 1: Setup

**Purpose**: Create new files and prepare the component skeleton

- [X] T001 [P] Create text shadow parser and serializer utility in `src/lib/textShadowUtils.ts` — export `TextShadowData` interface, `parseTextShadow(value: string): TextShadowData[]`, and `serializeTextShadow(shadows: TextShadowData[]): string` following the pattern from `ShadowBlurSection.tsx` (handle "none", empty string, multiple comma-separated shadows, rgba/hsl color functions)
- [X] T002 [P] Add new SVG icon components to `src/components/right-panel/design/icons.tsx` — add `DecoNoneIcon` (X mark), `StrikethroughIcon` (text with line through), `OverlineIcon` (text with line above), `UnderlineIcon` (text with line below), `ItalicIcon` (slanted I), `DirectionLTRIcon` (left-to-right paragraph), `DirectionRTLIcon` (right-to-left paragraph). All icons 14x14 viewBox, `stroke="currentColor"`, matching existing icon style.

**Checkpoint**: Utility and icons ready. TextSection rebuild can begin.

---

## Phase 2: User Story 1 — Edit Core Typography Properties (Priority: P1) MVP

**Goal**: Font family, weight, size, height, and color fields in a pro-style layout. This is the minimum viable Text section.

**Independent Test**: Select any text element in the canvas. Verify font family input, weight dropdown (labeled "400 - Normal" format), size + height side-by-side with unit selectors, and color picker all display computed values and apply changes live.

### Implementation for User Story 1

- [X] T003 [US1] Scaffold the new `TextSection` component in `src/components/right-panel/design/TextSection.tsx` — replace the entire existing component. Import `useEditorStore`, `useChangeTracker`, `SectionHeader`, `CompactInput`, `ColorInput`, `IconToggleGroup`. Extract all typography computed styles with defaults: `fontFamily` ("inherit"), `fontWeight` ("400"), `fontSize` ("16px"), `lineHeight` ("normal"), `color` ("#000000"), `textAlign` ("left"), `textDecoration` ("none"), `letterSpacing` ("normal"), `textIndent` ("0px"), `fontStyle` ("normal"), `textTransform` ("none"), `direction` ("ltr"), `wordBreak` ("normal"), `lineBreak` ("normal"), `whiteSpace` ("normal"), `textOverflow` ("clip"), `webkitTextStrokeWidth` ("0px"), `webkitTextStrokeColor` ("currentcolor"), `textShadow` ("none"), `columnCount` ("auto"). Create the `handleChange` wrapper around `applyChange`.
- [X] T004 [US1] Build the Font Family row in `src/components/right-panel/design/TextSection.tsx` — full-width text input for `fontFamily`, styled with `bg-tertiary`, `border`, `text-primary` matching existing inputs. Label "Font" on the left side using the same label style as reference editor (small muted text).
- [X] T005 [US1] Build the Weight dropdown in `src/components/right-panel/design/TextSection.tsx` — full-width `<select>` with labeled options: "100 - Thin", "200 - Extra Light", "300 - Light", "400 - Normal", "500 - Medium", "600 - Semi Bold", "700 - Bold", "800 - Extra Bold", "900 - Black". Selected value matches `fontWeight` from computed styles.
- [X] T006 [US1] Build the Size + Height row in `src/components/right-panel/design/TextSection.tsx` — two-column grid (`grid grid-cols-2 gap-1.5`). Left: `CompactInput` with label "Size", property `fontSize`, units `['px', 'em', 'rem', '%']`, min 0. Right: `CompactInput` with label "Height", property `lineHeight`, units `['px', 'em', 'rem', '']` (unitless for ratio values like "1.5").
- [X] T007 [US1] Build the Color row in `src/components/right-panel/design/TextSection.tsx` — `ColorInput` with label "Color", property `color`, value from `computedStyles.color`, `varExpression` from `cssVariableUsages['color']`. This automatically handles CSS variable display and detach/reattach.

**Checkpoint**: Core typography editing works. Font, weight, size, height, and color are all editable with live preview. This is the MVP.

---

## Phase 3: User Story 2 — Set Alignment and Decoration (Priority: P1)

**Goal**: Icon toggle rows for text alignment and text decoration, completing the primary visible section.

**Independent Test**: Select a text element, toggle alignment icons (left/center/right/justify) and verify `text-align` changes. Toggle decoration icons (none/strikethrough/overline/underline) and verify `text-decoration` changes.

### Implementation for User Story 2

- [X] T008 [US2] Build the Alignment icon toggle row in `src/components/right-panel/design/TextSection.tsx` — use existing `IconToggleGroup` with `AlignLeftIcon`, `AlignCenterIcon`, `AlignRightIcon`, `AlignJustifyIcon` from `icons.tsx`. Values: "left", "center", "right", "justify". Property: `textAlign`.
- [X] T009 [US2] Build the Decoration icon toggle row in `src/components/right-panel/design/TextSection.tsx` — use `IconToggleGroup` with the new icons from T002: `DecoNoneIcon` (value "none"), `StrikethroughIcon` (value "line-through"), `OverlineIcon` (value "overline"), `UnderlineIcon` (value "underline"). Property: `textDecoration`. Handle compound computed values (e.g., "underline solid rgb(0,0,0)") by extracting the keyword before matching the active icon.

**Checkpoint**: Full primary Text section complete. Font, weight, size, height, color, alignment, and decoration all working. This matches the top portion of the reference editor typography panel.

---

## Phase 4: User Story 3 — Advanced Type Options (Priority: P2)

**Goal**: Collapsible "More type options" section with letter spacing, text indent, columns, italicize, capitalize, direction, breaking, wrap, truncate, and stroke controls.

**Independent Test**: Expand "More type options", adjust each control, verify the corresponding CSS property updates in the iframe preview and appears in the Changes tab.

### Implementation for User Story 3

- [X] T010 [US3] Add the "More type options" collapsible toggle in `src/components/right-panel/design/TextSection.tsx` — create a `useState` `moreOpen` (default `false`). Render a clickable row with chevron (▸/▾) and label "More type options" styled with `text-muted` color, `bg-hover` on hover. When open, render a `div` with `space-y-2` containing all advanced fields below.
- [X] T011 [US3] Build the Letter Spacing / Text Indent / Columns row in `src/components/right-panel/design/TextSection.tsx` — three-column grid inside the "More type options" area. Left: `CompactInput` label "LS", property `letterSpacing`, units `['px', 'em', 'rem']`. Center: `CompactInput` label "TI", property `textIndent`, units `['px', 'em', 'rem', '%']`. Right: `CompactInput` label "Col", property `columnCount`, units `['']` (unitless). Add muted labels below each: "Letter spacing", "Text indent", "Columns".
- [X] T012 [US3] Build the Italicize / Capitalize / Direction row in `src/components/right-panel/design/TextSection.tsx` — three groups on one row. Italicize: `IconToggleGroup` with normal "I" icon and `ItalicIcon`, property `fontStyle`, values "normal" / "italic". Capitalize: `IconToggleGroup` with text labels "AA" (uppercase), "Aa" (capitalize), "aa" (lowercase), property `textTransform`. Direction: `IconToggleGroup` with `DirectionLTRIcon` / `DirectionRTLIcon`, property `direction`, values "ltr" / "rtl". Add muted labels below: "Italicize", "Capitalize", "Direction".
- [X] T013 [US3] Build the Breaking row in `src/components/right-panel/design/TextSection.tsx` — two-column grid. Left: `<select>` label "Word" for `wordBreak` with options "normal", "break-all", "keep-all", "break-word". Right: `<select>` label "Line" for `lineBreak` with options "normal", "loose", "strict", "anywhere". Style both selects matching existing dropdown pattern.
- [X] T014 [US3] Build the Wrap dropdown in `src/components/right-panel/design/TextSection.tsx` — full-width `<select>` for `whiteSpace` with options "normal", "nowrap", "pre", "pre-wrap", "pre-line", "break-spaces". Label "Wrap".
- [X] T015 [US3] Build the Truncate toggle in `src/components/right-panel/design/TextSection.tsx` — two toggle buttons ("Clip" and "Ellipsis") for `textOverflow`. Use the same style as `IconToggleGroup` but with text labels instead of icons. Active state uses accent background.
- [X] T016 [US3] Build the Stroke row in `src/components/right-panel/design/TextSection.tsx` — two-column grid. Left: `CompactInput` label "W", property `webkitTextStrokeWidth`, units `['px']`, min 0. Right: `ColorInput` label "Color", property `webkitTextStrokeColor`, value from computed styles. Label "Stroke" above the row.

**Checkpoint**: Full advanced typography panel works. All 17+ properties editable through the Text section. "More type options" collapses cleanly.

---

## Phase 5: User Story 4 — Text Shadows (Priority: P3)

**Goal**: Multi-entry text shadow management with add/remove and per-shadow X, Y, blur, color controls.

**Independent Test**: Click "+" next to "Text shadows" header, verify a shadow entry appears. Adjust X/Y/blur/color, verify `text-shadow` updates in the preview. Add a second shadow, verify stacking. Remove one, verify the other persists.

### Implementation for User Story 4

- [X] T017 [US4] Build the Text Shadows sub-section in `src/components/right-panel/design/TextSection.tsx` — use `SectionHeader` with title "Text shadows", `defaultOpen={false}`, and a `PlusIcon` button in the `actions` slot. Import `parseTextShadow` and `serializeTextShadow` from `src/lib/textShadowUtils.ts`. Parse `computedStyles.textShadow` into the shadow array. Create `addShadow()` (appends default `{ x: 0, y: 0, blur: 0, color: 'rgba(0,0,0,0.25)' }`), `removeShadow(index)`, and `updateShadow(index, updates)` handlers. Each calls `applyChange('textShadow', serializeTextShadow(newShadows))`.
- [X] T018 [US4] Build the per-shadow entry UI in `src/components/right-panel/design/TextSection.tsx` — for each shadow, render: a header row ("Shadow N" + delete button with `TrashIcon`), a 2x2 grid of `CompactInput`s for X (label "X", units ['px']), Y (label "Y", units ['px']), Blur (label "B", units ['px'], min 0), and a `ColorPicker` for the shadow color. Empty state: "No text shadows" muted text.

**Checkpoint**: Complete Text section matching reference editor typography panel. All user stories functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final refinements across all user stories

- [X] T019 Verify all 20 CSS properties render correct computed values when switching between elements in `src/components/right-panel/design/TextSection.tsx` — select multiple different elements (heading, paragraph, span, div), confirm each field resets to the new element's computed styles
- [X] T020 Verify all changes appear in the Changes tab with correct original → new values — edit font, size, color, decoration, letter spacing, text shadow across different elements and breakpoints, confirm each tracked correctly
- [X] T021 Run `bun run build` to verify no TypeScript errors or build warnings from the new/modified files
- [X] T022 Clean up any unused imports or dead code from the old TextSection implementation in `src/components/right-panel/design/TextSection.tsx`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — T001 and T002 can start immediately and run in parallel
- **User Story 1 (Phase 2)**: Depends on Phase 1 completion (needs icons for later phases, utility for Phase 5)
- **User Story 2 (Phase 3)**: Depends on T003 scaffold from Phase 2 + T002 icons from Phase 1
- **User Story 3 (Phase 4)**: Depends on T003 scaffold + T002 icons from Phase 1
- **User Story 4 (Phase 5)**: Depends on T003 scaffold + T001 utility from Phase 1
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 1 — no dependencies on other stories
- **User Story 2 (P1)**: Can start after T003 (scaffold) — needs alignment/decoration icons from T002
- **User Story 3 (P2)**: Can start after T003 (scaffold) — needs italic/direction icons from T002
- **User Story 4 (P3)**: Can start after T003 (scaffold) — needs `textShadowUtils` from T001

### Within Each User Story

- T003 (scaffold) must complete before any other US task
- T004–T007 (US1 fields) can run sequentially within the same file
- T008–T009 (US2 fields) can run sequentially within the same file
- T010 must complete before T011–T016 (toggle must exist before content)
- T017 must complete before T018 (shadow section before entry UI)

### Parallel Opportunities

- **Phase 1**: T001 and T002 are in different files — full parallel
- **Across stories**: US1 and US4 touch different sections of the same file, but since they write to the same `TextSection.tsx`, sequential is safer
- **Within US3**: T011–T016 add independent rows within the advanced section — could be parallelized if writing to separate sub-components, but since they're in the same file, run sequentially

---

## Parallel Example: Phase 1

```bash
# Launch both setup tasks together (different files):
Task: "Create text shadow utility in src/lib/textShadowUtils.ts"
Task: "Add new SVG icons to src/components/right-panel/design/icons.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2)

1. Complete Phase 1: Setup (T001, T002) — ~2 tasks
2. Complete Phase 2: User Story 1 (T003–T007) — ~5 tasks
3. Complete Phase 3: User Story 2 (T008–T009) — ~2 tasks
4. **STOP and VALIDATE**: The primary Text section (font, weight, size, height, color, align, decoration) is fully functional
5. Commit and test

### Incremental Delivery

1. Setup → icons + utility ready
2. Add US1 (core typography) → Test independently → Commit (MVP!)
3. Add US2 (alignment + decoration) → Test independently → Commit
4. Add US3 (advanced options) → Test independently → Commit
5. Add US4 (text shadows) → Test independently → Commit
6. Polish → Final validation → Commit

---

## Notes

- All tasks write to existing files in the established project structure — no new directories needed
- The only new file is `src/lib/textShadowUtils.ts` (T001)
- `src/components/right-panel/design/icons.tsx` is modified (T002), not created
- `src/components/right-panel/design/TextSection.tsx` is fully rewritten (T003) then extended (T004–T018)
- Every `applyChange()` call automatically handles: undo tracking, iframe preview, computed style update, changelog entry
- Commit after each phase checkpoint for clean git history

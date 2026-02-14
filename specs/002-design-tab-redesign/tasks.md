# Tasks: Right Panel Design Tab Redesign

**Input**: Design documents from `/specs/002-design-tab-redesign/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Not requested — no test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. Each section is tested manually after implementation (connect to localhost target, select element, verify).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create directory structure and type definitions needed by all stories

- [x] T001 Create inputs directory at `src/components/right-panel/design/inputs/`
- [x] T002 [P] Create GradientStop and GradientData type definitions in `src/types/gradient.ts` — types: `GradientStop { color: string; position: number; opacity: number }`, `GradientData { type: 'linear'|'radial'|'conic'; angle: number; stops: GradientStop[] }`
- [x] T003 [P] Create ShadowData type definition in `src/types/shadow.ts` — type: `ShadowData { x: number; y: number; blur: number; spread: number; color: string; inset: boolean }`
- [x] T004 Update CSS property groups in `src/lib/constants.ts` — add groups: `shadow: ['box-shadow']`, `appearance: ['opacity']`, `'flex-item': ['flex-grow','flex-shrink','flex-basis','align-self','order']`, `transform: ['transform']`, `filter: ['filter']`; add missing layout properties: `'row-gap','column-gap','align-content'`; add `'box-sizing'` to size group; regenerate `ALL_EDITABLE_PROPERTIES` from all groups

**Checkpoint**: `bun dev` starts without errors. Types importable.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build reusable input primitives that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create SVG icon library in `src/components/right-panel/design/icons.tsx` — all icons as React components (14x14, `currentColor` fill/stroke). Include: `FlexRowIcon`, `FlexColIcon`, `GridIcon`, `BlockIcon`, `InlineIcon`, `AlignLeftIcon`, `AlignCenterIcon`, `AlignRightIcon`, `AlignJustifyIcon`, `AlignTopIcon`, `AlignMiddleIcon`, `AlignBottomIcon`, `StaticIcon`, `RelativeIcon`, `AbsoluteIcon`, `FixedIcon`, `StickyIcon`, `LinkIcon`, `UnlinkIcon`, `PlusIcon`, `MinusIcon`, `TrashIcon`, `CornerRadiusIcon`, `ClipContentIcon`, `BorderBoxIcon`, `ReverseIcon`, `VisibilityIcon`, `ExpandIcon`, `InsetIcon`. Each icon is a `(props: React.SVGProps<SVGSVGElement>) => JSX.Element` with width/height 14.
- [x] T006 Create CompactInput component in `src/components/right-panel/design/inputs/CompactInput.tsx` — 24px height inline input with optional prefix label character inside left border, numeric value area, clickable unit suffix inside right border. Uses `parseCSSValue`/`formatCSSValue` from `src/lib/utils.ts`. Implements: ArrowUp/ArrowDown increment ±1 (Shift: ±10), Enter/blur commit via `onChange(property, value)`, unit cycling on suffix click, "auto" unit disables numeric input. Props per Contract 2 in `contracts/component-contracts.md`. Styled with `var(--bg-tertiary)` background, `var(--text-primary)` text, `var(--border)` border, 11px font.
- [x] T007 [P] Create IconToggleGroup component in `src/components/right-panel/design/inputs/IconToggleGroup.tsx` — row of connected 24x24 icon buttons for mutually exclusive options. Active button: `background: var(--accent-bg, rgba(74,158,255,0.15))`, `color: var(--accent)`. Inactive: `background: transparent`, `color: var(--text-muted)`. Fully controlled — no internal state. Props per Contract 3: `options: { value, icon, tooltip? }[]`, `value: string`, `onChange: (value) => void`.
- [x] T008 [P] Create SectionHeader component in `src/components/right-panel/design/inputs/SectionHeader.tsx` — enhanced CollapsibleSection with right-side action slot. Wraps the same toggle/expand pattern as existing `CollapsibleSection` in `src/components/common/CollapsibleSection.tsx` but adds `actions?: ReactNode` prop rendered in the header row. Props: `title: string`, `defaultOpen?: boolean` (default true), `actions?: ReactNode`, `children: ReactNode`. Same dark-mode styling: `var(--border)` bottom border, `var(--text-secondary)` title, triangle toggle indicator.

**Checkpoint**: Foundation primitives ready. `bun dev` starts. All 4 components importable without breaking existing sections.

---

## Phase 3: User Story 1 — Compact Property Editing with Inline Inputs (Priority: P1)

**Goal**: Replace full-width PropertyInput rows with compact inline inputs and icon toggle groups in Position and Border sections. This is the MVP — the most immediate visual improvement.

**Independent Test**: Select any element. Position and Border sections render with compact 24px inputs instead of old wide PropertyInput rows. Arrow key increment, Enter/blur commit, and unit switching all work. Live preview updates in iframe.

### Implementation for User Story 1

- [x] T009 [US1] Rewrite PositionSection in `src/components/right-panel/design/PositionSection.tsx` — replace `PropertyInput` imports with `CompactInput` and `IconToggleGroup` from `inputs/`. Position type row: `IconToggleGroup` with icons for static/relative/absolute/fixed/sticky from `icons.tsx`. When non-static: show CompactInput rows for X (left), Y (top), Z (zIndex) with labels "X", "Y", "Z". Conditional bottom/right CompactInputs when not static. Continue using `useEditorStore` for `computedStyles` and `useChangeTracker` for `applyChange`. Replace `CollapsibleSection` with `SectionHeader`.
- [x] T010 [US1] Refactor BorderSection in `src/components/right-panel/design/BorderSection.tsx` — replace all `PropertyInput` with `CompactInput` for border-width (label "W"), border-style as CompactInput type="select", border-color remains as `ColorPicker`/`VariableColorPicker` (ColorInput comes in US5). Remove border-radius section entirely (moved to Appearance in US4). Remove individual radius inputs. Keep individual border width inputs (T/R/B/L) using CompactInput with labels "T","R","B","L". Replace `CollapsibleSection` with `SectionHeader`. Set `defaultOpen={false}` (collapsed by default).

**Checkpoint**: Position and Border sections render with compact inputs. All edits preview live. Changes tracked in Changes tab. `bun dev` runs without errors.

---

## Phase 4: User Story 2 — Linked Padding and Margin Controls (Priority: P2)

**Goal**: Add linked input pairs for padding and margin that toggle between 2-input linked mode and 4-input unlinked mode, merged into the Layout section.

**Independent Test**: Select an element with equal padding. Linked mode shows 2 inputs (H/V). Change H — both left and right update. Click unlink — 4 inputs appear. Set all to same value — re-link available.

### Implementation for User Story 2

- [x] T011 [US2] Create LinkedInputPair component in `src/components/right-panel/design/inputs/LinkedInputPair.tsx` — component-local `useState` for `isLinked: boolean`. Auto-detect linked state: all 4 values equal (same number + unit via `parseCSSValue`) → linked. Linked mode: 2 CompactInputs with labels "H" (horizontal) and "V" (vertical). Changing H fires `onChange` for both `properties.left` and `properties.right`. Changing V fires for both `properties.top` and `properties.bottom`. Unlinked mode: 4 CompactInputs in 2x2 grid with labels "T","R","B","L", each fires `onChange` individually. Link/Unlink toggle button using `LinkIcon`/`UnlinkIcon` from `icons.tsx`. Props per Contract 4: `label`, `values: {top,right,bottom,left}`, `properties: {top,right,bottom,left}`, `onChange: (property, value) => void`, `units?`.
- [x] T012 [US2] Rewrite LayoutSection in `src/components/right-panel/design/LayoutSection.tsx` — replace `CollapsibleSection` with `SectionHeader`. Display mode: `IconToggleGroup` with `BlockIcon`, `FlexRowIcon`, `FlexColIcon`, `GridIcon`, `InlineIcon` mapping to display values (block, flex+row, flex+column, grid, inline). Dimensions subsection: W/H side-by-side CompactInputs (labels "W","H") for width/height from `computedStyles`. Flex controls (conditional on isFlex): justify via `IconToggleGroup`, align-items via `IconToggleGroup`, wrap as `IconToggleGroup`, gap as CompactInput. Grid controls (conditional on isGrid): template columns/rows as text CompactInputs, gap as CompactInput. Padding subsection: `LinkedInputPair` with `label="Padding"`, `values={paddingTop,paddingRight,paddingBottom,paddingLeft}`, `properties={paddingTop,paddingRight,paddingBottom,paddingLeft}`. Margin subsection: `LinkedInputPair` with `label="Margin"`, same pattern for margin sides. Clip content: checkbox toggling `overflow: hidden`/`visible`. Border box: checkbox toggling `boxSizing: border-box`/`content-box`.

**Checkpoint**: Layout section shows dimensions, display icons, flex/grid controls, linked padding/margin. All edits preview live. Linked/unlinked toggle works correctly.

---

## Phase 5: User Story 3 — Design/CSS Tab Toggle with Raw CSS View (Priority: P3)

**Goal**: Add a Design|CSS segmented toggle and a read-only formatted CSS view showing all computed styles with search and copy.

**Independent Test**: Select element, click "CSS" toggle. All computed styles appear grouped by category. Type "font" in search — only font properties shown. Click copy — CSS text copied to clipboard.

### Implementation for User Story 3

- [x] T013 [P] [US3] Create DesignCSSTabToggle component in `src/components/right-panel/design/DesignCSSTabToggle.tsx` — two-button segmented control: "Design" | "CSS". Styled like the existing `ChangeScopeToggle` in DesignPanel (connected buttons, `var(--bg-tertiary)` background, `var(--accent-bg)` active). Props: `activeTab: 'design'|'css'`, `onTabChange: (tab) => void`. No internal state — fully controlled.
- [x] T014 [P] [US3] Create CSSRawView component in `src/components/right-panel/design/CSSRawView.tsx` — reads `computedStyles` from `useEditorStore`. Groups properties by category using `CSS_PROPERTIES` groups from `src/lib/constants.ts` (layout, size, spacing, typography, border, background, position + new groups). Each group rendered as collapsible section with group name header. Properties displayed as `property: value;` in monospace font (`font-family: monospace`, 11px). Search input at top: filters properties by name (case-insensitive substring match). Copy button: copies all currently-visible properties as formatted CSS text to clipboard via `navigator.clipboard.writeText()`. Styling: `var(--bg-secondary)` background, `var(--accent)` for property names, `var(--text-primary)` for values.
- [x] T015 [US3] Update DesignPanel in `src/components/right-panel/design/DesignPanel.tsx` — add local `useState<'design'|'css'>('design')` for tab state. Render `DesignCSSTabToggle` between `ElementLogBox` and the first section. When tab is 'design': render property sections (Position, Layout, Border — current order). When tab is 'css': render `CSSRawView` instead of sections. Preserve Element Info header (ElementBreadcrumb, ChangeScopeToggle, ElementLogBox) above the toggle — these always show regardless of tab.

**Checkpoint**: Design/CSS toggle works. CSS view shows grouped computed styles. Search filters. Copy works. Design tab still shows all sections.

---

## Phase 6: User Story 4 — Appearance Section with Opacity and Corner Radius (Priority: P4)

**Goal**: Consolidate opacity and corner radius into a dedicated Appearance section with expandable individual corners.

**Independent Test**: Select element. Appearance section shows opacity (0-100%) and corner radius side by side. Click expand icon — 4 individual corner inputs appear. Change bottomLeft radius — only that corner updates.

### Implementation for User Story 4

- [x] T016 [US4] Create AppearanceSection in `src/components/right-panel/design/AppearanceSection.tsx` — uses `SectionHeader` with title "Appearance". Row 1: Opacity `CompactInput` (label "O", min 0, max 100, step 1, units: ['%'], reads `computedStyles.opacity`, converts 0-1 float to 0-100% display, converts back on change). Corner radius `CompactInput` (label "R", reads `computedStyles.borderRadius`). Expand icon button (using `ExpandIcon` from icons.tsx) toggles `useState<boolean>` to show/hide individual corners. Expanded state: 4 CompactInputs in 2x2 grid — TL (borderTopLeftRadius), TR (borderTopRightRadius), BR (borderBottomRightRadius), BL (borderBottomLeftRadius) with labels "TL","TR","BR","BL". All inputs use `useChangeTracker.applyChange`.
- [x] T017 [US4] Add AppearanceSection to DesignPanel in `src/components/right-panel/design/DesignPanel.tsx` — import and render `AppearanceSection` after Layout section in the Design tab view. Section order becomes: Position → Layout → Appearance → Border.

**Checkpoint**: Appearance section renders with opacity and radius. Expand shows 4 corners. All changes preview live and are tracked.

---

## Phase 7: User Story 5 — Typography Section with Integrated Text Color (Priority: P5)

**Goal**: Create a unified Text section with font controls, text color (with CSS variable token support), and alignment icons.

**Independent Test**: Select a text element. Text section shows font family, weight, size, color (with CSS var token picker), line-height, letter-spacing, alignment icons, decoration. Each edit previews live.

### Implementation for User Story 5

- [x] T018 [US5] Create ColorInput component in `src/components/right-panel/design/inputs/ColorInput.tsx` — encapsulates the CSS variable detection pattern from `BorderSection`. Reads `cssVariableUsages`, `selectorPath`, `isPropertyDetached`, `detachProperty`, `reattachProperty` from `useEditorStore`. If `varExpression` prop is provided AND property is not detached: renders `VariableColorPicker` from `src/components/common/VariableColorPicker.tsx` with onDetach/onReattach wired to store actions. Otherwise: renders `ColorPicker` from `src/components/common/ColorPicker.tsx`. Layout: compact inline row — `[color swatch 20x20] [hex text input] [opacity % input]`. Props per Contract 5: `value`, `property`, `onChange`, `varExpression?`, `onDetach?`, `onReattach?`.
- [x] T019 [US5] Create TextSection in `src/components/right-panel/design/TextSection.tsx` — uses `SectionHeader` with title "Text". Font family: full-width searchable `<select>` or text input for `fontFamily`. Row: font weight `<select>` (100-900 + normal/bold) + font size `CompactInput` (label "S"). Color row: `ColorInput` for `color` property — reads `cssVariableUsages['color']` for var expression, wires detach/reattach to store. Row: line-height `CompactInput` (label "LH") + letter-spacing `CompactInput` (label "LS") side by side. Text alignment: `IconToggleGroup` with `AlignLeftIcon`, `AlignCenterIcon`, `AlignRightIcon`, `AlignJustifyIcon` mapping to `textAlign` values. Row: text-transform `<select>` (none/uppercase/lowercase/capitalize) + text-decoration `<select>` (none/underline/line-through/overline). All using `useChangeTracker.applyChange`.
- [x] T020 [US5] Add TextSection to DesignPanel in `src/components/right-panel/design/DesignPanel.tsx` — import and render `TextSection` after Appearance section. Section order becomes: Position → Layout → Appearance → Text → Border.

**Checkpoint**: Text section renders all typography controls. CSS variable token picker works for text color. All changes preview live and are tracked.

---

## Phase 8: User Story 6 — Background Section with Gradient Editor (Priority: P6)

**Goal**: Create a Background section supporting solid colors (with CSS variable tokens) and gradient editing with type selection, color stops, and angle control.

**Independent Test**: Select element. Background section shows solid color picker with CSS variable token support. Switch to "Linear" — gradient editor appears with 2 stops. Add a third stop. Change angle. Verify CSS output in iframe.

### Implementation for User Story 6

- [x] T021 [P] [US6] Create gradient parser in `src/lib/gradientParser.ts` — exports `parseGradient(css: string): GradientData | null` and `serializeGradient(data: GradientData): string`. Parse `linear-gradient(angle, color1 pos1%, color2 pos2%, ...)`, `radial-gradient(...)`, `conic-gradient(...)`. Split stops respecting parentheses in `rgb()`/`rgba()`/`hsl()`. Extract angle (degrees), color (hex/rgb/rgba/hsl/hsla/named), position (%). Return null for unparseable. Serialize back to valid CSS. Round-trip invariant: `serializeGradient(parseGradient(css))` produces functionally equivalent CSS. Import types from `src/types/gradient.ts`.
- [x] T022 [US6] Create GradientEditor component in `src/components/right-panel/design/GradientEditor.tsx` — visual gradient editor. Preview bar: horizontal div with CSS gradient as background. Stops list: each stop shows position `CompactInput` (0-100%), color swatch (clicking opens `ColorPicker`), opacity `CompactInput` (0-100%), remove button (`TrashIcon`). Add stop button (`PlusIcon`): inserts new stop at midpoint between existing stops with interpolated color. Reverse button (`ReverseIcon`): reverses stop order. Angle input (`CompactInput`, label "∠", 0-360) for linear type. Type selector: `<select>` for linear/radial/conic. Props: `value: GradientData`, `onChange: (data: GradientData) => void`. On every change: calls `serializeGradient()` and parent passes result to `applyChange`.
- [x] T023 [US6] Create BackgroundSection in `src/components/right-panel/design/BackgroundSection.tsx` — uses `SectionHeader` with title "Background", `defaultOpen={true}`, `actions` slot with `PlusIcon`. Type dropdown: Solid | Linear | Radial | Conic. Solid mode: `ColorInput` for `backgroundColor` property with CSS variable token support (reads `cssVariableUsages['background-color']`). Gradient mode: `GradientEditor` component. On gradient change: calls `applyChange('backgroundImage', serializeGradient(data))`. Reads initial gradient from `computedStyles.backgroundImage` via `parseGradient()`. Fallback: if gradient can't be parsed, show raw text input.
- [x] T024 [US6] Add BackgroundSection to DesignPanel in `src/components/right-panel/design/DesignPanel.tsx` — import and render `BackgroundSection` after Text section. Section order becomes: Position → Layout → Appearance → Text → Background → Border.

**Checkpoint**: Background section works with solid colors and CSS variable tokens. Gradient editor creates valid CSS. Add/remove/reverse stops work. Changes preview live.

---

## Phase 9: User Story 7 — Shadow and Blur Section (Priority: P7)

**Goal**: Create a Shadow & Blur section for editing box-shadow layers and filter blur.

**Independent Test**: Select element. Click + in Shadow & Blur header — shadow row appears with defaults. Edit Y offset — box-shadow updates live. Add second shadow. Toggle inset. Set filter blur. All changes tracked.

### Implementation for User Story 7

- [x] T025 [P] [US7] Create shadow parser in `src/lib/shadowParser.ts` — exports `parseShadow(css: string): ShadowData[]` and `serializeShadow(shadows: ShadowData[]): string`. Parse box-shadow shorthand: split by comma respecting parentheses in `rgb()`/`rgba()`. Per shadow: detect `inset` keyword, extract x/y/blur/spread as px values, extract color (hex/rgb/rgba/hsl/hsla/named). Returns `[]` for "none" or unparseable. Serialize: join shadow strings with `, `. Return "none" for empty array. Round-trip invariant: `serializeShadow(parseShadow(css))` produces functionally equivalent CSS. Import types from `src/types/shadow.ts`.
- [x] T026 [US7] Create ShadowBlurSection in `src/components/right-panel/design/ShadowBlurSection.tsx` — uses `SectionHeader` with title "Shadow & Blur", `defaultOpen={false}`, `actions` slot with `PlusIcon` button. Reads `computedStyles.boxShadow` via `parseShadow()`. Per shadow row: X `CompactInput` (label "X"), Y `CompactInput` (label "Y"), blur `CompactInput` (label "B"), spread `CompactInput` (label "S"), color swatch using `ColorPicker`, inset toggle button (`InsetIcon`), remove button (`TrashIcon`). On any change: rebuild `ShadowData[]`, serialize via `serializeShadow()`, call `applyChange('boxShadow', serialized)`. Add shadow: push `{ x:0, y:0, blur:4, spread:0, color:'rgba(0,0,0,0.25)', inset:false }` to array. Filter blur subsection: `CompactInput` for blur value, reads/writes `computedStyles.filter` — extracts `blur(Npx)` value, serializes back as `blur(${value}px)`.
- [x] T027 [US7] Add ShadowBlurSection to DesignPanel in `src/components/right-panel/design/DesignPanel.tsx` — import and render `ShadowBlurSection` after Border section. Section order becomes: Position → Layout → Appearance → Text → Background → Border → Shadow & Blur.

**Checkpoint**: Shadow section creates/edits/removes shadows. Multi-shadow works. Filter blur works. All changes preview live and are tracked.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final orchestration, section reordering, cleanup, and build verification

- [x] T028 Create PropertiesSection in `src/components/right-panel/design/PropertiesSection.tsx` — uses `SectionHeader` with title "Properties", `defaultOpen={false}`. Read-only display of: tag name (`useEditorStore(s => s.tagName)`), element ID (`s.elementId`), class list (split `s.className` by spaces into chips/badges), attributes (`s.attributes` as key=value list). Monospace font, `var(--text-secondary)` for labels, `var(--text-primary)` for values.
- [x] T029 Update BorderSection to use ColorInput in `src/components/right-panel/design/BorderSection.tsx` — replace the manual `VariableColorPicker`/`ColorPicker` conditional with `ColorInput` component from `inputs/ColorInput.tsx`. Remove direct imports of `ColorPicker`, `VariableColorPicker`, and CSS variable store selectors (now handled internally by ColorInput). Pass `varExpression={cssVariableUsages['border-color']}` and wire detach/reattach callbacks.
- [x] T030 Final DesignPanel rewrite in `src/components/right-panel/design/DesignPanel.tsx` — final section order in Design tab: Position → Layout → Appearance → Text → Background → Border → Shadow & Blur → Properties. Add PropertiesSection import. Remove any remaining PropertyInput imports. Verify all sections import from new components. Element Info header (ElementBreadcrumb, ChangeScopeToggle, ElementLogBox) remains unchanged above the DesignCSSTabToggle.
- [x] T031 Delete PropertyInput component — remove `src/components/right-panel/design/PropertyInput.tsx`. Verify no remaining imports across the codebase (search for `PropertyInput` in all .tsx/.ts files). If any imports remain, update those files to use CompactInput.
- [x] T032 Build verification — run `bun dev` to verify dev server starts without errors. Run `bun run build` to verify production build succeeds. Verify no TypeScript errors or unused import warnings.

**Checkpoint**: All sections in final order. Old component deleted. Build clean. Full regression verified.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (needs inputs/ directory and types) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 (needs CompactInput, IconToggleGroup, SectionHeader, icons)
- **US2 (Phase 4)**: Depends on Phase 2 (needs CompactInput for LinkedInputPair). Independent of US1.
- **US3 (Phase 5)**: Depends on Phase 2 only. Independent of US1/US2.
- **US4 (Phase 6)**: Depends on Phase 2 (needs CompactInput, SectionHeader). Independent of US1-US3.
- **US5 (Phase 7)**: Depends on Phase 2 (needs CompactInput, IconToggleGroup, SectionHeader). Independent of US1-US4.
- **US6 (Phase 8)**: Depends on Phase 1 (gradient types) + Phase 2. Independent of US1-US5.
- **US7 (Phase 9)**: Depends on Phase 1 (shadow types) + Phase 2. Independent of US1-US6.
- **Polish (Phase 10)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: After Phase 2 — No dependencies on other stories
- **US2 (P2)**: After Phase 2 — Independent (creates LinkedInputPair + rewrites Layout)
- **US3 (P3)**: After Phase 2 — Independent (creates toggle + CSS view)
- **US4 (P4)**: After Phase 2 — Independent (creates new section)
- **US5 (P5)**: After Phase 2 — Independent (creates ColorInput + TextSection)
- **US6 (P6)**: After Phase 2 — Independent (creates parser + editor + section)
- **US7 (P7)**: After Phase 2 — Independent (creates parser + section)

### Within Each User Story

- Components before sections
- Parsers before editors (US6, US7)
- Sections before DesignPanel updates
- Each story adds to DesignPanel incrementally

### Parallel Opportunities

- T002 + T003 (types) can run in parallel
- T005 + T007 + T008 (icons, IconToggleGroup, SectionHeader) can run in parallel after T001
- T009 + T010 (PositionSection + BorderSection in US1) use different files
- T013 + T014 (DesignCSSTabToggle + CSSRawView in US3) can run in parallel
- T021 + T025 (gradient parser + shadow parser) can run in parallel
- After Phase 2, all 7 user stories can proceed in parallel if desired (different files, independent sections)

---

## Parallel Example: After Phase 2 Completion

```bash
# All user stories can start in parallel (different files, no dependencies):
US1: Rewrite PositionSection + BorderSection
US2: Create LinkedInputPair + Rewrite LayoutSection
US3: Create DesignCSSTabToggle + CSSRawView
US4: Create AppearanceSection
US5: Create ColorInput + TextSection
US6: Create gradientParser + GradientEditor + BackgroundSection
US7: Create shadowParser + ShadowBlurSection

# Each story adds its section to DesignPanel independently
# Final Polish phase resolves section ordering
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (types, directory, constants)
2. Complete Phase 2: Foundational (icons, CompactInput, IconToggleGroup, SectionHeader)
3. Complete Phase 3: User Story 1 (Position + Border with compact inputs)
4. **STOP and VALIDATE**: Test US1 independently — compact inputs work, edits preview live
5. Proceed to next story

### Incremental Delivery (Recommended)

1. Setup + Foundational → Foundation ready
2. US1: Compact inputs in Position + Border → **Test** (MVP visible improvement)
3. US2: Linked padding/margin in Layout → **Test** (spacing workflow improved)
4. US3: Design/CSS toggle → **Test** (debugging capability added)
5. US4: Appearance section → **Test** (opacity + radius consolidated)
6. US5: Text section + color tokens → **Test** (typography consolidated)
7. US6: Background + gradients → **Test** (new capability)
8. US7: Shadow + blur → **Test** (new capability)
9. Polish: Final order, cleanup, build verification

Each story adds value without breaking previous stories. The panel remains functional throughout.

---

## Notes

- [P] tasks = different files, no dependencies between them
- [Story] label maps each task to its user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently
- All property changes flow through the same `applyChange(property, value)` pattern — no store changes needed
- DesignPanel is updated incrementally per story; final ordering happens in Polish phase

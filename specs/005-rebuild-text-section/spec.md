# Feature Specification: Rebuild Typography / Text Section

**Feature Branch**: `005-rebuild-text-section`
**Created**: 2026-02-15
**Status**: Draft
**Input**: User description: "Rebuild the Text Section in the Design panel to match reference editor's comprehensive typography panel with font, weight, size, height, color, alignment, decoration, and advanced type options"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Edit Core Typography Properties (Priority: P1)

A designer selects a text element on the canvas and needs to adjust its fundamental typography: font family, weight, size, line height, and color. The Text section in the right panel displays these properties in a compact, pro-style layout. The designer changes the font to "DM Sans", sets weight to "400 - Normal" via a dropdown, adjusts the size to "1 REM", height to "1.5", and picks a color. Each change previews instantly in the iframe.

**Why this priority**: Core typography controls are the most-used text editing features. Without them, no other text editing is useful.

**Independent Test**: Select any text element, verify that font family input, weight dropdown, size input (with unit selector), height input, and color picker all render current computed values and apply changes live to the iframe preview.

**Acceptance Scenarios**:

1. **Given** an element is selected, **When** the user views the Text section, **Then** Font, Weight, Size, Height, and Color fields display the element's current computed values.
2. **Given** the Text section is open, **When** the user changes the font family, **Then** the change previews instantly in the iframe and is tracked in the changelog.
3. **Given** the Text section is open, **When** the user selects a weight from the dropdown (showing label format like "400 - Normal"), **Then** the font weight updates in the preview.
4. **Given** the Size field shows "16px", **When** the user clicks the unit label to cycle to "rem", **Then** the value converts and the unit updates.
5. **Given** the user changes the color via the color picker, **When** the element uses a CSS variable for color, **Then** the variable name is shown alongside the swatch with an option to detach.

---

### User Story 2 - Set Alignment and Decoration (Priority: P1)

A designer needs to center-align a heading, add an underline decoration, and set text to uppercase. The Text section provides an icon toggle row for alignment (left, center, right, justify) and an icon toggle row for decoration (none, strikethrough, overline, underline, and more). A separate row handles text-transform (capitalize options).

**Why this priority**: Alignment and decoration are essential formatting controls used on nearly every text element.

**Independent Test**: Select a text element, toggle alignment icons and verify text-align changes. Toggle decoration icons and verify text-decoration changes. Change capitalize option and verify text-transform.

**Acceptance Scenarios**:

1. **Given** a text element is selected with `text-align: left`, **When** the user clicks the center-align icon, **Then** the text centers in the preview and the center icon shows as active.
2. **Given** the decoration row shows "none" as active, **When** the user clicks the underline icon, **Then** `text-decoration: underline` is applied and tracked.
3. **Given** the Decoration row, **When** the user views available options, **Then** icons for none (X), strikethrough, overline, underline, and line-through are present.

---

### User Story 3 - Use Advanced Type Options (Priority: P2)

A designer clicks "More type options" to expand an advanced section revealing: letter spacing, text indent, columns, italicize toggle, capitalize options (AA, Aa, aa), text direction (LTR/RTL), word breaking, line breaking, text wrap, text truncation (clip/ellipsis), text stroke (width + color), and text shadows. These are collapsed by default to keep the panel clean.

**Why this priority**: Advanced options serve power users who need fine-grained control. Keeping them collapsed avoids cluttering the primary view while still providing full reference editor-level capability.

**Independent Test**: Expand the "More type options" section, adjust letter spacing, text indent, font style (italic), text direction, word-break, overflow-wrap, white-space, text-overflow, and text stroke — verify each applies to the preview.

**Acceptance Scenarios**:

1. **Given** the Text section is open, **When** the user clicks "More type options", **Then** the advanced fields expand below the core fields.
2. **Given** the advanced section is expanded, **When** the user sets letter spacing to "2px", **Then** `letter-spacing: 2px` applies to the preview.
3. **Given** the advanced section is expanded, **When** the user clicks the italic toggle, **Then** `font-style: italic` toggles on/off.
4. **Given** the Capitalize row shows options (AA, Aa, aa), **When** the user clicks "AA", **Then** `text-transform: uppercase` is applied.
5. **Given** the Direction row, **When** the user clicks the RTL icon, **Then** `direction: rtl` is applied.
6. **Given** the Breaking row shows Word and Line dropdowns, **When** the user sets Word to "break-all", **Then** `word-break: break-all` is applied.
7. **Given** the Wrap field, **When** the user selects "nowrap", **Then** `white-space: nowrap` is applied.
8. **Given** the Truncate row shows "Clip" and "Ellipsis" toggle buttons, **When** the user clicks "Ellipsis", **Then** `text-overflow: ellipsis` is applied.
9. **Given** the Stroke row, **When** the user sets width to "1px" and color to "#030724", **Then** `-webkit-text-stroke: 1px #030724` is applied.

---

### User Story 4 - Manage Text Shadows (Priority: P3)

A designer wants to add a text shadow to a heading. At the bottom of the Text section, a "Text shadows" row with a "+" button lets them add a shadow entry. Each entry has X offset, Y offset, blur, and color controls. Multiple shadows can be stacked.

**Why this priority**: Text shadows are a niche but important design tool. They are less frequently used than core typography but expected in a professional editor.

**Independent Test**: Click the "+" button next to "Text shadows", verify a shadow entry appears with offset/blur/color inputs. Adjust values and verify `text-shadow` updates in the preview. Add a second shadow and verify stacking.

**Acceptance Scenarios**:

1. **Given** no text shadows exist, **When** the user clicks "+", **Then** a new shadow entry appears with default values (0, 0, 0, black).
2. **Given** a shadow entry exists, **When** the user changes the blur to "4px" and color to "#333", **Then** `text-shadow` updates in the preview.
3. **Given** two shadow entries exist, **When** the user removes one, **Then** the remaining shadow is preserved and the preview updates.

---

### Edge Cases

- What happens when the selected element has no text content (e.g., an empty div)? The Text section still shows and edits apply, since the element may receive text later.
- What happens when computed font-family returns a long comma-separated stack? The font input should display the full value and be scrollable/truncatable.
- What happens when the element's color is set via a CSS variable? The color field shows the resolved color swatch but displays the variable name, with a "Detach" button to switch to a raw value.
- What happens when the user switches breakpoints? Typography values update to show the computed styles for the new viewport width.
- What happens when `text-decoration` has a compound value like `underline line-through`? The decoration icons should reflect all active decorations.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Text section MUST display a font family input field showing the element's current `font-family` value.
- **FR-002**: The Text section MUST display a weight dropdown with labeled options (e.g., "400 - Normal", "700 - Bold") mapping to CSS `font-weight` values 100–900.
- **FR-003**: The Text section MUST display Size and Height fields side by side, each with a unit selector supporting px, em, rem, and % (Size maps to `font-size`, Height maps to `line-height`).
- **FR-004**: The Text section MUST display a color field with a color swatch, hex input, and CSS variable awareness (show variable name + detach button when applicable).
- **FR-005**: The Text section MUST display an alignment icon toggle row with four options: left, center, right, justify.
- **FR-006**: The Text section MUST display a decoration icon toggle row with options: none (X), strikethrough, overline, underline, and a "more" overflow icon.
- **FR-007**: The Text section MUST include a collapsible "More type options" area that is collapsed by default.
- **FR-008**: The "More type options" area MUST include controls for: letter spacing (numeric + unit), text indent (numeric + unit), and columns (numeric).
- **FR-009**: The "More type options" area MUST include an Italicize toggle (regular / italic), a Capitalize icon group (AA/Aa/aa mapping to uppercase/lowercase/capitalize), and a Direction toggle (LTR/RTL).
- **FR-010**: The "More type options" area MUST include Breaking controls: a Word dropdown (normal, break-all, keep-all, break-word) and a Line dropdown (normal, loose, strict, anywhere).
- **FR-011**: The "More type options" area MUST include a Wrap dropdown (normal, nowrap, pre, pre-wrap, pre-line, break-spaces).
- **FR-012**: The "More type options" area MUST include a Truncate toggle with "Clip" and "Ellipsis" options mapping to `text-overflow`.
- **FR-013**: The "More type options" area MUST include a Stroke control with a width field (numeric + px) and a color picker.
- **FR-014**: The Text section MUST include a "Text shadows" row with a "+" button to add shadow entries, each with X, Y, blur, and color controls.
- **FR-015**: Every field change MUST preview instantly in the iframe and be recorded in the change tracker.
- **FR-016**: All fields MUST populate from the selected element's current computed styles and update when a new element is selected.
- **FR-017**: Numeric inputs MUST support keyboard arrow-key increment/decrement (1 per step, 10 with Shift held).

### Key Entities

- **Typography Property**: A CSS property name (e.g., `font-size`, `letter-spacing`) with its current value, unit, and variable binding (if any). Each change produces a changelog entry.
- **Text Shadow Entry**: A single shadow layer with X offset, Y offset, blur radius, and color. Multiple entries compose the `text-shadow` CSS value.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can modify all core typography properties (font, weight, size, height, color, alignment, decoration) within the Text section without needing any other panel or tool.
- **SC-002**: All 17 typography-related CSS properties covered by this section are editable and preview changes in under 200ms of user input.
- **SC-003**: The "More type options" section remains collapsed by default, keeping the visible Text section height comparable to the current implementation until the user expands it.
- **SC-004**: 100% of typography property changes are tracked in the changelog with correct original and new values.
- **SC-005**: The rebuilt Text section visually matches the reference editor typography panel layout: font field spanning full width, weight + size on one row, height beside size, color with swatch, alignment as icon row, decoration as icon row, and advanced options collapsed below.

## Assumptions

- The existing `CompactInput`, `IconToggleGroup`, `ColorInput`, and `SectionHeader` components will be reused and extended as needed.
- The `-webkit-text-stroke` property is the target for the Stroke control (standard `text-stroke` has limited browser support).
- The "columns" field in the advanced section maps to the CSS `columns` or `column-count` property.
- `line-break` property options (normal, loose, strict, anywhere) are the CSS spec values for the Line Breaking dropdown.
- The font family field is a text input (not a font picker with preview), consistent with the current implementation.

# Feature Specification: Right Panel Design Tab Redesign

**Feature Branch**: `002-design-tab-redesign`
**Created**: 2026-02-14
**Status**: Draft
**Input**: Redesign the right panel Design tab to match a Figma-style properties panel with compact inline inputs, icon toggle groups, linked padding/margin controls, gradient editors, and token-aware color pickers. Implement section-by-section to keep changes lightweight and testable at each step.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compact Property Editing with Inline Inputs (Priority: P1)

A developer selects an element in the visual editor and sees a compact, professional properties panel in the right panel Design tab. Instead of wide label+input+dropdown rows, each property row uses a 24px-height inline input with a prefix character label (e.g., "W", "H", "X") and a clickable unit suffix inside the input border. The panel feels dense and efficient, matching the layout density of Figma or reference editor.

**Why this priority**: The compact input component is the foundation primitive that every other section depends on. Without it, no section can be redesigned. This also delivers the most immediate visual improvement.

**Independent Test**: Can be tested by selecting any element and verifying that Layout, Position, and Border sections render with the new compact inputs instead of the old full-width PropertyInput rows. All existing editing behavior (arrow key increment, Enter/blur commit, unit switching) must continue working.

**Acceptance Scenarios**:

1. **Given** an element is selected, **When** the user views the Design tab, **Then** all numeric property inputs display as compact 24px-height inputs with prefix labels and inline unit suffixes
2. **Given** a compact input is focused, **When** the user presses ArrowUp/ArrowDown, **Then** the value increments/decrements by 1 (or 10 with Shift held) and the change previews live
3. **Given** a compact input has a value, **When** the user clicks the unit suffix, **Then** a unit picker appears allowing switching between px, %, em, rem, auto
4. **Given** a display property input, **When** the user views layout controls, **Then** display mode options appear as an icon toggle group (row of connected icon buttons) instead of a dropdown select

---

### User Story 2 - Linked Padding and Margin Controls (Priority: P2)

A developer editing spacing properties sees linked padding and margin controls. When the link icon is active, changing one padding value updates all four sides simultaneously. Clicking the unlink icon expands to a 4-input grid (top/right/bottom/left) for individual control. The system auto-detects linked state when all four values are equal.

**Why this priority**: Spacing is one of the most frequently edited property groups. Linked controls dramatically reduce the number of interactions needed, which is the core efficiency gain of the redesign.

**Independent Test**: Can be tested by selecting an element with padding/margin, verifying linked mode shows 2 inputs (horizontal/vertical), changing one value updates all sides, unlinking shows 4 individual inputs, and re-linking when all values match.

**Acceptance Scenarios**:

1. **Given** an element with equal padding on all sides, **When** the spacing section loads, **Then** the link icon is active and only 2 inputs (horizontal/vertical) are shown
2. **Given** linked padding inputs, **When** the user changes the horizontal value, **Then** paddingLeft and paddingRight both update to the new value and preview live
3. **Given** linked padding inputs, **When** the user clicks the unlink icon, **Then** 4 individual inputs appear (top/right/bottom/left) with their current values preserved
4. **Given** 4 unlinked padding inputs with different values, **When** the user sets all 4 to the same value, **Then** the link icon visually indicates the values are equal and can be re-linked

---

### User Story 3 - Design/CSS Tab Toggle with Raw CSS View (Priority: P3)

A developer wants to see the raw computed CSS for the selected element. A two-button segmented control ("Design" | "CSS") appears between the Element Info header and the property sections. Toggling to "CSS" shows a formatted, read-only view of all computed styles grouped by category, with search filtering and copy-to-clipboard.

**Why this priority**: The CSS raw view provides a debugging escape hatch and reference for advanced users without blocking the main Design tab workflow. It complements the visual editing experience.

**Independent Test**: Can be tested by selecting an element, clicking the "CSS" toggle, verifying all computed styles render in a readable grouped format, searching for a specific property, and copying the output.

**Acceptance Scenarios**:

1. **Given** an element is selected, **When** the Design tab loads, **Then** a "Design | CSS" segmented control appears between the Element Info header and the first property section
2. **Given** the "Design" toggle is active, **When** the user clicks "CSS", **Then** the property sections are replaced by a formatted, grouped, read-only display of all computed styles
3. **Given** the CSS view is active, **When** the user types "font" in the search input, **Then** only CSS properties containing "font" are shown
4. **Given** the CSS view is active, **When** the user clicks the copy button, **Then** all displayed CSS text is copied to the clipboard

---

### User Story 4 - Appearance Section with Opacity and Corner Radius (Priority: P4)

A developer editing visual appearance finds opacity and corner radius controls grouped together in a dedicated Appearance section. The section includes a single-value corner radius input with an expand icon that reveals individual corner inputs (topLeft, topRight, bottomRight, bottomLeft).

**Why this priority**: Consolidating opacity and radius into one section simplifies the panel hierarchy and removes them from sections where they felt out of place (opacity in Color, radius in Border).

**Independent Test**: Can be tested by selecting an element, changing opacity, changing overall corner radius, expanding to individual corners, and verifying each change previews live.

**Acceptance Scenarios**:

1. **Given** an element is selected, **When** the Appearance section renders, **Then** it shows an opacity input (0-100%) and a corner radius input side by side
2. **Given** the corner radius row, **When** the user clicks the expand icon, **Then** 4 individual corner inputs appear for topLeft, topRight, bottomRight, bottomLeft
3. **Given** individual corner inputs are visible, **When** the user changes bottomLeft radius, **Then** only borderBottomLeftRadius updates and previews live

---

### User Story 5 - Typography Section with Integrated Text Color (Priority: P5)

A developer editing text properties finds font family, weight, size, color, line height, letter spacing, text alignment, and text decoration all grouped in a single Text section. Text color uses a compact color picker row with swatch, hex input, opacity, and CSS variable token picker support.

**Why this priority**: Typography controls are frequently used but were previously split across Typography and Color sections. Consolidation makes the workflow more intuitive.

**Independent Test**: Can be tested by selecting a text element, changing font family, weight, size, color (including CSS variable tokens), line height, letter spacing, alignment, and decoration, verifying each previews live.

**Acceptance Scenarios**:

1. **Given** a text element is selected, **When** the Text section renders, **Then** it shows font family dropdown, weight/size row, color picker, line-height/letter-spacing row, and alignment/decoration controls
2. **Given** the Text section color picker, **When** the user clicks the color swatch, **Then** a color popup appears supporting hex input, opacity, and CSS variable token selection
3. **Given** a CSS variable is used for text color, **When** the user views the color picker, **Then** it shows the variable name with a detach option to override with a static value

---

### User Story 6 - Background Section with Gradient Editor (Priority: P6)

A developer editing background properties can switch between solid color and gradient fills. The gradient editor shows a preview bar with draggable color stops, each with position, color, and opacity controls. Multiple gradient types (linear, radial, conic) are supported.

**Why this priority**: Gradient editing is a new capability not present in the current editor. It's valuable but complex, so it's deferred until simpler sections are stable.

**Independent Test**: Can be tested by selecting an element, setting a solid background color (including CSS variable tokens), switching to linear gradient, adding/removing stops, adjusting angle, and verifying the CSS output matches.

**Acceptance Scenarios**:

1. **Given** an element with a solid background, **When** the Background section loads, **Then** it shows a compact color picker for backgroundColor with CSS variable token support
2. **Given** the Background section, **When** the user switches type from "Solid" to "Linear", **Then** a gradient editor appears with a preview bar and at least 2 color stops
3. **Given** a gradient editor with 2 stops, **When** the user adds a new stop, **Then** a third stop appears at the midpoint with interpolated color
4. **Given** a linear gradient, **When** the user changes the angle, **Then** the CSS output updates to reflect the new angle and previews live

---

### User Story 7 - Shadow and Blur Section (Priority: P7)

A developer can add and edit box shadows and filter blur effects. The Shadow & Blur section shows per-shadow rows with X/Y/blur/spread offsets, color picker, and inset toggle. A separate filter blur input controls `filter: blur()`.

**Why this priority**: Shadow editing is a new capability. It's deferred to the end because it requires a CSS parser for the shorthand format and is less frequently edited than layout/typography.

**Independent Test**: Can be tested by selecting an element, adding a box shadow, editing X/Y/blur/spread values, changing shadow color, toggling inset, adding a second shadow, and setting filter blur.

**Acceptance Scenarios**:

1. **Given** an element with no box shadow, **When** the user clicks the + button in the Shadow & Blur header, **Then** a new shadow row appears with default values (0 0 4px 0 rgba(0,0,0,0.25))
2. **Given** a shadow row, **When** the user changes the Y offset to 4px, **Then** the box-shadow CSS updates and previews live
3. **Given** multiple shadow rows, **When** the user clicks remove on the second shadow, **Then** only that shadow is removed from the box-shadow value
4. **Given** the filter blur input, **When** the user enters 2px, **Then** `filter: blur(2px)` is applied and previews live

---

### Edge Cases

- What happens when computed styles return empty or "auto" values? Inputs display the raw value; numeric operations treat "auto" as 0 for increment purposes.
- How does the panel handle elements with no text content showing the Text section? The Text section still renders (since CSS text properties apply regardless) but text-specific controls like alignment show current computed values.
- What happens when a gradient CSS value is malformed or uses unsupported syntax? The gradient editor falls back to displaying the raw CSS string with an option to edit as text.
- How does linked padding behave when individual sides use different units? The link icon shows as unlinked; values are only auto-linked when all four sides have the same numeric value and unit.
- What happens when the element has both a CSS variable and a static value for the same property? The CSS variable token picker shows the variable name; the detach button allows switching to static editing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Panel MUST replace full-width PropertyInput rows with compact 24px-height inline inputs featuring prefix character labels and clickable inline unit suffixes
- **FR-002**: Panel MUST provide icon toggle groups as connected button rows for mutually exclusive options (display type, text alignment, position type, flex direction)
- **FR-003**: Panel MUST provide linked input pairs for padding and margin that toggle between 2-input (horizontal/vertical) linked mode and 4-input (top/right/bottom/left) unlinked mode
- **FR-004**: Panel MUST preserve the existing Element Info header (breadcrumb, Apply-to toggle, Source/Element/Applies To/Path block) without modification
- **FR-005**: Panel MUST add a "Design | CSS" segmented toggle between the Element Info header and property sections
- **FR-006**: Panel MUST display property sections in the order: Position, Layout, Appearance, Text, Background, Border, Shadow & Blur
- **FR-007**: All property changes MUST continue flowing through the existing `applyChange(property, value)` pattern to the change tracker, postMessage bridge, and persistence layer
- **FR-008**: Compact color picker rows MUST support CSS variable token detection, detach/reattach workflow, hex input, and opacity control
- **FR-009**: Background section MUST support gradient editing with type selection (solid/linear/radial/conic), color stops with position and opacity, and angle control for linear gradients
- **FR-010**: Shadow section MUST parse and serialize the `box-shadow` shorthand format, supporting multiple shadows with X/Y/blur/spread/color/inset per shadow
- **FR-011**: CSS raw view MUST display all computed styles grouped by category with search filtering and copy-to-clipboard
- **FR-012**: Each section MUST be implementable and testable independently — the panel MUST remain functional after adding each new section
- **FR-013**: All existing editing interactions MUST be preserved: arrow key increment (1 or 10 with Shift), Enter/blur commit, live preview via postMessage
- **FR-014**: Appearance section MUST consolidate opacity (from former Color section) and corner radius (from former Border section) with expandable individual-corner controls

### Key Entities

- **CompactInput**: Inline property input with prefix label, numeric value, and clickable unit suffix. Replaces PropertyInput for numeric CSS properties.
- **IconToggleGroup**: Row of connected icon buttons for selecting from mutually exclusive options. Used for display type, text alignment, position type.
- **LinkedInputPair**: Paired inputs with link/unlink toggle for 4-sided CSS properties (padding, margin). Linked mode sets all sides equally; unlinked mode allows individual control.
- **ColorInput**: Compact color picker row with swatch, hex input, opacity, and CSS variable token integration.
- **GradientData**: Structured representation of CSS gradients (type, angle, color stops with position and opacity).
- **ShadowData**: Structured representation of a single box-shadow layer (x, y, blur, spread, color, inset flag).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can edit any CSS property in the Design tab with fewer interactions than the current layout — compact inputs reduce vertical scroll by at least 30%
- **SC-002**: The editor starts and renders the Design tab without errors after each individual section is implemented (incremental stability)
- **SC-003**: All property changes made through the redesigned panel appear correctly in the Changes tab with accurate original-to-new value tracking
- **SC-004**: Users can toggle between Design and CSS views in under 1 second with no layout shift or data loss
- **SC-005**: Linked padding/margin controls reduce the number of inputs needed for uniform spacing from 4 to 1 interaction
- **SC-006**: CSS variable token pickers in Text color and Background sections function identically to the current VariableColorPicker (detach, reattach, variable name display)
- **SC-007**: Gradient editor produces valid CSS gradient strings that preview correctly in the iframe when applied
- **SC-008**: Shadow editor produces valid CSS box-shadow strings supporting multiple shadow layers

## Assumptions

- The existing store (Zustand slices), change tracker hooks, postMessage bridge, and localStorage persistence layer remain unchanged. This is a UI-only redesign.
- The existing `parseCSSValue`/`formatCSSValue` utilities are sufficient for compact inputs. New parsers are only needed for gradients and box-shadow shorthand.
- SVG icons for toggle groups will be created as inline React components (no external icon library dependency).
- The dark-mode-only color palette and CSS custom properties defined in the project remain the visual foundation.
- Sections currently not present in the editor (Size, Spacing, Color, Typography) have been accounted for by absorbing their properties into the new section structure per the plan mapping.

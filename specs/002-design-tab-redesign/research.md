# Research: Right Panel Design Tab Redesign

**Feature Branch**: `002-design-tab-redesign`
**Date**: 2026-02-14

## R1: Compact Input Architecture

**Decision**: Build `CompactInput` as a drop-in replacement for `PropertyInput` that preserves the same `onChange(property, value)` contract.

**Rationale**: The existing `PropertyInput` already handles `parseCSSValue`/`formatCSSValue`, arrow key ±1/±10, Enter/blur commit. The new `CompactInput` must replicate all of this behavior while changing only the visual layout (prefix label inside border, inline unit suffix instead of separate `<select>`). Keeping the same `onChange` signature means zero changes to `useChangeTracker.applyChange()`.

**Alternatives considered**:
- Extending `PropertyInput` with a `compact` prop — rejected because the DOM structure is fundamentally different (label outside vs. inside, separate unit dropdown vs. inline suffix). A new component is cleaner.
- Using `UnitInput` as the base — rejected because `UnitInput` lacks the `property` prop and type variants (text/select) that sections need.

## R2: Icon Toggle Group Pattern

**Decision**: Inline SVG React components in a dedicated `icons.tsx` file, 14×14 with `currentColor` fill. `IconToggleGroup` renders them as a row of connected 24×24 buttons.

**Rationale**: No external icon library keeps the bundle small and avoids a new dependency. 14×14 matches Figma's property panel icon density. `currentColor` allows the active state to use `var(--accent)` via CSS.

**Alternatives considered**:
- Lucide React icons — rejected because the specific icons needed (flex-row, flex-col, align-top, link/unlink) don't have exact matches. Custom SVGs give precise control.
- Icon sprites — rejected; inline SVGs are simpler for 20-30 icons and tree-shake automatically.

## R3: Linked Input Pair State Management

**Decision**: Use component-local `useState` for the linked/unlinked toggle. Auto-detect linked state from equal values on mount and when `computedStyles` change.

**Rationale**: The linked/unlinked state is purely UI state — it doesn't affect the CSS output. When linked, changing one value fires `applyChange` for all 4 sides. When unlinked, each input fires independently. The store doesn't need to know about the link state.

**Alternatives considered**:
- Store the link state in Zustand — rejected because it's per-component UI state with no cross-panel impact.
- Always start unlinked — rejected because the common case (equal values) benefits from the compact linked view.

## R4: CSS Variable Integration in ColorInput

**Decision**: `ColorInput` will internally check `cssVariableUsages` and `isPropertyDetached` to decide whether to show the variable picker or a plain color input. It wraps the existing `VariableColorPicker` and `ColorPicker` components.

**Rationale**: The existing CSS variable handling pattern (in `BorderSection`) manually checks `cssVariableUsages[property]` and conditionally renders `VariableColorPicker` or `ColorPicker`. `ColorInput` encapsulates this pattern so every section gets variable support automatically.

**Alternatives considered**:
- Duplicating the conditional pattern in every section — rejected because the pattern is identical each time.
- Modifying `ColorPicker` to be variable-aware — rejected because `ColorPicker` is used in contexts outside the Design panel.

## R5: Gradient Parser Scope

**Decision**: Support `linear-gradient`, `radial-gradient`, and `conic-gradient` with hex/rgb/rgba/hsl/hsla colors and percentage positions. Named colors are resolved via a lookup table. `calc()` positions are passed through as-is.

**Rationale**: These three gradient types cover 99%+ of real-world usage. The parser needs to handle `linear-gradient(90deg, #ff0000 0%, #0000ff 100%)` and produce structured `GradientData` that can be round-tripped back to CSS.

**Alternatives considered**:
- Using an npm gradient parser (e.g., `gradient-parser`) — rejected to avoid adding a dependency for what's a focused parsing task.
- Supporting only linear gradients initially — considered viable for MVP, but the parser structure naturally handles all three types with minimal extra code.

## R6: Box-Shadow Parser Scope

**Decision**: Parse `box-shadow` shorthand into `ShadowData[]`. Support `inset`, length values (px/em/rem), and colors (hex/rgb/rgba/hsl/hsla/named).

**Rationale**: `box-shadow` supports comma-separated multiple shadows. Each shadow has: `[inset] <x> <y> [blur] [spread] [color]`. The parser splits by comma (respecting parentheses in `rgb()`), then parses each shadow's parts.

**Alternatives considered**:
- Supporting only single shadows — rejected because multi-shadow is common (e.g., elevation layering).

## R7: Section Loading Strategy

**Decision**: All sections are standard React components rendered synchronously. No lazy loading or code splitting.

**Rationale**: The user specifically asked to keep the panel lightweight. The sections are small components (50-200 lines each) and the total bundle impact is negligible. React.lazy would add unnecessary complexity. The "section-by-section" requirement refers to implementation order, not runtime loading.

**Alternatives considered**:
- React.lazy per section — rejected because the total code is small and the added complexity of Suspense boundaries doesn't help with the user's concern (which is about implementation incrementality, not runtime performance).

## R8: Design/CSS Tab Toggle Scope

**Decision**: Local `useState` in `DesignPanel` — no store change needed. The toggle only affects which content renders below the Element Info header.

**Rationale**: The CSS view is a read-only display of `computedStyles`. It doesn't interact with `applyChange` or the change tracker. Local state is sufficient.

**Alternatives considered**:
- Adding to UISlice — rejected because the toggle has no cross-panel effect.

## R9: Constants Update Scope

**Decision**: Add new property groups to `CSS_PROPERTIES`: `shadow` (`box-shadow`), `appearance` (`opacity`, `border-radius` individual corners), `flex-item` (`flex-grow`, `flex-shrink`, `flex-basis`, `align-self`, `order`). Update `ALL_EDITABLE_PROPERTIES`.

**Rationale**: The new sections edit properties not currently in `CSS_PROPERTIES`. Adding them ensures the inspector extracts these computed styles and change tracking captures them.

**Alternatives considered**:
- Not updating constants and reading from `computedStyles` directly — rejected because `ALL_EDITABLE_PROPERTIES` determines which properties the inspector sends back.

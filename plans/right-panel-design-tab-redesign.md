# Right Panel Design Tab Redesign — Figma-Style Properties Panel

## Context

The current right panel Design tab uses a traditional vertical-stacked layout with full-width `PropertyInput` components (64px label + input + separate unit dropdown). The user wants to redesign it to match a professional Figma-style properties panel with compact inline inputs, icon toggle groups, linked padding/margin controls, gradient editors, and token-aware color pickers.

This is a UI-only redesign — the underlying store, change tracking, postMessage bridge, and persistence remain unchanged.

---

## Preserved — Element Info Header (DO NOT REMOVE)

The existing DesignPanel header area above the property sections **must be kept exactly as-is**. This includes:

1. **Breadcrumb path** — e.g. `header#home > div.container.md\:px-12.z-10.flex-1.flex.flex-...`
2. **Apply to scope toggle** — `All` | `Desktop Only` segmented control
3. **Element Info block** with Copy button:
   - **SOURCE** — file path (e.g. `src/app/page.tsx`)
   - **ELEMENT** — full opening tag with classes
   - **APPLIES TO** — breakpoint scope label (e.g. `All breakpoints`)
   - **PATH** — full selector path

This header is rendered by `DesignPanel.tsx` before the property sections. During the D2 rewrite, preserve this entire block unchanged — only the sections below it are redesigned. The new `DesignCSSTabToggle` goes **between** the Element Info header and the first property section.

---

## Section Mapping (Current → New)

| Current | New | Notes |
|---------|-----|-------|
| LayoutSection | **Layout** (Flow + flex/grid controls) | Absorbs display/flex/grid logic |
| SizeSection | **Layout** (Dimensions subsection) | W/H merged into Layout |
| SpacingSection | **Layout** (Padding/Margin subsections) | Box model diagram → compact linked inputs |
| PositionSection | **Position** | Compact X/Y/Z + rotation + icon toggles |
| ColorSection (opacity) | **Appearance** | Opacity + corner radius |
| BorderSection (radius) | **Appearance** (corner radius) | Radius moves out of Border |
| TypographySection | **Text** | + absorbs text color from ColorSection |
| ColorSection (text color) | **Text** (Color row) | Moved into Text section |
| ColorSection (bg color) | **Background** | + new gradient editor |
| BorderSection | **Border** | Refactored with compact inputs |
| *(new)* | **Shadow & Blur** | box-shadow + filter:blur |
| *(new)* | **Properties** | Read-only element metadata |

**New section order:** Position → Layout → Appearance → Text → Background → Border → Shadow & Blur → Properties

---

## Phase A: Foundation Primitives

Build reusable input components that all sections depend on.

### A1. SVG Icon Library
**Create:** `src/components/right-panel/design/icons.tsx`
- All SVG icons as React components (14×14, `currentColor`)
- Display types: `FlexRow`, `FlexCol`, `Grid`, `Block`
- Text alignment: `AlignLeft`, `AlignCenter`, `AlignRight`, `AlignJustify`
- Vertical alignment: `AlignTop`, `AlignMiddle`, `AlignBottom`
- Position types: icons for static/relative/absolute/fixed/sticky
- Utility: `Link`, `Unlink`, `Plus`, `Minus`, `EyeDropper`, `Rotate`, `CornerRadius`, `ClipContent`, `BorderBox`, `Reverse`, `Trash`, `BlendMode`, `Visibility`

### A2. CompactInput (replaces PropertyInput)
**Create:** `src/components/right-panel/design/inputs/CompactInput.tsx`
- Inline label as prefix character (e.g., "X", "W") or placeholder
- Unit shown as clickable suffix inside input border (not separate `<select>`)
- 24px height, 11px font, `var(--bg-tertiary)` background
- Preserves: `parseCSSValue`/`formatCSSValue`, arrow key ±1/±10, Enter/blur commit
- Props: `label?`, `value`, `property`, `onChange`, `units?`, `min?`, `max?`, `step?`, `className?`

### A3. IconToggleGroup
**Create:** `src/components/right-panel/design/inputs/IconToggleGroup.tsx`
- Row of connected icon buttons for mutually exclusive options
- 24×24 buttons, `var(--accent)` when active
- Props: `options: { value, icon, tooltip? }[]`, `value`, `onChange`

### A4. LinkedInputPair
**Create:** `src/components/right-panel/design/inputs/LinkedInputPair.tsx`
- When linked: 2 inputs (horizontal/vertical) — changing one sets both sides
- When unlinked: 4 inputs in 2×2 grid (top/right/bottom/left)
- Link/unlink toggle icon; auto-detect linked state from equal values
- Props: `label`, `values: {top,right,bottom,left}`, `properties: {top,right,bottom,left}`, `onChange`

### A5. SectionHeader (enhanced CollapsibleSection)
**Create:** `src/components/right-panel/design/inputs/SectionHeader.tsx`
- Wraps existing `CollapsibleSection` pattern
- Adds right-side action slot (for +, token, visibility icons in header)
- Props: `title`, `defaultOpen?`, `actions?: ReactNode`, `children`

### A6. ColorInput (compact color picker row)
**Create:** `src/components/right-panel/design/inputs/ColorInput.tsx`
- Layout: `[swatch] [type: Solid ▾] [#hex] [100%] [eyedropper]`
- Integrates CSS variable token picker (reuses `VariableColorPicker` popup logic)
- Handles `cssVariableUsages`, `isPropertyDetached`, `detachProperty`, `reattachProperty`
- Props: `value`, `property`, `onChange`, `varExpression?`, `onDetach?`, `onReattach?`

### A7. DesignCSSTabToggle
**Create:** `src/components/right-panel/design/DesignCSSTabToggle.tsx`
- Two-button segmented control: "Design" | "CSS"
- Local state (no store change needed)

### A8. CSSRawView
**Create:** `src/components/right-panel/design/CSSRawView.tsx`
- Shows all `computedStyles` as formatted, read-only CSS text
- Grouped by category (layout, size, spacing, typography, colors, border, position)
- Copy-to-clipboard button
- Search/filter input to find specific properties
- Monospace font, syntax-highlighted property names and values

---

## Phase B: Simple Section Rewrites

### B1. PositionSection (rewrite)
**Modify:** `src/components/right-panel/design/PositionSection.tsx`
- Row 1: `[X]` left `[Y]` top `[Z]` zIndex — using CompactInput
- Row 2: `[∠]` rotation (parse `transform: rotate()`) + IconToggleGroup for position type
- Conditional: show bottom/right inputs when not static
- **Reuse:** existing `computedStyles.position`, `top`, `left`, etc.

### B2. AppearanceSection (new)
**Create:** `src/components/right-panel/design/AppearanceSection.tsx`
- Header with blend mode icon + visibility toggle
- Row: Opacity `[100 %]` | Corner Radius `[0 px]` + individual corners expand icon
- Expandable 4-corner grid: topLeft, topRight, bottomRight, bottomLeft
- **Source properties from:** old ColorSection (opacity), old BorderSection (borderRadius)

### B3. TextSection (rewrite of TypographySection)
**Create:** `src/components/right-panel/design/TextSection.tsx`
- Font: full-width searchable dropdown
- Row: Weight select + Size CompactInput
- Color: ColorInput for `color` property (moved from ColorSection)
- Row: LineHeight + LetterSpacing side by side
- Alignment: IconToggleGroup for textAlign + vertical-align icons
- Row: textTransform, textDecoration, fontStyle
- **Reuse:** existing TypographySection logic + ColorSection text color logic

### B4. BorderSection (refactor)
**Modify:** `src/components/right-panel/design/BorderSection.tsx`
- Use SectionHeader with token icon + add button
- Collapsed by default
- Replace PropertyInput with CompactInput
- Replace color picker with ColorInput
- Remove borderRadius (moved to AppearanceSection)

---

## Phase C: Complex Sections (new parsers needed)

### C1. LayoutSection (major rewrite — merges 3 sections)
**Modify:** `src/components/right-panel/design/LayoutSection.tsx`
- **Flow:** IconToggleGroup mapping to display + flexDirection combos
- **Dimensions:** W/H side by side with unit dropdowns
- **Flex/Grid controls** (conditional): justify, align, wrap, gap via IconToggleGroup + CompactInput
- **Padding:** LinkedInputPair for paddingTop/Right/Bottom/Left
- **Clip content:** Checkbox → `overflow: hidden`
- **Margin:** LinkedInputPair for marginTop/Right/Bottom/Left
- **Border box:** Checkbox → `boxSizing: border-box`
- **Absorbs:** SizeSection, SpacingSection, old LayoutSection

### C2. Gradient Parser + Types
**Create:** `src/lib/gradientParser.ts`, `src/types/gradient.ts`
- Parse `linear-gradient(90deg, #ff0000 0%, #0000ff 100%)` → structured data
- Serialize back to CSS
- Types: `GradientStop { color, position }`, `GradientData { type, angle?, stops }`
- Handle: linear, radial, conic; hex/rgb colors; percentage positions

### C3. BackgroundSection + GradientEditor
**Create:** `src/components/right-panel/design/BackgroundSection.tsx`
**Create:** `src/components/right-panel/design/GradientEditor.tsx`
- Type dropdown: Solid | Linear | Radial | Conic
- Solid: ColorInput for backgroundColor + token picker
- Gradient: preview bar + stops list (position %, color, opacity per stop)
- Add/remove/reverse stops, delete gradient
- SectionHeader with token icon + add button

### C4. Shadow Parser + Types
**Create:** `src/lib/shadowParser.ts`, `src/types/shadow.ts`
- Parse `box-shadow` shorthand → `{ x, y, blur, spread, color, inset }[]`
- Serialize back to CSS
- Types: `ShadowData { x, y, blur, spread, color, inset }`

### C5. ShadowBlurSection
**Create:** `src/components/right-panel/design/ShadowBlurSection.tsx`
- Collapsed by default with + button in header
- Per-shadow row: X, Y, blur, spread offsets + ColorInput + remove
- Filter blur: CompactInput for `filter: blur(Npx)`

---

## Phase D: Orchestrator + Cleanup

### D1. PropertiesSection (new, minimal)
**Create:** `src/components/right-panel/design/PropertiesSection.tsx`
- Read-only display of element tag, classes, attributes
- Collapsed by default

### D2. DesignPanel Rewrite
**Modify:** `src/components/right-panel/design/DesignPanel.tsx`
- **PRESERVE** the entire Element Info header (breadcrumb, Apply to toggle, Source/Element/Applies To/Path block, Copy button) — no changes to this area
- Add DesignCSSTabToggle **below** the Element Info header, **above** property sections
- Render sections in new order: Position → Layout → Appearance → Text → Background → Border → Shadow & Blur → Properties
- CSS tab: `CSSRawView` showing formatted, read-only computed styles with search and copy

### D3. Delete Absorbed Files
- `SizeSection.tsx` → absorbed into LayoutSection
- `SpacingSection.tsx` → absorbed into LayoutSection (LinkedInputPair)
- `TypographySection.tsx` → replaced by TextSection
- `ColorSection.tsx` → split across Text (color), Background (bg), Appearance (opacity)

### D4. Constants Update
**Modify:** `src/lib/constants.ts`
- Add CSS property groups: `shadow`, `appearance`, `transform`, `boxSizing`
- Update `ALL_EDITABLE_PROPERTIES` with new properties

---

## Files Summary

**Create (19 files):**
- `src/components/right-panel/design/icons.tsx`
- `src/components/right-panel/design/inputs/CompactInput.tsx`
- `src/components/right-panel/design/inputs/IconToggleGroup.tsx`
- `src/components/right-panel/design/inputs/LinkedInputPair.tsx`
- `src/components/right-panel/design/inputs/SectionHeader.tsx`
- `src/components/right-panel/design/inputs/ColorInput.tsx`
- `src/components/right-panel/design/DesignCSSTabToggle.tsx`
- `src/components/right-panel/design/CSSRawView.tsx`
- `src/components/right-panel/design/AppearanceSection.tsx`
- `src/components/right-panel/design/TextSection.tsx`
- `src/components/right-panel/design/BackgroundSection.tsx`
- `src/components/right-panel/design/GradientEditor.tsx`
- `src/components/right-panel/design/ShadowBlurSection.tsx`
- `src/components/right-panel/design/PropertiesSection.tsx`
- `src/lib/gradientParser.ts`
- `src/lib/shadowParser.ts`
- `src/types/gradient.ts`
- `src/types/shadow.ts`

**Rewrite (4 files):**
- `src/components/right-panel/design/DesignPanel.tsx`
- `src/components/right-panel/design/PositionSection.tsx`
- `src/components/right-panel/design/LayoutSection.tsx`
- `src/components/right-panel/design/BorderSection.tsx`

**Delete (4 files):**
- `src/components/right-panel/design/SizeSection.tsx`
- `src/components/right-panel/design/SpacingSection.tsx`
- `src/components/right-panel/design/TypographySection.tsx`
- `src/components/right-panel/design/ColorSection.tsx`

**Unchanged:** All store slices, hooks, inspector code, types (except additions), common components

---

## Integration Contract (preserved)

Every section continues to use the exact same pattern:
```tsx
const computedStyles = useEditorStore((s) => s.computedStyles);
const { applyChange } = useChangeTracker();
// All property changes flow through: applyChange(property, value)
// → records StyleChange → sends PREVIEW_CHANGE postMessage → persists to localStorage
```

No store, hook, or inspector changes are required.

---

## Verification

1. `bun dev` — app starts without errors
2. Connect to a localhost target URL
3. Select an element — verify all sections render with correct computed values
4. Edit properties in each section — verify live preview updates in iframe
5. Check Changes tab — verify all changes are tracked with correct original→new values
6. Verify CSS variable token pickers work in Text color and Background sections
7. Test linked/unlinked padding and margin toggles
8. Test gradient editor: create linear gradient, add/remove stops, verify CSS output
9. Test shadow section: add box-shadow, verify CSS output
10. Verify responsive breakpoint scope toggle still works across all sections

# Quickstart: Right Panel Design Tab Redesign

**Feature Branch**: `002-design-tab-redesign`
**Date**: 2026-02-14

## Prerequisites

- Bun installed (`bun --version` should work)
- Node.js 18+ (for Next.js compatibility)
- A localhost web app running to connect to (e.g., `localhost:3000`)

## Setup

```bash
git checkout 002-design-tab-redesign
bun install
bun dev
```

Open `http://localhost:3001` (or the port shown). Enter your target URL (e.g., `http://localhost:3000`) and click Connect.

## Development Workflow

Each section is implemented and tested independently. After implementing a section:

1. Run `bun dev`
2. Connect to a target URL
3. Select an element in the preview
4. Verify the new section renders correctly in the right panel Design tab
5. Edit properties in the new section — verify live preview updates
6. Check the Changes tab — verify changes are tracked correctly
7. Verify no regressions in other sections

## Testing Checklist (per section)

### Foundation Primitives (CompactInput, IconToggleGroup, LinkedInputPair)
- [ ] CompactInput renders at 24px height with prefix label and inline unit suffix
- [ ] Arrow keys increment/decrement by 1 (Shift: 10)
- [ ] Enter and blur commit the value
- [ ] Unit clicking cycles through available units
- [ ] IconToggleGroup shows connected buttons with active state highlighting
- [ ] LinkedInputPair auto-detects equal values as linked
- [ ] Unlink shows 4 individual inputs; re-link when values match

### Position Section
- [ ] Position type shown as icon toggle group
- [ ] X/Y/Z inputs rendered as compact inline inputs
- [ ] Conditional offset inputs appear for non-static position

### Layout Section
- [ ] Display mode shown as icon toggle group
- [ ] W/H dimensions side by side as compact inputs
- [ ] Flex/grid controls conditional on display type
- [ ] Padding/margin as linked input pairs
- [ ] Clip content and border-box checkboxes functional

### Appearance Section
- [ ] Opacity slider 0-100%
- [ ] Corner radius with expand to 4 corners

### Text Section
- [ ] Font family searchable dropdown
- [ ] Weight + size in one row
- [ ] Color with CSS variable token support
- [ ] Line-height + letter-spacing side by side
- [ ] Text alignment as icon toggle group

### Background Section
- [ ] Solid color with CSS variable token support
- [ ] Gradient type selector (solid/linear/radial/conic)
- [ ] Gradient preview bar with stops
- [ ] Add/remove/reverse stops

### Border Section
- [ ] Width, style, color with compact inputs
- [ ] No border-radius (moved to Appearance)

### Shadow & Blur Section
- [ ] Add shadow via + button
- [ ] Per-shadow X/Y/blur/spread + color + remove
- [ ] Filter blur input

### Design/CSS Toggle
- [ ] Toggle between Design and CSS views
- [ ] CSS view shows grouped, formatted computed styles
- [ ] Search filters properties
- [ ] Copy button works

## File Structure

```
src/components/right-panel/design/
├── icons.tsx                    # SVG icon components
├── inputs/
│   ├── CompactInput.tsx         # Inline compact input
│   ├── IconToggleGroup.tsx      # Connected icon button group
│   ├── LinkedInputPair.tsx      # Linked 4-sided inputs
│   ├── SectionHeader.tsx        # Collapsible section + actions
│   └── ColorInput.tsx           # Color picker with variable support
├── DesignCSSTabToggle.tsx       # Design | CSS segmented control
├── CSSRawView.tsx               # Read-only CSS display
├── DesignPanel.tsx              # Main orchestrator (modified)
├── PositionSection.tsx          # Position controls (rewritten)
├── LayoutSection.tsx            # Layout + size + spacing (rewritten)
├── AppearanceSection.tsx        # Opacity + corner radius (new)
├── TextSection.tsx              # Typography + text color (new)
├── BackgroundSection.tsx        # Background + gradient (new)
├── GradientEditor.tsx           # Gradient stop editor (new)
├── BorderSection.tsx            # Border controls (refactored)
├── ShadowBlurSection.tsx        # Shadow + filter blur (new)
└── PropertiesSection.tsx        # Read-only element metadata (new)

src/lib/
├── gradientParser.ts            # Gradient CSS ↔ structured data
└── shadowParser.ts              # box-shadow CSS ↔ structured data

src/types/
├── gradient.ts                  # GradientData, GradientStop types
└── shadow.ts                    # ShadowData type
```

## Key Integration Points

- **Store**: `useEditorStore` — read `computedStyles`, `cssVariableUsages`, `selectorPath`, `isPropertyDetached`
- **Changes**: `useChangeTracker()` — call `applyChange(property, value)` for all edits
- **CSS Variables**: Read `cssVariableUsages[kebab-case-property]` to detect var() expressions
- **Detach/Reattach**: Call `detachProperty(selectorPath, property)` / `reattachProperty(selectorPath, property)` from store

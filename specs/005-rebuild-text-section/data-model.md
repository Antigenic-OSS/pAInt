# Data Model: Rebuild Typography / Text Section

**Feature**: 005-rebuild-text-section
**Date**: 2026-02-15

## Entities

### TextShadowData

Represents a single text-shadow layer. Multiple entries compose the `text-shadow` CSS property value.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| x | number | 0 | Horizontal offset in pixels |
| y | number | 0 | Vertical offset in pixels |
| blur | number | 0 | Blur radius in pixels |
| color | string | "rgba(0,0,0,0.25)" | Shadow color (hex, rgb, rgba, hsl) |

**Validation**:
- `blur` must be >= 0
- `color` must be a valid CSS color string
- `x` and `y` can be negative

**Serialization**: `"${x}px ${y}px ${blur}px ${color}"` — entries joined with `, `

**Example**:
- Single: `"2px 2px 4px rgba(0,0,0,0.3)"`
- Multiple: `"1px 1px 2px #000, -1px -1px 2px rgba(255,255,255,0.1)"`

### Typography Properties Map

All properties read from `computedStyles` (Record<string, string>) in the Zustand store. No new state fields needed.

| Property Key | CSS Property | Default Value | Input Component |
|-------------|-------------|---------------|-----------------|
| fontFamily | font-family | "inherit" | Text input |
| fontWeight | font-weight | "400" | Select dropdown |
| fontSize | font-size | "16px" | CompactInput |
| lineHeight | line-height | "normal" | CompactInput |
| color | color | "#000000" | ColorInput |
| textAlign | text-align | "left" | IconToggleGroup |
| textDecoration | text-decoration | "none" | IconToggleGroup |
| letterSpacing | letter-spacing | "normal" | CompactInput |
| textIndent | text-indent | "0px" | CompactInput |
| columnCount | column-count | "auto" | CompactInput |
| fontStyle | font-style | "normal" | IconToggleGroup |
| textTransform | text-transform | "none" | IconToggleGroup |
| direction | direction | "ltr" | IconToggleGroup |
| wordBreak | word-break | "normal" | Select dropdown |
| lineBreak | line-break | "normal" | Select dropdown |
| whiteSpace | white-space | "normal" | Select dropdown |
| textOverflow | text-overflow | "clip" | Toggle buttons |
| webkitTextStrokeWidth | -webkit-text-stroke-width | "0px" | CompactInput |
| webkitTextStrokeColor | -webkit-text-stroke-color | "currentcolor" | ColorInput |
| textShadow | text-shadow | "none" | Multi-entry (TextShadowData[]) |

## State Flow

```
No new Zustand slices or store fields needed.

Existing data flow (unchanged):

  computedStyles[property]          ← read by TextSection
       ↓
  rendered in input component       ← CompactInput / ColorInput / Select / IconToggleGroup
       ↓
  onChange → applyChange(prop, val) ← from useChangeTracker hook
       ↓
  PREVIEW_CHANGE postMessage        ← sent to iframe
  + updateComputedStyles()          ← local store update
  + addStyleChange()                ← changelog tracking
  + pushUndo()                      ← undo stack
```

## New Utility: textShadowUtils.ts

```
parseTextShadow(value: string): TextShadowData[]
  - Input: CSS text-shadow string (e.g., "2px 2px 4px #000, 1px 1px #fff")
  - Output: Array of TextShadowData objects
  - Handles: "none", empty string, multiple shadows, rgba/hsl colors

serializeTextShadow(shadows: TextShadowData[]): string
  - Input: Array of TextShadowData objects
  - Output: CSS text-shadow string
  - Returns "none" for empty array
```

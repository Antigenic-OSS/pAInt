# Research: Rebuild Typography / Text Section

**Feature**: 005-rebuild-text-section
**Date**: 2026-02-15

## R1: CSS Property Coverage

**Decision**: The rebuilt TextSection covers 17+ CSS properties organized into three tiers.

**Core properties** (always visible):
| Property | CSS Name | Input Type |
|----------|----------|------------|
| Font Family | `font-family` | Text input (full width) |
| Font Weight | `font-weight` | Labeled dropdown ("400 - Normal") |
| Font Size | `font-size` | CompactInput with units (px, em, rem, %) |
| Line Height | `line-height` | CompactInput with units (px, em, rem, unitless) |
| Color | `color` | ColorInput with CSS variable awareness |
| Text Align | `text-align` | IconToggleGroup (left, center, right, justify) |
| Text Decoration | `text-decoration` | IconToggleGroup (none, strikethrough, overline, underline) |

**Advanced properties** (collapsed "More type options"):
| Property | CSS Name | Input Type |
|----------|----------|------------|
| Letter Spacing | `letter-spacing` | CompactInput (px, em, rem) |
| Text Indent | `text-indent` | CompactInput (px, em, rem, %) |
| Columns | `column-count` | CompactInput (unitless) |
| Font Style | `font-style` | IconToggleGroup (normal, italic) |
| Text Transform | `text-transform` | IconToggleGroup (AA=uppercase, Aa=capitalize, aa=lowercase) |
| Direction | `direction` | IconToggleGroup (LTR, RTL) |
| Word Break | `word-break` | Dropdown (normal, break-all, keep-all, break-word) |
| Line Break | `line-break` | Dropdown (normal, loose, strict, anywhere) |
| White Space | `white-space` | Dropdown (normal, nowrap, pre, pre-wrap, pre-line, break-spaces) |
| Text Overflow | `text-overflow` | Toggle buttons (clip, ellipsis) |
| Text Stroke | `-webkit-text-stroke` | CompactInput (width) + ColorInput (color) |

**Multi-entry property** (separate sub-section):
| Property | CSS Name | Input Type |
|----------|----------|------------|
| Text Shadow | `text-shadow` | Add/remove entries, each with X, Y, blur, color |

**Rationale**: Matches the Webflow typography panel screenshot 1:1. Grouped by frequency of use (core = always, advanced = on demand, shadows = specialized).

**Alternatives considered**:
- Flat list of all properties (rejected: too tall, clutters the panel)
- Separate section for each group (rejected: over-fragmented, Webflow uses single section)

## R2: Text Shadow Parsing Strategy

**Decision**: Create `src/lib/textShadowUtils.ts` with `parseTextShadow()` and `serializeTextShadow()` functions.

**Format**: `text-shadow: <x> <y> [blur] [color], ...`

**Parsing approach**:
1. Split on commas (respecting parentheses for `rgba()` / `hsl()`)
2. For each shadow: extract numeric values (x, y, blur) and color token
3. Default blur = 0, default color = current text color

**Serialization**: Join entries with `, ` separator.

**Rationale**: Mirrors the existing `parseShadow()` / `serializeShadow()` pattern in `ShadowBlurSection.tsx` but simplified (text-shadow has no `spread` or `inset`).

**Alternatives considered**:
- Reuse box-shadow parser directly (rejected: text-shadow has different syntax — no spread, no inset)
- Regex-only parser (rejected: fails on nested color functions like `rgba()`)

## R3: Decoration Icon Design

**Decision**: Use icon-based toggle for decorations, matching the Webflow pattern.

**Icons needed** (new additions to `icons.tsx`):
| Icon | Represents | Visual |
|------|-----------|--------|
| `DecoNoneIcon` | No decoration | X mark |
| `StrikethroughIcon` | `line-through` | Text with line through middle |
| `OverlineIcon` | `overline` | Text with line above |
| `UnderlineIcon` | `underline` | Text with line below |
| `ItalicIcon` | `font-style: italic` | Slanted "I" |
| `DirectionLTRIcon` | `direction: ltr` | Left-to-right arrow with text lines |
| `DirectionRTLIcon` | `direction: rtl` | Right-to-left arrow with text lines |

**Rationale**: IconToggleGroup already handles active/inactive states with accent colors. Extending with new SVG icons is the lowest-effort approach.

**Alternatives considered**:
- Text labels instead of icons (rejected: takes too much horizontal space)
- Dropdown for decoration (rejected: Webflow uses icon row)

## R4: Compound text-decoration Handling

**Decision**: Treat `text-decoration` as a single-value toggle (clicking one decoration replaces the current one, not additive).

**Rationale**: The Webflow panel shows decoration as a mutually exclusive toggle row (you pick one). While CSS allows `text-decoration: underline line-through`, it's a rare use case. The toggle pattern is simpler and matches the reference UI.

**Edge case**: If the computed style returns a compound value like `underline line-through`, the first token is used to determine the active icon. Users can override by clicking a specific icon.

## R5: Text Stroke Implementation

**Decision**: Map the Stroke control to `-webkit-text-stroke-width` and `-webkit-text-stroke-color` as two separate `applyChange()` calls.

**Rationale**: The shorthand `-webkit-text-stroke: 1px #000` works for applying, but reading computed styles requires the longhand properties. Using separate properties ensures the UI reads back correctly after applying.

**Alternatives considered**:
- Single shorthand property (rejected: `getComputedStyle()` returns longhand values, not shorthand)

## R6: Layout Structure (Webflow Fidelity)

**Decision**: The rebuilt TextSection follows this visual layout:

```
┌──────────────────────────────────────┐
│ ▼ Typography                         │
├──────────────────────────────────────┤
│ Font  [ DM Sans                    ] │  ← full width text input
│ Weight [ 400 - Normal ▼ ]            │  ← full width dropdown
│ Size  [ 1    ] REM  Height [ 1.5 ] - │  ← 2-col: size + height
│ Color [ ■ ] #030724                  │  ← color swatch + hex
│ Align [ ≡ ] [ ≡ ] [ ≡ ] [ ≡ ]       │  ← 4 icon toggles
│ Decor [ X ] [ ─ ] [ T̄ ] [ T̲ ] [ … ] │  ← 5 icon toggles
├──────────────────────────────────────┤
│ ▸ More type options                  │  ← collapsed by default
│   ┌──────────────────────────────┐   │
│   │ [ Normal ▼ ] [ 0 px ] [Auto]│   │  ← letter-spacing, indent, columns
│   │ Letter sp.   Text indent  Col│   │
│   │ [ I ] [ I ] [AA] [Aa] [aa]  │   │  ← italic, capitalize
│   │ Italicize    Capitalize      │   │
│   │ [ ← ] [ → ]                 │   │  ← direction LTR/RTL
│   │ Direction                    │   │
│   │ Breaking                     │   │
│   │ Word [ Normal ▼ ] Line [Norm]│   │  ← 2-col dropdowns
│   │ Wrap [ Normal            ▼ ] │   │  ← full width dropdown
│   │ Truncate [ Clip ] [ Ellipsis]│   │  ← toggle buttons
│   │ Stroke [ 0 px ] [ ■ #030724]│   │  ← width + color
│   └──────────────────────────────┘   │
├──────────────────────────────────────┤
│ Text shadows                      [+]│  ← add button
│   Shadow 1: [ X ] [ Y ] [ B ] [ ■ ] │  ← per-entry controls
└──────────────────────────────────────┘
```

**Rationale**: Directly mirrors the Webflow screenshot. Core properties visible immediately, advanced properties collapsed, shadows at the bottom with add/remove.

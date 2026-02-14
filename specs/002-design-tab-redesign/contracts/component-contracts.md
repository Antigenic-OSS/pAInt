# Component Contracts: Right Panel Design Tab Redesign

**Feature Branch**: `002-design-tab-redesign`
**Date**: 2026-02-14

This feature is a UI-only redesign with no API endpoints. The contracts below define the component interfaces and internal function signatures that maintain compatibility with the existing system.

---

## Contract 1: Property Change Flow (PRESERVED)

Every section component MUST follow this exact pattern:

```typescript
// 1. Read state
const computedStyles = useEditorStore((s) => s.computedStyles);
const { applyChange } = useChangeTracker();

// 2. Handle changes
const handleChange = (property: string, value: string) => {
  applyChange(property, value);
};

// 3. Pass to inputs
<CompactInput
  property="width"
  value={computedStyles.width || '0px'}
  onChange={handleChange}
/>
```

**Invariant**: `onChange(property, value)` is the universal contract. Every input component (CompactInput, IconToggleGroup, LinkedInputPair, ColorInput) MUST call it with the CSS property name and new CSS value string.

---

## Contract 2: CompactInput API

```typescript
interface CompactInputProps {
  label?: string;            // Prefix character (e.g., "W", "H", "X")
  placeholder?: string;
  value: string;             // CSS value string
  property: string;          // CSS property name
  onChange: (property: string, value: string) => void;
  units?: string[];          // Default: ['px', '%', 'em', 'rem', 'auto']
  min?: number;
  max?: number;
  step?: number;             // Default: 1
  className?: string;
}
```

**Behavior contract**:
- ArrowUp: `value + step` (Shift: `value + step * 10`)
- ArrowDown: `value - step` (Shift: `value - step * 10`)
- Enter: commit current value
- Blur: commit current value
- Unit click: cycle through `units` array
- "auto" unit: disable numeric input, call `onChange(property, 'auto')`

---

## Contract 3: IconToggleGroup API

```typescript
interface IconToggleOption {
  value: string;
  icon: React.ReactNode;     // 14×14 SVG component
  tooltip?: string;
}

interface IconToggleGroupProps {
  options: IconToggleOption[];
  value: string;
  onChange: (value: string) => void;
}
```

**Behavior contract**:
- Exactly one option active at a time
- Active button: `background: var(--accent-bg)`, `color: var(--accent)`
- Inactive button: `background: transparent`, `color: var(--text-muted)`
- Click fires `onChange(option.value)`

---

## Contract 4: LinkedInputPair API

```typescript
interface LinkedInputPairProps {
  label: string;
  values: { top: string; right: string; bottom: string; left: string };
  properties: { top: string; right: string; bottom: string; left: string };
  onChange: (property: string, value: string) => void;
  units?: string[];
}
```

**Behavior contract**:
- **Linked mode** (all 4 values equal): Show 2 CompactInputs (H, V)
  - Changing H: calls `onChange` for both `properties.left` and `properties.right`
  - Changing V: calls `onChange` for both `properties.top` and `properties.bottom`
- **Unlinked mode**: Show 4 CompactInputs (T, R, B, L)
  - Each calls `onChange` for its individual property only
- Link toggle: switch between modes. Auto-link when all 4 values equal.

---

## Contract 5: ColorInput API

```typescript
interface ColorInputProps {
  value: string;             // Resolved color value
  property: string;          // CSS property name
  onChange: (property: string, value: string) => void;
  varExpression?: string;    // CSS var() expression
  onDetach?: () => void;
  onReattach?: (expr: string) => void;
}
```

**Behavior contract**:
- If `varExpression` is set and property is not detached: render `VariableColorPicker`
- Otherwise: render `ColorPicker` with hex input and swatch
- Layout: `[swatch 20×20] [hex input] [opacity %]`

---

## Contract 6: Gradient Parser

```typescript
// src/lib/gradientParser.ts

function parseGradient(css: string): GradientData | null;
// Input: "linear-gradient(90deg, #ff0000 0%, #0000ff 100%)"
// Output: { type: 'linear', angle: 90, stops: [{color:'#ff0000',position:0,opacity:1},{color:'#0000ff',position:100,opacity:1}] }
// Returns null for unparseable values

function serializeGradient(data: GradientData): string;
// Input: { type: 'linear', angle: 90, stops: [...] }
// Output: "linear-gradient(90deg, #ff0000 0%, #0000ff 100%)"
```

**Round-trip invariant**: `serializeGradient(parseGradient(css))` MUST produce functionally equivalent CSS.

---

## Contract 7: Shadow Parser

```typescript
// src/lib/shadowParser.ts

function parseShadow(css: string): ShadowData[];
// Input: "2px 4px 6px 0px rgba(0,0,0,0.25), inset 0px 1px 2px 0px #000"
// Output: [
//   { x:2, y:4, blur:6, spread:0, color:'rgba(0,0,0,0.25)', inset:false },
//   { x:0, y:1, blur:2, spread:0, color:'#000', inset:true }
// ]
// Returns [] for "none" or unparseable values

function serializeShadow(shadows: ShadowData[]): string;
// Input: [{ x:2, y:4, blur:6, spread:0, color:'rgba(0,0,0,0.25)', inset:false }]
// Output: "2px 4px 6px 0px rgba(0,0,0,0.25)"
// Returns "none" for empty array
```

**Round-trip invariant**: `serializeShadow(parseShadow(css))` MUST produce functionally equivalent CSS.

---

## Contract 8: CSS Property Groups (Constants)

```typescript
// Additions to CSS_PROPERTIES in src/lib/constants.ts

shadow: ['box-shadow'],
appearance: ['opacity'],
'flex-item': ['flex-grow', 'flex-shrink', 'flex-basis', 'align-self', 'order'],
transform: ['transform'],
filter: ['filter'],
```

`ALL_EDITABLE_PROPERTIES` MUST be regenerated to include all new properties.

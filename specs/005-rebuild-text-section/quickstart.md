# Quickstart: Rebuild Typography / Text Section

**Feature**: 005-rebuild-text-section
**Branch**: `005-rebuild-text-section`

## Prerequisites

- Bun installed
- Dev Editor repo cloned
- A localhost target app running (e.g., `http://localhost:3000`)

## Setup

```bash
git checkout 005-rebuild-text-section
bun install
bun dev
```

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/right-panel/design/TextSection.tsx` | REWRITE | Full rebuild of the typography panel |
| `src/components/right-panel/design/icons.tsx` | ADD ICONS | New SVG icons for decoration, italic, direction |
| `src/lib/textShadowUtils.ts` | CREATE | Text-shadow parser and serializer |

## Key Patterns to Follow

### Reading computed styles
```tsx
const computedStyles = useEditorStore((state) => state.computedStyles);
const fontSize = computedStyles.fontSize || '16px';
```

### Applying changes
```tsx
const { applyChange } = useChangeTracker();
const handleChange = (property: string, value: string) => {
  applyChange(property, value);
};
```

### Color with CSS variable support
```tsx
const cssVariableUsages = useEditorStore((state) => state.cssVariableUsages);
<ColorInput
  label="Color"
  value={color}
  property="color"
  onChange={handleChange}
  varExpression={cssVariableUsages['color']}
/>
```

### Collapsible sub-section (for "More type options")
```tsx
const [moreOpen, setMoreOpen] = useState(false);
<button onClick={() => setMoreOpen(!moreOpen)}>
  {moreOpen ? '▾' : '▸'} More type options
</button>
{moreOpen && (<div>...advanced fields...</div>)}
```

### Multi-entry pattern (for text shadows)
```tsx
const shadows = parseTextShadow(computedStyles.textShadow || 'none');
const updateShadow = (index, updates) => {
  const next = shadows.map((s, i) => i === index ? { ...s, ...updates } : s);
  applyChange('textShadow', serializeTextShadow(next));
};
```

## Testing

1. Start Dev Editor: `bun dev`
2. Connect to a localhost target
3. Select a text element (heading, paragraph, etc.)
4. Verify all core fields populate with computed values
5. Change font, weight, size, height, color — verify instant preview
6. Toggle alignment and decoration icons — verify preview
7. Expand "More type options" — verify all advanced fields work
8. Add a text shadow — verify it renders in the preview
9. Check the Changes tab — verify all edits are tracked

'use client';

import { useEditorStore } from '@/store';
import { SectionHeader } from '@/components/right-panel/design/inputs/SectionHeader';
import { CompactInput } from '@/components/right-panel/design/inputs/CompactInput';
import { ColorInput } from '@/components/right-panel/design/inputs/ColorInput';
import { useChangeTracker } from '@/hooks/useChangeTracker';

const BORDER_STYLES = ['none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset'];

export function BorderSection() {
  const computedStyles = useEditorStore((state) => state.computedStyles);
  const cssVariableUsages = useEditorStore((state) => state.cssVariableUsages);
  const { applyChange } = useChangeTracker();

  const handleChange = (property: string, value: string) => {
    applyChange(property, value);
  };

  const borderWidth = computedStyles.borderWidth || '0px';
  const borderStyle = computedStyles.borderStyle || 'solid';
  const borderColor = computedStyles.borderColor || '#000000';

  const borderTopWidth = computedStyles.borderTopWidth || borderWidth;
  const borderRightWidth = computedStyles.borderRightWidth || borderWidth;
  const borderBottomWidth = computedStyles.borderBottomWidth || borderWidth;
  const borderLeftWidth = computedStyles.borderLeftWidth || borderWidth;

  return (
    <SectionHeader title="Border" defaultOpen={false}>
      {/* General Border */}
      <div className="space-y-1.5 pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="grid grid-cols-2 gap-1.5">
          <CompactInput
            label="W"
            value={borderWidth}
            property="borderWidth"
            onChange={handleChange}
            units={['px', 'em', 'rem']}
            min={0}
          />
          <select
            value={borderStyle}
            onChange={(e) => handleChange('borderStyle', e.target.value)}
            className="h-6 rounded text-[11px] px-1.5 cursor-pointer outline-none"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            {BORDER_STYLES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <ColorInput
          label="Color"
          value={borderColor}
          property="borderColor"
          onChange={handleChange}
          varExpression={cssVariableUsages['border-color']}
        />
      </div>

      {/* Individual Widths */}
      <div className="pt-1.5">
        <div className="text-[10px] font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Individual Widths
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <CompactInput
            label="T"
            value={borderTopWidth}
            property="borderTopWidth"
            onChange={handleChange}
            units={['px', 'em', 'rem']}
            min={0}
          />
          <CompactInput
            label="R"
            value={borderRightWidth}
            property="borderRightWidth"
            onChange={handleChange}
            units={['px', 'em', 'rem']}
            min={0}
          />
          <CompactInput
            label="B"
            value={borderBottomWidth}
            property="borderBottomWidth"
            onChange={handleChange}
            units={['px', 'em', 'rem']}
            min={0}
          />
          <CompactInput
            label="L"
            value={borderLeftWidth}
            property="borderLeftWidth"
            onChange={handleChange}
            units={['px', 'em', 'rem']}
            min={0}
          />
        </div>
      </div>
    </SectionHeader>
  );
}

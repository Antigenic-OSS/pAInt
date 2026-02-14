'use client';

import { useState } from 'react';
import { useEditorStore } from '@/store';
import { SectionHeader } from '@/components/right-panel/design/inputs/SectionHeader';
import { CompactInput } from '@/components/right-panel/design/inputs/CompactInput';
import { ExpandIcon } from '@/components/right-panel/design/icons';
import { useChangeTracker } from '@/hooks/useChangeTracker';
import { parseCSSValue, formatCSSValue } from '@/lib/utils';

export function AppearanceSection() {
  const computedStyles = useEditorStore((state) => state.computedStyles);
  const { applyChange } = useChangeTracker();
  const [showCorners, setShowCorners] = useState(false);

  const handleChange = (property: string, value: string) => {
    applyChange(property, value);
  };

  // Opacity: computedStyles returns 0-1 float, display as 0-100%
  const rawOpacity = computedStyles.opacity || '1';
  const opacityPercent = String(Math.round(parseFloat(rawOpacity) * 100));

  const handleOpacityChange = (_property: string, value: string) => {
    const parsed = parseCSSValue(value);
    const clamped = Math.max(0, Math.min(100, parsed.number));
    applyChange('opacity', String(clamped / 100));
  };

  return (
    <SectionHeader title="Appearance" defaultOpen={true}>
      <div className="grid grid-cols-2 gap-1.5">
        <CompactInput
          label="O"
          value={formatCSSValue(parseFloat(opacityPercent), '%')}
          property="opacity"
          onChange={handleOpacityChange}
          units={['%']}
          min={0}
          max={100}
          step={1}
        />
        <div className="flex items-center gap-1">
          <CompactInput
            label="R"
            value={computedStyles.borderRadius || '0px'}
            property="borderRadius"
            onChange={handleChange}
            units={['px', '%', 'em', 'rem']}
            min={0}
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => setShowCorners(!showCorners)}
            className="flex items-center justify-center w-6 h-6 rounded hover:opacity-80"
            style={{
              color: showCorners ? 'var(--accent)' : 'var(--text-muted)',
              background: showCorners ? 'var(--accent-bg, rgba(74,158,255,0.15))' : 'transparent',
            }}
            title="Individual corners"
          >
            <ExpandIcon />
          </button>
        </div>
      </div>

      {showCorners && (
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <CompactInput
            label="TL"
            value={computedStyles.borderTopLeftRadius || '0px'}
            property="borderTopLeftRadius"
            onChange={handleChange}
            units={['px', '%', 'em', 'rem']}
            min={0}
          />
          <CompactInput
            label="TR"
            value={computedStyles.borderTopRightRadius || '0px'}
            property="borderTopRightRadius"
            onChange={handleChange}
            units={['px', '%', 'em', 'rem']}
            min={0}
          />
          <CompactInput
            label="BL"
            value={computedStyles.borderBottomLeftRadius || '0px'}
            property="borderBottomLeftRadius"
            onChange={handleChange}
            units={['px', '%', 'em', 'rem']}
            min={0}
          />
          <CompactInput
            label="BR"
            value={computedStyles.borderBottomRightRadius || '0px'}
            property="borderBottomRightRadius"
            onChange={handleChange}
            units={['px', '%', 'em', 'rem']}
            min={0}
          />
        </div>
      )}
    </SectionHeader>
  );
}

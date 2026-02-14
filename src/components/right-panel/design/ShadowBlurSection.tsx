'use client';

import { useMemo } from 'react';
import { useEditorStore } from '@/store';
import { SectionHeader } from '@/components/right-panel/design/inputs/SectionHeader';
import { CompactInput } from '@/components/right-panel/design/inputs/CompactInput';
import { ColorPicker } from '@/components/common/ColorPicker';
import { PlusIcon, TrashIcon, InsetIcon } from '@/components/right-panel/design/icons';
import { parseShadow, serializeShadow } from '@/lib/shadowParser';
import { useChangeTracker } from '@/hooks/useChangeTracker';
import type { ShadowData } from '@/types/shadow';

const DEFAULT_SHADOW: ShadowData = {
  x: 0,
  y: 0,
  blur: 4,
  spread: 0,
  color: 'rgba(0,0,0,0.25)',
  inset: false,
};

export function ShadowBlurSection() {
  const computedStyles = useEditorStore((state) => state.computedStyles);
  const { applyChange } = useChangeTracker();

  const boxShadow = computedStyles.boxShadow || 'none';
  const filter = computedStyles.filter || 'none';

  const shadows = useMemo(() => parseShadow(boxShadow), [boxShadow]);

  // Extract blur value from filter
  const filterBlurMatch = filter.match(/blur\((\d+(?:\.\d+)?)px\)/);
  const filterBlurValue = filterBlurMatch ? filterBlurMatch[1] : '0';

  const updateShadows = (newShadows: ShadowData[]) => {
    applyChange('boxShadow', serializeShadow(newShadows));
  };

  const updateShadow = (index: number, updates: Partial<ShadowData>) => {
    const newShadows = shadows.map((s, i) =>
      i === index ? { ...s, ...updates } : s
    );
    updateShadows(newShadows);
  };

  const addShadow = () => {
    updateShadows([...shadows, { ...DEFAULT_SHADOW }]);
  };

  const removeShadow = (index: number) => {
    updateShadows(shadows.filter((_, i) => i !== index));
  };

  const handleFilterBlurChange = (_property: string, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      applyChange('filter', `blur(${num}px)`);
    } else {
      applyChange('filter', 'none');
    }
  };

  return (
    <SectionHeader
      title="Shadow & Blur"
      defaultOpen={false}
      actions={
        <button
          type="button"
          onClick={addShadow}
          className="flex items-center justify-center w-5 h-5 rounded hover:opacity-80"
          style={{ color: 'var(--text-muted)' }}
          title="Add shadow"
        >
          <PlusIcon />
        </button>
      }
    >
      {/* Shadow layers */}
      {shadows.map((shadow, i) => (
        <div key={i} className="space-y-1 pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
              Shadow {shadows.length > 1 ? i + 1 : ''}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => updateShadow(i, { inset: !shadow.inset })}
                className="flex items-center justify-center w-5 h-5 rounded hover:opacity-80"
                style={{
                  color: shadow.inset ? 'var(--accent)' : 'var(--text-muted)',
                  background: shadow.inset ? 'var(--accent-bg, rgba(74,158,255,0.15))' : 'transparent',
                }}
                title="Inset"
              >
                <InsetIcon />
              </button>
              <button
                type="button"
                onClick={() => removeShadow(i)}
                className="flex items-center justify-center w-5 h-5 rounded hover:opacity-80"
                style={{ color: 'var(--text-muted)' }}
                title="Remove"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <CompactInput
              label="X"
              value={`${shadow.x}px`}
              property={`shadow-${i}-x`}
              onChange={(_p, v) => {
                const num = parseFloat(v);
                if (!isNaN(num)) updateShadow(i, { x: num });
              }}
              units={['px']}
            />
            <CompactInput
              label="Y"
              value={`${shadow.y}px`}
              property={`shadow-${i}-y`}
              onChange={(_p, v) => {
                const num = parseFloat(v);
                if (!isNaN(num)) updateShadow(i, { y: num });
              }}
              units={['px']}
            />
            <CompactInput
              label="B"
              value={`${shadow.blur}px`}
              property={`shadow-${i}-blur`}
              onChange={(_p, v) => {
                const num = parseFloat(v);
                if (!isNaN(num)) updateShadow(i, { blur: Math.max(0, num) });
              }}
              units={['px']}
              min={0}
            />
            <CompactInput
              label="S"
              value={`${shadow.spread}px`}
              property={`shadow-${i}-spread`}
              onChange={(_p, v) => {
                const num = parseFloat(v);
                if (!isNaN(num)) updateShadow(i, { spread: num });
              }}
              units={['px']}
            />
          </div>
          <ColorPicker
            label="Color"
            value={shadow.color}
            onChange={(c) => updateShadow(i, { color: c })}
          />
        </div>
      ))}

      {shadows.length === 0 && (
        <div className="text-[11px] py-1" style={{ color: 'var(--text-muted)' }}>
          No shadows. Click + to add one.
        </div>
      )}

      {/* Filter blur */}
      <div className="pt-1">
        <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
          Filter Blur
        </div>
        <CompactInput
          label="B"
          value={`${filterBlurValue}px`}
          property="filter"
          onChange={handleFilterBlurChange}
          units={['px']}
          min={0}
          className="w-1/2"
        />
      </div>
    </SectionHeader>
  );
}

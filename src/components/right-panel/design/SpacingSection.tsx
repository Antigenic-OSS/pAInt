'use client';

import { useEditorStore } from '@/store';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { parseCSSValue } from '@/lib/utils';
import { useChangeTracker } from '@/hooks/useChangeTracker';

export function SpacingSection() {
  const computedStyles = useEditorStore((state) => state.computedStyles);
  const { applyChange } = useChangeTracker();

  const handleChange = (property: string, value: string) => {
    applyChange(property, value);
  };

  // Parse spacing values
  const marginTop = parseCSSValue(computedStyles.marginTop || '0px');
  const marginRight = parseCSSValue(computedStyles.marginRight || '0px');
  const marginBottom = parseCSSValue(computedStyles.marginBottom || '0px');
  const marginLeft = parseCSSValue(computedStyles.marginLeft || '0px');

  const paddingTop = parseCSSValue(computedStyles.paddingTop || '0px');
  const paddingRight = parseCSSValue(computedStyles.paddingRight || '0px');
  const paddingBottom = parseCSSValue(computedStyles.paddingBottom || '0px');
  const paddingLeft = parseCSSValue(computedStyles.paddingLeft || '0px');

  const handleInputChange = (property: string, value: string) => {
    handleChange(property, value);
  };

  const SpacingInput = ({ value, property, placeholder }: { value: number, property: string, placeholder?: string }) => (
    <input
      type="number"
      value={value}
      onChange={(e) => handleInputChange(property, `${e.target.value}px`)}
      placeholder={placeholder}
      className="w-10 text-[11px] text-center py-0.5 px-1 rounded"
      style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        color: 'var(--text-primary)',
      }}
    />
  );

  return (
    <CollapsibleSection title="Spacing" defaultOpen={true}>
      {/* Box Model Diagram */}
      <div
        className="p-3 rounded"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border)'
        }}
      >
        {/* Margin (outer) */}
        <div
          className="p-2"
          style={{
            background: 'rgba(255, 200, 100, 0.1)',
            border: '1px dashed rgba(255, 200, 100, 0.3)'
          }}
        >
          <div className="flex justify-center mb-1">
            <SpacingInput value={marginTop.number} property="marginTop" />
          </div>
          <div className="flex items-center gap-1">
            <SpacingInput value={marginLeft.number} property="marginLeft" />

            {/* Padding (inner) */}
            <div
              className="flex-1 p-2"
              style={{
                background: 'rgba(100, 255, 200, 0.1)',
                border: '1px dashed rgba(100, 255, 200, 0.3)'
              }}
            >
              <div className="flex justify-center mb-1">
                <SpacingInput value={paddingTop.number} property="paddingTop" />
              </div>
              <div className="flex items-center gap-1">
                <SpacingInput value={paddingLeft.number} property="paddingLeft" />

                {/* Content */}
                <div
                  className="flex-1 flex items-center justify-center text-[9px] py-3"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)'
                  }}
                >
                  content
                </div>

                <SpacingInput value={paddingRight.number} property="paddingRight" />
              </div>
              <div className="flex justify-center mt-1">
                <SpacingInput value={paddingBottom.number} property="paddingBottom" />
              </div>
            </div>

            <SpacingInput value={marginRight.number} property="marginRight" />
          </div>
          <div className="flex justify-center mt-1">
            <SpacingInput value={marginBottom.number} property="marginBottom" />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-[10px]">
        <div className="flex items-center gap-1">
          <div
            className="w-3 h-3 rounded"
            style={{ background: 'rgba(255, 200, 100, 0.2)', border: '1px dashed rgba(255, 200, 100, 0.4)' }}
          />
          <span style={{ color: 'var(--text-muted)' }}>Margin</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-3 h-3 rounded"
            style={{ background: 'rgba(100, 255, 200, 0.2)', border: '1px dashed rgba(100, 255, 200, 0.4)' }}
          />
          <span style={{ color: 'var(--text-muted)' }}>Padding</span>
        </div>
      </div>
    </CollapsibleSection>
  );
}

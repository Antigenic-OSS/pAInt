'use client';

import { useEditorStore } from '@/store';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { PropertyInput } from '@/components/right-panel/design/PropertyInput';
import { useChangeTracker } from '@/hooks/useChangeTracker';

export function PositionSection() {
  const computedStyles = useEditorStore((state) => state.computedStyles);
  const { applyChange } = useChangeTracker();

  const handleChange = (property: string, value: string) => {
    applyChange(property, value);
  };

  const position = computedStyles.position || 'static';
  const top = computedStyles.top || 'auto';
  const right = computedStyles.right || 'auto';
  const bottom = computedStyles.bottom || 'auto';
  const left = computedStyles.left || 'auto';
  const zIndex = computedStyles.zIndex || 'auto';

  const isPositioned = position !== 'static';

  return (
    <CollapsibleSection title="Position" defaultOpen={true}>
      <PropertyInput
        label="Type"
        value={position}
        property="position"
        onChange={handleChange}
        type="select"
        options={['static', 'relative', 'absolute', 'fixed', 'sticky']}
      />

      {isPositioned && (
        <div className="space-y-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <PropertyInput
            label="Top"
            value={top}
            property="top"
            onChange={handleChange}
            showUnit={true}
            units={['px', '%', 'em', 'rem', 'auto']}
          />
          <PropertyInput
            label="Right"
            value={right}
            property="right"
            onChange={handleChange}
            showUnit={true}
            units={['px', '%', 'em', 'rem', 'auto']}
          />
          <PropertyInput
            label="Bottom"
            value={bottom}
            property="bottom"
            onChange={handleChange}
            showUnit={true}
            units={['px', '%', 'em', 'rem', 'auto']}
          />
          <PropertyInput
            label="Left"
            value={left}
            property="left"
            onChange={handleChange}
            showUnit={true}
            units={['px', '%', 'em', 'rem', 'auto']}
          />
          <PropertyInput
            label="Z-Index"
            value={zIndex}
            property="zIndex"
            onChange={handleChange}
            showUnit={false}
          />
        </div>
      )}
    </CollapsibleSection>
  );
}

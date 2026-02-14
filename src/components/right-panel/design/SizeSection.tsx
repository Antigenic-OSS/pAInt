'use client';

import { useEditorStore } from '@/store';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { PropertyInput } from '@/components/right-panel/design/PropertyInput';
import { useChangeTracker } from '@/hooks/useChangeTracker';

export function SizeSection() {
  const computedStyles = useEditorStore((state) => state.computedStyles);
  const { applyChange } = useChangeTracker();

  const handleChange = (property: string, value: string) => {
    applyChange(property, value);
  };

  const width = computedStyles.width || 'auto';
  const height = computedStyles.height || 'auto';
  const minWidth = computedStyles.minWidth || '0px';
  const minHeight = computedStyles.minHeight || '0px';
  const maxWidth = computedStyles.maxWidth || 'none';
  const maxHeight = computedStyles.maxHeight || 'none';
  const overflow = computedStyles.overflow || 'visible';
  const overflowX = computedStyles.overflowX || 'visible';
  const overflowY = computedStyles.overflowY || 'visible';

  return (
    <CollapsibleSection title="Size" defaultOpen={true}>
      <PropertyInput
        label="Width"
        value={width}
        property="width"
        onChange={handleChange}
        showUnit={true}
        units={['px', '%', 'em', 'rem', 'vw', 'auto']}
      />
      <PropertyInput
        label="Height"
        value={height}
        property="height"
        onChange={handleChange}
        showUnit={true}
        units={['px', '%', 'em', 'rem', 'vh', 'auto']}
      />
      <PropertyInput
        label="Min W"
        value={minWidth}
        property="minWidth"
        onChange={handleChange}
        showUnit={true}
        units={['px', '%', 'em', 'rem', 'vw']}
      />
      <PropertyInput
        label="Min H"
        value={minHeight}
        property="minHeight"
        onChange={handleChange}
        showUnit={true}
        units={['px', '%', 'em', 'rem', 'vh']}
      />
      <PropertyInput
        label="Max W"
        value={maxWidth}
        property="maxWidth"
        onChange={handleChange}
        showUnit={true}
        units={['px', '%', 'em', 'rem', 'vw', 'none']}
      />
      <PropertyInput
        label="Max H"
        value={maxHeight}
        property="maxHeight"
        onChange={handleChange}
        showUnit={true}
        units={['px', '%', 'em', 'rem', 'vh', 'none']}
      />
      <PropertyInput
        label="Overflow"
        value={overflow}
        property="overflow"
        onChange={handleChange}
        type="select"
        options={['visible', 'hidden', 'scroll', 'auto']}
      />
      <PropertyInput
        label="Overflow X"
        value={overflowX}
        property="overflowX"
        onChange={handleChange}
        type="select"
        options={['visible', 'hidden', 'scroll', 'auto']}
      />
      <PropertyInput
        label="Overflow Y"
        value={overflowY}
        property="overflowY"
        onChange={handleChange}
        type="select"
        options={['visible', 'hidden', 'scroll', 'auto']}
      />
    </CollapsibleSection>
  );
}

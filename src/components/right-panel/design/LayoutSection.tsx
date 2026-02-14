'use client';

import { useEditorStore } from '@/store';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { PropertyInput } from '@/components/right-panel/design/PropertyInput';
import { useChangeTracker } from '@/hooks/useChangeTracker';

export function LayoutSection() {
  const computedStyles = useEditorStore((state) => state.computedStyles);
  const { applyChange } = useChangeTracker();

  const handleChange = (property: string, value: string) => {
    applyChange(property, value);
  };

  const display = computedStyles.display || 'block';
  const flexDirection = computedStyles.flexDirection || 'row';
  const justifyContent = computedStyles.justifyContent || 'flex-start';
  const alignItems = computedStyles.alignItems || 'stretch';
  const alignContent = computedStyles.alignContent || 'normal';
  const flexWrap = computedStyles.flexWrap || 'nowrap';
  const gap = computedStyles.gap || '0px';
  const rowGap = computedStyles.rowGap || gap;
  const columnGap = computedStyles.columnGap || gap;

  const isFlex = display === 'flex' || display === 'inline-flex';
  const isGrid = display === 'grid' || display === 'inline-grid';

  return (
    <CollapsibleSection title="Layout" defaultOpen={true}>
      <PropertyInput
        label="Display"
        value={display}
        property="display"
        onChange={handleChange}
        type="select"
        options={['block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'none']}
      />

      {/* Flexbox Controls */}
      {isFlex && (
        <div className="space-y-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
            Flexbox
          </div>
          <PropertyInput
            label="Direction"
            value={flexDirection}
            property="flexDirection"
            onChange={handleChange}
            type="select"
            options={['row', 'row-reverse', 'column', 'column-reverse']}
          />
          <PropertyInput
            label="Justify"
            value={justifyContent}
            property="justifyContent"
            onChange={handleChange}
            type="select"
            options={['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly']}
          />
          <PropertyInput
            label="Align"
            value={alignItems}
            property="alignItems"
            onChange={handleChange}
            type="select"
            options={['stretch', 'flex-start', 'flex-end', 'center', 'baseline']}
          />
          <PropertyInput
            label="Wrap"
            value={flexWrap}
            property="flexWrap"
            onChange={handleChange}
            type="select"
            options={['nowrap', 'wrap', 'wrap-reverse']}
          />
          <PropertyInput
            label="Align Cont"
            value={alignContent}
            property="alignContent"
            onChange={handleChange}
            type="select"
            options={['normal', 'flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'stretch']}
          />
          <PropertyInput
            label="Gap"
            value={gap}
            property="gap"
            onChange={handleChange}
            showUnit={true}
            units={['px', 'em', 'rem', '%']}
          />
          <PropertyInput
            label="Row Gap"
            value={rowGap}
            property="rowGap"
            onChange={handleChange}
            showUnit={true}
            units={['px', 'em', 'rem', '%']}
          />
          <PropertyInput
            label="Col Gap"
            value={columnGap}
            property="columnGap"
            onChange={handleChange}
            showUnit={true}
            units={['px', 'em', 'rem', '%']}
          />
        </div>
      )}

      {/* Grid Controls */}
      {isGrid && (
        <div className="space-y-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
            Grid
          </div>
          <PropertyInput
            label="Template C"
            value={computedStyles.gridTemplateColumns || 'none'}
            property="gridTemplateColumns"
            onChange={handleChange}
            type="text"
          />
          <PropertyInput
            label="Template R"
            value={computedStyles.gridTemplateRows || 'none'}
            property="gridTemplateRows"
            onChange={handleChange}
            type="text"
          />
          <PropertyInput
            label="Gap"
            value={gap}
            property="gap"
            onChange={handleChange}
            showUnit={true}
            units={['px', 'em', 'rem', '%']}
          />
          <PropertyInput
            label="Row Gap"
            value={rowGap}
            property="rowGap"
            onChange={handleChange}
            showUnit={true}
            units={['px', 'em', 'rem', '%']}
          />
          <PropertyInput
            label="Col Gap"
            value={columnGap}
            property="columnGap"
            onChange={handleChange}
            showUnit={true}
            units={['px', 'em', 'rem', '%']}
          />
        </div>
      )}
    </CollapsibleSection>
  );
}

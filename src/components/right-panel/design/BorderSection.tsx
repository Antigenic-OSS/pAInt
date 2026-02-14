'use client';

import { useEditorStore } from '@/store';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { PropertyInput } from '@/components/right-panel/design/PropertyInput';
import { ColorPicker } from '@/components/common/ColorPicker';
import { VariableColorPicker } from '@/components/common/VariableColorPicker';
import { useChangeTracker } from '@/hooks/useChangeTracker';

export function BorderSection() {
  const computedStyles = useEditorStore((state) => state.computedStyles);
  const selectorPath = useEditorStore((state) => state.selectorPath);
  const cssVariableUsages = useEditorStore((state) => state.cssVariableUsages);
  const isPropertyDetached = useEditorStore((state) => state.isPropertyDetached);
  const detachProperty = useEditorStore((state) => state.detachProperty);
  const reattachProperty = useEditorStore((state) => state.reattachProperty);
  const { applyChange } = useChangeTracker();

  const handleChange = (property: string, value: string) => {
    applyChange(property, value);
  };

  const borderWidth = computedStyles.borderWidth || '0px';
  const borderStyle = computedStyles.borderStyle || 'solid';
  const borderColor = computedStyles.borderColor || '#000000';
  const borderRadius = computedStyles.borderRadius || '0px';

  const borderColorVarExpr = cssVariableUsages['border-color'];
  const borderColorHasVar = !!borderColorVarExpr && !!selectorPath && !isPropertyDetached(selectorPath, 'borderColor');

  // Individual border widths
  const borderTopWidth = computedStyles.borderTopWidth || borderWidth;
  const borderRightWidth = computedStyles.borderRightWidth || borderWidth;
  const borderBottomWidth = computedStyles.borderBottomWidth || borderWidth;
  const borderLeftWidth = computedStyles.borderLeftWidth || borderWidth;

  // Individual border radius
  const borderTopLeftRadius = computedStyles.borderTopLeftRadius || borderRadius;
  const borderTopRightRadius = computedStyles.borderTopRightRadius || borderRadius;
  const borderBottomRightRadius = computedStyles.borderBottomRightRadius || borderRadius;
  const borderBottomLeftRadius = computedStyles.borderBottomLeftRadius || borderRadius;

  return (
    <CollapsibleSection title="Border" defaultOpen={true}>
      {/* General Border */}
      <div className="space-y-2 pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <PropertyInput
          label="Width"
          value={borderWidth}
          property="borderWidth"
          onChange={handleChange}
          showUnit={true}
          units={['px', 'em', 'rem']}
        />
        <PropertyInput
          label="Style"
          value={borderStyle}
          property="borderStyle"
          onChange={handleChange}
          type="select"
          options={['none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset']}
        />
        {borderColorHasVar ? (
          <VariableColorPicker
            label="Color"
            property="borderColor"
            value={borderColor}
            varExpression={borderColorVarExpr}
            onChange={handleChange}
            onDetach={() => selectorPath && detachProperty(selectorPath, 'borderColor')}
            onReattach={(expr) => {
              if (selectorPath) {
                reattachProperty(selectorPath, 'borderColor');
                handleChange('borderColor', expr);
              }
            }}
          />
        ) : (
          <ColorPicker
            label="Color"
            value={borderColor}
            onChange={(value) => handleChange('borderColor', value)}
          />
        )}
        <PropertyInput
          label="Radius"
          value={borderRadius}
          property="borderRadius"
          onChange={handleChange}
          showUnit={true}
          units={['px', '%', 'em', 'rem']}
        />
      </div>

      {/* Individual Widths */}
      <div className="space-y-2 pt-2 pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
          Individual Widths
        </div>
        <PropertyInput
          label="Top"
          value={borderTopWidth}
          property="borderTopWidth"
          onChange={handleChange}
          showUnit={true}
          units={['px', 'em', 'rem']}
        />
        <PropertyInput
          label="Right"
          value={borderRightWidth}
          property="borderRightWidth"
          onChange={handleChange}
          showUnit={true}
          units={['px', 'em', 'rem']}
        />
        <PropertyInput
          label="Bottom"
          value={borderBottomWidth}
          property="borderBottomWidth"
          onChange={handleChange}
          showUnit={true}
          units={['px', 'em', 'rem']}
        />
        <PropertyInput
          label="Left"
          value={borderLeftWidth}
          property="borderLeftWidth"
          onChange={handleChange}
          showUnit={true}
          units={['px', 'em', 'rem']}
        />
      </div>

      {/* Individual Radius */}
      <div className="space-y-2 pt-2">
        <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
          Individual Radius
        </div>
        <PropertyInput
          label="Top L"
          value={borderTopLeftRadius}
          property="borderTopLeftRadius"
          onChange={handleChange}
          showUnit={true}
          units={['px', '%', 'em', 'rem']}
        />
        <PropertyInput
          label="Top R"
          value={borderTopRightRadius}
          property="borderTopRightRadius"
          onChange={handleChange}
          showUnit={true}
          units={['px', '%', 'em', 'rem']}
        />
        <PropertyInput
          label="Bottom R"
          value={borderBottomRightRadius}
          property="borderBottomRightRadius"
          onChange={handleChange}
          showUnit={true}
          units={['px', '%', 'em', 'rem']}
        />
        <PropertyInput
          label="Bottom L"
          value={borderBottomLeftRadius}
          property="borderBottomLeftRadius"
          onChange={handleChange}
          showUnit={true}
          units={['px', '%', 'em', 'rem']}
        />
      </div>
    </CollapsibleSection>
  );
}

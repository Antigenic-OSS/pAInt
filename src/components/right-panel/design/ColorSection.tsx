'use client';

import { useEditorStore } from '@/store';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { ColorPicker } from '@/components/common/ColorPicker';
import { VariableColorPicker } from '@/components/common/VariableColorPicker';
import { useChangeTracker } from '@/hooks/useChangeTracker';

export function ColorSection() {
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

  const backgroundColor = computedStyles.backgroundColor || 'transparent';
  const color = computedStyles.color || '#000000';
  const opacity = computedStyles.opacity || '1';

  const bgVarExpr = cssVariableUsages['background-color'];
  const colorVarExpr = cssVariableUsages['color'];
  const bgHasVar = !!bgVarExpr && !!selectorPath && !isPropertyDetached(selectorPath, 'backgroundColor');
  const colorHasVar = !!colorVarExpr && !!selectorPath && !isPropertyDetached(selectorPath, 'color');

  return (
    <CollapsibleSection title="Color" defaultOpen={true}>
      {bgHasVar ? (
        <VariableColorPicker
          label="Background"
          property="backgroundColor"
          value={backgroundColor}
          varExpression={bgVarExpr}
          onChange={handleChange}
          onDetach={() => selectorPath && detachProperty(selectorPath, 'backgroundColor')}
          onReattach={(expr) => {
            if (selectorPath) {
              reattachProperty(selectorPath, 'backgroundColor');
              handleChange('backgroundColor', expr);
            }
          }}
        />
      ) : (
        <ColorPicker
          label="Background"
          value={backgroundColor}
          onChange={(value) => handleChange('backgroundColor', value)}
        />
      )}

      {colorHasVar ? (
        <VariableColorPicker
          label="Text"
          property="color"
          value={color}
          varExpression={colorVarExpr}
          onChange={handleChange}
          onDetach={() => selectorPath && detachProperty(selectorPath, 'color')}
          onReattach={(expr) => {
            if (selectorPath) {
              reattachProperty(selectorPath, 'color');
              handleChange('color', expr);
            }
          }}
        />
      ) : (
        <ColorPicker
          label="Text"
          value={color}
          onChange={(value) => handleChange('color', value)}
        />
      )}

      {/* Opacity Slider */}
      <div className="flex items-center gap-2">
        <label className="text-[11px] w-16 flex-shrink-0 truncate" style={{ color: 'var(--text-muted)' }}>
          Opacity
        </label>
        <div className="flex flex-1 items-center gap-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={opacity}
            onChange={(e) => handleChange('opacity', e.target.value)}
            className="flex-1"
            style={{ accentColor: 'var(--accent)' }}
          />
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={opacity}
            onChange={(e) => handleChange('opacity', e.target.value)}
            className="w-12 text-xs py-1 px-2"
          />
        </div>
      </div>
    </CollapsibleSection>
  );
}

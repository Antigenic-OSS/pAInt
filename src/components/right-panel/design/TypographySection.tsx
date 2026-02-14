'use client';

import { useEditorStore } from '@/store';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { PropertyInput } from '@/components/right-panel/design/PropertyInput';
import { useChangeTracker } from '@/hooks/useChangeTracker';

export function TypographySection() {
  const computedStyles = useEditorStore((state) => state.computedStyles);
  const { applyChange } = useChangeTracker();

  const handleChange = (property: string, value: string) => {
    applyChange(property, value);
  };

  const fontFamily = computedStyles.fontFamily || 'inherit';
  const fontSize = computedStyles.fontSize || '16px';
  const fontWeight = computedStyles.fontWeight || '400';
  const lineHeight = computedStyles.lineHeight || 'normal';
  const letterSpacing = computedStyles.letterSpacing || 'normal';
  const textAlign = computedStyles.textAlign || 'left';
  const textTransform = computedStyles.textTransform || 'none';
  const textDecoration = computedStyles.textDecoration || 'none';
  const fontStyle = computedStyles.fontStyle || 'normal';

  return (
    <CollapsibleSection title="Typography" defaultOpen={true}>
      <PropertyInput
        label="Font"
        value={fontFamily}
        property="fontFamily"
        onChange={handleChange}
        type="select"
        options={[
          'inherit',
          'Arial, sans-serif',
          'Georgia, serif',
          'Courier New, monospace',
          'Times New Roman, serif',
          'Verdana, sans-serif',
          'Trebuchet MS, sans-serif',
          'system-ui, sans-serif',
        ]}
      />
      <PropertyInput
        label="Size"
        value={fontSize}
        property="fontSize"
        onChange={handleChange}
        showUnit={true}
        units={['px', 'em', 'rem', '%']}
      />
      <PropertyInput
        label="Weight"
        value={fontWeight}
        property="fontWeight"
        onChange={handleChange}
        type="select"
        options={['100', '200', '300', '400', '500', '600', '700', '800', '900', 'normal', 'bold']}
      />
      <PropertyInput
        label="Line H"
        value={lineHeight}
        property="lineHeight"
        onChange={handleChange}
        showUnit={true}
        units={['px', 'em', 'rem', '', 'normal']}
      />
      <PropertyInput
        label="Letter Sp"
        value={letterSpacing}
        property="letterSpacing"
        onChange={handleChange}
        showUnit={true}
        units={['px', 'em', 'rem', 'normal']}
      />
      <PropertyInput
        label="Align"
        value={textAlign}
        property="textAlign"
        onChange={handleChange}
        type="select"
        options={['left', 'center', 'right', 'justify', 'start', 'end']}
      />
      <PropertyInput
        label="Transform"
        value={textTransform}
        property="textTransform"
        onChange={handleChange}
        type="select"
        options={['none', 'uppercase', 'lowercase', 'capitalize']}
      />
      <PropertyInput
        label="Decoration"
        value={textDecoration}
        property="textDecoration"
        onChange={handleChange}
        type="select"
        options={['none', 'underline', 'overline', 'line-through']}
      />
      <PropertyInput
        label="Style"
        value={fontStyle}
        property="fontStyle"
        onChange={handleChange}
        type="select"
        options={['normal', 'italic', 'oblique']}
      />
    </CollapsibleSection>
  );
}

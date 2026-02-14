'use client';

import { useEditorStore } from '@/store';
import { ColorPicker } from '@/components/common/ColorPicker';
import { VariableColorPicker } from '@/components/common/VariableColorPicker';

interface ColorInputProps {
  value: string;
  property: string;
  onChange: (property: string, value: string) => void;
  varExpression?: string;
  label?: string;
}

export function ColorInput({
  value,
  property,
  onChange,
  varExpression,
  label,
}: ColorInputProps) {
  const selectorPath = useEditorStore((s) => s.selectorPath);
  const isPropertyDetached = useEditorStore((s) => s.isPropertyDetached);
  const detachProperty = useEditorStore((s) => s.detachProperty);
  const reattachProperty = useEditorStore((s) => s.reattachProperty);

  const hasVar = !!varExpression && !!selectorPath && !isPropertyDetached(selectorPath, property);

  if (hasVar) {
    return (
      <VariableColorPicker
        label={label || ''}
        property={property}
        value={value}
        varExpression={varExpression}
        onChange={onChange}
        onDetach={() => selectorPath && detachProperty(selectorPath, property)}
        onReattach={(expr) => {
          if (selectorPath) {
            reattachProperty(selectorPath, property);
            onChange(property, expr);
          }
        }}
      />
    );
  }

  return (
    <ColorPicker
      label={label}
      value={value}
      onChange={(val) => onChange(property, val)}
    />
  );
}

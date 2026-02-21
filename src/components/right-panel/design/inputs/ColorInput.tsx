'use client';

import { useEditorStore } from '@/store';
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
  const detachProperty = useEditorStore((s) => s.detachProperty);
  const reattachProperty = useEditorStore((s) => s.reattachProperty);
  const tailwindEntry = useEditorStore((s) => s.tailwindClassMap[property]);

  return (
    <VariableColorPicker
      label={label || ''}
      property={property}
      value={value}
      varExpression={varExpression}
      tailwindClassName={tailwindEntry?.className}
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

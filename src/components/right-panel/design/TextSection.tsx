'use client';

import { useEditorStore } from '@/store';
import { SectionHeader } from '@/components/right-panel/design/inputs/SectionHeader';
import { CompactInput } from '@/components/right-panel/design/inputs/CompactInput';
import { IconToggleGroup } from '@/components/right-panel/design/inputs/IconToggleGroup';
import { ColorInput } from '@/components/right-panel/design/inputs/ColorInput';
import {
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  AlignJustifyIcon,
} from '@/components/right-panel/design/icons';
import { useChangeTracker } from '@/hooks/useChangeTracker';

const TEXT_ALIGN_OPTIONS = [
  { value: 'left', icon: <AlignLeftIcon />, tooltip: 'Left' },
  { value: 'center', icon: <AlignCenterIcon />, tooltip: 'Center' },
  { value: 'right', icon: <AlignRightIcon />, tooltip: 'Right' },
  { value: 'justify', icon: <AlignJustifyIcon />, tooltip: 'Justify' },
];

export function TextSection() {
  const computedStyles = useEditorStore((state) => state.computedStyles);
  const cssVariableUsages = useEditorStore((state) => state.cssVariableUsages);
  const { applyChange } = useChangeTracker();

  const handleChange = (property: string, value: string) => {
    applyChange(property, value);
  };

  const fontFamily = computedStyles.fontFamily || 'inherit';
  const fontWeight = computedStyles.fontWeight || '400';
  const fontSize = computedStyles.fontSize || '16px';
  const color = computedStyles.color || '#000000';
  const lineHeight = computedStyles.lineHeight || 'normal';
  const letterSpacing = computedStyles.letterSpacing || 'normal';
  const textAlign = computedStyles.textAlign || 'left';
  const textDecoration = computedStyles.textDecoration || 'none';
  const textTransform = computedStyles.textTransform || 'none';

  return (
    <SectionHeader title="Text" defaultOpen={true}>
      {/* Font family */}
      <input
        type="text"
        value={fontFamily}
        onChange={(e) => handleChange('fontFamily', e.target.value)}
        className="w-full h-6 rounded text-[11px] px-2 outline-none"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
        }}
        placeholder="Font family"
      />

      {/* Weight + Size */}
      <div className="grid grid-cols-2 gap-1.5">
        <select
          value={fontWeight}
          onChange={(e) => handleChange('fontWeight', e.target.value)}
          className="h-6 rounded text-[11px] px-1.5 cursor-pointer outline-none"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <option value="100">100 Thin</option>
          <option value="200">200 Extra Light</option>
          <option value="300">300 Light</option>
          <option value="400">400 Regular</option>
          <option value="500">500 Medium</option>
          <option value="600">600 Semi Bold</option>
          <option value="700">700 Bold</option>
          <option value="800">800 Extra Bold</option>
          <option value="900">900 Black</option>
        </select>
        <CompactInput
          label="S"
          value={fontSize}
          property="fontSize"
          onChange={handleChange}
          units={['px', 'em', 'rem', '%']}
          min={0}
        />
      </div>

      {/* Color */}
      <ColorInput
        label="Color"
        value={color}
        property="color"
        onChange={handleChange}
        varExpression={cssVariableUsages['color']}
      />

      {/* Line height + Letter spacing */}
      <div className="grid grid-cols-2 gap-1.5">
        <CompactInput
          label="LH"
          value={lineHeight}
          property="lineHeight"
          onChange={handleChange}
          units={['px', 'em', 'rem', '']}
        />
        <CompactInput
          label="LS"
          value={letterSpacing}
          property="letterSpacing"
          onChange={handleChange}
          units={['px', 'em', 'rem']}
        />
      </div>

      {/* Text alignment */}
      <IconToggleGroup
        options={TEXT_ALIGN_OPTIONS}
        value={textAlign}
        onChange={(val) => handleChange('textAlign', val)}
      />

      {/* Text transform + Decoration */}
      <div className="grid grid-cols-2 gap-1.5">
        <select
          value={textTransform}
          onChange={(e) => handleChange('textTransform', e.target.value)}
          className="h-6 rounded text-[11px] px-1.5 cursor-pointer outline-none"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <option value="none">None</option>
          <option value="uppercase">Uppercase</option>
          <option value="lowercase">Lowercase</option>
          <option value="capitalize">Capitalize</option>
        </select>
        <select
          value={textDecoration}
          onChange={(e) => handleChange('textDecoration', e.target.value)}
          className="h-6 rounded text-[11px] px-1.5 cursor-pointer outline-none"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <option value="none">No Decoration</option>
          <option value="underline">Underline</option>
          <option value="line-through">Strikethrough</option>
          <option value="overline">Overline</option>
        </select>
      </div>
    </SectionHeader>
  );
}

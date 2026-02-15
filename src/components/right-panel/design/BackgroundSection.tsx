'use client';

import { useState, useMemo } from 'react';
import { useEditorStore } from '@/store';
import { SectionHeader } from '@/components/right-panel/design/inputs/SectionHeader';
import { ColorInput } from '@/components/right-panel/design/inputs/ColorInput';
import { GradientEditor } from './GradientEditor';
import { PlusIcon } from '@/components/right-panel/design/icons';
import { parseGradient, serializeGradient } from '@/lib/gradientParser';
import { useChangeTracker } from '@/hooks/useChangeTracker';
import type { GradientData } from '@/types/gradient';

const BACKGROUND_PROPERTIES = ['backgroundColor', 'backgroundImage'];

type BgMode = 'solid' | 'linear' | 'radial' | 'conic';

const DEFAULT_GRADIENT: GradientData = {
  type: 'linear',
  angle: 180,
  stops: [
    { color: '#000000', position: 0, opacity: 1 },
    { color: '#ffffff', position: 100, opacity: 1 },
  ],
};

export function BackgroundSection() {
  const computedStyles = useEditorStore((state) => state.computedStyles);
  const cssVariableUsages = useEditorStore((state) => state.cssVariableUsages);
  const { applyChange, resetProperty } = useChangeTracker();

  const hasChanges = useEditorStore((s) => {
    const sp = s.selectorPath;
    if (!sp) return false;
    return s.styleChanges.some((c) => c.elementSelector === sp && BACKGROUND_PROPERTIES.includes(c.property));
  });

  const handleResetAll = () => {
    const { selectorPath, styleChanges } = useEditorStore.getState();
    if (!selectorPath) return;
    const matching = styleChanges.filter((c) => c.elementSelector === selectorPath && BACKGROUND_PROPERTIES.includes(c.property));
    for (const c of matching) resetProperty(c.property);
  };

  const bgImage = computedStyles.backgroundImage || 'none';
  const bgColor = computedStyles.backgroundColor || 'transparent';

  const parsedGradient = useMemo(() => parseGradient(bgImage), [bgImage]);

  const [mode, setMode] = useState<BgMode>(() => {
    if (parsedGradient) return parsedGradient.type;
    return 'solid';
  });

  const [gradientData, setGradientData] = useState<GradientData>(
    () => parsedGradient || DEFAULT_GRADIENT
  );

  const handleChange = (property: string, value: string) => {
    applyChange(property, value);
  };

  const handleModeChange = (newMode: BgMode) => {
    setMode(newMode);
    if (newMode === 'solid') {
      applyChange('backgroundImage', 'none');
    } else {
      const newData = { ...gradientData, type: newMode as GradientData['type'] };
      setGradientData(newData);
      applyChange('backgroundImage', serializeGradient(newData));
    }
  };

  const handleGradientChange = (data: GradientData) => {
    setGradientData(data);
    applyChange('backgroundImage', serializeGradient(data));
  };

  return (
    <SectionHeader
      title="Background"
      defaultOpen={true}
      hasChanges={hasChanges}
      onReset={handleResetAll}
      actions={
        <button
          type="button"
          className="flex items-center justify-center w-5 h-5 rounded hover:opacity-80"
          style={{ color: 'var(--text-muted)' }}
          title="Add background"
        >
          <PlusIcon />
        </button>
      }
    >
      {/* Mode selector */}
      <select
        value={mode}
        onChange={(e) => handleModeChange(e.target.value as BgMode)}
        className="w-full h-6 rounded text-[11px] px-1.5 cursor-pointer outline-none"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
        }}
      >
        <option value="solid">Solid</option>
        <option value="linear">Linear Gradient</option>
        <option value="radial">Radial Gradient</option>
        <option value="conic">Conic Gradient</option>
      </select>

      {mode === 'solid' ? (
        <ColorInput
          label="Color"
          value={bgColor}
          property="backgroundColor"
          onChange={handleChange}
          varExpression={cssVariableUsages['background-color']}
        />
      ) : (
        <GradientEditor
          value={gradientData}
          onChange={handleGradientChange}
        />
      )}
    </SectionHeader>
  );
}

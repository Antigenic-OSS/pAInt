'use client';

import { useEditorStore } from '@/store';
import { SectionHeader } from '@/components/right-panel/design/inputs/SectionHeader';
import { CompactInput } from '@/components/right-panel/design/inputs/CompactInput';
import { IconToggleGroup } from '@/components/right-panel/design/inputs/IconToggleGroup';
import {
  StaticIcon,
  RelativeIcon,
  AbsoluteIcon,
  FixedIcon,
  StickyIcon,
} from '@/components/right-panel/design/icons';
import { useChangeTracker } from '@/hooks/useChangeTracker';

const POSITION_OPTIONS = [
  { value: 'static', icon: <StaticIcon />, tooltip: 'Static' },
  { value: 'relative', icon: <RelativeIcon />, tooltip: 'Relative' },
  { value: 'absolute', icon: <AbsoluteIcon />, tooltip: 'Absolute' },
  { value: 'fixed', icon: <FixedIcon />, tooltip: 'Fixed' },
  { value: 'sticky', icon: <StickyIcon />, tooltip: 'Sticky' },
];

export function PositionSection() {
  const computedStyles = useEditorStore((state) => state.computedStyles);
  const { applyChange } = useChangeTracker();

  const handleChange = (property: string, value: string) => {
    applyChange(property, value);
  };

  const position = computedStyles.position || 'static';
  const isPositioned = position !== 'static';

  return (
    <SectionHeader title="Position" defaultOpen={true}>
      <IconToggleGroup
        options={POSITION_OPTIONS}
        value={position}
        onChange={(value) => handleChange('position', value)}
      />

      {isPositioned && (
        <>
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <CompactInput
              label="X"
              value={computedStyles.left || 'auto'}
              property="left"
              onChange={handleChange}
              units={['px', '%', 'em', 'rem', 'auto']}
            />
            <CompactInput
              label="Y"
              value={computedStyles.top || 'auto'}
              property="top"
              onChange={handleChange}
              units={['px', '%', 'em', 'rem', 'auto']}
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <CompactInput
              label="R"
              value={computedStyles.right || 'auto'}
              property="right"
              onChange={handleChange}
              units={['px', '%', 'em', 'rem', 'auto']}
            />
            <CompactInput
              label="B"
              value={computedStyles.bottom || 'auto'}
              property="bottom"
              onChange={handleChange}
              units={['px', '%', 'em', 'rem', 'auto']}
            />
          </div>
          <CompactInput
            label="Z"
            value={computedStyles.zIndex || 'auto'}
            property="zIndex"
            onChange={handleChange}
            units={['auto']}
            className="w-1/2"
          />
        </>
      )}
    </SectionHeader>
  );
}

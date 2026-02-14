'use client';

import { useEditorStore } from '@/store';
import { SectionHeader } from '@/components/right-panel/design/inputs/SectionHeader';
import { CompactInput } from '@/components/right-panel/design/inputs/CompactInput';
import { IconToggleGroup } from '@/components/right-panel/design/inputs/IconToggleGroup';
import { LinkedInputPair } from '@/components/right-panel/design/inputs/LinkedInputPair';
import {
  BlockIcon,
  FlexRowIcon,
  FlexColIcon,
  GridIcon,
  InlineIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  AlignTopIcon,
  AlignMiddleIcon,
  AlignBottomIcon,
  ClipContentIcon,
  BorderBoxIcon,
} from '@/components/right-panel/design/icons';
import { useChangeTracker } from '@/hooks/useChangeTracker';

const DISPLAY_OPTIONS = [
  { value: 'block', icon: <BlockIcon />, tooltip: 'Block' },
  { value: 'flex-row', icon: <FlexRowIcon />, tooltip: 'Flex (Row)' },
  { value: 'flex-col', icon: <FlexColIcon />, tooltip: 'Flex (Column)' },
  { value: 'grid', icon: <GridIcon />, tooltip: 'Grid' },
  { value: 'inline', icon: <InlineIcon />, tooltip: 'Inline' },
];

const JUSTIFY_OPTIONS = [
  { value: 'flex-start', icon: <AlignLeftIcon />, tooltip: 'Start' },
  { value: 'center', icon: <AlignCenterIcon />, tooltip: 'Center' },
  { value: 'flex-end', icon: <AlignRightIcon />, tooltip: 'End' },
];

const ALIGN_OPTIONS = [
  { value: 'flex-start', icon: <AlignTopIcon />, tooltip: 'Start' },
  { value: 'center', icon: <AlignMiddleIcon />, tooltip: 'Center' },
  { value: 'flex-end', icon: <AlignBottomIcon />, tooltip: 'End' },
];

const WRAP_OPTIONS = [
  { value: 'nowrap', icon: <BlockIcon />, tooltip: 'No Wrap' },
  { value: 'wrap', icon: <GridIcon />, tooltip: 'Wrap' },
];

function getDisplayValue(display: string, flexDirection: string): string {
  if (display === 'flex' || display === 'inline-flex') {
    return flexDirection === 'column' || flexDirection === 'column-reverse'
      ? 'flex-col'
      : 'flex-row';
  }
  if (display === 'grid' || display === 'inline-grid') return 'grid';
  if (display === 'inline' || display === 'inline-block') return 'inline';
  return 'block';
}

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
  const flexWrap = computedStyles.flexWrap || 'nowrap';
  const gap = computedStyles.gap || '0px';

  const isFlex = display === 'flex' || display === 'inline-flex';
  const isGrid = display === 'grid' || display === 'inline-grid';

  const overflow = computedStyles.overflow || 'visible';
  const boxSizing = computedStyles.boxSizing || 'content-box';
  const isClipped = overflow === 'hidden';
  const isBorderBox = boxSizing === 'border-box';

  const displayValue = getDisplayValue(display, flexDirection);

  const handleDisplayChange = (val: string) => {
    switch (val) {
      case 'flex-row':
        handleChange('display', 'flex');
        handleChange('flexDirection', 'row');
        break;
      case 'flex-col':
        handleChange('display', 'flex');
        handleChange('flexDirection', 'column');
        break;
      case 'grid':
        handleChange('display', 'grid');
        break;
      case 'inline':
        handleChange('display', 'inline');
        break;
      default:
        handleChange('display', 'block');
    }
  };

  return (
    <SectionHeader title="Layout" defaultOpen={true}>
      {/* Display mode */}
      <IconToggleGroup
        options={DISPLAY_OPTIONS}
        value={displayValue}
        onChange={handleDisplayChange}
      />

      {/* Dimensions */}
      <div className="grid grid-cols-2 gap-1.5 pt-1">
        <CompactInput
          label="W"
          value={computedStyles.width || 'auto'}
          property="width"
          onChange={handleChange}
          units={['px', '%', 'em', 'rem', 'vw', 'auto']}
        />
        <CompactInput
          label="H"
          value={computedStyles.height || 'auto'}
          property="height"
          onChange={handleChange}
          units={['px', '%', 'em', 'rem', 'vh', 'auto']}
        />
      </div>

      {/* Flex Controls */}
      {isFlex && (
        <div className="space-y-1.5 pt-1.5" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
            Flex
          </div>
          <div className="flex items-center gap-2">
            <IconToggleGroup
              options={JUSTIFY_OPTIONS}
              value={justifyContent}
              onChange={(val) => handleChange('justifyContent', val)}
            />
            <IconToggleGroup
              options={ALIGN_OPTIONS}
              value={alignItems}
              onChange={(val) => handleChange('alignItems', val)}
            />
            <IconToggleGroup
              options={WRAP_OPTIONS}
              value={flexWrap}
              onChange={(val) => handleChange('flexWrap', val)}
            />
          </div>
          <CompactInput
            label="G"
            value={gap}
            property="gap"
            onChange={handleChange}
            units={['px', 'em', 'rem', '%']}
            min={0}
            className="w-1/2"
          />
        </div>
      )}

      {/* Grid Controls */}
      {isGrid && (
        <div className="space-y-1.5 pt-1.5" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
            Grid
          </div>
          <CompactInput
            label="C"
            value={computedStyles.gridTemplateColumns || 'none'}
            property="gridTemplateColumns"
            onChange={handleChange}
            units={[]}
          />
          <CompactInput
            label="R"
            value={computedStyles.gridTemplateRows || 'none'}
            property="gridTemplateRows"
            onChange={handleChange}
            units={[]}
          />
          <CompactInput
            label="G"
            value={gap}
            property="gap"
            onChange={handleChange}
            units={['px', 'em', 'rem', '%']}
            min={0}
            className="w-1/2"
          />
        </div>
      )}

      {/* Padding */}
      <div className="pt-1.5" style={{ borderTop: '1px solid var(--border)' }}>
        <LinkedInputPair
          label="Padding"
          values={{
            top: computedStyles.paddingTop || '0px',
            right: computedStyles.paddingRight || '0px',
            bottom: computedStyles.paddingBottom || '0px',
            left: computedStyles.paddingLeft || '0px',
          }}
          properties={{
            top: 'paddingTop',
            right: 'paddingRight',
            bottom: 'paddingBottom',
            left: 'paddingLeft',
          }}
          onChange={handleChange}
        />
      </div>

      {/* Margin */}
      <LinkedInputPair
        label="Margin"
        values={{
          top: computedStyles.marginTop || '0px',
          right: computedStyles.marginRight || '0px',
          bottom: computedStyles.marginBottom || '0px',
          left: computedStyles.marginLeft || '0px',
        }}
        properties={{
          top: 'marginTop',
          right: 'marginRight',
          bottom: 'marginBottom',
          left: 'marginLeft',
        }}
        onChange={handleChange}
      />

      {/* Toggles */}
      <div className="flex items-center gap-3 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <button
            type="button"
            onClick={() => handleChange('overflow', isClipped ? 'visible' : 'hidden')}
            className="flex items-center justify-center w-5 h-5 rounded"
            style={{
              color: isClipped ? 'var(--accent)' : 'var(--text-muted)',
              background: isClipped ? 'var(--accent-bg, rgba(74,158,255,0.15))' : 'transparent',
            }}
          >
            <ClipContentIcon />
          </button>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Clip</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <button
            type="button"
            onClick={() => handleChange('boxSizing', isBorderBox ? 'content-box' : 'border-box')}
            className="flex items-center justify-center w-5 h-5 rounded"
            style={{
              color: isBorderBox ? 'var(--accent)' : 'var(--text-muted)',
              background: isBorderBox ? 'var(--accent-bg, rgba(74,158,255,0.15))' : 'transparent',
            }}
          >
            <BorderBoxIcon />
          </button>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Border Box</span>
        </label>
      </div>
    </SectionHeader>
  );
}

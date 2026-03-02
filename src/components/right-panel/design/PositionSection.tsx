'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '@/store';
import { SectionHeader } from '@/components/right-panel/design/inputs/SectionHeader';
import {
  StaticIcon,
  RelativeIcon,
  AbsoluteIcon,
  FixedIcon,
  StickyIcon,
} from '@/components/right-panel/design/icons';
import { useChangeTracker } from '@/hooks/useChangeTracker';
import { parseCSSValue, formatCSSValue } from '@/lib/utils';

// ─── Position option data ──────────────────────────────────────────

const POSITION_OPTIONS = [
  {
    value: 'static',
    label: 'Static',
    icon: <StaticIcon />,
    desc: 'Static is the default position and displays an element based on styles in the Layout section.',
  },
  {
    value: 'relative',
    label: 'Relative',
    icon: <RelativeIcon />,
    desc: 'Relative positions the element relative to its normal position in the document flow.',
  },
  {
    value: 'absolute',
    label: 'Absolute',
    icon: <AbsoluteIcon />,
    desc: 'Absolute positions the element relative to its nearest positioned ancestor.',
  },
  {
    value: 'fixed',
    label: 'Fixed',
    icon: <FixedIcon />,
    desc: 'Fixed positions the element relative to the browser viewport. It stays in place when scrolling.',
  },
  {
    value: 'sticky',
    label: 'Sticky',
    icon: <StickyIcon />,
    desc: 'Sticky toggles between relative and fixed based on the scroll position.',
  },
];

const FLOAT_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];

const CLEAR_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'both', label: 'Both' },
];

// ─── Position Dropdown ─────────────────────────────────────────────

function PositionDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hoveredDesc, setHoveredDesc] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = POSITION_OPTIONS.find((o) => o.value === value) || POSITION_OPTIONS[0];
  const displayDesc = hoveredDesc ?? current.desc;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center w-full h-7 rounded px-2 text-[11px] transition-colors"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
        }}
      >
        <span className="flex items-center justify-center w-4 h-4 mr-1.5" style={{ color: 'var(--text-secondary)' }}>
          {current.icon}
        </span>
        <span className="flex-1 text-left">{current.label}</span>
        <svg width={8} height={8} viewBox="0 0 8 8" fill="none" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          <path d="M2 3l2 2 2-2" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 rounded-md overflow-hidden shadow-lg"
          style={{
            background: '#252525',
            border: '1px solid var(--border)',
          }}
        >
          {POSITION_OPTIONS.map((opt) => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                onMouseEnter={() => setHoveredDesc(opt.desc)}
                onMouseLeave={() => setHoveredDesc(null)}
                className="flex items-center w-full px-2.5 py-1.5 text-[11px] transition-colors"
                style={{
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(74, 158, 255, 0.08)' : 'transparent',
                }}
              >
                <span className="w-4 text-center mr-2" style={{ fontSize: 10, color: isActive ? 'var(--accent)' : 'transparent' }}>
                  {isActive ? '✓' : ''}
                </span>
                <span className="flex items-center justify-center w-4 h-4 mr-2" style={{ color: 'var(--text-secondary)' }}>
                  {opt.icon}
                </span>
                <span>{opt.label}</span>
              </button>
            );
          })}
          {/* Description area */}
          <div
            className="px-3 py-2 text-[10px] leading-relaxed"
            style={{
              borderTop: '1px solid var(--border)',
              color: 'var(--text-muted)',
              background: '#1e1e1e',
            }}
          >
            {displayDesc}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Preset values for position offsets ─────────────────────────────

const OFFSET_PRESETS = [0, 5, 10, 15, 25, 50, 75, 100];

// ─── Offset Input (compact, for spatial layout) ────────────────────

function OffsetInput({
  value,
  property,
  onChange,
  placeholder = 'Auto',
}: {
  value: string;
  property: string;
  onChange: (prop: string, val: string) => void;
  placeholder?: string;
}) {
  const isAuto = !value || value === 'auto';
  const parsed = parseCSSValue(value || '0px');
  const [localVal, setLocalVal] = useState(isAuto ? '' : String(parsed.number));
  const [focused, setFocused] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartValue = useRef(0);

  const hasChange = useEditorStore((s) => {
    const sp = s.selectorPath;
    return sp ? s.styleChanges.some((c) => c.elementSelector === sp && c.property === property) : false;
  });

  useEffect(() => {
    const a = !value || value === 'auto';
    if (a) {
      setLocalVal('');
    } else {
      const p = parseCSSValue(value);
      setLocalVal(String(p.number));
    }
  }, [value]);

  // Close presets on outside click
  useEffect(() => {
    if (!showPresets) return;
    const handle = (e: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        popoverRef.current && !popoverRef.current.contains(e.target as Node)
      ) {
        setShowPresets(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showPresets]);

  const commit = useCallback((num: string) => {
    if (!num || num.trim() === '') {
      onChange(property, 'auto');
    } else {
      const n = parseFloat(num);
      if (!isNaN(n)) onChange(property, formatCSSValue(n, 'px'));
    }
  }, [onChange, property]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commit(localVal);
      inputRef.current?.blur();
      setShowPresets(false);
    } else if (e.key === 'Escape') {
      setShowPresets(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const inc = e.shiftKey ? 10 : 1;
      const next = parseFloat(localVal || '0') + inc;
      setLocalVal(String(next));
      commit(String(next));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const dec = e.shiftKey ? 10 : 1;
      const next = parseFloat(localVal || '0') - dec;
      setLocalVal(String(next));
      commit(String(next));
    }
  }, [localVal, commit]);

  const selectPreset = useCallback((val: number | 'auto') => {
    if (val === 'auto') {
      setLocalVal('');
      onChange(property, 'auto');
    } else {
      setLocalVal(String(val));
      onChange(property, formatCSSValue(val, 'px'));
    }
    setShowPresets(false);
  }, [onChange, property]);

  // Drag-to-scrub (2px step per pixel of movement)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    e.preventDefault();
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartValue.current = parseFloat(localVal || '0');
    containerRef.current?.setPointerCapture(e.pointerId);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, [localVal]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const delta = e.clientX - dragStartX.current;
    const next = Math.round(dragStartValue.current + delta * 2);
    setLocalVal(String(next));
    onChange(property, formatCSSValue(next, 'px'));
  }, [onChange, property]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    containerRef.current?.releasePointerCapture(e.pointerId);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex items-center justify-center h-6 rounded px-1"
        style={{
          background: focused || showPresets ? '#333' : 'transparent',
          cursor: focused ? 'text' : 'ew-resize',
          minWidth: 42,
        }}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={localVal}
          placeholder={placeholder}
          onChange={(e) => setLocalVal(e.target.value)}
          onFocus={() => { setFocused(true); setShowPresets(true); }}
          onBlur={() => { setFocused(false); commit(localVal); }}
          onKeyDown={handleKeyDown}
          className="w-full text-center text-[11px] bg-transparent border-none outline-none"
          style={{
            color: hasChange ? 'var(--accent)' : (isAuto && !focused ? 'var(--text-muted)' : 'var(--text-primary)'),
            cursor: focused ? 'text' : 'ew-resize',
          }}
        />
      </div>

      {/* Preset popover */}
      {showPresets && (
        <div
          ref={popoverRef}
          className="absolute z-50 rounded-md shadow-lg"
          style={{
            background: '#252525',
            border: '1px solid var(--border)',
            padding: '6px',
            width: '140px',
            left: '50%',
            transform: 'translateX(-50%)',
            top: '100%',
            marginTop: '4px',
          }}
        >
          {/* Auto button */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); selectPreset('auto'); }}
            className="w-full h-6 rounded text-[10px] mb-1 transition-colors"
            style={{
              background: isAuto ? 'rgba(74,158,255,0.12)' : 'var(--bg-tertiary)',
              color: isAuto ? 'var(--accent)' : 'var(--text-secondary)',
              border: isAuto ? '1px solid rgba(74,158,255,0.3)' : '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            Auto
          </button>

          {/* Slider track visual */}
          <div
            className="relative h-1.5 rounded-full mx-1 mb-2 mt-1"
            style={{ background: '#3a3a3a' }}
          >
            <div
              className="absolute h-full rounded-full"
              style={{
                background: 'var(--accent)',
                width: isAuto ? '0%' : `${Math.min(100, (parsed.number / 100) * 100)}%`,
                transition: 'width 0.15s',
              }}
            />
            {/* Thumb */}
            {!isAuto && (
              <div
                className="absolute top-1/2 w-2.5 h-2.5 rounded-full border-2 border-white"
                style={{
                  left: `${Math.min(100, (parsed.number / 100) * 100)}%`,
                  transform: 'translate(-50%, -50%)',
                  background: 'var(--accent)',
                  boxShadow: '0 0 3px rgba(0,0,0,0.4)',
                }}
              />
            )}
          </div>

          {/* Preset grid */}
          <div className="grid grid-cols-4 gap-1">
            {OFFSET_PRESETS.map((val) => {
              const isActive = !isAuto && parsed.number === val;
              return (
                <button
                  key={val}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); selectPreset(val); }}
                  className="h-5 rounded text-[9px] tabular-nums transition-colors"
                  style={{
                    background: isActive ? 'rgba(74,158,255,0.12)' : 'var(--bg-tertiary)',
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    border: isActive ? '1px solid rgba(74,158,255,0.3)' : '1px solid transparent',
                    cursor: 'pointer',
                  }}
                >
                  {val}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Spatial Offset Widget (visual-editor-style) ─────────────────────────

function SpatialOffsetWidget({
  top,
  right,
  bottom,
  left,
  onChange,
}: {
  top: string;
  right: string;
  bottom: string;
  left: string;
  onChange: (prop: string, val: string) => void;
}) {
  return (
    <div className="relative flex flex-col items-center" style={{ padding: '2px 0' }}>
      {/* Top */}
      <div className="flex justify-center mb-0.5">
        <OffsetInput value={top} property="top" onChange={onChange} />
      </div>

      {/* Middle row: Left — Element — Right */}
      <div className="flex items-center w-full">
        <div className="flex-1 flex justify-end pr-1">
          <OffsetInput value={left} property="left" onChange={onChange} />
        </div>

        {/* Center element visual */}
        <div
          className="flex-shrink-0 rounded"
          style={{
            width: 56,
            height: 36,
            background: '#3a3a3a',
            border: '1.5px solid #555',
          }}
        />

        <div className="flex-1 flex justify-start pl-1">
          <OffsetInput value={right} property="right" onChange={onChange} />
        </div>
      </div>

      {/* Bottom */}
      <div className="flex justify-center mt-0.5">
        <OffsetInput value={bottom} property="bottom" onChange={onChange} />
      </div>
    </div>
  );
}

// ─── z-Index Input ─────────────────────────────────────────────────

function ZIndexInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (prop: string, val: string) => void;
}) {
  const isAuto = !value || value === 'auto' || value === '0';
  const [localVal, setLocalVal] = useState(isAuto ? '' : value);
  const [isAutoMode, setIsAutoMode] = useState(isAuto);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const a = !value || value === 'auto';
    setIsAutoMode(a);
    setLocalVal(a ? '' : value);
  }, [value]);

  const commit = useCallback((v: string) => {
    if (!v || v.trim() === '') {
      onChange('zIndex', 'auto');
      setIsAutoMode(true);
    } else {
      const n = parseInt(v, 10);
      if (!isNaN(n)) {
        onChange('zIndex', String(n));
        setIsAutoMode(false);
      }
    }
  }, [onChange]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
        z-Index
      </span>
      <div
        className="flex items-center h-6 rounded flex-1 overflow-hidden"
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={isAutoMode ? '' : localVal}
          placeholder="Auto"
          onChange={(e) => { setLocalVal(e.target.value); setIsAutoMode(false); }}
          onBlur={() => commit(localVal)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { commit(localVal); inputRef.current?.blur(); }
            else if (e.key === 'ArrowUp') {
              e.preventDefault();
              const next = parseInt(localVal || '0', 10) + (e.shiftKey ? 10 : 1);
              setLocalVal(String(next));
              setIsAutoMode(false);
              commit(String(next));
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              const next = parseInt(localVal || '0', 10) - (e.shiftKey ? 10 : 1);
              setLocalVal(String(next));
              setIsAutoMode(false);
              commit(String(next));
            }
          }}
          className="flex-1 min-w-0 h-full px-2 text-[11px] bg-transparent border-none outline-none"
          style={{ color: isAutoMode ? 'var(--text-muted)' : 'var(--text-primary)' }}
        />
        <button
          type="button"
          onClick={() => {
            if (isAutoMode) {
              setIsAutoMode(false);
              setLocalVal('0');
              onChange('zIndex', '0');
              inputRef.current?.focus();
            } else {
              setIsAutoMode(true);
              setLocalVal('');
              onChange('zIndex', 'auto');
            }
          }}
          className="flex-shrink-0 h-full px-2 text-[10px] transition-colors bg-transparent border-none outline-none cursor-pointer"
          style={{
            color: isAutoMode ? 'var(--accent)' : 'var(--text-muted)',
            borderLeft: '1px solid var(--border)',
          }}
        >
          Auto
        </button>
      </div>
    </div>
  );
}

// ─── Float & Clear Section ─────────────────────────────────────────

function FloatClearSection({
  float: floatVal,
  clear: clearVal,
  onChange,
}: {
  float: string;
  clear: string;
  onChange: (prop: string, val: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 w-full text-[10px] py-1 transition-colors"
        style={{ color: 'var(--text-muted)' }}
      >
        <span
          style={{
            display: 'inline-block',
            fontSize: 8,
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }}
        >
          ▸
        </span>
        Float and clear
      </button>

      {open && (
        <div className="space-y-2 pt-1 pb-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] w-10 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>Float</span>
            <div className="flex-1 flex rounded overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {FLOAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange('float', opt.value)}
                  className="flex-1 h-6 text-[10px] transition-colors"
                  style={{
                    background: opt.value === floatVal ? '#3a3a3a' : 'var(--bg-tertiary)',
                    color: opt.value === floatVal ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] w-10 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>Clear</span>
            <div className="flex-1 flex rounded overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {CLEAR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange('clear', opt.value)}
                  className="flex-1 h-6 text-[10px] transition-colors"
                  style={{
                    background: opt.value === clearVal ? '#3a3a3a' : 'var(--bg-tertiary)',
                    color: opt.value === clearVal ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main PositionSection ──────────────────────────────────────────

const POSITION_PROPERTIES = [
  'position', 'top', 'right', 'bottom', 'left', 'zIndex', 'float', 'clear',
];

export function PositionSection() {
  const computedStyles = useEditorStore((state) => state.computedStyles);
  const { applyChange, resetProperty } = useChangeTracker();

  const hasChanges = useEditorStore((s) => {
    const sp = s.selectorPath;
    if (!sp) return false;
    return s.styleChanges.some((c) => c.elementSelector === sp && POSITION_PROPERTIES.includes(c.property));
  });

  const handleResetAll = useCallback(() => {
    const { selectorPath, styleChanges } = useEditorStore.getState();
    if (!selectorPath) return;
    const matching = styleChanges.filter((c) => c.elementSelector === selectorPath && POSITION_PROPERTIES.includes(c.property));
    for (const c of matching) resetProperty(c.property);
  }, [resetProperty]);

  const handleChange = (property: string, value: string) => {
    applyChange(property, value);
  };

  const position = computedStyles.position || 'static';
  const isPositioned = position !== 'static';

  return (
    <SectionHeader title="Position" defaultOpen={true} hasChanges={hasChanges} onReset={handleResetAll}>
      {/* Position label + dropdown */}
      <div className="flex items-center gap-2">
        <span
          className="text-[11px] flex-shrink-0"
          style={{ color: isPositioned ? 'var(--accent)' : 'var(--text-secondary)' }}
        >
          Position
        </span>
        <div className="flex-1">
          <PositionDropdown value={position} onChange={(v) => handleChange('position', v)} />
        </div>
      </div>

      {isPositioned && (
        <>
          {/* Spatial offset widget */}
          <div
            className="mt-1 rounded-md px-2 py-2"
            style={{ background: '#1a1a1a', border: '1px solid var(--border)' }}
          >
            <SpatialOffsetWidget
              top={computedStyles.top || 'auto'}
              right={computedStyles.right || 'auto'}
              bottom={computedStyles.bottom || 'auto'}
              left={computedStyles.left || 'auto'}
              onChange={handleChange}
            />
          </div>

          {/* z-Index */}
          <div className="mt-2">
            <ZIndexInput
              value={computedStyles.zIndex || 'auto'}
              onChange={handleChange}
            />
          </div>
        </>
      )}

      {/* Float & Clear */}
      <div className="mt-1" style={{ borderTop: '1px solid var(--border)', paddingTop: 6 }}>
        <FloatClearSection
          float={computedStyles.float || 'none'}
          clear={computedStyles.clear || 'none'}
          onChange={handleChange}
        />
      </div>
    </SectionHeader>
  );
}

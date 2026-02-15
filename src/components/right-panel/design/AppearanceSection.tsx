'use client';

import { useState, useRef, useCallback } from 'react';
import { useEditorStore } from '@/store';
import { SectionHeader } from '@/components/right-panel/design/inputs/SectionHeader';
import { CompactInput } from '@/components/right-panel/design/inputs/CompactInput';
import { ExpandIcon } from '@/components/right-panel/design/icons';
import { useChangeTracker } from '@/hooks/useChangeTracker';
import { parseCSSValue, formatCSSValue } from '@/lib/utils';

const APPEARANCE_PROPERTIES = [
  'opacity', 'borderRadius',
  'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius',
  'overflow', 'overflowX', 'overflowY',
  'cursor', 'mixBlendMode', 'visibility', 'pointerEvents',
];

// ─── Opacity Slider ───────────────────────────────────────────────

function OpacitySlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updateFromPointer = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onChange(Math.round(ratio * 100));
  }, [onChange]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    isDragging.current = true;
    trackRef.current?.setPointerCapture(e.pointerId);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    updateFromPointer(e.clientX);
  }, [updateFromPointer]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    updateFromPointer(e.clientX);
  }, [updateFromPointer]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    trackRef.current?.releasePointerCapture(e.pointerId);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="relative h-1.5 rounded-full cursor-pointer"
      style={{ background: '#3a3a3a' }}
    >
      {/* Fill */}
      <div
        className="absolute h-full rounded-full"
        style={{
          background: 'var(--accent)',
          width: `${value}%`,
          transition: isDragging.current ? 'none' : 'width 0.1s',
        }}
      />
      {/* Thumb */}
      <div
        className="absolute top-1/2 w-3 h-3 rounded-full border-2"
        style={{
          left: `${value}%`,
          transform: 'translate(-50%, -50%)',
          background: '#fff',
          borderColor: 'var(--accent)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  );
}

// ─── Spatial Corner Radius Widget ─────────────────────────────────

function CornerRadiusWidget({
  tl,
  tr,
  bl,
  br,
  uniform,
  onChange,
}: {
  tl: string;
  tr: string;
  bl: string;
  br: string;
  uniform: string;
  onChange: (prop: string, val: string) => void;
}) {
  const [showIndividual, setShowIndividual] = useState(false);

  const uniformParsed = parseCSSValue(uniform);
  const uniformNum = uniformParsed.number;

  // Clamp preview radius to max 12 for the visual
  const previewR = Math.min(12, uniformNum);

  return (
    <div className="space-y-2">
      {/* Uniform radius row */}
      <div className="flex items-center gap-2">
        {/* Visual preview box */}
        <div
          className="flex-shrink-0 flex items-center justify-center"
          style={{ width: 28, height: 28 }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: showIndividual
                ? `${Math.min(12, parseCSSValue(tl).number)}px ${Math.min(12, parseCSSValue(tr).number)}px ${Math.min(12, parseCSSValue(br).number)}px ${Math.min(12, parseCSSValue(bl).number)}px`
                : `${previewR}px`,
              border: '1.5px solid var(--text-secondary)',
              transition: 'border-radius 0.15s',
            }}
          />
        </div>

        <div className="flex-1">
          <CompactInput
            label="R"
            value={uniform}
            property="borderRadius"
            onChange={onChange}
            units={['px', '%', 'em', 'rem']}
            min={0}
          />
        </div>

        <button
          type="button"
          onClick={() => setShowIndividual(!showIndividual)}
          className="flex items-center justify-center w-6 h-6 rounded transition-colors"
          style={{
            color: showIndividual ? 'var(--accent)' : 'var(--text-muted)',
            background: showIndividual ? 'rgba(74,158,255,0.12)' : 'transparent',
          }}
          title="Individual corners"
        >
          <ExpandIcon />
        </button>
      </div>

      {/* Individual corners — spatial layout */}
      {showIndividual && (
        <div
          className="relative rounded-md p-3"
          style={{ background: '#1a1a1a', border: '1px solid var(--border)' }}
        >
          <div className="grid grid-cols-2 gap-x-8 gap-y-1">
            {/* Top row */}
            <div className="flex items-center gap-1">
              <svg width={10} height={10} viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
                <path d="M1 9V4a3 3 0 0 1 3-3h5" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" style={{ color: 'var(--text-muted)' }} />
              </svg>
              <div className="flex-1">
                <CompactInput
                  value={tl}
                  property="borderTopLeftRadius"
                  onChange={onChange}
                  units={['px', '%', 'em', 'rem']}
                  min={0}
                />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex-1">
                <CompactInput
                  value={tr}
                  property="borderTopRightRadius"
                  onChange={onChange}
                  units={['px', '%', 'em', 'rem']}
                  min={0}
                />
              </div>
              <svg width={10} height={10} viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
                <path d="M1 1h5a3 3 0 0 1 3 3v5" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" style={{ color: 'var(--text-muted)' }} />
              </svg>
            </div>

            {/* Center visual element */}
            <div className="col-span-2 flex justify-center py-1.5">
              <div
                style={{
                  width: 48,
                  height: 32,
                  borderRadius: `${Math.min(16, parseCSSValue(tl).number)}px ${Math.min(16, parseCSSValue(tr).number)}px ${Math.min(16, parseCSSValue(br).number)}px ${Math.min(16, parseCSSValue(bl).number)}px`,
                  background: '#3a3a3a',
                  border: '1.5px solid #555',
                  transition: 'border-radius 0.15s',
                }}
              />
            </div>

            {/* Bottom row */}
            <div className="flex items-center gap-1">
              <svg width={10} height={10} viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
                <path d="M9 1H4a3 3 0 0 0-3 3v5" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" style={{ color: 'var(--text-muted)' }} />
              </svg>
              <div className="flex-1">
                <CompactInput
                  value={bl}
                  property="borderBottomLeftRadius"
                  onChange={onChange}
                  units={['px', '%', 'em', 'rem']}
                  min={0}
                />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex-1">
                <CompactInput
                  value={br}
                  property="borderBottomRightRadius"
                  onChange={onChange}
                  units={['px', '%', 'em', 'rem']}
                  min={0}
                />
              </div>
              <svg width={10} height={10} viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
                <path d="M1 1h5a3 3 0 0 1 3 3v5" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" style={{ color: 'var(--text-muted)' }} transform="rotate(180 5 5)" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Overflow Controls ────────────────────────────────────────────

const OVERFLOW_OPTIONS = ['visible', 'hidden', 'scroll', 'auto'] as const;

function OverflowToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] w-5 flex-shrink-0 text-center" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <div
        className="flex-1 flex rounded overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        {OVERFLOW_OPTIONS.map((opt) => {
          const isActive = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className="flex-1 h-6 text-[10px] transition-colors"
              style={{
                background: isActive ? 'rgba(74,158,255,0.12)' : 'var(--bg-tertiary)',
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              {opt === 'visible' ? 'vis' : opt === 'hidden' ? 'hide' : opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Cursor Dropdown ──────────────────────────────────────────────

const CURSOR_OPTIONS = [
  'auto', 'default', 'pointer', 'text', 'move', 'wait',
  'help', 'crosshair', 'not-allowed', 'grab', 'grabbing',
  'col-resize', 'row-resize', 'n-resize', 'e-resize', 'zoom-in', 'zoom-out', 'none',
];

// ─── Select Style ─────────────────────────────────────────────────

const selectStyle = {
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
} as const;

// ─── Main AppearanceSection ───────────────────────────────────────

export function AppearanceSection() {
  const computedStyles = useEditorStore((state) => state.computedStyles);
  const { applyChange, resetProperty } = useChangeTracker();
  const [moreOpen, setMoreOpen] = useState(false);

  const hasChanges = useEditorStore((s) => {
    const sp = s.selectorPath;
    if (!sp) return false;
    return s.styleChanges.some((c) => c.elementSelector === sp && APPEARANCE_PROPERTIES.includes(c.property));
  });

  const handleResetAll = () => {
    const { selectorPath, styleChanges } = useEditorStore.getState();
    if (!selectorPath) return;
    const matching = styleChanges.filter((c) => c.elementSelector === selectorPath && APPEARANCE_PROPERTIES.includes(c.property));
    for (const c of matching) resetProperty(c.property);
  };

  const handleChange = (property: string, value: string) => {
    applyChange(property, value);
  };

  // ─── Values ─────────────────────────────────────────────────────
  const rawOpacity = computedStyles.opacity || '1';
  const opacityPercent = Math.round(parseFloat(rawOpacity) * 100);

  const borderRadius = computedStyles.borderRadius || '0px';
  const borderTopLeftRadius = computedStyles.borderTopLeftRadius || borderRadius;
  const borderTopRightRadius = computedStyles.borderTopRightRadius || borderRadius;
  const borderBottomLeftRadius = computedStyles.borderBottomLeftRadius || borderRadius;
  const borderBottomRightRadius = computedStyles.borderBottomRightRadius || borderRadius;

  const overflowX = computedStyles.overflowX || 'visible';
  const overflowY = computedStyles.overflowY || 'visible';
  const cursor = computedStyles.cursor || 'auto';
  const mixBlendMode = computedStyles.mixBlendMode || 'normal';
  const visibility = computedStyles.visibility || 'visible';
  const pointerEvents = computedStyles.pointerEvents || 'auto';

  const handleOpacityChange = (_property: string, value: string) => {
    const parsed = parseCSSValue(value);
    const clamped = Math.max(0, Math.min(100, parsed.number));
    applyChange('opacity', String(clamped / 100));
  };

  const handleOpacitySlider = (pct: number) => {
    applyChange('opacity', String(pct / 100));
  };

  // Row label width consistent with other sections
  const LW = 'w-[52px]';

  return (
    <SectionHeader title="Appearance" defaultOpen={true} hasChanges={hasChanges} onReset={handleResetAll}>
      {/* ── Opacity ─────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <span className={`${LW} flex-shrink-0 text-[11px]`} style={{ color: 'var(--accent)' }}>
          Opacity
        </span>
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 py-1">
            <OpacitySlider value={opacityPercent} onChange={handleOpacitySlider} />
          </div>
          <div style={{ width: 58 }}>
            <CompactInput
              value={formatCSSValue(opacityPercent, '%')}
              property="opacity"
              onChange={handleOpacityChange}
              units={['%']}
              min={0}
              max={100}
              step={1}
            />
          </div>
        </div>
      </div>

      {/* ── Border Radius ──────────────────────────────── */}
      <CornerRadiusWidget
        tl={borderTopLeftRadius}
        tr={borderTopRightRadius}
        bl={borderBottomLeftRadius}
        br={borderBottomRightRadius}
        uniform={borderRadius}
        onChange={handleChange}
      />

      {/* ── Overflow ───────────────────────────────────── */}
      <div className="space-y-1">
        <span className="text-[11px] block" style={{ color: 'var(--text-secondary)' }}>
          Overflow
        </span>
        <OverflowToggle label="X" value={overflowX} onChange={(v) => handleChange('overflowX', v)} />
        <OverflowToggle label="Y" value={overflowY} onChange={(v) => handleChange('overflowY', v)} />
      </div>

      {/* ── Cursor ─────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <span className={`${LW} flex-shrink-0 text-[11px]`} style={{ color: 'var(--text-secondary)' }}>
          Cursor
        </span>
        <select
          value={cursor}
          onChange={(e) => handleChange('cursor', e.target.value)}
          className="flex-1 h-7 rounded text-[11px] px-2 cursor-pointer outline-none"
          style={selectStyle}
        >
          {CURSOR_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {/* ── More toggle ────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMoreOpen(!moreOpen)}
          className="flex items-center gap-1 text-[10px] py-0.5 transition-colors"
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <span
            style={{
              display: 'inline-block',
              fontSize: 8,
              transform: moreOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s',
            }}
          >
            ▸
          </span>
          More options
        </button>
      </div>

      {moreOpen && (
        <div className="space-y-2 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
          {/* Mix Blend Mode */}
          <div className="flex items-center gap-2">
            <span className={`${LW} flex-shrink-0 text-[11px]`} style={{ color: 'var(--text-secondary)' }}>
              Blend
            </span>
            <select
              value={mixBlendMode}
              onChange={(e) => handleChange('mixBlendMode', e.target.value)}
              className="flex-1 h-7 rounded text-[11px] px-2 cursor-pointer outline-none"
              style={selectStyle}
            >
              {[
                'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
                'color-dodge', 'color-burn', 'hard-light', 'soft-light',
                'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity',
              ].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Visibility */}
          <div className="flex items-center gap-2">
            <span className={`${LW} flex-shrink-0 text-[11px]`} style={{ color: 'var(--text-secondary)' }}>
              Visible
            </span>
            <div
              className="inline-flex rounded"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
            >
              {(['visible', 'hidden', 'collapse'] as const).map((opt) => {
                const isActive = visibility === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleChange('visibility', opt)}
                    className="flex items-center justify-center px-3 text-[11px] transition-colors"
                    style={{
                      height: 24,
                      background: isActive ? 'rgba(74,158,255,0.12)' : 'transparent',
                      color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pointer Events */}
          <div className="flex items-center gap-2">
            <span className={`${LW} flex-shrink-0 text-[11px]`} style={{ color: 'var(--text-secondary)' }}>
              Pointer
            </span>
            <div
              className="inline-flex rounded"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
            >
              {(['auto', 'none'] as const).map((opt) => {
                const isActive = pointerEvents === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleChange('pointerEvents', opt)}
                    className="flex items-center justify-center px-4 text-[11px] transition-colors"
                    style={{
                      height: 24,
                      background: isActive ? 'rgba(74,158,255,0.12)' : 'transparent',
                      color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </SectionHeader>
  );
}

'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { GradientData, GradientStop } from '@/types/gradient';
import { serializeGradient } from '@/lib/gradientParser';
import { ColorPicker } from '@/components/common/ColorPicker';

interface GradientEditorProps {
  value: GradientData;
  onChange: (data: GradientData) => void;
  showTypeSelector?: boolean;
}

// ─── Color Helpers ───────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  if (clean.length >= 6) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }
  return null;
}

function parseStopColor(color: string): { hex: string; opacity: number } {
  const rgbaMatch = color.match(
    /rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)/
  );
  if (rgbaMatch) {
    const r = +rgbaMatch[1],
      g = +rgbaMatch[2],
      b = +rgbaMatch[3];
    const a =
      rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;
    const hex =
      '#' +
      [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
    return { hex, opacity: Math.round(a * 100) };
  }
  if (color.startsWith('#')) {
    return { hex: color.slice(0, 7), opacity: 100 };
  }
  return { hex: '#000000', opacity: 100 };
}

function buildStopColor(hex: string, opacity: number): string {
  if (opacity >= 100) return hex;
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(opacity / 100).toFixed(2)})`;
}

// ─── Gradient Type Icons ─────────────────────────────────────────

function LinearIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      {...props}
    >
      <rect
        x={2}
        y={2}
        width={12}
        height={12}
        rx={2}
        stroke="currentColor"
        strokeWidth={1.2}
      />
      <line
        x1={4}
        y1={12}
        x2={12}
        y2={4}
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </svg>
  );
}

function RadialIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      {...props}
    >
      <circle cx={8} cy={8} r={3} stroke="currentColor" strokeWidth={1.2} />
      <circle
        cx={8}
        cy={8}
        r={6}
        stroke="currentColor"
        strokeWidth={1.2}
        opacity={0.4}
      />
    </svg>
  );
}

function ConicIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      {...props}
    >
      <circle cx={8} cy={8} r={6} stroke="currentColor" strokeWidth={1.2} />
      <path
        d="M8 2V8L12.5 4"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Rotate Icons ────────────────────────────────────────────────

function RotateCCWIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
      <path
        d="M2.5 5.5A3.5 3.5 0 0 1 9.3 4"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <path
        d="M2 3.5L2.5 5.5 4.5 5"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RotateCWIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
      <path
        d="M9.5 5.5A3.5 3.5 0 0 0 2.7 4"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <path
        d="M10 3.5L9.5 5.5 7.5 5"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Angle Dial ──────────────────────────────────────────────────

function AngleDial({
  angle,
  onChange,
}: {
  angle: number;
  onChange: (a: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  const calcAngle = useCallback(
    (e: React.PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      let deg = Math.atan2(y, x) * (180 / Math.PI) + 90;
      if (deg < 0) deg += 360;
      onChange(Math.round(deg) % 360);
    },
    [onChange]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      svgRef.current?.setPointerCapture(e.pointerId);
      calcAngle(e);
    },
    [calcAngle]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!svgRef.current?.hasPointerCapture(e.pointerId)) return;
      calcAngle(e);
    },
    [calcAngle]
  );

  const rad = (angle - 90) * (Math.PI / 180);
  const cx = 13,
    cy = 13,
    r = 9;
  const dotX = cx + r * Math.cos(rad);
  const dotY = cy + r * Math.sin(rad);

  return (
    <svg
      ref={svgRef}
      width={26}
      height={26}
      viewBox="0 0 26 26"
      style={{ cursor: 'pointer', flexShrink: 0 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--text-muted)"
        strokeWidth={1.5}
        opacity={0.3}
      />
      <circle
        cx={cx}
        cy={cy}
        r={1.5}
        fill="var(--text-muted)"
        opacity={0.4}
      />
      <line
        x1={cx}
        y1={cy}
        x2={dotX}
        y2={dotY}
        stroke="var(--text-secondary)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <circle cx={dotX} cy={dotY} r={2.5} fill="var(--accent)" />
    </svg>
  );
}

// ─── Gradient Bar with Draggable Stops ───────────────────────────

function GradientBar({
  stops,
  selectedIndex,
  gradient,
  onSelectStop,
  onMoveStop,
  onAddStop,
  onRemoveStop,
}: {
  stops: GradientStop[];
  selectedIndex: number;
  gradient: string;
  onSelectStop: (index: number) => void;
  onMoveStop: (index: number, position: number) => void;
  onAddStop: (position: number) => void;
  onRemoveStop: (index: number) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const dragIndexRef = useRef<number | null>(null);
  const wasDragging = useRef(false);

  const handleBarPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only handle direct clicks on the bar, not on stop handles
      if ((e.target as HTMLElement).dataset.stopHandle) return;
      const rect = barRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pos = Math.max(
        0,
        Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100))
      );
      onAddStop(pos);
    },
    [onAddStop]
  );

  const handleStopPointerDown = useCallback(
    (e: React.PointerEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      dragIndexRef.current = index;
      wasDragging.current = false;
      onSelectStop(index);
      barRef.current?.setPointerCapture(e.pointerId);
    },
    [onSelectStop]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragIndexRef.current === null) return;
      if (!barRef.current?.hasPointerCapture(e.pointerId)) return;
      wasDragging.current = true;
      const rect = barRef.current.getBoundingClientRect();
      const pos = Math.max(
        0,
        Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100))
      );
      onMoveStop(dragIndexRef.current, pos);
    },
    [onMoveStop]
  );

  const handlePointerUp = useCallback(() => {
    dragIndexRef.current = null;
  }, []);

  return (
    <div
      ref={barRef}
      className="relative w-full"
      style={{ paddingBottom: 14, cursor: 'copy' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Checkerboard + gradient */}
      <div
        className="w-full rounded"
        style={{
          height: 24,
          background: `${gradient}, repeating-conic-gradient(#333 0% 25%, #444 0% 50%) 0 0 / 8px 8px`,
          border: '1px solid var(--border)',
          cursor: 'copy',
        }}
        onPointerDown={handleBarPointerDown}
      />

      {/* Stop handles */}
      {stops.map((stop, i) => {
        const isSelected = i === selectedIndex;
        return (
          <div
            key={i}
            data-stop-handle="true"
            className="absolute"
            style={{
              left: `${stop.position}%`,
              bottom: 0,
              transform: 'translateX(-50%)',
              width: 11,
              height: 11,
              background: stop.color,
              border: isSelected
                ? '2px solid #fff'
                : '1.5px solid rgba(255,255,255,0.25)',
              borderRadius: 2,
              cursor: 'grab',
              zIndex: isSelected ? 2 : 1,
              boxShadow: isSelected
                ? '0 0 0 1px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.4)'
                : '0 1px 3px rgba(0,0,0,0.4)',
            }}
            onPointerDown={(e) => handleStopPointerDown(e, i)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onRemoveStop(i);
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Main GradientEditor ─────────────────────────────────────────

export function GradientEditor({ value, onChange, showTypeSelector = true }: GradientEditorProps) {
  const [selectedStop, setSelectedStop] = useState(0);

  const previewGradient = useMemo(() => serializeGradient(value), [value]);

  // Build a scaled-down repeat preview (show ~3 repetitions)
  const repeatPreview = useMemo(() => {
    const scaled = {
      ...value,
      repeat: true,
      stops: value.stops.map((s) => ({
        ...s,
        position: Math.round(s.position * 0.33),
      })),
    };
    return serializeGradient(scaled);
  }, [value]);

  // Keep selected stop in bounds
  useEffect(() => {
    if (selectedStop >= value.stops.length) {
      setSelectedStop(Math.max(0, value.stops.length - 1));
    }
  }, [value.stops.length, selectedStop]);

  const currentStop = value.stops[selectedStop] || value.stops[0];
  const { hex: stopHex, opacity: stopOpacity } = useMemo(
    () => parseStopColor(currentStop?.color || '#000000'),
    [currentStop?.color]
  );

  // ── Type ──
  const updateType = useCallback(
    (type: GradientData['type']) => {
      onChange({ ...value, type });
    },
    [value, onChange]
  );

  // ── Angle ──
  const updateAngle = useCallback(
    (angle: number) => {
      onChange({ ...value, angle });
    },
    [value, onChange]
  );

  const rotateAngle = useCallback(
    (delta: number) => {
      onChange({
        ...value,
        angle: ((value.angle + delta) % 360 + 360) % 360,
      });
    },
    [value, onChange]
  );

  // ── Stops ──
  const updateStop = useCallback(
    (index: number, updates: Partial<GradientStop>) => {
      const newStops = value.stops.map((s, i) =>
        i === index ? { ...s, ...updates } : s
      );
      onChange({ ...value, stops: newStops });
    },
    [value, onChange]
  );

  const addStopAtPosition = useCallback(
    (position: number) => {
      const pos = Math.max(0, Math.min(100, position));
      // Interpolate color from closest neighbor
      const newStop: GradientStop = {
        color: '#808080',
        position: pos,
        opacity: 1,
      };
      const newStops = [...value.stops, newStop].sort(
        (a, b) => a.position - b.position
      );
      const newIndex = newStops.findIndex((s) => s === newStop);
      setSelectedStop(newIndex);
      onChange({ ...value, stops: newStops });
    },
    [value, onChange]
  );

  const removeStop = useCallback(
    (index: number) => {
      if (value.stops.length <= 2) return;
      const newStops = value.stops.filter((_, i) => i !== index);
      onChange({ ...value, stops: newStops });
      if (selectedStop >= newStops.length)
        setSelectedStop(newStops.length - 1);
      else if (selectedStop === index)
        setSelectedStop(Math.max(0, index - 1));
    },
    [value, onChange, selectedStop]
  );

  // ── Selected stop color ──
  const updateStopColor = useCallback(
    (color: string) => {
      updateStop(selectedStop, { color });
    },
    [selectedStop, updateStop]
  );

  const updateStopHex = useCallback(
    (newHex: string) => {
      const clean = newHex.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
      if (clean.length === 6 || clean.length === 3) {
        const hex = '#' + clean;
        const newColor = buildStopColor(hex, stopOpacity);
        updateStop(selectedStop, { color: newColor });
      }
    },
    [selectedStop, stopOpacity, updateStop]
  );

  const updateStopOpacity = useCallback(
    (opacity: number) => {
      const clamped = Math.max(0, Math.min(100, opacity));
      const newColor = buildStopColor(stopHex, clamped);
      updateStop(selectedStop, { color: newColor, opacity: clamped / 100 });
    },
    [selectedStop, stopHex, updateStop]
  );

  // ── Repeat ──
  const toggleRepeat = useCallback(() => {
    onChange({ ...value, repeat: !value.repeat });
  }, [value, onChange]);

  // ── Local inputs ──
  const [angleInput, setAngleInput] = useState(String(value.angle));
  useEffect(() => setAngleInput(String(value.angle)), [value.angle]);

  const commitAngle = useCallback(() => {
    const n = parseInt(angleInput, 10);
    if (!isNaN(n)) updateAngle(((n % 360) + 360) % 360);
    else setAngleInput(String(value.angle));
  }, [angleInput, value.angle, updateAngle]);

  const [hexInput, setHexInput] = useState(stopHex.replace('#', ''));
  useEffect(
    () => setHexInput(stopHex.replace('#', '')),
    [stopHex]
  );

  const commitHex = useCallback(() => {
    updateStopHex(hexInput);
  }, [hexInput, updateStopHex]);

  const [opacityInput, setOpacityInput] = useState(String(stopOpacity));
  useEffect(
    () => setOpacityInput(String(stopOpacity)),
    [stopOpacity]
  );

  const commitOpacity = useCallback(() => {
    const n = parseInt(opacityInput, 10);
    if (!isNaN(n)) updateStopOpacity(n);
    else setOpacityInput(String(stopOpacity));
  }, [opacityInput, stopOpacity, updateStopOpacity]);

  const showAngle = value.type === 'linear' || value.type === 'conic';

  const TYPES: { type: GradientData['type']; Icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
    { type: 'linear', Icon: LinearIcon },
    { type: 'radial', Icon: RadialIcon },
    { type: 'conic', Icon: ConicIcon },
  ];

  return (
    <div className="space-y-2.5">
      {/* ── Type row ── */}
      {showTypeSelector && (
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] w-10 shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >
            Type
          </span>
          <div className="flex gap-px rounded overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {TYPES.map(({ type, Icon }) => {
              const active = value.type === type;
              return (
                <button
                  key={type}
                  type="button"
                  className="flex items-center justify-center w-7 h-7"
                  style={{
                    background: active
                      ? 'rgba(74,158,255,0.15)'
                      : 'var(--bg-tertiary)',
                    color: active
                      ? 'var(--accent)'
                      : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  title={type.charAt(0).toUpperCase() + type.slice(1)}
                  onClick={() => updateType(type)}
                >
                  <Icon />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Angle row ── */}
      {showAngle && (
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] w-10 shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >
            Angle
          </span>
          <AngleDial angle={value.angle} onChange={updateAngle} />
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              className="flex items-center justify-center w-5 h-5 rounded hover:opacity-80"
              style={{ color: 'var(--text-muted)' }}
              onClick={() => rotateAngle(-45)}
              title="Rotate -45\u00B0"
            >
              <RotateCCWIcon />
            </button>
            <button
              type="button"
              className="flex items-center justify-center w-5 h-5 rounded hover:opacity-80"
              style={{ color: 'var(--text-muted)' }}
              onClick={() => rotateAngle(45)}
              title="Rotate +45\u00B0"
            >
              <RotateCWIcon />
            </button>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <input
              type="text"
              value={angleInput}
              onChange={(e) => setAngleInput(e.target.value)}
              onBlur={commitAngle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitAngle();
              }}
              className="w-11 h-6 rounded text-[11px] px-1.5 outline-none text-right tabular-nums"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
            <span
              className="text-[9px] uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              DEG
            </span>
          </div>
        </div>
      )}

      {/* ── Gradient bar + stops ── */}
      <GradientBar
        stops={value.stops}
        selectedIndex={selectedStop}
        gradient={previewGradient}
        onSelectStop={setSelectedStop}
        onMoveStop={(index, pos) => updateStop(index, { position: pos })}
        onAddStop={addStopAtPosition}
        onRemoveStop={removeStop}
      />

      {/* ── Repeat row ── */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!value.repeat}
            onChange={toggleRepeat}
            className="w-3 h-3 rounded accent-[#4a9eff]"
            style={{ accentColor: 'var(--accent)' }}
          />
          <span
            className="text-[11px]"
            style={{ color: 'var(--text-secondary)' }}
          >
            Repeat
          </span>
        </label>
        <div
          className="flex-1 h-3 rounded-sm"
          style={{
            background: `${repeatPreview}, repeating-conic-gradient(#333 0% 25%, #444 0% 50%) 0 0 / 6px 6px`,
            border: '1px solid var(--border)',
            opacity: value.repeat ? 1 : 0.35,
          }}
        />
      </div>

      {/* ── Color row (selected stop) ── */}
      <div className="flex items-center gap-2">
        <span
          className="text-[11px] w-10 shrink-0"
          style={{ color: 'var(--text-muted)' }}
        >
          Color
        </span>
        <ColorPicker
          value={currentStop?.color || '#000000'}
          onChange={updateStopColor}
        />
        <div className="flex items-center gap-0.5 ml-auto shrink-0">
          <input
            type="text"
            value={opacityInput}
            onChange={(e) => setOpacityInput(e.target.value)}
            onBlur={commitOpacity}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitOpacity();
            }}
            className="w-8 h-6 rounded text-[11px] px-1 outline-none text-right tabular-nums"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
          <span
            className="text-[10px]"
            style={{ color: 'var(--text-muted)' }}
          >
            %
          </span>
        </div>
      </div>

      {/* ── Stop list (remove on double-click hint) ── */}
      {value.stops.length > 2 && (
        <div
          className="text-[9px] text-center"
          style={{ color: 'var(--text-muted)', opacity: 0.5 }}
        >
          Double-click a stop handle to remove it
        </div>
      )}
    </div>
  );
}

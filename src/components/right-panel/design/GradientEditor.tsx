'use client';

import type { GradientData, GradientStop } from '@/types/gradient';
import { serializeGradient } from '@/lib/gradientParser';
import { CompactInput } from '@/components/right-panel/design/inputs/CompactInput';
import { ColorPicker } from '@/components/common/ColorPicker';
import { PlusIcon, TrashIcon, ReverseIcon } from '@/components/right-panel/design/icons';

interface GradientEditorProps {
  value: GradientData;
  onChange: (data: GradientData) => void;
}

export function GradientEditor({ value, onChange }: GradientEditorProps) {
  const previewGradient = serializeGradient(value);

  const updateStop = (index: number, updates: Partial<GradientStop>) => {
    const newStops = value.stops.map((s, i) =>
      i === index ? { ...s, ...updates } : s
    );
    onChange({ ...value, stops: newStops });
  };

  const addStop = () => {
    const len = value.stops.length;
    if (len < 2) return;
    const midIndex = Math.floor(len / 2);
    const a = value.stops[midIndex - 1];
    const b = value.stops[midIndex];
    const newStop: GradientStop = {
      color: a.color,
      position: Math.round((a.position + b.position) / 2),
      opacity: 1,
    };
    const newStops = [
      ...value.stops.slice(0, midIndex),
      newStop,
      ...value.stops.slice(midIndex),
    ];
    onChange({ ...value, stops: newStops });
  };

  const removeStop = (index: number) => {
    if (value.stops.length <= 2) return;
    onChange({ ...value, stops: value.stops.filter((_, i) => i !== index) });
  };

  const reverseStops = () => {
    const reversed = [...value.stops].reverse().map((s, i, arr) => ({
      ...s,
      position: Math.round(100 - arr[arr.length - 1 - i].position),
    }));
    // Recalculate positions properly
    const maxPos = value.stops[value.stops.length - 1].position;
    const flipped = [...value.stops].reverse().map((s) => ({
      ...s,
      position: maxPos - s.position,
    }));
    onChange({ ...value, stops: flipped });
  };

  return (
    <div className="space-y-1.5">
      {/* Preview bar */}
      <div
        className="w-full h-6 rounded"
        style={{
          background: previewGradient,
          border: '1px solid var(--border)',
        }}
      />

      {/* Type + Angle */}
      <div className="flex items-center gap-1.5">
        <select
          value={value.type}
          onChange={(e) =>
            onChange({ ...value, type: e.target.value as GradientData['type'] })
          }
          className="h-6 rounded text-[11px] px-1.5 cursor-pointer outline-none flex-1"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <option value="linear">Linear</option>
          <option value="radial">Radial</option>
          <option value="conic">Conic</option>
        </select>
        {(value.type === 'linear' || value.type === 'conic') && (
          <CompactInput
            label={'\u2220'}
            value={`${value.angle}deg`}
            property="angle"
            onChange={(_p, v) => {
              const num = parseInt(v);
              if (!isNaN(num)) {
                onChange({ ...value, angle: ((num % 360) + 360) % 360 });
              }
            }}
            units={['deg']}
            min={0}
            max={360}
            className="w-20"
          />
        )}
        <button
          type="button"
          onClick={reverseStops}
          className="flex items-center justify-center w-6 h-6 rounded hover:opacity-80"
          style={{ color: 'var(--text-muted)' }}
          title="Reverse stops"
        >
          <ReverseIcon />
        </button>
        <button
          type="button"
          onClick={addStop}
          className="flex items-center justify-center w-6 h-6 rounded hover:opacity-80"
          style={{ color: 'var(--text-muted)' }}
          title="Add stop"
        >
          <PlusIcon />
        </button>
      </div>

      {/* Stops */}
      {value.stops.map((stop, i) => (
        <div key={i} className="flex items-center gap-1">
          <ColorPicker
            value={stop.color}
            onChange={(c) => updateStop(i, { color: c })}
          />
          <CompactInput
            value={`${stop.position}%`}
            property={`stop-${i}`}
            onChange={(_p, v) => {
              const num = parseInt(v);
              if (!isNaN(num)) {
                updateStop(i, { position: Math.max(0, Math.min(100, num)) });
              }
            }}
            units={['%']}
            min={0}
            max={100}
            className="w-16"
          />
          {value.stops.length > 2 && (
            <button
              type="button"
              onClick={() => removeStop(i)}
              className="flex items-center justify-center w-5 h-5 rounded hover:opacity-80"
              style={{ color: 'var(--text-muted)' }}
            >
              <TrashIcon />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

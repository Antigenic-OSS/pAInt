'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useEditorStore } from '@/store';
import { SectionHeader } from '@/components/right-panel/design/inputs/SectionHeader';
import { ColorInput } from '@/components/right-panel/design/inputs/ColorInput';
import { GradientEditor } from './GradientEditor';
import { PlusIcon } from '@/components/right-panel/design/icons';
import { ColorPicker } from '@/components/common/ColorPicker';
import { parseGradient, serializeGradient } from '@/lib/gradientParser';
import { useChangeTracker } from '@/hooks/useChangeTracker';
import type { GradientData } from '@/types/gradient';

// ─── Constants ───────────────────────────────────────────────────

const BACKGROUND_PROPERTIES = [
  'backgroundColor', 'backgroundImage',
  'backgroundSize', 'backgroundPosition', 'backgroundRepeat',
  'backgroundAttachment', 'backgroundClip',
];

const DEFAULT_GRADIENT: GradientData = {
  type: 'linear',
  angle: 180,
  stops: [
    { color: '#000000', position: 0, opacity: 1 },
    { color: '#ffffff', position: 100, opacity: 1 },
  ],
};

const POSITION_PRESETS: { x: string; y: string }[][] = [
  [{ x: '0%', y: '0%' }, { x: '50%', y: '0%' }, { x: '100%', y: '0%' }],
  [{ x: '0%', y: '50%' }, { x: '50%', y: '50%' }, { x: '100%', y: '50%' }],
  [{ x: '0%', y: '100%' }, { x: '50%', y: '100%' }, { x: '100%', y: '100%' }],
];

const CLIP_OPTIONS: { value: string; label: string }[] = [
  { value: 'border-box', label: 'None' },
  { value: 'padding-box', label: 'Clip to padding' },
  { value: 'content-box', label: 'Clip to content' },
  { value: 'text', label: 'Clip to text' },
];

type BgLayerType = 'image' | 'linear' | 'radial' | 'overlay';

// ─── Helpers ─────────────────────────────────────────────────────

function detectLayerType(bgImage: string): BgLayerType | null {
  if (!bgImage || bgImage === 'none') return null;
  if (bgImage.includes('url(')) return 'image';
  if (bgImage.includes('radial-gradient')) return 'radial';
  if (bgImage.includes('linear-gradient') || bgImage.includes('conic-gradient')) return 'linear';
  return null;
}

function parseImageUrl(bgImage: string): string | null {
  const match = bgImage.match(/url\(["']?([^"')]+)["']?\)/);
  return match ? match[1] : null;
}

function parseBgSize(raw: string): { mode: string; w: string; h: string } {
  const v = raw.trim();
  if (v === 'cover') return { mode: 'cover', w: 'auto', h: 'auto' };
  if (v === 'contain') return { mode: 'contain', w: 'auto', h: 'auto' };
  const parts = v.split(/\s+/);
  return { mode: 'custom', w: parts[0] || 'auto', h: parts[1] || 'auto' };
}

function parseBgPosition(raw: string): { x: string; y: string } {
  const v = raw.trim();
  const parts = v.split(/\s+/);
  return { x: parts[0] || '0%', y: parts[1] || '0%' };
}

function extractFilename(url: string): string {
  try {
    const path = new URL(url, 'http://localhost').pathname;
    const name = path.split('/').pop() || 'background-image';
    return name.length > 18 ? name.slice(0, 15) + '...' : name;
  } catch {
    return 'background-image';
  }
}

// ─── Layer Type Icons ────────────────────────────────────────────

function ImageTypeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" {...props}>
      <rect x={2} y={3} width={12} height={10} rx={1.5} stroke="currentColor" strokeWidth={1.2} />
      <circle cx={5.5} cy={6.5} r={1.2} stroke="currentColor" strokeWidth={1} />
      <path d="M2 11l3.5-3 2.5 2 2.5-2L14 11" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LinearTypeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" {...props}>
      <rect x={2} y={2} width={12} height={12} rx={2} stroke="currentColor" strokeWidth={1.2} />
      <line x1={4} y1={12} x2={12} y2={4} stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
    </svg>
  );
}

function RadialTypeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" {...props}>
      <circle cx={8} cy={8} r={3} stroke="currentColor" strokeWidth={1.2} />
      <circle cx={8} cy={8} r={6} stroke="currentColor" strokeWidth={1.2} opacity={0.4} />
    </svg>
  );
}

function OverlayTypeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" {...props}>
      <rect x={2} y={4} width={8} height={8} rx={1} stroke="currentColor" strokeWidth={1.2} />
      <rect x={6} y={2} width={8} height={8} rx={1} stroke="currentColor" strokeWidth={1.2} opacity={0.5} />
    </svg>
  );
}

// ─── Tile SVG Icons ──────────────────────────────────────────────

function TileRepeatIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <rect x={1} y={1} width={5} height={5} rx={0.5} fill="currentColor" opacity={0.6} />
      <rect x={8} y={1} width={5} height={5} rx={0.5} fill="currentColor" opacity={0.6} />
      <rect x={1} y={8} width={5} height={5} rx={0.5} fill="currentColor" opacity={0.6} />
      <rect x={8} y={8} width={5} height={5} rx={0.5} fill="currentColor" opacity={0.6} />
    </svg>
  );
}

function TileRepeatXIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <rect x={1} y={4.5} width={3} height={5} rx={0.5} fill="currentColor" opacity={0.6} />
      <rect x={5.5} y={4.5} width={3} height={5} rx={0.5} fill="currentColor" opacity={0.6} />
      <rect x={10} y={4.5} width={3} height={5} rx={0.5} fill="currentColor" opacity={0.6} />
    </svg>
  );
}

function TileRepeatYIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <rect x={4.5} y={1} width={5} height={3} rx={0.5} fill="currentColor" opacity={0.6} />
      <rect x={4.5} y={5.5} width={5} height={3} rx={0.5} fill="currentColor" opacity={0.6} />
      <rect x={4.5} y={10} width={5} height={3} rx={0.5} fill="currentColor" opacity={0.6} />
    </svg>
  );
}

function TileSpaceIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <circle cx={3} cy={7} r={1.2} fill="currentColor" opacity={0.5} />
      <circle cx={7} cy={7} r={1.2} fill="currentColor" opacity={0.5} />
      <circle cx={11} cy={7} r={1.2} fill="currentColor" opacity={0.5} />
    </svg>
  );
}

function TileNoRepeatIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

// ─── Trash icon ──────────────────────────────────────────────────

function TrashSmallIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 14 14" fill="none">
      <path d="M3 4h8M5.5 4V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M4 4v7a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────

const LAYER_TYPES: { type: BgLayerType; Icon: React.FC<React.SVGProps<SVGSVGElement>>; title: string }[] = [
  { type: 'image', Icon: ImageTypeIcon, title: 'Image' },
  { type: 'linear', Icon: LinearTypeIcon, title: 'Linear' },
  { type: 'radial', Icon: RadialTypeIcon, title: 'Radial' },
  { type: 'overlay', Icon: OverlayTypeIcon, title: 'Overlay' },
];

function TypeSelector({
  value,
  onChange,
}: {
  value: BgLayerType;
  onChange: (type: BgLayerType) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] w-12 shrink-0" style={{ color: 'var(--text-muted)' }}>
        Type
      </span>
      <div
        className="flex gap-px rounded overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        {LAYER_TYPES.map(({ type, Icon, title }) => {
          const active = value === type;
          return (
            <button
              key={type}
              type="button"
              className="flex items-center justify-center w-7 h-7"
              style={{
                background: active ? 'rgba(74,158,255,0.15)' : 'var(--bg-tertiary)',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
              }}
              title={title}
              onClick={() => onChange(type)}
            >
              <Icon />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ImagePanel({
  imageUrl,
  onUrlChange,
}: {
  imageUrl: string;
  onUrlChange: (url: string) => void;
}) {
  const [localUrl, setLocalUrl] = useState(imageUrl);
  const [imgMeta, setImgMeta] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => setLocalUrl(imageUrl), [imageUrl]);

  useEffect(() => {
    if (!imageUrl) { setImgMeta(null); return; }
    const img = new Image();
    img.onload = () => setImgMeta({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setImgMeta(null);
    img.src = imageUrl;
  }, [imageUrl]);

  const commit = useCallback(() => {
    const trimmed = localUrl.trim();
    if (trimmed && trimmed !== imageUrl) onUrlChange(trimmed);
  }, [localUrl, imageUrl, onUrlChange]);

  const filename = imageUrl ? extractFilename(imageUrl) : '';

  return (
    <div className="space-y-2">
      {/* Image row */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] w-12 shrink-0" style={{ color: 'var(--text-muted)' }}>
          Image
        </span>
        {/* Thumbnail */}
        <div
          className="w-12 h-12 rounded shrink-0 flex items-center justify-center"
          style={{
            background: imageUrl
              ? `url(${imageUrl}) center/cover no-repeat, repeating-conic-gradient(#333 0% 25%, #444 0% 50%) 0 0 / 8px 8px`
              : 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
          }}
        >
          {!imageUrl && (
            <ImageTypeIcon style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
          )}
        </div>
        {/* Meta */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <div
            className="text-[11px] truncate"
            style={{ color: 'var(--text-secondary)' }}
          >
            {filename || 'No image'}
          </div>
          {imgMeta && (
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {imgMeta.w} x {imgMeta.h}
            </div>
          )}
        </div>
      </div>

      {/* URL input styled as a button area */}
      <input
        type="text"
        value={localUrl}
        placeholder="Enter image URL"
        onChange={(e) => setLocalUrl(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
        className="w-full h-7 rounded text-[11px] px-2 outline-none text-center"
        style={{
          background: 'var(--bg-primary, #1e1e1e)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
        }}
      />
    </div>
  );
}

function OverlayPanel({
  color,
  onChange,
}: {
  color: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] w-12 shrink-0" style={{ color: 'var(--text-muted)' }}>
        Color
      </span>
      <ColorPicker value={color} onChange={onChange} />
    </div>
  );
}

function SizeModeToggle({
  value,
  onChange,
}: {
  value: string;
  onChange: (mode: string) => void;
}) {
  const modes = ['custom', 'cover', 'contain'];
  return (
    <div className="flex gap-0.5 rounded overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      {modes.map((m) => (
        <button
          key={m}
          type="button"
          className="flex-1 text-[10px] py-0.5 px-1.5 capitalize"
          style={{
            background: value === m ? 'rgba(74,158,255,0.12)' : 'transparent',
            color: value === m ? 'var(--accent)' : 'var(--text-secondary)',
            border: 'none',
            cursor: 'pointer',
          }}
          onClick={() => onChange(m)}
        >
          {m === 'custom' ? 'Custom' : m.charAt(0).toUpperCase() + m.slice(1)}
        </button>
      ))}
    </div>
  );
}

function DimensionInput({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: string;
  suffix?: string;
  onChange: (val: string) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        {label && (
          <span className="text-[10px] w-6 shrink-0" style={{ color: 'var(--text-muted)' }}>
            {label}
          </span>
        )}
        <input
          type="text"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => onChange(local)}
          onKeyDown={(e) => { if (e.key === 'Enter') onChange(local); }}
          className="flex-1 h-6 rounded text-[11px] px-1.5 outline-none min-w-0 text-right"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />
        {suffix && (
          <span className="text-[9px] uppercase w-4 shrink-0" style={{ color: 'var(--text-muted)' }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function PositionGrid({
  posX,
  posY,
  onSelect,
}: {
  posX: string;
  posY: string;
  onSelect: (x: string, y: string) => void;
}) {
  return (
    <div
      className="grid shrink-0"
      style={{
        gridTemplateColumns: 'repeat(3, 1fr)',
        width: 44,
        height: 44,
        background: 'var(--bg-tertiary)',
        borderRadius: 4,
        border: '1px solid var(--border)',
        padding: 5,
        gap: 2,
      }}
    >
      {POSITION_PRESETS.flat().map((preset) => {
        const isActive = posX === preset.x && posY === preset.y;
        return (
          <button
            key={`${preset.x}-${preset.y}`}
            type="button"
            className="flex items-center justify-center rounded-full"
            style={{
              width: 10,
              height: 10,
              background: isActive ? 'var(--accent)' : 'var(--text-muted)',
              opacity: isActive ? 1 : 0.35,
              cursor: 'pointer',
              border: 'none',
              padding: 0,
            }}
            title={`${preset.x} ${preset.y}`}
            onClick={() => onSelect(preset.x, preset.y)}
          />
        );
      })}
    </div>
  );
}

const TILE_OPTIONS: { value: string; Icon: React.FC; title: string }[] = [
  { value: 'repeat', Icon: TileRepeatIcon, title: 'Repeat' },
  { value: 'repeat-x', Icon: TileRepeatXIcon, title: 'Repeat X' },
  { value: 'repeat-y', Icon: TileRepeatYIcon, title: 'Repeat Y' },
  { value: 'space', Icon: TileSpaceIcon, title: 'Space' },
  { value: 'no-repeat', Icon: TileNoRepeatIcon, title: 'No repeat' },
];

function TileToggle({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex gap-px rounded overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      {TILE_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            className="flex items-center justify-center w-7 h-6"
            style={{
              background: active ? 'rgba(74,158,255,0.12)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
            }}
            title={opt.title}
            onClick={() => onChange(opt.value)}
          >
            <opt.Icon />
          </button>
        );
      })}
    </div>
  );
}

function AttachmentToggle({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const isFixed = value === 'fixed';
  return (
    <div className="flex gap-0.5 rounded overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <button
        type="button"
        className="flex-1 text-[10px] py-0.5 px-1.5"
        style={{
          background: isFixed ? 'rgba(74,158,255,0.12)' : 'transparent',
          color: isFixed ? 'var(--accent)' : 'var(--text-secondary)',
          border: 'none',
          cursor: 'pointer',
        }}
        onClick={() => onChange('fixed')}
      >
        Fixed
      </button>
      <button
        type="button"
        className="flex-1 text-[10px] py-0.5 px-1.5"
        style={{
          background: !isFixed ? 'rgba(74,158,255,0.12)' : 'transparent',
          color: !isFixed ? 'var(--accent)' : 'var(--text-secondary)',
          border: 'none',
          cursor: 'pointer',
        }}
        onClick={() => onChange('scroll')}
      >
        Not fixed
      </button>
    </div>
  );
}

function ClipDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-6 rounded text-[11px] px-1.5 cursor-pointer outline-none"
      style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        color: 'var(--text-primary)',
      }}
    >
      {CLIP_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ─── Main Component ──────────────────────────────────────────────

export function BackgroundSection() {
  const computedStyles = useEditorStore((state) => state.computedStyles);
  const cssVariableUsages = useEditorStore((state) => state.cssVariableUsages);
  const selectorPath = useEditorStore((state) => state.selectorPath);
  const { applyChange, resetProperty } = useChangeTracker();

  const hasChanges = useEditorStore((s) => {
    const sp = s.selectorPath;
    if (!sp) return false;
    return s.styleChanges.some((c) => c.elementSelector === sp && BACKGROUND_PROPERTIES.includes(c.property));
  });

  const handleResetAll = () => {
    const { selectorPath: sp, styleChanges } = useEditorStore.getState();
    if (!sp) return;
    const matching = styleChanges.filter((c) => c.elementSelector === sp && BACKGROUND_PROPERTIES.includes(c.property));
    for (const c of matching) resetProperty(c.property);
  };

  // --- Read computed values ---
  const bgImage = computedStyles.backgroundImage || 'none';
  const rawBgColor = computedStyles.backgroundColor || '';
  const bgColor = (!rawBgColor || rawBgColor === 'rgba(0, 0, 0, 0)' || rawBgColor === 'transparent') ? 'transparent' : rawBgColor;
  const bgSize = computedStyles.backgroundSize || 'auto';
  const bgPosition = computedStyles.backgroundPosition || '0% 0%';
  const bgRepeat = computedStyles.backgroundRepeat || 'repeat';
  const bgAttachment = computedStyles.backgroundAttachment || 'scroll';
  const bgClip = computedStyles.backgroundClip || 'border-box';

  // --- Parse composite properties ---
  const parsedSize = useMemo(() => parseBgSize(bgSize), [bgSize]);
  const parsedPosition = useMemo(() => parseBgPosition(bgPosition), [bgPosition]);

  // --- Layer detection ---
  const detectedType = useMemo(() => detectLayerType(bgImage), [bgImage]);
  const hasLayer = detectedType !== null || bgImage !== 'none';

  // --- Layer type state ---
  const [layerType, setLayerType] = useState<BgLayerType>(
    () => detectedType || 'linear'
  );

  // --- Gradient state ---
  const parsedGradient = useMemo(() => parseGradient(bgImage), [bgImage]);
  const [gradientData, setGradientData] = useState<GradientData>(
    () => parsedGradient || DEFAULT_GRADIENT
  );

  // --- Image state ---
  const detectedImageUrl = useMemo(() => parseImageUrl(bgImage), [bgImage]);
  const [imageUrl, setImageUrl] = useState(() => detectedImageUrl || '');

  // --- Overlay state ---
  const [overlayColor, setOverlayColor] = useState('rgba(0, 0, 0, 0.50)');

  // Sync when element changes
  useEffect(() => {
    const detected = detectLayerType(bgImage);
    if (detected) {
      setLayerType(detected);
      if (detected === 'image') {
        const url = parseImageUrl(bgImage);
        if (url) setImageUrl(url);
      }
    }
    if (parsedGradient) {
      setGradientData(parsedGradient);
    }
  }, [selectorPath, bgImage, parsedGradient]);

  // --- Layer preview swatch ---
  const layerSwatchBg = useMemo(() => {
    if (layerType === 'image' && imageUrl) return `url(${imageUrl}) center/cover no-repeat`;
    if ((layerType === 'linear' || layerType === 'radial') && parsedGradient) {
      return serializeGradient(gradientData);
    }
    if (layerType === 'overlay') return overlayColor;
    return 'var(--bg-tertiary)';
  }, [layerType, imageUrl, parsedGradient, gradientData, overlayColor]);

  const layerLabel = useMemo(() => {
    switch (layerType) {
      case 'image': return imageUrl ? extractFilename(imageUrl) : 'Image';
      case 'linear': return 'Linear gradient';
      case 'radial': return 'Radial gradient';
      case 'overlay': return 'Overlay';
    }
  }, [layerType, imageUrl]);

  // --- Handlers ---
  const handleColorChange = useCallback(
    (property: string, value: string) => applyChange(property, value),
    [applyChange]
  );

  const handleAddLayer = useCallback(() => {
    setLayerType('linear');
    setGradientData(DEFAULT_GRADIENT);
    applyChange('backgroundImage', serializeGradient(DEFAULT_GRADIENT));
  }, [applyChange]);

  const handleRemoveLayer = useCallback(() => {
    applyChange('backgroundImage', 'none');
  }, [applyChange]);

  const handleTypeChange = useCallback(
    (newType: BgLayerType) => {
      setLayerType(newType);
      switch (newType) {
        case 'image':
          applyChange('backgroundImage', imageUrl ? `url(${imageUrl})` : 'none');
          break;
        case 'linear': {
          const data = { ...gradientData, type: 'linear' as const };
          setGradientData(data);
          applyChange('backgroundImage', serializeGradient(data));
          break;
        }
        case 'radial': {
          const data = { ...gradientData, type: 'radial' as const };
          setGradientData(data);
          applyChange('backgroundImage', serializeGradient(data));
          break;
        }
        case 'overlay':
          applyChange('backgroundImage', `linear-gradient(${overlayColor}, ${overlayColor})`);
          break;
      }
    },
    [applyChange, imageUrl, gradientData, overlayColor]
  );

  const handleGradientChange = useCallback(
    (data: GradientData) => {
      setGradientData(data);
      applyChange('backgroundImage', serializeGradient(data));
    },
    [applyChange]
  );

  const handleImageUrlChange = useCallback(
    (url: string) => {
      setImageUrl(url);
      if (url) applyChange('backgroundImage', `url(${url})`);
      else applyChange('backgroundImage', 'none');
    },
    [applyChange]
  );

  const handleOverlayColorChange = useCallback(
    (color: string) => {
      setOverlayColor(color);
      applyChange('backgroundImage', `linear-gradient(${color}, ${color})`);
    },
    [applyChange]
  );

  // --- Size handlers ---
  const handleSizeModeChange = useCallback(
    (mode: string) => {
      if (mode === 'cover' || mode === 'contain') {
        applyChange('backgroundSize', mode);
      } else {
        const s = parsedSize;
        const w = s.w === 'auto' && s.h === 'auto' ? '100%' : s.w;
        const h = s.h === 'auto' && s.w === 'auto' ? 'auto' : s.h;
        applyChange('backgroundSize', `${w} ${h}`);
      }
    },
    [applyChange, parsedSize]
  );

  const handleSizeW = useCallback(
    (val: string) => applyChange('backgroundSize', `${val} ${parsedSize.h}`),
    [applyChange, parsedSize.h]
  );

  const handleSizeH = useCallback(
    (val: string) => applyChange('backgroundSize', `${parsedSize.w} ${val}`),
    [applyChange, parsedSize.w]
  );

  // --- Position handlers ---
  const handlePositionGrid = useCallback(
    (x: string, y: string) => applyChange('backgroundPosition', `${x} ${y}`),
    [applyChange]
  );

  const handlePosX = useCallback(
    (val: string) => applyChange('backgroundPosition', `${val} ${parsedPosition.y}`),
    [applyChange, parsedPosition.y]
  );

  const handlePosY = useCallback(
    (val: string) => applyChange('backgroundPosition', `${parsedPosition.x} ${val}`),
    [applyChange, parsedPosition.x]
  );

  // --- Simple property handlers ---
  const handleRepeatChange = useCallback(
    (val: string) => applyChange('backgroundRepeat', val),
    [applyChange]
  );

  const handleAttachmentChange = useCallback(
    (val: string) => applyChange('backgroundAttachment', val),
    [applyChange]
  );

  const handleClipChange = useCallback(
    (val: string) => applyChange('backgroundClip', val),
    [applyChange]
  );

  // Show shared controls for image, linear, radial (not overlay)
  const showSharedControls = layerType !== 'overlay';

  return (
    <SectionHeader
      title="Backgrounds"
      defaultOpen={true}
      hasChanges={hasChanges}
      onReset={handleResetAll}
      actions={
        <button
          type="button"
          className="flex items-center justify-center w-5 h-5 rounded hover:opacity-80"
          style={{ color: 'var(--text-muted)' }}
          title="Add background layer"
          onClick={handleAddLayer}
        >
          <PlusIcon />
        </button>
      }
    >
      <div className="space-y-2.5">
        {/* ── Image & gradient header ── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Image &amp; gradient
            </span>
            {!hasLayer && (
              <button
                type="button"
                className="flex items-center justify-center w-4 h-4 rounded hover:opacity-80"
                style={{ color: 'var(--text-muted)' }}
                title="Add background layer"
                onClick={handleAddLayer}
              >
                <PlusIcon />
              </button>
            )}
          </div>

          {/* ── Layer panel ── */}
          {hasLayer && (
            <div
              className="space-y-2.5 rounded p-2"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
              }}
            >
              {/* Preview swatch + label + remove */}
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded shrink-0"
                  style={{
                    background: `${layerSwatchBg}, repeating-conic-gradient(#333 0% 25%, #444 0% 50%) 0 0 / 6px 6px`,
                    border: '1px solid var(--border)',
                  }}
                />
                <span className="text-[11px] flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                  {layerLabel}
                </span>
                <button
                  type="button"
                  className="flex items-center justify-center w-5 h-5 rounded hover:opacity-80"
                  style={{ color: 'var(--text-muted)' }}
                  title="Remove layer"
                  onClick={handleRemoveLayer}
                >
                  <TrashSmallIcon />
                </button>
              </div>

              {/* Type selector */}
              <TypeSelector value={layerType} onChange={handleTypeChange} />

              {/* ── Type-specific content ── */}
              {layerType === 'image' && (
                <ImagePanel imageUrl={imageUrl} onUrlChange={handleImageUrlChange} />
              )}

              {(layerType === 'linear' || layerType === 'radial') && (
                <GradientEditor
                  value={gradientData}
                  onChange={handleGradientChange}
                  showTypeSelector={false}
                />
              )}

              {layerType === 'overlay' && (
                <OverlayPanel color={overlayColor} onChange={handleOverlayColorChange} />
              )}

              {/* ── Shared controls (Size, Position, Tile, Fixed) ── */}
              {showSharedControls && (
                <>
                  {/* Size */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] w-12 shrink-0" style={{ color: 'var(--text-muted)' }}>
                        Size
                      </span>
                      <SizeModeToggle value={parsedSize.mode} onChange={handleSizeModeChange} />
                    </div>
                    {parsedSize.mode === 'custom' && (
                      <div className="grid grid-cols-2 gap-1.5 pl-14">
                        <div className="space-y-0.5">
                          <DimensionInput label="" value={parsedSize.w} onChange={handleSizeW} />
                          <span className="text-[9px] text-center block" style={{ color: 'var(--text-muted)' }}>Width</span>
                        </div>
                        <div className="space-y-0.5">
                          <DimensionInput label="" value={parsedSize.h} onChange={handleSizeH} />
                          <span className="text-[9px] text-center block" style={{ color: 'var(--text-muted)' }}>Height</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Position */}
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="text-[11px] w-12 shrink-0 pt-1" style={{ color: 'var(--text-muted)' }}>
                        Position
                      </span>
                      <PositionGrid
                        posX={parsedPosition.x}
                        posY={parsedPosition.y}
                        onSelect={handlePositionGrid}
                      />
                      <div className="flex-1 space-y-1.5">
                        <DimensionInput label="Left" value={parsedPosition.x} suffix="PX" onChange={handlePosX} />
                        <DimensionInput label="Top" value={parsedPosition.y} suffix="PX" onChange={handlePosY} />
                      </div>
                    </div>
                  </div>

                  {/* Tile */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] w-12 shrink-0" style={{ color: 'var(--text-muted)' }}>
                      Tile
                    </span>
                    <TileToggle value={bgRepeat} onChange={handleRepeatChange} />
                  </div>

                  {/* Fixed */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] w-12 shrink-0" style={{ color: 'var(--text-muted)' }}>
                      Fixed
                    </span>
                    <AttachmentToggle value={bgAttachment} onChange={handleAttachmentChange} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Color row (always visible) ── */}
        <ColorInput
          label="Color"
          value={bgColor}
          property="backgroundColor"
          onChange={handleColorChange}
          varExpression={cssVariableUsages['background-color']}
        />

        {/* ── Clipping ── */}
        <div className="space-y-1">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Clipping</span>
          <ClipDropdown value={bgClip} onChange={handleClipChange} />
        </div>
      </div>
    </SectionHeader>
  );
}

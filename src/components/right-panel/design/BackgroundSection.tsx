'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useEditorStore } from '@/store'
import { SectionHeader } from '@/components/right-panel/design/inputs/SectionHeader'
import { ColorInput } from '@/components/right-panel/design/inputs/ColorInput'
import { GradientEditor } from './GradientEditor'
import { PlusIcon } from '@/components/right-panel/design/icons'
import { ColorPicker } from '@/components/common/ColorPicker'
import { parseGradient, serializeGradient } from '@/lib/gradientParser'
import { useChangeTracker } from '@/hooks/useChangeTracker'
import type { GradientData } from '@/types/gradient'

// ─── Constants ───────────────────────────────────────────────────

const BACKGROUND_PROPERTIES = [
  'backgroundColor',
  'backgroundImage',
  'backgroundSize',
  'backgroundPosition',
  'backgroundRepeat',
  'backgroundAttachment',
  'backgroundClip',
]

const DEFAULT_GRADIENT: GradientData = {
  type: 'linear',
  angle: 180,
  stops: [
    { color: '#000000', position: 0, opacity: 1 },
    { color: '#ffffff', position: 100, opacity: 1 },
  ],
}

const CLIP_OPTIONS: { value: string; label: string }[] = [
  { value: 'border-box', label: 'None' },
  { value: 'padding-box', label: 'Clip to padding' },
  { value: 'content-box', label: 'Clip to content' },
  { value: 'text', label: 'Clip to text' },
]

type BgLayerType = 'linear' | 'radial' | 'overlay'

// ─── Helpers ─────────────────────────────────────────────────────

function detectLayerType(bgImage: string): BgLayerType | null {
  if (!bgImage || bgImage === 'none') return null
  if (bgImage.includes('radial-gradient')) return 'radial'
  if (bgImage.includes('linear-gradient') || bgImage.includes('conic-gradient'))
    return 'linear'
  return null
}

// ─── Layer Type Icons ────────────────────────────────────────────

function LinearTypeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" {...props}>
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
  )
}

function RadialTypeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" {...props}>
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
  )
}

function OverlayTypeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" {...props}>
      <rect
        x={2}
        y={4}
        width={8}
        height={8}
        rx={1}
        stroke="currentColor"
        strokeWidth={1.2}
      />
      <rect
        x={6}
        y={2}
        width={8}
        height={8}
        rx={1}
        stroke="currentColor"
        strokeWidth={1.2}
        opacity={0.5}
      />
    </svg>
  )
}

// ─── Trash icon ──────────────────────────────────────────────────

function TrashSmallIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 14 14" fill="none">
      <path
        d="M3 4h8M5.5 4V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M4 4v7a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ─── Sub-Components ──────────────────────────────────────────────

const LAYER_TYPES: {
  type: BgLayerType
  Icon: React.FC<React.SVGProps<SVGSVGElement>>
  title: string
}[] = [
  { type: 'linear', Icon: LinearTypeIcon, title: 'Linear' },
  { type: 'radial', Icon: RadialTypeIcon, title: 'Radial' },
  { type: 'overlay', Icon: OverlayTypeIcon, title: 'Overlay' },
]

function TypeSelector({
  value,
  onChange,
}: {
  value: BgLayerType
  onChange: (type: BgLayerType) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[11px] w-12 shrink-0"
        style={{ color: 'var(--text-muted)' }}
      >
        Type
      </span>
      <div
        className="flex gap-px rounded overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        {LAYER_TYPES.map(({ type, Icon, title }) => {
          const active = value === type
          return (
            <button
              key={type}
              type="button"
              className="flex items-center justify-center w-7 h-7"
              style={{
                background: active
                  ? 'rgba(74,158,255,0.15)'
                  : 'var(--bg-tertiary)',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
              }}
              title={title}
              onClick={() => onChange(type)}
            >
              <Icon />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function OverlayPanel({
  color,
  onChange,
}: {
  color: string
  onChange: (color: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[11px] w-12 shrink-0"
        style={{ color: 'var(--text-muted)' }}
      >
        Color
      </span>
      <ColorPicker
        value={color}
        onChange={onChange}
        onSelectVariable={onChange}
      />
    </div>
  )
}

function ClipDropdown({
  value,
  onChange,
}: {
  value: string
  onChange: (val: string) => void
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
  )
}

// ─── Main Component ──────────────────────────────────────────────

export function BackgroundSection() {
  const computedStyles = useEditorStore((state) => state.computedStyles)
  const cssVariableUsages = useEditorStore((state) => state.cssVariableUsages)
  const selectorPath = useEditorStore((state) => state.selectorPath)
  const { applyChange, resetProperty } = useChangeTracker()

  const hasChanges = useEditorStore((s) => {
    const sp = s.selectorPath
    if (!sp) return false
    return s.styleChanges.some(
      (c) =>
        c.elementSelector === sp && BACKGROUND_PROPERTIES.includes(c.property),
    )
  })

  const handleResetAll = () => {
    const { selectorPath: sp, styleChanges } = useEditorStore.getState()
    if (!sp) return
    const matching = styleChanges.filter(
      (c) =>
        c.elementSelector === sp && BACKGROUND_PROPERTIES.includes(c.property),
    )
    for (const c of matching) resetProperty(c.property)
  }

  // --- Read computed values ---
  const bgImage = computedStyles.backgroundImage || 'none'
  const rawBgColor = computedStyles.backgroundColor || ''
  const bgColor =
    !rawBgColor ||
    rawBgColor === 'rgba(0, 0, 0, 0)' ||
    rawBgColor === 'transparent'
      ? 'transparent'
      : rawBgColor
  const bgClip = computedStyles.backgroundClip || 'border-box'

  // --- Layer detection ---
  const detectedType = useMemo(() => detectLayerType(bgImage), [bgImage])
  const hasLayer = detectedType !== null

  // --- Layer type state ---
  const [layerType, setLayerType] = useState<BgLayerType>(
    () => detectedType || 'linear',
  )

  // --- Gradient state ---
  const parsedGradient = useMemo(() => parseGradient(bgImage), [bgImage])
  const [gradientData, setGradientData] = useState<GradientData>(
    () => parsedGradient || DEFAULT_GRADIENT,
  )

  // --- Overlay state ---
  const [overlayColor, setOverlayColor] = useState('rgba(0, 0, 0, 0.50)')

  // Sync when element changes
  useEffect(() => {
    const detected = detectLayerType(bgImage)
    if (detected) {
      setLayerType(detected)
    }
    if (parsedGradient) {
      setGradientData(parsedGradient)
    }
  }, [selectorPath, bgImage, parsedGradient])

  // --- Layer preview swatch ---
  const layerSwatchBg = useMemo(() => {
    if (layerType === 'linear' || layerType === 'radial') {
      return serializeGradient(gradientData)
    }
    if (layerType === 'overlay') return overlayColor
    return 'var(--bg-tertiary)'
  }, [layerType, gradientData, overlayColor])

  const layerLabel = useMemo(() => {
    switch (layerType) {
      case 'linear':
        return 'Linear gradient'
      case 'radial':
        return 'Radial gradient'
      case 'overlay':
        return 'Overlay'
    }
  }, [layerType])

  // --- Handlers ---
  const handleColorChange = useCallback(
    (property: string, value: string) => applyChange(property, value),
    [applyChange],
  )

  const handleAddLayer = useCallback(() => {
    setLayerType('linear')
    setGradientData(DEFAULT_GRADIENT)
    applyChange('backgroundImage', serializeGradient(DEFAULT_GRADIENT))
  }, [applyChange])

  const handleRemoveLayer = useCallback(() => {
    applyChange('backgroundImage', 'none')
  }, [applyChange])

  const handleTypeChange = useCallback(
    (newType: BgLayerType) => {
      setLayerType(newType)
      switch (newType) {
        case 'linear': {
          const data = { ...gradientData, type: 'linear' as const }
          setGradientData(data)
          applyChange('backgroundImage', serializeGradient(data))
          break
        }
        case 'radial': {
          const data = { ...gradientData, type: 'radial' as const }
          setGradientData(data)
          applyChange('backgroundImage', serializeGradient(data))
          break
        }
        case 'overlay':
          applyChange(
            'backgroundImage',
            `linear-gradient(${overlayColor}, ${overlayColor})`,
          )
          break
      }
    },
    [applyChange, gradientData, overlayColor],
  )

  const handleGradientChange = useCallback(
    (data: GradientData) => {
      setGradientData(data)
      applyChange('backgroundImage', serializeGradient(data))
    },
    [applyChange],
  )

  const handleOverlayColorChange = useCallback(
    (color: string) => {
      setOverlayColor(color)
      applyChange('backgroundImage', `linear-gradient(${color}, ${color})`)
    },
    [applyChange],
  )

  const handleClipChange = useCallback(
    (val: string) => applyChange('backgroundClip', val),
    [applyChange],
  )

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
          title="Add gradient"
          onClick={handleAddLayer}
        >
          <PlusIcon />
        </button>
      }
    >
      <div className="space-y-2.5">
        {/* ── Gradient header ── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              Gradient
            </span>
            {!hasLayer && (
              <button
                type="button"
                className="flex items-center justify-center w-4 h-4 rounded hover:opacity-80"
                style={{ color: 'var(--text-muted)' }}
                title="Add gradient"
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
                <span
                  className="text-[11px] flex-1 truncate"
                  style={{ color: 'var(--text-secondary)' }}
                >
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
              {(layerType === 'linear' || layerType === 'radial') && (
                <GradientEditor
                  value={gradientData}
                  onChange={handleGradientChange}
                  showTypeSelector={false}
                />
              )}

              {layerType === 'overlay' && (
                <OverlayPanel
                  color={overlayColor}
                  onChange={handleOverlayColorChange}
                />
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
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Clipping
          </span>
          <ClipDropdown value={bgClip} onChange={handleClipChange} />
        </div>
      </div>
    </SectionHeader>
  )
}

'use client'

import { useState, useMemo } from 'react'
import { useEditorStore } from '@/store'
import { SectionHeader } from '@/components/right-panel/design/inputs/SectionHeader'
import { CompactInput } from '@/components/right-panel/design/inputs/CompactInput'
import { DraggableLabel } from '@/components/right-panel/design/inputs/DraggableLabel'
import { IconToggleGroup } from '@/components/right-panel/design/inputs/IconToggleGroup'
import { ColorInput } from '@/components/right-panel/design/inputs/ColorInput'
import { ColorPicker } from '@/components/common/ColorPicker'
import {
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  AlignJustifyIcon,
  DecoNoneIcon,
  StrikethroughIcon,
  OverlineIcon,
  UnderlineIcon,
  ItalicIcon,
  DirectionLTRIcon,
  DirectionRTLIcon,
  PlusIcon,
  TrashIcon,
} from '@/components/right-panel/design/icons'
import { useChangeTracker } from '@/hooks/useChangeTracker'
import { parseTextShadow, serializeTextShadow } from '@/lib/textShadowUtils'
import type { TextShadowData } from '@/lib/textShadowUtils'

// --- Option definitions ---

const TEXT_ALIGN_OPTIONS = [
  { value: 'left', icon: <AlignLeftIcon />, tooltip: 'Left' },
  { value: 'center', icon: <AlignCenterIcon />, tooltip: 'Center' },
  { value: 'right', icon: <AlignRightIcon />, tooltip: 'Right' },
  { value: 'justify', icon: <AlignJustifyIcon />, tooltip: 'Justify' },
]

const TEXT_DECORATION_OPTIONS = [
  { value: 'none', icon: <DecoNoneIcon />, tooltip: 'None' },
  {
    value: 'line-through',
    icon: <StrikethroughIcon />,
    tooltip: 'Strikethrough',
  },
  { value: 'overline', icon: <OverlineIcon />, tooltip: 'Overline' },
  { value: 'underline', icon: <UnderlineIcon />, tooltip: 'Underline' },
]

const FONT_STYLE_OPTIONS = [
  {
    value: 'normal',
    icon: <span className="text-[11px] font-medium">N</span>,
    tooltip: 'Normal',
  },
  { value: 'italic', icon: <ItalicIcon />, tooltip: 'Italic' },
]

const TEXT_TRANSFORM_OPTIONS = [
  {
    value: 'uppercase',
    icon: <span className="text-[10px] font-bold">AA</span>,
    tooltip: 'Uppercase',
  },
  {
    value: 'capitalize',
    icon: <span className="text-[10px] font-bold">Aa</span>,
    tooltip: 'Capitalize',
  },
  {
    value: 'lowercase',
    icon: <span className="text-[10px] font-bold">aa</span>,
    tooltip: 'Lowercase',
  },
  { value: 'none', icon: <DecoNoneIcon />, tooltip: 'None' },
]

const DIRECTION_OPTIONS = [
  { value: 'ltr', icon: <DirectionLTRIcon />, tooltip: 'Left to Right' },
  { value: 'rtl', icon: <DirectionRTLIcon />, tooltip: 'Right to Left' },
]

const WEIGHT_OPTIONS = [
  { value: '100', label: '100 - Thin' },
  { value: '200', label: '200 - Extra Light' },
  { value: '300', label: '300 - Light' },
  { value: '400', label: '400 - Normal' },
  { value: '500', label: '500 - Medium' },
  { value: '600', label: '600 - Semi Bold' },
  { value: '700', label: '700 - Bold' },
  { value: '800', label: '800 - Extra Bold' },
  { value: '900', label: '900 - Black' },
]

// --- Shared styles ---

const selectStyle = {
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
} as const

const _labelStyle = {
  color: 'var(--text-muted)',
} as const

// --- Helper: parse font-family stack into individual font names ---

function parseFontStack(value: string): string[] {
  if (!value || value === 'inherit') return []
  // Split by commas, respecting quoted font names
  const fonts: string[] = []
  let current = ''
  let inQuote = false
  let quoteChar = ''
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]
    if (!inQuote && (ch === '"' || ch === "'")) {
      inQuote = true
      quoteChar = ch
    } else if (inQuote && ch === quoteChar) {
      inQuote = false
    } else if (ch === ',' && !inQuote) {
      const trimmed = current.trim().replace(/^["']|["']$/g, '')
      if (trimmed) fonts.push(trimmed)
      current = ''
      continue
    }
    current += ch
  }
  const last = current.trim().replace(/^["']|["']$/g, '')
  if (last) fonts.push(last)
  return [...new Set(fonts)]
}

// --- Helper: extract first keyword from compound text-decoration ---

function extractDecorationKeyword(value: string): string {
  if (!value || value === 'none') return 'none'
  const first = value.split(/\s+/)[0]
  if (['underline', 'overline', 'line-through', 'none'].includes(first))
    return first
  return 'none'
}

// --- Component ---

const TYPOGRAPHY_PROPERTIES = [
  'fontFamily',
  'fontWeight',
  'fontSize',
  'lineHeight',
  'color',
  'textAlign',
  'textDecoration',
  'letterSpacing',
  'textIndent',
  'columnCount',
  'fontStyle',
  'textTransform',
  'direction',
  'wordBreak',
  'lineBreak',
  'whiteSpace',
  'textOverflow',
  'webkitTextStrokeWidth',
  'webkitTextStrokeColor',
  'textShadow',
]

export function TextSection() {
  const computedStyles = useEditorStore((state) => state.computedStyles)
  const cssVariableUsages = useEditorStore((state) => state.cssVariableUsages)
  const { applyChange, resetProperty } = useChangeTracker()

  const hasChanges = useEditorStore((s) => {
    const sp = s.selectorPath
    if (!sp) return false
    return s.styleChanges.some(
      (c) =>
        c.elementSelector === sp && TYPOGRAPHY_PROPERTIES.includes(c.property),
    )
  })

  const handleResetAll = () => {
    const { selectorPath, styleChanges } = useEditorStore.getState()
    if (!selectorPath) return
    const matching = styleChanges.filter(
      (c) =>
        c.elementSelector === selectorPath &&
        TYPOGRAPHY_PROPERTIES.includes(c.property),
    )
    for (const c of matching) resetProperty(c.property)
  }

  const handleChange = (property: string, value: string) => {
    applyChange(property, value)
  }

  // --- Core typography values ---
  const fontFamily = computedStyles.fontFamily || 'inherit'
  const fontWeight = computedStyles.fontWeight || '400'
  const fontSize = computedStyles.fontSize || '16px'
  const lineHeight = computedStyles.lineHeight || 'normal'
  const color = computedStyles.color || '#000000'
  const textAlign = computedStyles.textAlign || 'left'
  const textDecoration = computedStyles.textDecoration || 'none'

  // --- Advanced values ---
  const letterSpacing = computedStyles.letterSpacing || 'normal'
  const textIndent = computedStyles.textIndent || '0px'
  const columnCount = computedStyles.columnCount || 'auto'
  const fontStyle = computedStyles.fontStyle || 'normal'
  const textTransform = computedStyles.textTransform || 'none'
  const direction = computedStyles.direction || 'ltr'
  const wordBreak = computedStyles.wordBreak || 'normal'
  const lineBreak = computedStyles.lineBreak || 'normal'
  const whiteSpace = computedStyles.whiteSpace || 'normal'
  const textOverflow = computedStyles.textOverflow || 'clip'
  const webkitTextStrokeWidth = computedStyles.webkitTextStrokeWidth || '0px'
  const webkitTextStrokeColor =
    computedStyles.webkitTextStrokeColor || 'currentcolor'

  // --- Text shadow ---
  const textShadowRaw = computedStyles.textShadow || 'none'
  const shadows = useMemo(() => parseTextShadow(textShadowRaw), [textShadowRaw])

  const addShadow = () => {
    const next: TextShadowData[] = [
      ...shadows,
      { x: 0, y: 0, blur: 0, color: 'rgba(0,0,0,0.25)' },
    ]
    applyChange('textShadow', serializeTextShadow(next))
  }

  const removeShadow = (index: number) => {
    const next = shadows.filter((_, i) => i !== index)
    applyChange('textShadow', serializeTextShadow(next))
  }

  const updateShadow = (index: number, updates: Partial<TextShadowData>) => {
    const next = shadows.map((s, i) => (i === index ? { ...s, ...updates } : s))
    applyChange('textShadow', serializeTextShadow(next))
  }

  // --- More type options toggle ---
  const [moreOpen, setMoreOpen] = useState(false)

  const decoValue = extractDecorationKeyword(textDecoration)

  // Parse font stack into individual font options
  const fontOptions = useMemo(() => parseFontStack(fontFamily), [fontFamily])

  // Row label width
  const LW = 'w-[52px]'

  return (
    <SectionHeader
      title="Typography"
      defaultOpen={true}
      hasChanges={hasChanges}
      onReset={handleResetAll}
    >
      {/* ===== Core Typography — design tool row layout ===== */}

      {/* Font */}
      <div className="flex items-center gap-2">
        <span
          className={`${LW} flex-shrink-0 text-[11px]`}
          style={{ color: 'var(--accent)' }}
        >
          Font
        </span>
        <select
          value={fontFamily}
          onChange={(e) => handleChange('fontFamily', e.target.value)}
          className="flex-1 h-7 rounded text-[11px] px-2 cursor-pointer outline-none"
          style={selectStyle}
        >
          <option value={fontFamily}>{fontOptions[0] || fontFamily}</option>
          {fontOptions.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </div>

      {/* Weight */}
      <div className="flex items-center gap-2">
        <span
          className={`${LW} flex-shrink-0 text-[11px]`}
          style={{ color: 'var(--accent)' }}
        >
          Weight
        </span>
        <select
          value={fontWeight}
          onChange={(e) => handleChange('fontWeight', e.target.value)}
          className="flex-1 h-7 rounded text-[11px] px-2 cursor-pointer outline-none"
          style={selectStyle}
        >
          {WEIGHT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Size + Height + Spacing */}
      <div className="grid grid-cols-[52px_1fr_auto_1fr] items-center gap-x-2 gap-y-2">
        <DraggableLabel
          value={fontSize}
          property="fontSize"
          onChange={handleChange}
          min={0}
          className="text-[11px] whitespace-nowrap"
          style={{ color: 'var(--accent)' }}
        >
          Size
        </DraggableLabel>
        <CompactInput
          value={fontSize}
          property="fontSize"
          onChange={handleChange}
          units={['px', 'em', 'rem', '%', 'vw']}
          min={0}
          className="min-w-0"
        />
        <DraggableLabel
          value={lineHeight}
          property="lineHeight"
          onChange={handleChange}
          className="text-[11px] whitespace-nowrap"
          style={{ color: 'var(--text-muted)' }}
        >
          Height
        </DraggableLabel>
        <CompactInput
          value={lineHeight}
          property="lineHeight"
          onChange={handleChange}
          units={['px', 'em', 'rem', '']}
          className="min-w-0"
        />
        <DraggableLabel
          value={letterSpacing}
          property="letterSpacing"
          onChange={handleChange}
          className="text-[11px] whitespace-nowrap"
          style={{ color: 'var(--text-muted)' }}
        >
          Spacing
        </DraggableLabel>
        <CompactInput
          value={letterSpacing}
          property="letterSpacing"
          onChange={handleChange}
          units={['px', 'em', 'rem']}
          className="min-w-0"
        />
        <DraggableLabel
          value={textIndent}
          property="textIndent"
          onChange={handleChange}
          className="text-[11px] whitespace-nowrap"
          style={{ color: 'var(--text-muted)' }}
        >
          Indent
        </DraggableLabel>
        <CompactInput
          value={textIndent}
          property="textIndent"
          onChange={handleChange}
          units={['px', 'em', 'rem', '%']}
          className="min-w-0"
        />
      </div>

      {/* Color */}
      <div className="flex items-center gap-2">
        <span
          className={`${LW} flex-shrink-0 text-[11px]`}
          style={{ color: 'var(--accent)' }}
        >
          Color
        </span>
        <div className="flex-1">
          <ColorInput
            value={color}
            property="color"
            onChange={handleChange}
            varExpression={cssVariableUsages.color}
          />
        </div>
      </div>

      {/* Align */}
      <div className="flex items-center gap-2">
        <span
          className={`${LW} flex-shrink-0 text-[11px]`}
          style={{ color: 'var(--text-secondary)' }}
        >
          Align
        </span>
        <IconToggleGroup
          options={TEXT_ALIGN_OPTIONS}
          value={textAlign}
          onChange={(val) => handleChange('textAlign', val)}
        />
      </div>

      {/* Decoration */}
      <div className="flex items-center gap-2">
        <span
          className={`${LW} flex-shrink-0 text-[11px]`}
          style={{ color: 'var(--text-secondary)' }}
        >
          Decor
        </span>
        <IconToggleGroup
          options={TEXT_DECORATION_OPTIONS}
          value={decoValue}
          onChange={(val) => handleChange('textDecoration', val)}
        />
        <button
          type="button"
          onClick={() => setMoreOpen(!moreOpen)}
          className="flex items-center justify-center w-6 h-6 rounded transition-colors"
          style={{
            color: moreOpen ? 'var(--accent)' : 'var(--text-muted)',
            background: moreOpen ? 'rgba(74,158,255,0.10)' : 'transparent',
          }}
          title="More type options"
        >
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <circle cx={3} cy={7} r={1.2} fill="currentColor" />
            <circle cx={7} cy={7} r={1.2} fill="currentColor" />
            <circle cx={11} cy={7} r={1.2} fill="currentColor" />
          </svg>
        </button>
      </div>

      {/* ===== More Type Options (collapsible) ===== */}

      {moreOpen && (
        <div
          className="space-y-2 pt-1"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {/* Columns */}
          <div className="flex items-center gap-2">
            <span
              className={`${LW} flex-shrink-0 text-[11px]`}
              style={{ color: 'var(--text-secondary)' }}
            >
              Columns
            </span>
            <div className="flex-1">
              <CompactInput
                value={columnCount}
                property="columnCount"
                onChange={handleChange}
                units={['', 'auto']}
              />
            </div>
          </div>

          {/* Style / Transform / Direction */}
          <div className="flex items-center gap-2">
            <span
              className={`${LW} flex-shrink-0 text-[11px]`}
              style={{ color: 'var(--text-secondary)' }}
            >
              Style
            </span>
            <IconToggleGroup
              options={FONT_STYLE_OPTIONS}
              value={fontStyle}
              onChange={(val) => handleChange('fontStyle', val)}
            />
            <IconToggleGroup
              options={TEXT_TRANSFORM_OPTIONS}
              value={textTransform}
              onChange={(val) => handleChange('textTransform', val)}
            />
            <IconToggleGroup
              options={DIRECTION_OPTIONS}
              value={direction}
              onChange={(val) => handleChange('direction', val)}
            />
          </div>

          {/* Breaking */}
          <div className="flex items-center gap-2">
            <span
              className={`${LW} flex-shrink-0 text-[11px]`}
              style={{ color: 'var(--text-secondary)' }}
            >
              Break
            </span>
            <div className="flex-1">
              <select
                value={wordBreak}
                onChange={(e) => handleChange('wordBreak', e.target.value)}
                className="w-full h-7 rounded text-[11px] px-1.5 cursor-pointer outline-none"
                style={selectStyle}
              >
                <option value="normal">normal</option>
                <option value="break-all">break-all</option>
                <option value="keep-all">keep-all</option>
                <option value="break-word">break-word</option>
              </select>
            </div>
            <div className="flex-1">
              <select
                value={lineBreak}
                onChange={(e) => handleChange('lineBreak', e.target.value)}
                className="w-full h-7 rounded text-[11px] px-1.5 cursor-pointer outline-none"
                style={selectStyle}
              >
                <option value="normal">normal</option>
                <option value="loose">loose</option>
                <option value="strict">strict</option>
                <option value="anywhere">anywhere</option>
              </select>
            </div>
          </div>

          {/* Wrap */}
          <div className="flex items-center gap-2">
            <span
              className={`${LW} flex-shrink-0 text-[11px]`}
              style={{ color: 'var(--text-secondary)' }}
            >
              Wrap
            </span>
            <div className="flex-1">
              <select
                value={whiteSpace}
                onChange={(e) => handleChange('whiteSpace', e.target.value)}
                className="w-full h-7 rounded text-[11px] px-1.5 cursor-pointer outline-none"
                style={selectStyle}
              >
                <option value="normal">normal</option>
                <option value="nowrap">nowrap</option>
                <option value="pre">pre</option>
                <option value="pre-wrap">pre-wrap</option>
                <option value="pre-line">pre-line</option>
                <option value="break-spaces">break-spaces</option>
              </select>
            </div>
          </div>

          {/* Truncate */}
          <div className="flex items-center gap-2">
            <span
              className={`${LW} flex-shrink-0 text-[11px]`}
              style={{ color: 'var(--text-secondary)' }}
            >
              Truncate
            </span>
            <div
              className="inline-flex rounded"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
              }}
            >
              {(['clip', 'ellipsis'] as const).map((opt) => {
                const isActive = textOverflow === opt
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleChange('textOverflow', opt)}
                    className="flex items-center justify-center px-3 text-[11px] transition-colors"
                    style={{
                      height: 24,
                      background: isActive
                        ? 'var(--accent-bg, rgba(74,158,255,0.15))'
                        : 'transparent',
                      color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                    }}
                  >
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Stroke */}
          <div className="flex items-center gap-2">
            <span
              className={`${LW} flex-shrink-0 text-[11px]`}
              style={{ color: 'var(--text-secondary)' }}
            >
              Stroke
            </span>
            <div className="flex-1">
              <CompactInput
                label="W"
                value={webkitTextStrokeWidth}
                property="webkitTextStrokeWidth"
                onChange={handleChange}
                units={['px']}
                min={0}
              />
            </div>
            <div className="flex-1">
              <ColorInput
                value={webkitTextStrokeColor}
                property="webkitTextStrokeColor"
                onChange={handleChange}
                varExpression={cssVariableUsages['webkit-text-stroke-color']}
              />
            </div>
          </div>
        </div>
      )}

      {/* ===== US4: Text Shadows ===== */}

      <SectionHeader
        title="Text shadows"
        defaultOpen={false}
        actions={
          <button
            type="button"
            onClick={addShadow}
            className="flex items-center justify-center w-5 h-5 rounded hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
            title="Add text shadow"
          >
            <PlusIcon />
          </button>
        }
      >
        {shadows.map((shadow, i) => (
          <div
            key={i}
            className="space-y-1 pb-2"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-medium"
                style={{ color: 'var(--text-muted)' }}
              >
                Shadow {shadows.length > 1 ? i + 1 : ''}
              </span>
              <button
                type="button"
                onClick={() => removeShadow(i)}
                className="flex items-center justify-center w-5 h-5 rounded hover:opacity-80"
                style={{ color: 'var(--text-muted)' }}
                title="Remove"
              >
                <TrashIcon />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <CompactInput
                label="X"
                value={`${shadow.x}px`}
                property={`textShadow-${i}-x`}
                onChange={(_p, v) => {
                  const num = parseFloat(v)
                  if (!Number.isNaN(num)) updateShadow(i, { x: num })
                }}
                units={['px']}
              />
              <CompactInput
                label="Y"
                value={`${shadow.y}px`}
                property={`textShadow-${i}-y`}
                onChange={(_p, v) => {
                  const num = parseFloat(v)
                  if (!Number.isNaN(num)) updateShadow(i, { y: num })
                }}
                units={['px']}
              />
              <CompactInput
                label="B"
                value={`${shadow.blur}px`}
                property={`textShadow-${i}-blur`}
                onChange={(_p, v) => {
                  const num = parseFloat(v)
                  if (!Number.isNaN(num)) updateShadow(i, { blur: Math.max(0, num) })
                }}
                units={['px']}
                min={0}
              />
            </div>
            <ColorPicker
              label="Color"
              value={shadow.color}
              onChange={(c) => updateShadow(i, { color: c })}
              onSelectVariable={(varExpr) =>
                updateShadow(i, { color: varExpr })
              }
            />
          </div>
        ))}

        {shadows.length === 0 && (
          <div
            className="text-[11px] py-1"
            style={{ color: 'var(--text-muted)' }}
          >
            No text shadows
          </div>
        )}
      </SectionHeader>
    </SectionHeader>
  )
}

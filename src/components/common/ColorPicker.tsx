'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { sendViaIframe } from '@/hooks/usePostMessage'
import { useEditorStore } from '@/store'
import {
  filterColorVariables,
  toDisplayableColor,
} from '@/lib/cssVariableUtils'

// ─── Color Conversion Utilities ─────────────────────────────────

interface HSV {
  h: number
  s: number
  v: number
}
interface RGB {
  r: number
  g: number
  b: number
}

function hsvToRgb({ h, s, v }: HSV): RGB {
  const s1 = s / 100,
    v1 = v / 100
  const c = v1 * s1,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = v1 - c
  let r = 0,
    g = 0,
    b = 0
  if (h < 60) {
    r = c
    g = x
  } else if (h < 120) {
    r = x
    g = c
  } else if (h < 180) {
    g = c
    b = x
  } else if (h < 240) {
    g = x
    b = c
  } else if (h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

function rgbToHsv({ r, g, b }: RGB): HSV {
  const r1 = r / 255,
    g1 = g / 255,
    b1 = b / 255
  const max = Math.max(r1, g1, b1),
    min = Math.min(r1, g1, b1)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r1) h = 60 * (((g1 - b1) / d) % 6)
    else if (max === g1) h = 60 * ((b1 - r1) / d + 2)
    else h = 60 * ((r1 - g1) / d + 4)
  }
  if (h < 0) h += 360
  const s = max === 0 ? 0 : (d / max) * 100
  const v = max * 100
  return { h: Math.round(h), s: Math.round(s), v: Math.round(v) }
}

function rgbToHex({ r, g, b }: RGB): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

function hexToRgb(hex: string): RGB | null {
  const clean = hex.replace('#', '')
  let r: number, g: number, b: number
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16)
    g = parseInt(clean[1] + clean[1], 16)
    b = parseInt(clean[2] + clean[2], 16)
  } else if (clean.length >= 6) {
    r = parseInt(clean.slice(0, 2), 16)
    g = parseInt(clean.slice(2, 4), 16)
    b = parseInt(clean.slice(4, 6), 16)
  } else {
    return null
  }
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null
  return { r, g, b }
}

function parseColor(value: string): { rgb: RGB; alpha: number } {
  // Handle transparent keyword
  if (!value || value === 'transparent') {
    return { rgb: { r: 0, g: 0, b: 0 }, alpha: 0 }
  }
  // Handle rgba/rgb
  const rgbaMatch = value.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
  )
  if (rgbaMatch) {
    return {
      rgb: { r: +rgbaMatch[1], g: +rgbaMatch[2], b: +rgbaMatch[3] },
      alpha:
        rgbaMatch[4] !== undefined
          ? Math.round(parseFloat(rgbaMatch[4]) * 100)
          : 100,
    }
  }
  // Handle hex
  const rgb = hexToRgb(value)
  if (rgb) {
    // Check for 8-digit hex alpha
    const clean = value.replace('#', '')
    let alpha = 100
    if (clean.length === 8) {
      alpha = Math.round((parseInt(clean.slice(6, 8), 16) / 255) * 100)
    }
    return { rgb, alpha }
  }
  return { rgb: { r: 0, g: 0, b: 0 }, alpha: 100 }
}

function formatOutput(rgb: RGB, alpha: number): string {
  if (alpha < 100) {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(alpha / 100).toFixed(2)})`
  }
  return rgbToHex(rgb)
}

// ─── Canvas Drawing ─────────────────────────────────────────────

function drawSaturationBrightness(canvas: HTMLCanvasElement, hue: number) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return
  const w = canvas.width,
    h = canvas.height

  // Base hue color
  const hueRgb = hsvToRgb({ h: hue, s: 100, v: 100 })

  // White → hue horizontal gradient
  const gradH = ctx.createLinearGradient(0, 0, w, 0)
  gradH.addColorStop(0, '#ffffff')
  gradH.addColorStop(1, `rgb(${hueRgb.r},${hueRgb.g},${hueRgb.b})`)
  ctx.fillStyle = gradH
  ctx.fillRect(0, 0, w, h)

  // Transparent → black vertical gradient
  const gradV = ctx.createLinearGradient(0, 0, 0, h)
  gradV.addColorStop(0, 'rgba(0,0,0,0)')
  gradV.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.fillStyle = gradV
  ctx.fillRect(0, 0, w, h)
}

function drawHueSlider(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const grad = ctx.createLinearGradient(0, 0, w, 0)
  for (let i = 0; i <= 6; i++) {
    const hue = i * 60
    const rgb = hsvToRgb({ h: hue >= 360 ? 0 : hue, s: 100, v: 100 })
    grad.addColorStop(i / 6, `rgb(${rgb.r},${rgb.g},${rgb.b})`)
  }
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, canvas.height)
}

function drawAlphaSlider(canvas: HTMLCanvasElement, rgb: RGB) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width,
    h = canvas.height

  // Checkerboard background
  const size = 4
  for (let x = 0; x < w; x += size) {
    for (let y = 0; y < h; y += size) {
      ctx.fillStyle = (x / size + y / size) % 2 === 0 ? '#ccc' : '#fff'
      ctx.fillRect(x, y, size, size)
    }
  }

  // Alpha gradient
  const grad = ctx.createLinearGradient(0, 0, w, 0)
  grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`)
  grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},1)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
}

// ─── Pointer drag helper ────────────────────────────────────────

function usePointerDrag(onDrag: (x: number, y: number, rect: DOMRect) => void) {
  const ref = useRef<HTMLCanvasElement>(null)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      const el = ref.current
      if (!el) return
      el.setPointerCapture(e.pointerId)
      const rect = el.getBoundingClientRect()
      onDrag(e.clientX - rect.left, e.clientY - rect.top, rect)
    },
    [onDrag],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const el = ref.current
      if (!el || !el.hasPointerCapture(e.pointerId)) return
      const rect = el.getBoundingClientRect()
      onDrag(e.clientX - rect.left, e.clientY - rect.top, rect)
    },
    [onDrag],
  )

  return { ref, handlePointerDown, handlePointerMove }
}

// ─── Numeric scrub input ────────────────────────────────────────

function ScrubInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState('')
  const ref = useRef<HTMLSpanElement>(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startVal = useRef(0)

  const commit = useCallback(
    (raw: string) => {
      const n = parseInt(raw, 10)
      if (!Number.isNaN(n)) onChange(Math.max(min, Math.min(max, n)))
      setEditing(false)
    },
    [onChange, min, max],
  )

  return (
    <div className="flex flex-col items-center gap-0.5">
      {editing ? (
        <input
          type="text"
          inputMode="numeric"
          value={editVal}
          onChange={(e) => setEditVal(e.target.value)}
          onBlur={() => commit(editVal)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(editVal)
            if (e.key === 'Escape') setEditing(false)
          }}
          className="w-8 text-center text-[10px] bg-transparent border-none outline-none rounded"
          style={{
            color: 'var(--text-primary)',
            background: 'rgba(255,255,255,0.06)',
          }}
        />
      ) : (
        <span
          ref={ref}
          className="w-8 text-center text-[10px] select-none tabular-nums"
          style={{ color: 'var(--text-primary)', cursor: 'ew-resize' }}
          onDoubleClick={() => {
            setEditVal(String(value))
            setEditing(true)
          }}
          onPointerDown={(e) => {
            e.preventDefault()
            isDragging.current = true
            startX.current = e.clientX
            startVal.current = value
            ref.current?.setPointerCapture(e.pointerId)
            document.body.style.cursor = 'ew-resize'
            document.body.style.userSelect = 'none'
          }}
          onPointerMove={(e) => {
            if (!isDragging.current) return
            const delta = e.clientX - startX.current
            const mult = e.shiftKey ? 10 : 1
            const next = Math.max(
              min,
              Math.min(max, startVal.current + delta * mult),
            )
            onChange(Math.round(next))
          }}
          onPointerUp={(e) => {
            isDragging.current = false
            ref.current?.releasePointerCapture(e.pointerId)
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
          }}
        >
          {value}
        </span>
      )}
      <span
        className="text-[8px] uppercase"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </span>
    </div>
  )
}

// ─── Main ColorPicker ───────────────────────────────────────────

interface ColorPickerProps {
  value: string
  onChange: (value: string) => void
  onSelectVariable?: (varExpr: string) => void
  label?: string
}

export function ColorPicker({
  value,
  onChange,
  onSelectVariable,
  label,
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [varsOpen, setVarsOpen] = useState(false)
  const [varSearch, setVarSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // CSS variable definitions from store
  const definitions = useEditorStore((s) => s.cssVariableDefinitions)
  const colorVars = useMemo(
    () => filterColorVariables(definitions),
    [definitions],
  )
  const filteredColorVars = useMemo(() => {
    if (!varSearch) return colorVars
    const lower = varSearch.toLowerCase()
    const result: typeof colorVars = {}
    for (const [name, def] of Object.entries(colorVars)) {
      if (name.toLowerCase().includes(lower)) {
        result[name] = def
      }
    }
    return result
  }, [colorVars, varSearch])
  const hasColorVars = Object.keys(colorVars).length > 0

  // Parse incoming color
  const { rgb: initRgb, alpha: initAlpha } = parseColor(value)
  const initHsv = rgbToHsv(initRgb)

  const [hsv, setHsv] = useState<HSV>(initHsv)
  const [alpha, setAlpha] = useState(initAlpha)
  const [hexInput, setHexInput] = useState(rgbToHex(initRgb).slice(1))

  // Canvas refs
  const satCanvasRef = useRef<HTMLCanvasElement>(null)
  const hueCanvasRef = useRef<HTMLCanvasElement>(null)
  const alphaCanvasRef = useRef<HTMLCanvasElement>(null)

  // Sync incoming value
  useEffect(() => {
    const { rgb, alpha: a } = parseColor(value)
    const h = rgbToHsv(rgb)
    setHsv(h)
    setAlpha(a)
    setHexInput(rgbToHex(rgb).slice(1))
  }, [value])

  // Emit color
  const emit = useCallback(
    (h: HSV, a: number) => {
      const rgb = hsvToRgb(h)
      onChange(formatOutput(rgb, a))
    },
    [onChange],
  )

  // Draw canvases
  useEffect(() => {
    if (!isOpen) return
    if (satCanvasRef.current)
      drawSaturationBrightness(satCanvasRef.current, hsv.h)
  }, [isOpen, hsv.h])

  useEffect(() => {
    if (!isOpen) return
    if (hueCanvasRef.current) drawHueSlider(hueCanvasRef.current)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    if (alphaCanvasRef.current)
      drawAlphaSlider(alphaCanvasRef.current, hsvToRgb(hsv))
  }, [isOpen, hsv])

  // When the popover closes, commit any pending hex input that hasn't
  // been emitted yet (e.g., user typed a hex value and clicked outside
  // before blur fired). Also hide/show the selection overlay.
  const prevOpenRef = useRef(isOpen)
  useEffect(() => {
    if (isOpen) {
      sendViaIframe({ type: 'HIDE_SELECTION_OVERLAY' })
    } else {
      sendViaIframe({ type: 'SHOW_SELECTION_OVERLAY' })
      // Commit pending hex input on close
      if (prevOpenRef.current) {
        const currentHex = rgbToHex(hsvToRgb(hsv))
        const pendingHex = `#${hexInput}`
        if (pendingHex !== currentHex) {
          const rgb = hexToRgb(pendingHex)
          if (rgb) {
            const next = rgbToHsv(rgb)
            setHsv(next)
            emit(next, alpha)
          }
        }
      }
    }
    prevOpenRef.current = isOpen
  }, [isOpen, hsv, hexInput, alpha, emit])

  // Click outside
  useEffect(() => {
    if (!isOpen) return
    const handle = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [isOpen])

  // Saturation/brightness drag
  const satDrag = usePointerDrag(
    useCallback(
      (x: number, y: number, rect: DOMRect) => {
        const s = Math.round(Math.max(0, Math.min(100, (x / rect.width) * 100)))
        const v = Math.round(
          Math.max(0, Math.min(100, 100 - (y / rect.height) * 100)),
        )
        const next = { ...hsv, s, v }
        setHsv(next)
        setHexInput(rgbToHex(hsvToRgb(next)).slice(1))
        emit(next, alpha)
      },
      [hsv, alpha, emit],
    ),
  )

  // Hue drag
  const hueDrag = usePointerDrag(
    useCallback(
      (x: number, _y: number, rect: DOMRect) => {
        const h = Math.round(Math.max(0, Math.min(359, (x / rect.width) * 360)))
        const next = { ...hsv, h }
        setHsv(next)
        setHexInput(rgbToHex(hsvToRgb(next)).slice(1))
        emit(next, alpha)
      },
      [hsv, alpha, emit],
    ),
  )

  // Alpha drag
  const alphaDrag = usePointerDrag(
    useCallback(
      (x: number, _y: number, rect: DOMRect) => {
        const a = Math.round(Math.max(0, Math.min(100, (x / rect.width) * 100)))
        setAlpha(a)
        emit(hsv, a)
      },
      [hsv, emit],
    ),
  )

  // Hex commit
  const commitHex = useCallback(() => {
    const rgb = hexToRgb(`#${hexInput}`)
    if (rgb) {
      const next = rgbToHsv(rgb)
      setHsv(next)
      emit(next, alpha)
    } else {
      setHexInput(rgbToHex(hsvToRgb(hsv)).slice(1))
    }
  }, [hexInput, alpha, hsv, emit])

  // HSV numeric changes
  const updateH = useCallback(
    (h: number) => {
      const next = { ...hsv, h }
      setHsv(next)
      setHexInput(rgbToHex(hsvToRgb(next)).slice(1))
      emit(next, alpha)
    },
    [hsv, alpha, emit],
  )

  const updateS = useCallback(
    (s: number) => {
      const next = { ...hsv, s }
      setHsv(next)
      setHexInput(rgbToHex(hsvToRgb(next)).slice(1))
      emit(next, alpha)
    },
    [hsv, alpha, emit],
  )

  const updateV = useCallback(
    (v: number) => {
      const next = { ...hsv, v }
      setHsv(next)
      setHexInput(rgbToHex(hsvToRgb(next)).slice(1))
      emit(next, alpha)
    },
    [hsv, alpha, emit],
  )

  const updateA = useCallback(
    (a: number) => {
      setAlpha(a)
      emit(hsv, a)
    },
    [hsv, emit],
  )

  // Popover position
  useEffect(() => {
    if (!isOpen || !popoverRef.current || !containerRef.current) return
    const popover = popoverRef.current
    const trigger = containerRef.current
    const triggerRect = trigger.getBoundingClientRect()
    const popoverHeight = popover.offsetHeight

    // Check if there's enough space below
    const spaceBelow = window.innerHeight - triggerRect.bottom - 8
    if (spaceBelow < popoverHeight) {
      popover.style.bottom = '100%'
      popover.style.top = 'auto'
      popover.style.marginBottom = '4px'
      popover.style.marginTop = '0'
    } else {
      popover.style.top = '100%'
      popover.style.bottom = 'auto'
      popover.style.marginTop = '4px'
      popover.style.marginBottom = '0'
    }
  }, [isOpen])

  const currentRgb = hsvToRgb(hsv)
  const displayHex = alpha === 0 ? 'transparent' : rgbToHex(currentRgb)

  // Saturation/brightness cursor position
  const satCursorX = `${hsv.s}%`
  const satCursorY = `${100 - hsv.v}%`

  return (
    <div className="flex items-center gap-2" ref={containerRef}>
      {label && (
        <label
          className="text-[11px] w-16 flex-shrink-0 truncate"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </label>
      )}
      <div className="flex items-center gap-1 flex-1 relative">
        {/* Color swatch trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-6 h-6 rounded border flex-shrink-0"
          style={{
            background:
              alpha === 0
                ? `repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 8px 8px`
                : alpha < 100
                  ? `linear-gradient(${formatOutput(currentRgb, alpha)}, ${formatOutput(currentRgb, alpha)}), repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 8px 8px`
                  : displayHex,
            borderColor: 'var(--border)',
          }}
        />
        {/* Hex text input */}
        <input
          type="text"
          value={displayHex}
          onChange={(e) => {
            const v = e.target.value.replace('#', '')
            setHexInput(v)
            // Emit immediately when a valid 6-char hex is entered
            const clean = v.replace(/[^0-9a-fA-F]/g, '')
            if (clean.length === 6) {
              const rgb = hexToRgb(`#${clean}`)
              if (rgb) {
                const next = rgbToHsv(rgb)
                setHsv(next)
                emit(next, alpha)
              }
            }
          }}
          onBlur={() => {
            const rgb = hexToRgb(`#${hexInput}`)
            if (rgb) {
              const next = rgbToHsv(rgb)
              setHsv(next)
              emit(next, alpha)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitHex()
          }}
          className="flex-1 min-w-0 text-xs py-1 px-2"
          style={{
            color: 'var(--text-primary)',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            outline: 'none',
          }}
        />

        {/* ─── Popover ─────────────────────────────── */}
        {isOpen && (
          <div
            ref={popoverRef}
            className="absolute left-0 rounded-lg shadow-xl z-50"
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-secondary, #252525)',
              border: '1px solid var(--border)',
              width: '232px',
              padding: '8px',
            }}
          >
            {/* Saturation / Brightness area */}
            <div
              className="relative mb-2 rounded overflow-hidden"
              style={{ height: '140px' }}
            >
              <canvas
                ref={(el) => {
                  ;(
                    satDrag.ref as React.MutableRefObject<HTMLCanvasElement | null>
                  ).current = el
                  ;(
                    satCanvasRef as React.MutableRefObject<HTMLCanvasElement | null>
                  ).current = el
                }}
                width={216}
                height={140}
                className="w-full h-full cursor-crosshair block"
                onPointerDown={satDrag.handlePointerDown}
                onPointerMove={satDrag.handlePointerMove}
              />
              {/* Circle cursor */}
              <div
                className="absolute w-3.5 h-3.5 rounded-full border-2 border-white pointer-events-none"
                style={{
                  left: satCursorX,
                  top: satCursorY,
                  transform: 'translate(-50%, -50%)',
                  boxShadow: '0 0 2px rgba(0,0,0,0.6)',
                }}
              />
            </div>

            {/* Hue slider */}
            <div
              className="relative mb-1.5 rounded-full overflow-hidden"
              style={{ height: '10px' }}
            >
              <canvas
                ref={(el) => {
                  ;(
                    hueDrag.ref as React.MutableRefObject<HTMLCanvasElement | null>
                  ).current = el
                  ;(
                    hueCanvasRef as React.MutableRefObject<HTMLCanvasElement | null>
                  ).current = el
                }}
                width={216}
                height={10}
                className="w-full h-full cursor-pointer block"
                onPointerDown={hueDrag.handlePointerDown}
                onPointerMove={hueDrag.handlePointerMove}
              />
              <div
                className="absolute top-1/2 w-2.5 h-2.5 rounded-full border-2 border-white pointer-events-none"
                style={{
                  left: `${(hsv.h / 360) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  boxShadow: '0 0 2px rgba(0,0,0,0.4)',
                }}
              />
            </div>

            {/* Alpha slider */}
            <div
              className="relative mb-2 rounded-full overflow-hidden"
              style={{ height: '10px' }}
            >
              <canvas
                ref={(el) => {
                  ;(
                    alphaDrag.ref as React.MutableRefObject<HTMLCanvasElement | null>
                  ).current = el
                  ;(
                    alphaCanvasRef as React.MutableRefObject<HTMLCanvasElement | null>
                  ).current = el
                }}
                width={216}
                height={10}
                className="w-full h-full cursor-pointer block"
                onPointerDown={alphaDrag.handlePointerDown}
                onPointerMove={alphaDrag.handlePointerMove}
              />
              <div
                className="absolute top-1/2 w-2.5 h-2.5 rounded-full border-2 border-white pointer-events-none"
                style={{
                  left: `${alpha}%`,
                  transform: 'translate(-50%, -50%)',
                  boxShadow: '0 0 2px rgba(0,0,0,0.4)',
                }}
              />
            </div>

            {/* Hex input row */}
            <div className="flex items-center gap-1 mb-1.5">
              <div
                className="flex items-center flex-1 h-6 rounded overflow-hidden"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                }}
              >
                <span
                  className="flex-shrink-0 px-1.5 text-[10px] h-full flex items-center"
                  style={{
                    color: 'var(--text-muted)',
                    borderRight: '1px solid var(--border)',
                  }}
                >
                  #
                </span>
                <input
                  type="text"
                  value={hexInput}
                  onChange={(e) =>
                    setHexInput(
                      e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6),
                    )
                  }
                  onBlur={commitHex}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitHex()
                  }}
                  className="flex-1 min-w-0 h-full px-1 text-[10px] bg-transparent border-none outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            {/* HSB + A numeric inputs */}
            <div className="flex items-center justify-between px-1">
              <ScrubInput
                label="H"
                value={hsv.h}
                min={0}
                max={359}
                onChange={updateH}
              />
              <ScrubInput
                label="S"
                value={hsv.s}
                min={0}
                max={100}
                onChange={updateS}
              />
              <ScrubInput
                label="B"
                value={hsv.v}
                min={0}
                max={100}
                onChange={updateV}
              />
              <ScrubInput
                label="A"
                value={alpha}
                min={0}
                max={100}
                onChange={updateA}
              />
            </div>

            {/* ─── Variables section ─────────────────── */}
            {hasColorVars && (
              <div
                className="mt-2"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <button
                  type="button"
                  onClick={() => setVarsOpen(!varsOpen)}
                  className="w-full flex items-center justify-between py-1.5 px-0.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span className="text-[10px] font-medium">Variables</span>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    className={`transition-transform ${varsOpen ? 'rotate-180' : ''}`}
                    style={{ fill: 'var(--text-muted)' }}
                  >
                    <path
                      d="M2 3.5L5 6.5L8 3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                </button>

                {varsOpen && (
                  <div>
                    {/* Search */}
                    <input
                      type="text"
                      placeholder="Filter variables..."
                      value={varSearch}
                      onChange={(e) => setVarSearch(e.target.value)}
                      className="w-full text-[10px] py-1 px-1.5 rounded mb-1"
                      style={{
                        background: 'var(--bg-primary, #1e1e1e)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                    />

                    {/* Scrollable list */}
                    <div
                      className="overflow-y-auto"
                      style={{ maxHeight: '140px' }}
                    >
                      {Object.entries(filteredColorVars).length === 0 && (
                        <div
                          className="text-[10px] px-1 py-2 text-center"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          No matching variables
                        </div>
                      )}
                      {Object.entries(filteredColorVars).map(([name, def]) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            const expr = `var(${name})`
                            if (onSelectVariable) {
                              onSelectVariable(expr)
                            } else {
                              onChange(expr)
                            }
                            setIsOpen(false)
                            setVarsOpen(false)
                            setVarSearch('')
                          }}
                          className="w-full flex items-center gap-1.5 px-1 py-1 rounded text-[10px] hover:opacity-80"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          <div
                            className="w-3.5 h-3.5 rounded border flex-shrink-0"
                            style={{
                              background: toDisplayableColor(def.resolvedValue),
                              borderColor: 'var(--border)',
                            }}
                          />
                          <span className="truncate">{name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

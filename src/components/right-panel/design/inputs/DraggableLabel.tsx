'use client'

import { useRef, useCallback } from 'react'
import { parseCSSValue, formatCSSValue } from '@/lib/utils'

interface DraggableLabelProps {
  children: React.ReactNode
  /** Current CSS value, e.g. "26.875px" */
  value: string
  property: string
  onChange: (property: string, value: string) => void
  step?: number
  min?: number
  max?: number
  className?: string
  style?: React.CSSProperties
}

/**
 * A label that supports Figma-style drag-to-scrub.
 * Drag left/right to decrement/increment the numeric value.
 * Hold Shift for 10x, Alt/Option for 0.1x.
 */
export function DraggableLabel({
  children,
  value,
  property,
  onChange,
  step = 1,
  min,
  max,
  className,
  style,
}: DraggableLabelProps) {
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartValue = useRef(0)
  const unitRef = useRef('px')

  const clamp = useCallback(
    (num: number) => {
      let v = num
      if (min !== undefined) v = Math.max(v, min)
      if (max !== undefined) v = Math.min(v, max)
      return v
    },
    [min, max],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const parsed = parseCSSValue(value)
      if (
        value === 'auto' ||
        value === 'none' ||
        value === 'normal' ||
        isNaN(parsed.number)
      )
        return

      e.preventDefault()
      isDragging.current = true
      dragStartX.current = e.clientX
      dragStartValue.current = parsed.number
      unitRef.current = parsed.unit || 'px'

      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      document.body.style.cursor = 'ew-resize'
      document.body.style.userSelect = 'none'
    },
    [value],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return
      const delta = e.clientX - dragStartX.current
      const multiplier = e.shiftKey ? 10 : e.altKey ? 0.1 : 1
      const next = clamp(
        Math.round((dragStartValue.current + delta * step * multiplier) * 100) /
          100,
      )
      onChange(property, formatCSSValue(next, unitRef.current))
    },
    [step, clamp, onChange, property],
  )

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    isDragging.current = false
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  const parsed = parseCSSValue(value)
  const isDraggable =
    value !== 'auto' &&
    value !== 'none' &&
    value !== 'normal' &&
    !isNaN(parsed.number)

  return (
    <span
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={className}
      style={{
        cursor: isDraggable ? 'ew-resize' : 'default',
        userSelect: 'none',
        ...style,
      }}
    >
      {children}
    </span>
  )
}

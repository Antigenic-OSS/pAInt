'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { parseCSSValue, formatCSSValue } from '@/lib/utils'
import { useEditorStore } from '@/store'

interface CompactInputProps {
  label?: string
  placeholder?: string
  value: string
  property: string
  onChange: (property: string, value: string) => void
  onReset?: (property: string) => void
  units?: string[]
  min?: number
  max?: number
  step?: number
  className?: string
}

export function CompactInput({
  label,
  placeholder,
  value,
  property,
  onChange,
  onReset,
  units = ['px', '%', 'em', 'rem', 'auto'],
  min,
  max,
  step = 1,
  className,
}: CompactInputProps) {
  const parsed = parseCSSValue(value)
  const [localValue, setLocalValue] = useState(
    value === 'auto' ? '' : String(parsed.number),
  )
  const [unit, setUnit] = useState(
    value === 'auto' ? 'auto' : parsed.unit || 'px',
  )
  const inputRef = useRef<HTMLInputElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const unitBtnRef = useRef<HTMLButtonElement>(null)
  const unitPopoverRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const [showUnits, setShowUnits] = useState(false)
  const dragStartX = useRef(0)
  const dragStartValue = useRef(0)

  // Check if this property has a tracked change (modified from original)
  const hasChange = useEditorStore((s) => {
    const sp = s.selectorPath
    return sp
      ? s.styleChanges.some(
          (c) => c.elementSelector === sp && c.property === property,
        )
      : false
  })

  const handleDoubleClick = useCallback(() => {
    if (unit === 'auto') return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [unit])

  // Close unit popover on outside click
  useEffect(() => {
    if (!showUnits) return
    const handler = (e: MouseEvent) => {
      if (
        unitBtnRef.current &&
        !unitBtnRef.current.contains(e.target as Node) &&
        unitPopoverRef.current &&
        !unitPopoverRef.current.contains(e.target as Node)
      ) {
        setShowUnits(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showUnits])

  useEffect(() => {
    if (value === 'auto') {
      setLocalValue('')
      setUnit('auto')
    } else {
      const p = parseCSSValue(value)
      setLocalValue(String(p.number))
      setUnit(p.unit || 'px')
    }
  }, [value])

  const clampValue = useCallback(
    (num: number): number => {
      let clamped = num
      if (min !== undefined) clamped = Math.max(clamped, min)
      if (max !== undefined) clamped = Math.min(clamped, max)
      return clamped
    },
    [min, max],
  )

  // --- Figma-style drag-to-scrub on label ---
  const handleLabelPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (unit === 'auto') return
      e.preventDefault()
      isDragging.current = true
      dragStartX.current = e.clientX
      dragStartValue.current = parseFloat(localValue || '0')

      const labelEl = labelRef.current
      if (labelEl) labelEl.setPointerCapture(e.pointerId)

      document.body.style.cursor = 'ew-resize'
      document.body.style.userSelect = 'none'
    },
    [localValue, unit],
  )

  const handleLabelPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return
      const delta = e.clientX - dragStartX.current
      // Base: 2 per pixel. Shift = 10x, Alt/Option = 0.1x
      const multiplier = e.shiftKey ? 10 : e.altKey ? 0.1 : 1
      const next = clampValue(
        Math.round(
          (dragStartValue.current + delta * 2 * step * multiplier) * 100,
        ) / 100,
      )
      const nextStr = String(next)
      setLocalValue(nextStr)
      onChange(property, formatCSSValue(next, unit))
    },
    [step, clampValue, onChange, property, unit],
  )

  const handleLabelPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    isDragging.current = false

    const labelEl = labelRef.current
    if (labelEl) labelEl.releasePointerCapture(e.pointerId)

    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  const commit = useCallback(
    (num: string, u: string) => {
      if (u === 'auto') {
        onChange(property, 'auto')
      } else {
        const n = parseFloat(num)
        if (!isNaN(n)) {
          const clamped = clampValue(n)
          onChange(property, formatCSSValue(clamped, u))
        }
      }
    },
    [onChange, property, clampValue],
  )

  const selectUnit = useCallback(
    (nextUnit: string) => {
      setUnit(nextUnit)
      setShowUnits(false)

      if (nextUnit === 'auto') {
        setLocalValue('')
        onChange(property, 'auto')
      } else {
        const num = parseFloat(localValue || '0')
        if (!isNaN(num)) {
          const clamped = clampValue(num)
          setLocalValue(String(clamped))
          onChange(property, formatCSSValue(clamped, nextUnit))
        }
      }
    },
    [localValue, onChange, property, clampValue],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        commit(localValue, unit)
        inputRef.current?.blur()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const increment = e.shiftKey ? step * 10 : step
        const next = clampValue(parseFloat(localValue || '0') + increment)
        const nextStr = String(next)
        setLocalValue(nextStr)
        commit(nextStr, unit)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        const decrement = e.shiftKey ? step * 10 : step
        const next = clampValue(parseFloat(localValue || '0') - decrement)
        const nextStr = String(next)
        setLocalValue(nextStr)
        commit(nextStr, unit)
      }
    },
    [localValue, unit, step, commit, clampValue],
  )

  const isAuto = unit === 'auto'

  return (
    <div className={`relative ${className ?? ''}`}>
      <div
        className="flex items-center h-6 rounded overflow-hidden"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border)',
        }}
      >
        {label && (
          <span
            ref={labelRef}
            onPointerDown={handleLabelPointerDown}
            onPointerMove={handleLabelPointerMove}
            onPointerUp={handleLabelPointerUp}
            onDoubleClick={handleDoubleClick}
            className="relative flex-shrink-0 flex items-center justify-center w-6 h-full text-[11px] select-none"
            style={{
              color: hasChange ? 'var(--accent)' : 'var(--text-secondary)',
              borderRight: '1px solid var(--border)',
              cursor: isAuto ? 'default' : 'ew-resize',
            }}
            title={hasChange ? 'Double-click to reset' : undefined}
          >
            {label}
            {hasChange && (
              <span
                className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                style={{ background: 'var(--accent)' }}
              />
            )}
          </span>
        )}

        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={isAuto ? 'auto' : localValue}
          placeholder={placeholder}
          onChange={(e) => {
            if (!isAuto) {
              setLocalValue(e.target.value)
            }
          }}
          onBlur={() => commit(localValue, unit)}
          onKeyDown={handleKeyDown}
          disabled={isAuto}
          className="flex-1 min-w-0 h-full px-1.5 text-[11px] bg-transparent border-none outline-none"
          style={{
            color: 'var(--text-primary)',
            opacity: isAuto ? 0.5 : 1,
          }}
        />

        <button
          ref={unitBtnRef}
          type="button"
          onClick={() => setShowUnits(!showUnits)}
          className="flex-shrink-0 flex items-center justify-center h-6 px-1.5 text-[11px] cursor-pointer select-none hover:opacity-80 bg-transparent border-none outline-none gap-0.5"
          style={{
            color: 'var(--text-secondary)',
            borderLeft: '1px solid var(--border)',
          }}
        >
          {unit}
          <svg
            width={6}
            height={6}
            viewBox="0 0 6 6"
            fill="none"
            style={{ opacity: 0.5 }}
          >
            <path
              d="M1 2l2 2 2-2"
              stroke="currentColor"
              strokeWidth={1}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {showUnits && (
        <div
          ref={unitPopoverRef}
          className="absolute z-50 right-0 mt-1 rounded-md overflow-hidden shadow-lg"
          style={{
            background: '#252525',
            border: '1px solid var(--border)',
            minWidth: 56,
            top: '100%',
          }}
        >
          {units.map((u) => {
            const isActive = u === unit
            return (
              <button
                key={u}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  selectUnit(u)
                }}
                className="flex items-center w-full px-2.5 py-1 text-[11px] transition-colors"
                style={{
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  background: isActive
                    ? 'rgba(74, 158, 255, 0.08)'
                    : 'transparent',
                }}
              >
                {u}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

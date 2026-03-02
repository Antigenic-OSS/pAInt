'use client'

import { useState, useCallback, useEffect } from 'react'
import { parseCSSValue, formatCSSValue } from '@/lib/utils'

interface UnitInputProps {
  value: string
  onChange: (value: string) => void
  units?: string[]
  placeholder?: string
}

export function UnitInput({
  value,
  onChange,
  units = ['px', '%', 'em', 'rem', 'auto'],
  placeholder = '0',
}: UnitInputProps) {
  const parsed = parseCSSValue(value)
  const [localValue, setLocalValue] = useState(String(parsed.number))
  const [unit, setUnit] = useState(parsed.unit || 'px')

  useEffect(() => {
    const p = parseCSSValue(value)
    setLocalValue(String(p.number))
    setUnit(p.unit || 'px')
  }, [value])

  const commit = useCallback(
    (num: string, u: string) => {
      if (u === 'auto') {
        onChange('auto')
      } else {
        const n = parseFloat(num)
        if (!Number.isNaN(n)) onChange(formatCSSValue(n, u))
      }
    },
    [onChange],
  )

  return (
    <div className="flex gap-1">
      <input
        type="number"
        value={unit === 'auto' ? '' : localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => commit(localValue, unit)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(localValue, unit)
        }}
        disabled={unit === 'auto'}
        placeholder={placeholder}
        className="flex-1 min-w-0 text-xs py-1 px-2"
        style={{ opacity: unit === 'auto' ? 0.5 : 1 }}
      />
      <select
        value={unit}
        onChange={(e) => {
          setUnit(e.target.value)
          commit(localValue, e.target.value)
        }}
        className="w-14 text-[11px] py-1 px-1 rounded"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
        }}
      >
        {units.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
    </div>
  )
}

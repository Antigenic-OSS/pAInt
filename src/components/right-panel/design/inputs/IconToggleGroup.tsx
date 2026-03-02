'use client'

import type React from 'react'

interface IconToggleOption {
  value: string
  icon: React.ReactNode
  tooltip?: string
}

interface IconToggleGroupProps {
  options: IconToggleOption[]
  value: string
  onChange: (value: string) => void
}

export function IconToggleGroup({
  options,
  value,
  onChange,
}: IconToggleGroupProps) {
  return (
    <div
      className="inline-flex rounded"
      style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
      }}
    >
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            title={option.tooltip}
            onClick={() => onChange(option.value)}
            className="flex items-center justify-center transition-colors"
            style={{
              width: 24,
              height: 24,
              background: isActive
                ? 'var(--accent-bg, rgba(74,158,255,0.15))'
                : 'transparent',
              color: isActive ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            {option.icon}
          </button>
        )
      })}
    </div>
  )
}

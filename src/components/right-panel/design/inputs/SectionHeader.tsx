'use client'

import type React from 'react'
import { useState } from 'react'

interface SectionHeaderProps {
  title: string
  defaultOpen?: boolean
  actions?: React.ReactNode
  children: React.ReactNode
  hasChanges?: boolean
  onReset?: () => void
}

export function SectionHeader({
  title,
  defaultOpen = true,
  actions,
  children,
  hasChanges,
  onReset,
}: SectionHeaderProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsOpen(!isOpen)
          }
        }}
        className="flex items-center justify-between w-full px-3 py-3 text-sm font-semibold hover:bg-[var(--bg-hover)] transition-colors cursor-pointer select-none"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span className="flex items-center">
          <span
            className="mr-2 text-[10px] transition-transform"
            style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          >
            ▼
          </span>
          {title}
          {hasChanges && (
            <span
              className="ml-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: 'var(--accent)' }}
            />
          )}
        </span>
        <span
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1"
        >
          {hasChanges && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="text-[9px] px-1.5 py-0.5 rounded hover:opacity-80"
              style={{
                color: '#f87171',
                background: 'rgba(248, 113, 113, 0.10)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          )}
          {actions}
        </span>
      </div>
      {isOpen && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  )
}

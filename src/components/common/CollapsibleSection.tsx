'use client'

import { useState } from 'react'

interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center w-full px-3 py-2 text-xs font-medium hover:bg-[var(--bg-hover)] transition-colors"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span
          className="mr-2 text-[10px] transition-transform"
          style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        >
          ▼
        </span>
        {title}
      </button>
      {isOpen && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  )
}

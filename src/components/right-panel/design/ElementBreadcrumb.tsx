'use client'

import { useEditorStore } from '@/store'

export function ElementBreadcrumb() {
  const selectorPath = useEditorStore((state) => state.selectorPath)

  if (!selectorPath) {
    return (
      <div
        className="px-3 py-2 text-xs"
        style={{
          borderBottom: '1px solid var(--border)',
          color: 'var(--text-muted)',
        }}
      >
        No element selected
      </div>
    )
  }

  // Parse the selector path to extract individual elements
  const parts = selectorPath.split(' > ').map((part) => part.trim())

  return (
    <div
      className="px-3 py-2 text-xs flex items-center gap-1 overflow-x-auto"
      style={{
        borderBottom: '1px solid var(--border)',
        color: 'var(--text-secondary)',
      }}
    >
      {parts.map((part, index) => (
        <span key={index} className="flex items-center gap-1 flex-shrink-0">
          {index > 0 && <span style={{ color: 'var(--text-muted)' }}>›</span>}
          <span
            className="hover:underline cursor-pointer"
            style={{
              color:
                index === parts.length - 1
                  ? 'var(--accent)'
                  : 'var(--text-secondary)',
            }}
          >
            {part}
          </span>
        </span>
      ))}
    </div>
  )
}

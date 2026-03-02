'use client'

import { useEditorStore } from '@/store'
import { SectionHeader } from '@/components/right-panel/design/inputs/SectionHeader'

export function PropertiesSection() {
  const tagName = useEditorStore((s) => s.tagName)
  const elementId = useEditorStore((s) => s.elementId)
  const className = useEditorStore((s) => s.className)
  const attributes = useEditorStore((s) => s.attributes)

  const classes = className ? className.split(/\s+/).filter(Boolean) : []
  const attrEntries = Object.entries(attributes).filter(
    ([key]) => key !== 'class' && key !== 'id' && key !== 'style',
  )

  return (
    <SectionHeader title="Properties" defaultOpen={false}>
      <div className="space-y-2 font-mono text-[11px]">
        {/* Tag name */}
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--text-secondary)' }}>Tag</span>
          <span style={{ color: 'var(--text-primary)' }}>{tagName || '—'}</span>
        </div>

        {/* Element ID */}
        {elementId && (
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--text-secondary)' }}>ID</span>
            <span style={{ color: 'var(--accent)' }}>#{elementId}</span>
          </div>
        )}

        {/* Classes */}
        {classes.length > 0 && (
          <div>
            <span
              className="block mb-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              Classes
            </span>
            <div className="flex flex-wrap gap-1">
              {classes.map((cls, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 rounded text-[10px]"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  .{cls}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Attributes */}
        {attrEntries.length > 0 && (
          <div>
            <span
              className="block mb-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              Attributes
            </span>
            <div className="space-y-0.5">
              {attrEntries.map(([key, value]) => (
                <div key={key}>
                  <span style={{ color: 'var(--accent)' }}>{key}</span>
                  <span style={{ color: 'var(--text-muted)' }}>=</span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    &quot;{value}&quot;
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionHeader>
  )
}

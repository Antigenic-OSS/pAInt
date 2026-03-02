'use client'

import { useMemo } from 'react'
import { useEditorStore } from '@/store'
import { DiffCard } from './DiffCard'

export function DiffViewer() {
  const parsedDiffs = useEditorStore((s) => s.parsedDiffs)

  const summary = useMemo(() => {
    const totalFiles = parsedDiffs.length
    let totalAdded = 0
    let totalRemoved = 0
    for (const diff of parsedDiffs) {
      totalAdded += diff.linesAdded
      totalRemoved += diff.linesRemoved
    }
    return { totalFiles, totalAdded, totalRemoved }
  }, [parsedDiffs])

  if (parsedDiffs.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-6 text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        No diffs to display
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Summary header */}
      <div
        className="flex items-center justify-between px-3 py-2 rounded text-xs"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        <span style={{ color: 'var(--text-secondary)' }}>
          {summary.totalFiles} file{summary.totalFiles !== 1 ? 's' : ''} changed
        </span>
        <div className="flex items-center gap-3">
          <span style={{ color: 'var(--success)' }}>+{summary.totalAdded}</span>
          <span style={{ color: 'var(--error)' }}>-{summary.totalRemoved}</span>
        </div>
      </div>

      {/* Diff cards */}
      {parsedDiffs.map((diff, idx) => (
        <DiffCard key={`${diff.filePath}-${idx}`} diff={diff} />
      ))}
    </div>
  )
}

'use client';

import type { StyleChange } from '@/types/changelog';

interface StyleChangeEntryProps {
  change: StyleChange;
  onUndo: (id: string, selectorPath: string, property: string) => void;
}

export function ChangeEntry({ change, onUndo }: StyleChangeEntryProps) {
  return (
    <div
      className="flex items-center gap-2 py-1.5 px-2 rounded text-xs group hover:bg-[var(--bg-hover)] transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span style={{ color: 'var(--accent)' }}>{change.property}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span
            className="truncate max-w-[80px] line-through"
            style={{ color: 'var(--text-muted)' }}
          >
            {change.originalValue || '(none)'}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <span className="truncate max-w-[80px]" style={{ color: 'var(--success)' }}>
            {change.newValue}
          </span>
        </div>
      </div>
      <button
        onClick={() => onUndo(change.id, change.elementSelector, change.property)}
        className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 text-[10px] rounded transition-opacity"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border)',
        }}
        title="Undo this change"
      >
        Undo
      </button>
    </div>
  );
}

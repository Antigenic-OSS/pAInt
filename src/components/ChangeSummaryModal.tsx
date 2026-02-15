'use client';

import { useState } from 'react';
import { useEditorStore } from '@/store';
import { BREAKPOINT_LABELS } from '@/types/changelog';
import type { Breakpoint, StyleChange } from '@/types/changelog';

interface ChangeSummaryModalProps {
  onClose: () => void;
}

const BREAKPOINT_ORDER: Breakpoint[] = ['desktop', 'tablet', 'mobile'];

export function ChangeSummaryModal({ onClose }: ChangeSummaryModalProps) {
  const styleChanges = useEditorStore((s) => s.styleChanges);
  const elementSnapshots = useEditorStore((s) => s.elementSnapshots);

  // Group changes by breakpoint
  const grouped = BREAKPOINT_ORDER.reduce<Record<Breakpoint, StyleChange[]>>(
    (acc, bp) => {
      acc[bp] = styleChanges.filter((c) => c.breakpoint === bp);
      return acc;
    },
    { desktop: [], tablet: [], mobile: [] }
  );

  // Track which sections are collapsed
  const [collapsed, setCollapsed] = useState<Record<Breakpoint, boolean>>({
    desktop: false,
    tablet: false,
    mobile: false,
  });

  const toggleSection = (bp: Breakpoint) => {
    setCollapsed((prev) => ({ ...prev, [bp]: !prev[bp] }));
  };

  // Resolve the page path for an element selector
  const getPagePath = (selector: string): string => {
    const snap = elementSnapshots[selector];
    return snap?.pagePath || '/';
  };

  // Group changes within a breakpoint by element selector
  const groupByElement = (changes: StyleChange[]) => {
    const map = new Map<string, StyleChange[]>();
    for (const c of changes) {
      const existing = map.get(c.elementSelector) || [];
      existing.push(c);
      map.set(c.elementSelector, existing);
    }
    return map;
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-[420px] max-h-[80vh] flex flex-col rounded-lg shadow-2xl"
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Summary of Changes
            </span>
          </div>
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            {styleChanges.length} change{styleChanges.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {styleChanges.length === 0 ? (
            <div
              className="text-xs text-center py-6"
              style={{ color: 'var(--text-muted)' }}
            >
              No changes tracked yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {BREAKPOINT_ORDER.map((bp) => {
                const changes = grouped[bp];
                if (changes.length === 0) return null;

                const elementGroups = groupByElement(changes);

                return (
                  <div key={bp}>
                    {/* Section header */}
                    <button
                      onClick={() => toggleSection(bp)}
                      className="w-full flex items-center justify-between py-1.5 group"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-semibold"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {BREAKPOINT_LABELS[bp]}
                        </span>
                        <span
                          className="text-[11px] px-1.5 py-0.5 rounded"
                          style={{
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {changes.length}
                        </span>
                      </div>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--text-muted)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-transform"
                        style={{
                          transform: collapsed[bp] ? 'rotate(-90deg)' : 'rotate(0deg)',
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {/* Divider */}
                    <div
                      className="h-px mb-2"
                      style={{ background: 'var(--border)' }}
                    />

                    {/* Changes list */}
                    {!collapsed[bp] && (
                      <div className="flex flex-col gap-2 mb-2">
                        {Array.from(elementGroups.entries()).map(
                          ([selector, elChanges]) => (
                            <div
                              key={selector}
                              className="rounded px-3 py-2"
                              style={{ background: 'var(--bg-tertiary)' }}
                            >
                              {/* Page path */}
                              <div
                                className="text-[10px] truncate mb-0.5"
                                style={{ color: 'var(--text-muted)' }}
                                title={getPagePath(selector)}
                              >
                                {getPagePath(selector)}
                              </div>
                              {/* Element selector */}
                              <div
                                className="text-[11px] font-mono truncate mb-1.5"
                                style={{ color: 'var(--accent)' }}
                                title={selector}
                              >
                                {selector}
                              </div>
                              {/* Properties */}
                              <div className="flex flex-col gap-1">
                                {elChanges.map((change) => (
                                  <div
                                    key={change.id}
                                    className="flex items-baseline gap-1.5 text-[11px] font-mono"
                                  >
                                    <span
                                      style={{ color: 'var(--text-secondary)' }}
                                    >
                                      {change.property}:
                                    </span>
                                    <span
                                      className="truncate"
                                      style={{ color: 'var(--text-muted)' }}
                                      title={change.originalValue}
                                    >
                                      &quot;{change.originalValue}&quot;
                                    </span>
                                    <span style={{ color: 'var(--text-muted)' }}>
                                      &rarr;
                                    </span>
                                    <span
                                      className="truncate"
                                      style={{ color: 'var(--success)' }}
                                      title={change.newValue}
                                    >
                                      &quot;{change.newValue}&quot;
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end px-4 py-3 flex-shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-medium transition-colors"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

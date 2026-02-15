'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '@/store';
import type { ConsoleLevel } from '@/types/messages';

const LEVEL_CONFIG: Record<ConsoleLevel, { icon: string; bgTint: string; color: string }> = {
  error: { icon: '\u2718', bgTint: 'rgba(248,113,113,0.1)', color: 'var(--error)' },
  warn:  { icon: '\u26A0', bgTint: 'rgba(251,191,36,0.1)',  color: 'var(--warning)' },
  info:  { icon: '\u24D8', bgTint: 'rgba(74,158,255,0.08)',  color: 'var(--accent)' },
  log:   { icon: '\u25CB', bgTint: 'transparent',             color: 'var(--text-secondary)' },
};

type FilterLevel = 'all' | ConsoleLevel;

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function ConsolePanel() {
  const entries = useEditorStore((s) => s.consoleEntries);
  const clearConsole = useEditorStore((s) => s.clearConsole);
  const [filter, setFilter] = useState<FilterLevel>('all');
  const listRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);

  const filtered = filter === 'all' ? entries : entries.filter((e) => e.level === filter);
  const errorCount = entries.filter((e) => e.level === 'error').length;

  // Auto-scroll to bottom unless user scrolled up
  useEffect(() => {
    if (!userScrolledUp.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [filtered.length]);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    userScrolledUp.current = !atBottom;
  }, []);

  const copyErrors = useCallback(() => {
    const errors = entries.filter((e) => e.level === 'error');
    if (errors.length === 0) return;
    const text = errors.map((e) => {
      const ts = new Date(e.timestamp).toISOString();
      const loc = e.source ? ` (${e.source}${e.line != null ? ':' + e.line : ''}${e.column != null ? ':' + e.column : ''})` : '';
      return `[${ts}] ERROR${loc}: ${e.args.join(' ')}`;
    }).join('\n');
    navigator.clipboard.writeText(text);
  }, [entries]);

  const filters: { id: FilterLevel; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'error', label: 'Errors' },
    { id: 'warn', label: 'Warnings' },
    { id: 'info', label: 'Info' },
    { id: 'log', label: 'Logs' },
  ];

  return (
    <div className="flex flex-col h-full" style={{ color: 'var(--text-primary)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {filtered.length} message{filtered.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-1.5">
          {errorCount > 0 && (
            <button
              onClick={copyErrors}
              className="px-2 py-0.5 rounded text-[10px] font-medium"
              style={{ background: 'var(--error)', color: '#fff' }}
            >
              Copy Errors ({errorCount})
            </button>
          )}
          <button
            onClick={clearConsole}
            className="px-2 py-0.5 rounded text-[10px] font-medium"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div
        className="flex items-center gap-1 px-3 py-1.5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors"
            style={{
              background: filter === f.id ? 'var(--accent)' : 'var(--bg-input)',
              color: filter === f.id ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Message list */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              No console messages captured
            </span>
          </div>
        ) : (
          filtered.map((entry) => {
            const cfg = LEVEL_CONFIG[entry.level];
            return (
              <div
                key={entry.id}
                className="flex items-start gap-2 px-3 py-1 text-[11px]"
                style={{
                  background: cfg.bgTint,
                  borderBottom: '1px solid var(--border)',
                  fontFamily: 'monospace',
                }}
              >
                <span style={{ color: cfg.color, flexShrink: 0, width: 14, textAlign: 'center' }}>
                  {cfg.icon}
                </span>
                <span className="flex-1 break-all" style={{ color: 'var(--text-primary)' }}>
                  {entry.args.join(' ')}
                </span>
                <span className="flex-shrink-0 flex flex-col items-end gap-0.5">
                  <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                    {formatTime(entry.timestamp)}
                  </span>
                  {entry.source && (
                    <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>
                      {entry.source.split('/').pop()}
                      {entry.line != null ? ':' + entry.line : ''}
                      {entry.column != null ? ':' + entry.column : ''}
                    </span>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

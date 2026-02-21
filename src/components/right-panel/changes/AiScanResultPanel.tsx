'use client';

import { useState, useCallback } from 'react';
import type { ClaudeScanResponse } from '@/types/claude';

function ChevronIcon({ open, size = 10 }: { open: boolean; size?: number }) {
  return (
    <span
      className="inline-block transition-transform"
      style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', fontSize: `${size}px` }}
    >
      ▼
    </span>
  );
}

function CopyIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CloseIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SendIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);
  return { copied, copy };
}

export function AiScanResultPanel({
  result,
  onDismiss,
  onSendToClaudeCode,
}: {
  result: ClaudeScanResponse;
  onDismiss: () => void;
  onSendToClaudeCode: (prompt: string) => void;
}) {
  const [promptText, setPromptText] = useState(result.smartPrompt);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const { copied, copy } = useCopy();

  const toggleGroup = useCallback((index: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  return (
    <div
      className="flex flex-col"
      style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-primary)',
      }}
    >
      {/* Header: Intent + dismiss */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0"
            style={{
              background: 'rgba(168, 85, 247, 0.12)',
              color: '#a855f7',
              border: '1px solid rgba(168, 85, 247, 0.25)',
            }}
          >
            AI Scan
          </span>
          <span
            className="text-[11px] truncate"
            style={{ color: 'var(--text-secondary)' }}
          >
            {result.intent}
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-0.5 rounded transition-colors hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-muted)' }}
          title="Dismiss scan results"
        >
          <CloseIcon size={12} />
        </button>
      </div>

      {/* Groups */}
      {result.groups.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--border)' }}>
          {result.groups.map((group, i) => (
            <div key={i}>
              <div
                onClick={() => toggleGroup(i)}
                className="flex items-center gap-2 px-3 py-1.5 text-[11px] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleGroup(i); } }}
              >
                <ChevronIcon open={expandedGroups.has(i)} />
                <span style={{ color: 'var(--text-primary)' }}>{group.label}</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {group.changeCount} change{group.changeCount !== 1 ? 's' : ''}
                </span>
              </div>
              {expandedGroups.has(i) && group.suggestedFiles.length > 0 && (
                <div className="pl-7 pr-3 pb-1.5">
                  {group.suggestedFiles.map((file) => (
                    <div
                      key={file}
                      className="text-[10px] font-mono truncate"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {file}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div
          className="mx-3 mt-2 px-2 py-1.5 rounded text-[11px]"
          style={{
            background: 'rgba(251, 191, 36, 0.08)',
            border: '1px solid rgba(251, 191, 36, 0.25)',
            color: '#fbbf24',
          }}
        >
          {result.warnings.map((warning, i) => (
            <div key={i} className="flex gap-1.5">
              <span className="flex-shrink-0">!</span>
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Editable prompt */}
      <div className="px-3 py-2">
        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          className="w-full rounded text-[11px] font-mono leading-relaxed resize-y p-2"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            minHeight: '120px',
            maxHeight: '300px',
          }}
          spellCheck={false}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 px-3 pb-3">
        <button
          onClick={() => copy(promptText)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-[12px] font-medium transition-all"
          style={{
            background: copied
              ? 'rgba(74, 222, 128, 0.15)'
              : 'rgba(168, 85, 247, 0.12)',
            color: copied ? 'var(--success)' : '#a855f7',
            border: `1px solid ${copied ? 'rgba(74, 222, 128, 0.3)' : 'rgba(168, 85, 247, 0.25)'}`,
          }}
        >
          {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
          {copied ? 'Copied' : 'Copy Prompt'}
        </button>
        <button
          onClick={() => onSendToClaudeCode(promptText)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-[12px] font-medium transition-all"
          style={{
            background: 'rgba(74, 158, 255, 0.12)',
            color: 'var(--accent)',
            border: '1px solid rgba(74, 158, 255, 0.25)',
          }}
        >
          <SendIcon size={12} />
          Send to Claude Code
        </button>
      </div>
    </div>
  );
}

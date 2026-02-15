'use client';

import { useState, useCallback } from 'react';
import { useEditorStore } from '@/store';
import { ApplyConfirmModal } from './ApplyConfirmModal';

interface ResultsSummaryProps {
  summary: string;
  onApplyAll: () => void;
}

export function ResultsSummary({ summary, onApplyAll }: ResultsSummaryProps) {
  const parsedDiffs = useEditorStore((s) => s.parsedDiffs);
  const claudeStatus = useEditorStore((s) => s.claudeStatus);
  const [copied, setCopied] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleCopyDiffs = useCallback(async () => {
    if (parsedDiffs.length === 0) return;

    const text = parsedDiffs
      .map((diff) => {
        const header = `--- ${diff.filePath}\n+++ ${diff.filePath}`;
        const hunks = diff.hunks
          .map((hunk) => {
            const hunkHeader = hunk.header;
            const lines = hunk.lines
              .map((line) => {
                const prefix =
                  line.type === 'addition'
                    ? '+'
                    : line.type === 'removal'
                      ? '-'
                      : ' ';
                return `${prefix}${line.content}`;
              })
              .join('\n');
            return `${hunkHeader}\n${lines}`;
          })
          .join('\n');
        return `${header}\n${hunks}`;
      })
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [parsedDiffs]);

  const isApplying = claudeStatus === 'applying';

  return (
    <div className="flex flex-col gap-3 p-3" style={{ borderTop: '1px solid var(--border)' }}>
      {/* Summary text */}
      {summary && (
        <div
          className="text-xs leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          {summary}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setShowConfirmModal(true)}
          disabled={isApplying || parsedDiffs.length === 0}
          className="w-full py-1.5 px-3 rounded text-xs font-medium transition-colors disabled:opacity-50"
          style={{
            background: 'var(--accent)',
            color: '#fff',
          }}
        >
          {isApplying ? 'Applying...' : 'Apply All'}
        </button>

        <button
          onClick={handleCopyDiffs}
          disabled={parsedDiffs.length === 0}
          className="w-full py-1.5 px-3 rounded text-xs font-medium transition-colors disabled:opacity-50"
          style={{
            background: copied ? 'var(--success)' : 'var(--bg-hover)',
            color: copied ? '#fff' : 'var(--text-secondary)',
          }}
        >
          {copied ? 'Copied!' : 'Copy All Diffs'}
        </button>
      </div>

      {showConfirmModal && (
        <ApplyConfirmModal
          onConfirm={() => {
            setShowConfirmModal(false);
            onApplyAll();
          }}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
    </div>
  );
}

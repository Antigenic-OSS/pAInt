'use client';

import { useState } from 'react';
import type { ParsedDiff } from '@/types/claude';

interface DiffCardProps {
  diff: ParsedDiff;
}

export function DiffCard({ diff }: DiffCardProps) {
  const [expanded, setExpanded] = useState(true);

  const fileName = diff.filePath.split('/').pop() || diff.filePath;

  return (
    <div
      className="rounded overflow-hidden"
      style={{ border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}
    >
      {/* File header - collapsible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center w-full px-3 py-2 text-left gap-2 hover:bg-[var(--bg-hover)] transition-colors"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        <span
          className="text-[10px] transition-transform flex-shrink-0"
          style={{
            color: 'var(--text-muted)',
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        >
          &#9660;
        </span>

        <span
          className="flex-1 text-xs font-mono truncate"
          style={{ color: 'var(--text-primary)' }}
          title={diff.filePath}
        >
          {fileName}
        </span>

        <div className="flex items-center gap-2 flex-shrink-0 text-[11px]">
          {diff.linesAdded > 0 && (
            <span style={{ color: 'var(--success)' }}>
              +{diff.linesAdded}
            </span>
          )}
          {diff.linesRemoved > 0 && (
            <span style={{ color: 'var(--error)' }}>
              -{diff.linesRemoved}
            </span>
          )}
        </div>
      </button>

      {/* File path subtitle */}
      {expanded && diff.filePath !== fileName && (
        <div
          className="px-3 py-1 text-[10px] font-mono truncate"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)' }}
          title={diff.filePath}
        >
          {diff.filePath}
        </div>
      )}

      {/* Diff hunks */}
      {expanded && (
        <div className="overflow-x-auto">
          {diff.hunks.map((hunk, hunkIdx) => (
            <div key={hunkIdx}>
              {/* Hunk header */}
              <div
                className="px-3 py-1 text-[10px] font-mono"
                style={{ color: 'var(--accent)', background: 'rgba(74, 158, 255, 0.06)' }}
              >
                {hunk.header}
              </div>

              {/* Diff lines */}
              {hunk.lines.map((line, lineIdx) => {
                let bgColor = 'transparent';
                let prefixChar = ' ';
                let textColor = 'var(--text-primary)';

                if (line.type === 'addition') {
                  bgColor = '#2ea04333';
                  prefixChar = '+';
                  textColor = '#4ec9b0';
                } else if (line.type === 'removal') {
                  bgColor = '#f4474733';
                  prefixChar = '-';
                  textColor = '#f44747';
                }

                return (
                  <div
                    key={lineIdx}
                    className="px-3 font-mono text-[11px] leading-5 whitespace-pre"
                    style={{ background: bgColor, color: textColor }}
                  >
                    <span
                      className="inline-block w-4 text-center select-none flex-shrink-0"
                      style={{
                        color:
                          line.type === 'context'
                            ? 'var(--text-muted)'
                            : textColor,
                      }}
                    >
                      {prefixChar}
                    </span>
                    {line.content}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

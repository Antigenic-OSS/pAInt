'use client'

import type { ClaudeStatus } from '@/types/claude'

interface ClaudeProgressIndicatorProps {
  status: ClaudeStatus
}

export function ClaudeProgressIndicator({
  status,
}: ClaudeProgressIndicatorProps) {
  const message =
    status === 'applying'
      ? 'Applying changes...'
      : 'Analyzing with Claude Code...'

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8 px-4">
      {/* CSS-only spinner */}
      <div
        className="w-8 h-8 rounded-full"
        style={{
          border: '2px solid var(--bg-hover)',
          borderTopColor: 'var(--accent)',
          animation: 'claude-spin 0.8s linear infinite',
        }}
      />

      {/* Status message with animated dots */}
      <div className="flex items-center gap-0.5">
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {message}
        </span>
        <span
          className="inline-flex text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          <span style={{ animation: 'claude-dot 1.4s infinite 0s' }}>.</span>
          <span style={{ animation: 'claude-dot 1.4s infinite 0.2s' }}>.</span>
          <span style={{ animation: 'claude-dot 1.4s infinite 0.4s' }}>.</span>
        </span>
      </div>

      {/* Subtle pulse bar */}
      <div
        className="w-32 h-1 rounded-full overflow-hidden"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            background: 'var(--accent)',
            animation: 'claude-pulse 1.5s ease-in-out infinite',
          }}
        />
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes claude-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes claude-dot {
          0%, 20% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes claude-pulse {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  )
}

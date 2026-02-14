'use client';

import type { ClaudeError, ClaudeErrorCode } from '@/types/claude';

interface ClaudeErrorStateProps {
  error: ClaudeError;
  onRetry: () => void;
}

const ERROR_DETAILS: Record<
  ClaudeErrorCode,
  { title: string; description: string; command?: string }
> = {
  CLI_NOT_FOUND: {
    title: 'Claude Code CLI Not Found',
    description:
      'The Claude Code CLI is not installed or not in your PATH. Install it to continue.',
    command: 'npm install -g @anthropic-ai/claude-code',
  },
  AUTH_REQUIRED: {
    title: 'Authentication Required',
    description:
      'Claude Code CLI needs to be authenticated. Run the command below in your terminal to log in.',
    command: 'claude',
  },
  TIMEOUT: {
    title: 'Analysis Timed Out',
    description:
      'The analysis took too long to complete. Try with fewer changes or a smaller scope.',
  },
  PARSE_FAILURE: {
    title: 'Parse Failure',
    description:
      'Could not parse the results returned by Claude Code. The output format may have changed.',
  },
  UNKNOWN: {
    title: 'Unexpected Error',
    description: 'An unexpected error occurred while communicating with Claude Code.',
  },
};

export function ClaudeErrorState({ error, onRetry }: ClaudeErrorStateProps) {
  const details = ERROR_DETAILS[error.code] || ERROR_DETAILS.UNKNOWN;

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Error icon and title */}
      <div className="flex items-start gap-2">
        <div
          className="flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 text-sm"
          style={{ background: 'rgba(244, 71, 71, 0.15)', color: 'var(--error)' }}
        >
          !
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-xs font-medium" style={{ color: 'var(--error)' }}>
            {details.title}
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {details.description}
          </p>
        </div>
      </div>

      {/* Raw error message */}
      {error.message && (
        <div
          className="px-3 py-2 rounded text-[11px] font-mono break-words"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
          }}
        >
          {error.message}
        </div>
      )}

      {/* Command suggestion */}
      {details.command && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            Run this in your terminal:
          </span>
          <code
            className="block px-3 py-2 rounded text-[11px] font-mono select-all"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            {details.command}
          </code>
        </div>
      )}

      {/* Retry button */}
      <button
        onClick={onRetry}
        className="w-full py-1.5 px-3 rounded text-xs font-medium transition-colors"
        style={{
          background: 'var(--bg-hover)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        }}
      >
        Retry
      </button>
    </div>
  );
}

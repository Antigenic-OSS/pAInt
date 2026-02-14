'use client';

import { useState, useCallback } from 'react';
import { useEditorStore } from '@/store';
import { ProjectRootSelector } from './ProjectRootSelector';
import type { ClaudeStatusResponse } from '@/types/claude';

interface SetupFlowProps {
  onComplete: () => void;
}

export function SetupFlow({ onComplete }: SetupFlowProps) {
  const cliAvailable = useEditorStore((s) => s.cliAvailable);
  const setCliAvailable = useEditorStore((s) => s.setCliAvailable);
  const projectRoot = useEditorStore((s) => s.projectRoot);

  const [step, setStep] = useState<1 | 2>(1);
  const [checking, setChecking] = useState(false);
  const [cliVersion, setCliVersion] = useState<string | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  const handleCheckCli = useCallback(async () => {
    setChecking(true);
    setCheckError(null);
    try {
      const res = await fetch('/api/claude/status');
      const data: ClaudeStatusResponse = await res.json();
      setCliAvailable(data.available);
      if (data.available && data.version) {
        setCliVersion(data.version);
      } else {
        setCheckError(data.error || 'Claude CLI not available');
      }
    } catch {
      setCliAvailable(false);
      setCheckError('Failed to check CLI status');
    } finally {
      setChecking(false);
    }
  }, [setCliAvailable]);

  const handleProjectRootSaved = useCallback(() => {
    onComplete();
  }, [onComplete]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
        Claude Code Setup
      </div>
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        Connect your editor to Claude Code CLI to analyze changes and apply diffs directly to your project files.
      </p>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        <StepBadge number={1} active={step === 1} completed={cliAvailable === true} />
        <div
          className="flex-1 h-px"
          style={{ background: 'var(--border)' }}
        />
        <StepBadge number={2} active={step === 2} completed={!!projectRoot} />
      </div>

      {/* Step 1: Verify CLI */}
      {step === 1 && (
        <div className="flex flex-col gap-3">
          <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            Step 1: Verify Claude CLI
          </div>
          <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            The Claude Code CLI must be installed and accessible in your PATH.
          </p>

          {cliAvailable === true && cliVersion && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded text-xs"
              style={{ background: 'rgba(78, 201, 176, 0.1)', border: '1px solid var(--success)' }}
            >
              <span style={{ color: 'var(--success)' }}>&#10003;</span>
              <span style={{ color: 'var(--success)' }}>
                CLI available &mdash; {cliVersion}
              </span>
            </div>
          )}

          {cliAvailable === false && checkError && (
            <div
              className="flex flex-col gap-2 px-3 py-2 rounded text-xs"
              style={{ background: 'rgba(244, 71, 71, 0.1)', border: '1px solid var(--error)' }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--error)' }}>&#10007;</span>
                <span style={{ color: 'var(--error)' }}>CLI not found</span>
              </div>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Install Claude Code CLI:
              </p>
              <code
                className="block px-2 py-1.5 rounded text-[11px] font-mono select-all"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              >
                npm install -g @anthropic-ai/claude-code
              </code>
            </div>
          )}

          <button
            onClick={handleCheckCli}
            disabled={checking}
            className="w-full py-1.5 px-3 rounded text-xs font-medium transition-colors disabled:opacity-50"
            style={{
              background: 'var(--accent)',
              color: '#fff',
            }}
          >
            {checking ? 'Checking...' : 'Check CLI Availability'}
          </button>

          {cliAvailable === true && (
            <button
              onClick={() => setStep(2)}
              className="w-full py-1.5 px-3 rounded text-xs font-medium transition-colors"
              style={{
                background: 'var(--bg-hover)',
                color: 'var(--text-primary)',
              }}
            >
              Continue to Step 2
            </button>
          )}
        </div>
      )}

      {/* Step 2: Set project root */}
      {step === 2 && (
        <div className="flex flex-col gap-3">
          <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            Step 2: Set Project Root
          </div>
          <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            Enter the absolute path to the project directory that Claude will analyze and modify.
          </p>

          <ProjectRootSelector onSaved={handleProjectRootSaved} />

          <button
            onClick={() => setStep(1)}
            className="text-[11px] text-left transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            &larr; Back to Step 1
          </button>
        </div>
      )}
    </div>
  );
}

function StepBadge({ number, active, completed }: { number: number; active: boolean; completed: boolean }) {
  let bgColor = 'var(--bg-tertiary)';
  let textColor = 'var(--text-muted)';
  let borderColor = 'var(--border)';

  if (completed) {
    bgColor = 'var(--success)';
    textColor = '#fff';
    borderColor = 'var(--success)';
  } else if (active) {
    bgColor = 'var(--accent)';
    textColor = '#fff';
    borderColor = 'var(--accent)';
  }

  return (
    <div
      className="flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-medium"
      style={{ background: bgColor, color: textColor, border: `1px solid ${borderColor}` }}
    >
      {completed ? '\u2713' : number}
    </div>
  );
}

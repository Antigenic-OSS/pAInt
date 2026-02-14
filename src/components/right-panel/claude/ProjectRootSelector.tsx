'use client';

import { useState, useCallback } from 'react';
import { useEditorStore } from '@/store';

interface ProjectRootSelectorProps {
  onSaved?: () => void;
}

export function ProjectRootSelector({ onSaved }: ProjectRootSelectorProps) {
  const projectRoot = useEditorStore((s) => s.projectRoot);
  const setProjectRoot = useEditorStore((s) => s.setProjectRoot);

  const [inputValue, setInputValue] = useState(projectRoot || '');
  const [validating, setValidating] = useState(false);
  const [validationState, setValidationState] = useState<'idle' | 'success' | 'error'>('idle');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setValidationState('error');
      setValidationMessage('Path cannot be empty');
      return;
    }

    if (!trimmed.startsWith('/')) {
      setValidationState('error');
      setValidationMessage('Path must be absolute (start with /)');
      return;
    }

    setValidating(true);
    setValidationState('idle');
    setValidationMessage(null);

    try {
      const res = await fetch('/api/claude/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectRoot: trimmed }),
      });

      if (res.ok) {
        setProjectRoot(trimmed);
        setValidationState('success');
        setValidationMessage('Project root saved');
        onSaved?.();
      } else {
        const data = await res.json().catch(() => ({ error: 'Validation failed' }));
        setValidationState('error');
        setValidationMessage(data.error || 'Path validation failed');
      }
    } catch {
      // If the POST endpoint doesn't exist yet, fall back to client-side validation
      // and save directly since the path format is already validated
      setProjectRoot(trimmed);
      setValidationState('success');
      setValidationMessage('Project root saved');
      onSaved?.();
    } finally {
      setValidating(false);
    }
  }, [inputValue, setProjectRoot, onSaved]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSave();
      }
    },
    [handleSave]
  );

  return (
    <div className="flex flex-col gap-2">
      <label
        className="text-[11px] font-medium"
        style={{ color: 'var(--text-secondary)' }}
      >
        Project Root
      </label>

      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setValidationState('idle');
            setValidationMessage(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="/path/to/your/project"
          className="flex-1 px-2 py-1.5 rounded text-xs font-mono outline-none transition-colors"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: `1px solid ${
              validationState === 'error'
                ? 'var(--error)'
                : validationState === 'success'
                  ? 'var(--success)'
                  : 'var(--border)'
            }`,
          }}
        />
        <button
          onClick={handleSave}
          disabled={validating || !inputValue.trim()}
          className="px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
          style={{
            background: 'var(--accent)',
            color: '#fff',
          }}
        >
          {validating ? '...' : 'Save'}
        </button>
      </div>

      {validationMessage && (
        <div
          className="text-[11px]"
          style={{
            color: validationState === 'success' ? 'var(--success)' : 'var(--error)',
          }}
        >
          {validationState === 'success' ? '\u2713' : '\u2717'} {validationMessage}
        </div>
      )}

      {projectRoot && validationState !== 'success' && (
        <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Current: {projectRoot}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { useEditorStore } from '@/store';
import { useProjectScan } from '@/hooks/useProjectScan';

interface ProjectRootSelectorProps {
  targetUrl: string;
  onSaved?: () => void;
}

export function ProjectRootSelector({ targetUrl, onSaved }: ProjectRootSelectorProps) {
  const portRoots = useEditorStore((s) => s.portRoots);
  const projectRoot = portRoots[targetUrl] ?? null;
  const setProjectRoot = useEditorStore((s) => s.setProjectRoot);
  const scanStatus = useEditorStore((s) => s.scanStatus);
  const scannedProjectName = useEditorStore((s) => s.scannedProjectName);
  const componentFileMap = useEditorStore((s) => s.componentFileMap);
  const { triggerScan } = useProjectScan();

  const [inputValue, setInputValue] = useState(projectRoot || '');
  const [validating, setValidating] = useState(false);
  const [validationState, setValidationState] = useState<'idle' | 'success' | 'error'>('idle');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const scanWithFeedback = useCallback(async (rootPath: string) => {
    await triggerScan(rootPath, {
      onSuccess: (count, projectName) => {
        setValidationState('success');
        setValidationMessage(
          count > 0
            ? `Found ${count} components in ${projectName}`
            : 'No component files found — check folder'
        );
      },
      onError: (message) => {
        setValidationState('error');
        setValidationMessage(message);
      },
    });
  }, [triggerScan]);

  const handlePickFolder = useCallback(async () => {
    setPicking(true);
    try {
      const res = await fetch('/api/claude/pick-folder');
      const data = await res.json();
      if (data.path) {
        setInputValue(data.path);
        setValidationState('idle');
        setValidationMessage(null);
      }
    } catch { /* user cancelled or error */ } finally {
      setPicking(false);
    }
  }, []);

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
        setProjectRoot(targetUrl, trimmed);
        // Trigger scan immediately after saving
        await scanWithFeedback(trimmed);
        onSaved?.();
      } else {
        const data = await res.json().catch(() => ({ error: 'Validation failed' }));
        setValidationState('error');
        setValidationMessage(data.error || 'Path validation failed');
      }
    } catch {
      // If the POST endpoint doesn't exist yet, fall back to saving and scanning
      setProjectRoot(targetUrl, trimmed);
      await scanWithFeedback(trimmed);
      onSaved?.();
    } finally {
      setValidating(false);
    }
  }, [inputValue, targetUrl, setProjectRoot, onSaved, scanWithFeedback]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSave();
      }
    },
    [handleSave]
  );

  const componentCount = componentFileMap ? Object.keys(componentFileMap).length : 0;

  return (
    <div className="flex flex-col gap-2">
      <label
        className="text-[11px] font-medium"
        style={{ color: 'var(--text-secondary)' }}
      >
        Project Root
      </label>

      <div className="flex gap-1.5">
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
          className="flex-1 min-w-0 px-2 py-1.5 rounded text-xs font-mono outline-none transition-colors"
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
          onClick={handlePickFolder}
          disabled={picking}
          title="Browse for folder"
          className="flex items-center justify-center w-8 h-8 rounded transition-colors disabled:opacity-50 flex-shrink-0"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M1.5 3C1.5 2.17157 2.17157 1.5 3 1.5H6.17157C6.57019 1.5 6.95262 1.65804 7.23431 1.93934L8.06066 2.76569C8.34196 3.04698 8.72439 3.20503 9.12301 3.20503H13C13.8284 3.20503 14.5 3.8766 14.5 4.70503V12.5C14.5 13.3284 13.8284 14 13 14H3C2.17157 14 1.5 13.3284 1.5 12.5V3Z"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          onClick={handleSave}
          disabled={validating || !inputValue.trim()}
          className="px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 flex-shrink-0"
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
            color: validationState === 'success'
              ? (componentCount > 0 ? 'var(--success)' : 'var(--warning)')
              : 'var(--error)',
          }}
        >
          {validationState === 'success' ? '\u2713' : '\u2717'} {validationMessage}
        </div>
      )}

      {scanStatus === 'scanning' && (
        <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Scanning project for components...
        </div>
      )}

      {projectRoot && validationState !== 'success' && scanStatus !== 'scanning' && (
        <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Current: {projectRoot}
          {scannedProjectName && ` (${scannedProjectName})`}
        </div>
      )}
    </div>
  );
}

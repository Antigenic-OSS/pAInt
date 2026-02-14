'use client';

import { useCallback } from 'react';
import { useEditorStore } from '@/store';
import type { ClaudeAnalyzeResponse, ClaudeApplyResponse, ClaudeStatusResponse } from '@/types/claude';

export function useClaudeAPI() {
  const setClaudeStatus = useEditorStore((s) => s.setClaudeStatus);
  const setCliAvailable = useEditorStore((s) => s.setCliAvailable);
  const setSessionId = useEditorStore((s) => s.setSessionId);
  const setParsedDiffs = useEditorStore((s) => s.setParsedDiffs);
  const setClaudeError = useEditorStore((s) => s.setClaudeError);
  const resetClaude = useEditorStore((s) => s.resetClaude);

  const checkStatus = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/claude/status');
      const data: ClaudeStatusResponse = await res.json();
      setCliAvailable(data.available);
      return data.available;
    } catch {
      setCliAvailable(false);
      return false;
    }
  }, [setCliAvailable]);

  const analyze = useCallback(
    async (changelog: string, projectRoot: string) => {
      resetClaude();
      setClaudeStatus('analyzing');

      try {
        const res = await fetch('/api/claude/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ changelog, projectRoot }),
        });

        if (!res.ok) {
          const err = await res.json();
          setClaudeStatus('error');
          setClaudeError({
            code: err.code || 'UNKNOWN',
            message: err.error || 'Analysis failed',
          });
          return;
        }

        const data: ClaudeAnalyzeResponse = await res.json();
        setSessionId(data.sessionId);
        setParsedDiffs(data.diffs);
        setClaudeStatus('complete');
      } catch (e) {
        setClaudeStatus('error');
        setClaudeError({
          code: 'UNKNOWN',
          message: e instanceof Error ? e.message : 'Network error',
        });
      }
    },
    [resetClaude, setClaudeStatus, setSessionId, setParsedDiffs, setClaudeError]
  );

  const apply = useCallback(
    async (sessionId: string, projectRoot: string) => {
      setClaudeStatus('applying');

      try {
        const res = await fetch('/api/claude/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, projectRoot }),
        });

        if (!res.ok) {
          const err = await res.json();
          setClaudeStatus('error');
          setClaudeError({
            code: err.code || 'UNKNOWN',
            message: err.error || 'Apply failed',
          });
          return;
        }

        const data: ClaudeApplyResponse = await res.json();
        if (data.success) {
          setClaudeStatus('applied');
        } else {
          setClaudeStatus('error');
          setClaudeError({
            code: 'UNKNOWN',
            message: data.summary || 'Apply returned unsuccessful',
          });
        }
      } catch (e) {
        setClaudeStatus('error');
        setClaudeError({
          code: 'UNKNOWN',
          message: e instanceof Error ? e.message : 'Network error',
        });
      }
    },
    [setClaudeStatus, setClaudeError]
  );

  return { checkStatus, analyze, apply };
}

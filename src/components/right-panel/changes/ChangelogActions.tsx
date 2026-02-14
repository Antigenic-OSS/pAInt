'use client';

import { useState, useCallback } from 'react';
import { useEditorStore } from '@/store';
import { useChangeTracker } from '@/hooks/useChangeTracker';
import { formatChangelog } from '@/lib/utils';
import { BREAKPOINTS } from '@/lib/constants';

export function ChangelogActions() {
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const targetUrl = useEditorStore((s) => s.targetUrl);
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint);
  const currentPagePath = useEditorStore((s) => s.currentPagePath);
  const styleChanges = useEditorStore((s) => s.styleChanges);
  const { revertAll } = useChangeTracker();

  const handleCopyChangelog = useCallback(async () => {
    if (!targetUrl) return;

    const changelog = formatChangelog({
      targetUrl,
      pagePath: currentPagePath,
      breakpoint: activeBreakpoint,
      breakpointWidth: BREAKPOINTS[activeBreakpoint].width,
      styleChanges,
    });

    try {
      await navigator.clipboard.writeText(changelog);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = changelog;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [targetUrl, activeBreakpoint, styleChanges, currentPagePath]);

  const handleClearAll = useCallback(() => {
    revertAll();
    setShowConfirm(false);
  }, [revertAll]);

  if (styleChanges.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 p-3" style={{ borderTop: '1px solid var(--border)' }}>
      <button
        onClick={handleCopyChangelog}
        className="w-full py-1.5 px-3 rounded text-xs font-medium transition-colors"
        style={{
          background: copied ? 'var(--success)' : 'var(--accent)',
          color: '#fff',
        }}
      >
        {copied ? 'Copied!' : 'Copy Changelog'}
      </button>

      {showConfirm ? (
        <div className="flex gap-2">
          <button
            onClick={handleClearAll}
            className="flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors"
            style={{ background: 'var(--error)', color: '#fff' }}
          >
            Confirm Clear
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors"
            style={{
              background: 'var(--bg-hover)',
              color: 'var(--text-secondary)',
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full py-1.5 px-3 rounded text-xs font-medium transition-colors"
          style={{
            background: 'var(--bg-hover)',
            color: 'var(--text-secondary)',
          }}
        >
          Clear All Changes
        </button>
      )}
    </div>
  );
}

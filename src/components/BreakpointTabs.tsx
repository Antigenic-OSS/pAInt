'use client';

import { useCallback } from 'react';
import { useEditorStore } from '@/store';
import { usePostMessage } from '@/hooks/usePostMessage';
import { BREAKPOINTS } from '@/lib/constants';
import type { Breakpoint } from '@/types/changelog';

export function BreakpointTabs() {
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint);
  const setActiveBreakpoint = useEditorStore((s) => s.setActiveBreakpoint);
  const { sendToInspector } = usePostMessage();

  const breakpoints = Object.entries(BREAKPOINTS) as [Breakpoint, { label: string; width: number }][];

  const handleBreakpointChange = useCallback(
    (bp: Breakpoint) => {
      setActiveBreakpoint(bp);
      sendToInspector({
        type: 'SET_BREAKPOINT',
        payload: { width: BREAKPOINTS[bp].width },
      });
    },
    [setActiveBreakpoint, sendToInspector]
  );

  return (
    <div className="flex items-center gap-1">
      {breakpoints.map(([key, { label, width }]) => (
        <button
          key={key}
          onClick={() => handleBreakpointChange(key)}
          className="px-2 py-0.5 text-[11px] rounded transition-colors"
          style={{
            background: activeBreakpoint === key ? 'var(--accent-bg)' : 'transparent',
            color: activeBreakpoint === key ? 'var(--accent)' : 'var(--text-muted)',
          }}
          title={`${label} (${width}px)`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

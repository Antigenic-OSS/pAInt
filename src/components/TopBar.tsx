'use client';

import { TargetSelector } from './TargetSelector';
import { BreakpointTabs } from './BreakpointTabs';
import { PageSelector } from './PageSelector';
import { useEditorStore } from '@/store';

export function TopBar() {
  const toggleLeftPanel = useEditorStore((s) => s.toggleLeftPanel);
  const toggleRightPanel = useEditorStore((s) => s.toggleRightPanel);
  const leftPanelOpen = useEditorStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useEditorStore((s) => s.rightPanelOpen);
  const connectionStatus = useEditorStore((s) => s.connectionStatus);
  const setActiveRightTab = useEditorStore((s) => s.setActiveRightTab);
  const changeCount = useEditorStore((s) => s.styleChanges.length);

  return (
    <div
      className="flex items-center h-10 px-3 gap-3 flex-shrink-0"
      style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Left panel toggle */}
      <button
        onClick={toggleLeftPanel}
        className="px-2 py-1 text-xs rounded hover:bg-[var(--bg-hover)] transition-colors"
        style={{ color: leftPanelOpen ? 'var(--accent)' : 'var(--text-secondary)' }}
        title="Toggle layers panel"
      >
        ☰
      </button>

      {/* Logo */}
      <span
        className="text-sm font-semibold tracking-tight whitespace-nowrap"
        style={{ color: 'var(--text-primary)' }}
      >
        Dev Editor
      </span>

      {/* Separator */}
      <div className="w-px h-5" style={{ background: 'var(--border)' }} />

      {/* Target URL selector */}
      <TargetSelector />

      {/* Center area — breakpoints */}
      {connectionStatus === 'connected' && (
        <>
          <div className="w-px h-5" style={{ background: 'var(--border)' }} />
          <BreakpointTabs />
          <div className="w-px h-5" style={{ background: 'var(--border)' }} />
          <PageSelector />
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Apply button — switches to Changes tab */}
      {connectionStatus === 'connected' && changeCount > 0 && (
        <button
          onClick={() => {
            setActiveRightTab('changes');
            if (!rightPanelOpen) toggleRightPanel();
          }}
          className="px-3 py-1 text-xs font-medium rounded transition-colors"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          Apply ({changeCount})
        </button>
      )}

      {/* Right panel toggle */}
      <button
        onClick={toggleRightPanel}
        className="px-2 py-1 text-xs rounded hover:bg-[var(--bg-hover)] transition-colors"
        style={{ color: rightPanelOpen ? 'var(--accent)' : 'var(--text-secondary)' }}
        title="Toggle design panel"
      >
        ☰
      </button>
    </div>
  );
}

'use client';

import { TargetSelector } from './TargetSelector';
import { BreakpointTabs } from './BreakpointTabs';
import { SetupInstructions } from './SetupInstructions';
import { useEditorStore } from '@/store';
import { usePostMessage } from '@/hooks/usePostMessage';
import { performUndo, performRedo } from '@/hooks/useChangeTracker';

export function TopBar() {
  const toggleLeftPanel = useEditorStore((s) => s.toggleLeftPanel);
  const toggleRightPanel = useEditorStore((s) => s.toggleRightPanel);
  const leftPanelOpen = useEditorStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useEditorStore((s) => s.rightPanelOpen);
  const connectionStatus = useEditorStore((s) => s.connectionStatus);
  const setActiveRightTab = useEditorStore((s) => s.setActiveRightTab);
  const changeCount = useEditorStore((s) => s.styleChanges.length);
  const selectionMode = useEditorStore((s) => s.selectionMode);
  const toggleSelectionMode = useEditorStore((s) => s.toggleSelectionMode);
  const viewMode = useEditorStore((s) => s.viewMode);
  const toggleViewMode = useEditorStore((s) => s.toggleViewMode);
  const canUndo = useEditorStore((s) => s.undoStack.length > 0);
  const canRedo = useEditorStore((s) => s.redoStack.length > 0);
  const { sendToInspector, iframeRef } = usePostMessage();

  return (
    <div className="relative flex-shrink-0">
    <div
      className="flex items-center h-10 px-3 gap-3"
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

      {/* Refresh preview */}
      {connectionStatus === 'connected' && (
        <button
          onClick={() => {
            const iframe = iframeRef.current;
            if (iframe?.src) {
              iframe.src = iframe.src;
            }
          }}
          className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          title="Refresh preview"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
      )}

      {/* Center area — breakpoints */}
      {connectionStatus === 'connected' && (
        <>
          <div className="w-px h-5" style={{ background: 'var(--border)' }} />
          <BreakpointTabs />
        </>
      )}

      {/* Select / Preview toggle */}
      {connectionStatus === 'connected' && (
        <>
          <div className="w-px h-5" style={{ background: 'var(--border)' }} />
          <div
            className="flex rounded overflow-hidden"
            style={{ border: '1px solid var(--border)' }}
          >
            <button
              onClick={() => {
                if (!viewMode && selectionMode) return;
                if (viewMode) {
                  toggleViewMode();
                  if (!selectionMode) toggleSelectionMode();
                  sendToInspector({ type: 'SET_SELECTION_MODE', payload: { enabled: true } });
                } else {
                  toggleSelectionMode();
                  sendToInspector({ type: 'SET_SELECTION_MODE', payload: { enabled: true } });
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs transition-colors"
              style={{
                background: !viewMode && selectionMode ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: !viewMode && selectionMode ? '#fff' : 'var(--text-secondary)',
                borderRight: '1px solid var(--border)',
              }}
              title={selectionMode && !viewMode ? 'Selection mode ON — click selects elements' : 'Switch to selection mode'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                <path d="M13 13l6 6" />
              </svg>
              Select
            </button>
            <button
              onClick={() => {
                if (viewMode) return;
                toggleViewMode();
                sendToInspector({ type: 'SET_SELECTION_MODE', payload: { enabled: false } });
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs transition-colors"
              style={{
                background: viewMode ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: viewMode ? '#fff' : 'var(--text-secondary)',
              }}
              title={viewMode ? 'Preview mode — exit to edit' : 'Preview — navigate & test the site'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Preview
            </button>
          </div>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Undo / Redo */}
      {connectionStatus === 'connected' && (
        <>
          <button
            onClick={performUndo}
            disabled={!canUndo}
            className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors"
            style={{
              color: canUndo ? 'var(--text-secondary)' : 'var(--text-muted)',
              opacity: canUndo ? 1 : 0.4,
              cursor: canUndo ? 'pointer' : 'default',
            }}
            title="Undo (Cmd+Z)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
          <button
            onClick={performRedo}
            disabled={!canRedo}
            className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors"
            style={{
              color: canRedo ? 'var(--text-secondary)' : 'var(--text-muted)',
              opacity: canRedo ? 1 : 0.4,
              cursor: canRedo ? 'pointer' : 'default',
            }}
            title="Redo (Cmd+Shift+Z)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </>
      )}

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
    <SetupInstructions />
    </div>
  );
}

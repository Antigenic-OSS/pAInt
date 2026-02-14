'use client';

import { Suspense } from 'react';
import { useEditorStore } from '@/store';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { TopBar } from './TopBar';
import { LeftPanel } from './left-panel/LeftPanel';
import { RightPanel } from './right-panel/RightPanel';
import { PreviewFrame } from './PreviewFrame';
import { ErrorBoundary } from './common/ErrorBoundary';

function PanelLoading() {
  return (
    <div
      className="flex items-center justify-center h-full"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Loading...
      </div>
    </div>
  );
}

export function Editor() {
  const leftPanelOpen = useEditorStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useEditorStore((s) => s.rightPanelOpen);
  const leftPanelWidth = useEditorStore((s) => s.leftPanelWidth);
  const rightPanelWidth = useEditorStore((s) => s.rightPanelWidth);

  useKeyboardShortcuts();

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg-primary)' }}>
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        {leftPanelOpen && (
          <ErrorBoundary panelName="Layers panel">
            <Suspense fallback={<PanelLoading />}>
              <LeftPanel width={leftPanelWidth} />
            </Suspense>
          </ErrorBoundary>
        )}
        <div className="flex-1 min-w-0 relative">
          <ErrorBoundary panelName="Preview">
            <PreviewFrame />
          </ErrorBoundary>
        </div>
        {rightPanelOpen && (
          <ErrorBoundary panelName="Design panel">
            <Suspense fallback={<PanelLoading />}>
              <RightPanel width={rightPanelWidth} />
            </Suspense>
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}

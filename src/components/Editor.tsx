'use client';

import { Suspense, useCallback } from 'react';
import { useEditorStore } from '@/store';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePostMessage } from '@/hooks/usePostMessage';
import { TopBar } from './TopBar';
import { LeftPanel } from './left-panel/LeftPanel';
import { RightPanel } from './right-panel/RightPanel';
import { PreviewFrame } from './PreviewFrame';
import { ConnectModal } from './ConnectModal';
import { ErrorBoundary } from './common/ErrorBoundary';
import { ToastContainer } from './common/ToastContainer';

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
  const targetUrl = useEditorStore((s) => s.targetUrl);
  const connectionStatus = useEditorStore((s) => s.connectionStatus);
  const leftPanelOpen = useEditorStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useEditorStore((s) => s.rightPanelOpen);
  const leftPanelWidth = useEditorStore((s) => s.leftPanelWidth);
  const rightPanelWidth = useEditorStore((s) => s.rightPanelWidth);
  const { sendToInspector } = usePostMessage();

  useKeyboardShortcuts();

  // Hide iframe hover overlay when interacting with any panel outside the canvas
  const hideHover = useCallback(() => {
    sendToInspector({ type: 'HIDE_HOVER' });
  }, [sendToInspector]);

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div onMouseDown={hideHover} onMouseEnter={hideHover}>
        <TopBar />
      </div>
      <div className="flex flex-1 overflow-hidden">
        {leftPanelOpen && (
          // eslint-disable-next-line jsx-a11y/no-static-element-interactions
          <div onMouseDown={hideHover} onMouseEnter={hideHover} className="flex">
            <ErrorBoundary panelName="Layers panel">
              <Suspense fallback={<PanelLoading />}>
                <LeftPanel width={leftPanelWidth} />
              </Suspense>
            </ErrorBoundary>
          </div>
        )}
        <div className="flex-1 min-w-0 relative">
          <ErrorBoundary panelName="Preview">
            <PreviewFrame />
          </ErrorBoundary>
        </div>
        {rightPanelOpen && (
          // eslint-disable-next-line jsx-a11y/no-static-element-interactions
          <div onMouseDown={hideHover} onMouseEnter={hideHover} className="flex">
            <ErrorBoundary panelName="Design panel">
              <Suspense fallback={<PanelLoading />}>
                <RightPanel width={rightPanelWidth} />
              </Suspense>
            </ErrorBoundary>
          </div>
        )}
      </div>
      <ToastContainer />
      {(!targetUrl || connectionStatus === 'connecting') && <ConnectModal />}
    </div>
  );
}

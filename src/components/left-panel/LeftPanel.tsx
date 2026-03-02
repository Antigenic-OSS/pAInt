'use client';

import React, { Suspense } from 'react';
import { ResizablePanel } from '@/components/common/ResizablePanel';
import { useEditorStore } from '@/store';
import { LayersPanel } from './LayersPanel';
import { PagesPanel } from './PagesPanel';
import { AddElementPanel } from './AddElementPanel';
import { IconSidebar } from './IconSidebar';
import { PANEL_DEFAULTS } from '@/lib/constants';

const ComponentsPanel = React.lazy(() => import('./ComponentsPanel'));
const TerminalPanel = React.lazy(() =>
  import('./terminal/TerminalPanel').then((m) => ({ default: m.TerminalPanel })),
);

type LeftTab = 'layers' | 'pages' | 'components' | 'terminal' | 'add-element';

const TAB_LABELS: Record<LeftTab, string> = {
  layers: 'Navigator',
  pages: 'Pages',
  components: 'Components',
  'add-element': 'Add Element',
  terminal: 'Terminal',
};

interface LeftPanelProps {
  width: number;
}

export function LeftPanel({ width }: LeftPanelProps) {
  const setLeftPanelWidth = useEditorStore((s) => s.setLeftPanelWidth);
  const connectionStatus = useEditorStore((s) => s.connectionStatus);
  const activeTab = useEditorStore((s) => s.activeLeftTab);
  const leftPanelOpen = useEditorStore((s) => s.leftPanelOpen);

  const isInspectorTab = activeTab !== 'terminal';
  const showNotConnected = isInspectorTab && connectionStatus !== 'connected';

  return (
    <div className="flex h-full">
      <IconSidebar />
      {leftPanelOpen && (
        <ResizablePanel
          width={width}
          minWidth={PANEL_DEFAULTS.leftMin}
          maxWidth={PANEL_DEFAULTS.leftMax}
          onResize={setLeftPanelWidth}
          side="left"
        >
          <div className="flex flex-col h-full">
            {/* Panel header */}
            <div
              className="flex items-center flex-shrink-0 h-8"
              style={{
                padding: '0 12px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {TAB_LABELS[activeTab]}
              </span>
            </div>

            {/* Tab content */}
            {activeTab === 'terminal' ? (
              <Suspense
                fallback={
                  <div style={{ color: 'var(--text-muted)', padding: '8px', fontSize: '11px' }}>
                    Loading terminal...
                  </div>
                }
              >
                <TerminalPanel />
              </Suspense>
            ) : showNotConnected ? (
              <div
                className="flex items-center justify-center flex-1 text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                Connect to inspect
              </div>
            ) : activeTab === 'layers' ? (
              <LayersPanel />
            ) : activeTab === 'pages' ? (
              <PagesPanel />
            ) : activeTab === 'add-element' ? (
              <AddElementPanel />
            ) : (
              <Suspense
                fallback={
                  <div style={{ color: 'var(--text-muted)', padding: '8px', fontSize: '11px' }}>
                    Loading...
                  </div>
                }
              >
                <ComponentsPanel />
              </Suspense>
            )}
          </div>
        </ResizablePanel>
      )}
    </div>
  );
}

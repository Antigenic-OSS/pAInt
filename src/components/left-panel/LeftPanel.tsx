'use client';

import React, { Suspense } from 'react';
import { ResizablePanel } from '@/components/common/ResizablePanel';
import { useEditorStore } from '@/store';
import { LayersPanel } from './LayersPanel';
import { PagesPanel } from './PagesPanel';
import { PANEL_DEFAULTS } from '@/lib/constants';

const ComponentsPanel = React.lazy(() => import('./ComponentsPanel'));

type LeftTab = 'layers' | 'pages' | 'components';

interface LeftPanelProps {
  width: number;
}

export function LeftPanel({ width }: LeftPanelProps) {
  const setLeftPanelWidth = useEditorStore((s) => s.setLeftPanelWidth);
  const connectionStatus = useEditorStore((s) => s.connectionStatus);
  const activeTab = useEditorStore((s) => s.activeLeftTab);
  const setActiveTab = useEditorStore((s) => s.setActiveLeftTab);

  const tabs: { id: LeftTab; label: string }[] = [
    { id: 'layers', label: 'Layers' },
    { id: 'pages', label: 'Pages' },
    { id: 'components', label: 'Comps' },
  ];

  return (
    <ResizablePanel
      width={width}
      minWidth={PANEL_DEFAULTS.leftMin}
      maxWidth={PANEL_DEFAULTS.leftMax}
      onResize={setLeftPanelWidth}
      side="left"
    >
      <div className="flex flex-col h-full">
        {/* Tabs */}
        <div
          className="flex items-center h-8 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 h-full text-xs font-medium transition-colors"
              style={{
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {connectionStatus === 'connected' ? (
          activeTab === 'layers' ? (
            <LayersPanel />
          ) : activeTab === 'pages' ? (
            <PagesPanel />
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
          )
        ) : (
          <div
            className="flex items-center justify-center flex-1 text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            Connect to inspect
          </div>
        )}
      </div>
    </ResizablePanel>
  );
}

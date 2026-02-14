'use client';

import { ResizablePanel } from '@/components/common/ResizablePanel';
import { useEditorStore } from '@/store';
import { LayersPanel } from './LayersPanel';
import { PANEL_DEFAULTS } from '@/lib/constants';

interface LeftPanelProps {
  width: number;
}

export function LeftPanel({ width }: LeftPanelProps) {
  const setLeftPanelWidth = useEditorStore((s) => s.setLeftPanelWidth);
  const connectionStatus = useEditorStore((s) => s.connectionStatus);

  return (
    <ResizablePanel
      width={width}
      minWidth={PANEL_DEFAULTS.leftMin}
      maxWidth={PANEL_DEFAULTS.leftMax}
      onResize={setLeftPanelWidth}
      side="left"
    >
      <div className="flex flex-col h-full">
        <div
          className="flex items-center h-8 px-3 text-xs font-medium flex-shrink-0"
          style={{
            color: 'var(--text-secondary)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          Layers
        </div>
        {connectionStatus === 'connected' ? (
          <LayersPanel />
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

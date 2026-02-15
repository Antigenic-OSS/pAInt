'use client';

import { ResizablePanel } from '@/components/common/ResizablePanel';
import { PanelTabs } from './PanelTabs';
import { DesignPanel } from './design/DesignPanel';
import { ChangesPanel } from './changes/ChangesPanel';
import { ClaudeIntegrationPanel } from './claude/ClaudeIntegrationPanel';
import { ConsolePanel } from './console/ConsolePanel';
import { useEditorStore } from '@/store';
import { PANEL_DEFAULTS } from '@/lib/constants';

interface RightPanelProps {
  width: number;
}

export function RightPanel({ width }: RightPanelProps) {
  const setRightPanelWidth = useEditorStore((s) => s.setRightPanelWidth);
  const activeRightTab = useEditorStore((s) => s.activeRightTab);

  return (
    <ResizablePanel
      width={width}
      minWidth={PANEL_DEFAULTS.rightMin}
      maxWidth={PANEL_DEFAULTS.rightMax}
      onResize={setRightPanelWidth}
      side="right"
    >
      <div className="flex flex-col h-full">
        <PanelTabs />
        <div className="flex-1 overflow-y-auto">
          {activeRightTab === 'design' && <DesignPanel />}
          {activeRightTab === 'changes' && <ChangesPanel />}
          {activeRightTab === 'claude' && <ClaudeIntegrationPanel />}
          {activeRightTab === 'console' && <ConsolePanel />}
        </div>
      </div>
    </ResizablePanel>
  );
}

'use client';

import { useEditorStore } from '@/store';

export function PanelTabs() {
  const activeRightTab = useEditorStore((s) => s.activeRightTab);
  const setActiveRightTab = useEditorStore((s) => s.setActiveRightTab);
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint);
  const changeCount = useEditorStore((s) => s.styleChanges.filter((c) => c.breakpoint === activeBreakpoint).length);
  const consoleErrorCount = useEditorStore((s) => s.consoleErrorCount);

  const tabs: Array<{ id: 'design' | 'changes' | 'claude' | 'console'; label: string }> = [
    { id: 'design', label: 'Design' },
    { id: 'changes', label: 'Changes' },
    // { id: 'claude', label: 'Claude' },
    { id: 'console', label: 'Console' },
  ];

  return (
    <div
      className="flex items-center h-8 flex-shrink-0"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveRightTab(tab.id)}
          className="flex items-center gap-1.5 px-3 h-full text-xs font-medium transition-colors relative"
          style={{
            color: activeRightTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
            background: 'transparent',
          }}
        >
          {tab.label}
          {tab.id === 'changes' && changeCount > 0 && (
            <span
              className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-medium"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {changeCount}
            </span>
          )}
          {tab.id === 'console' && consoleErrorCount > 0 && (
            <span
              className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-medium"
              style={{ background: 'var(--error)', color: '#fff' }}
            >
              {consoleErrorCount}
            </span>
          )}
          {activeRightTab === tab.id && (
            <div
              className="absolute bottom-0 left-0 right-0 h-0.5"
              style={{ background: 'var(--accent)' }}
            />
          )}
        </button>
      ))}
    </div>
  );
}

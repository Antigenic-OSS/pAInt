'use client';

import { useCallback } from 'react';
import { useEditorStore } from '@/store';
import { ElementBreadcrumb } from './ElementBreadcrumb';
import { ElementLogBox } from '../ElementLogBox';
import { BorderSection } from './BorderSection';
import { LayoutSection } from './LayoutSection';
import { PositionSection } from './PositionSection';

function ChangeScopeToggle() {
  const changeScope = useEditorStore((s) => s.changeScope);
  const setChangeScope = useEditorStore((s) => s.setChangeScope);
  const updateAllSnapshotsScope = useEditorStore((s) => s.updateAllSnapshotsScope);
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint);

  const handleScopeChange = useCallback((scope: 'all' | 'breakpoint-only') => {
    setChangeScope(scope);
    updateAllSnapshotsScope(scope);
  }, [setChangeScope, updateAllSnapshotsScope]);

  return (
    <div
      className="flex items-center justify-between px-3 py-1.5"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
        Apply to
      </span>
      <div className="flex items-center gap-0.5 rounded p-0.5" style={{ background: 'var(--bg-tertiary)' }}>
        <button
          onClick={() => handleScopeChange('all')}
          className="px-2 py-0.5 text-[11px] rounded transition-colors"
          style={{
            background: changeScope === 'all' ? 'var(--accent-bg, rgba(74,158,255,0.15))' : 'transparent',
            color: changeScope === 'all' ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          All
        </button>
        <button
          onClick={() => handleScopeChange('breakpoint-only')}
          className="px-2 py-0.5 text-[11px] rounded transition-colors capitalize"
          style={{
            background: changeScope === 'breakpoint-only' ? 'var(--accent-bg, rgba(74,158,255,0.15))' : 'transparent',
            color: changeScope === 'breakpoint-only' ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          {activeBreakpoint} only
        </button>
      </div>
    </div>
  );
}

export function DesignPanel() {
  const selectorPath = useEditorStore((s) => s.selectorPath);

  if (!selectorPath) {
    return (
      <div
        className="flex items-center justify-center h-full text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        Select an element to edit
      </div>
    );
  }

  return (
    <div>
      <ElementBreadcrumb />
      <ChangeScopeToggle />
      <ElementLogBox />
      <LayoutSection />
      <BorderSection />
      <PositionSection />
    </div>
  );
}

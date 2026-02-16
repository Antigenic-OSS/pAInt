'use client';

import { useMemo } from 'react';
import { useEditorStore } from '@/store';
import { LayerNode } from './LayerNode';
import { LayerSearch } from './LayerSearch';

export function LayersPanel() {
  const rootNode = useEditorStore((s) => s.rootNode);
  const searchQuery = useEditorStore((s) => s.searchQuery);
  const styleChanges = useEditorStore((s) => s.styleChanges);

  const changedSelectors = useMemo(() => {
    const set = new Set<string>();
    for (const change of styleChanges) {
      set.add(change.elementSelector);
    }
    return set;
  }, [styleChanges]);

  if (!rootNode) {
    return (
      <div
        className="flex items-center justify-center flex-1 text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        Loading tree...
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <LayerSearch />
      <div className="flex-1 overflow-auto py-1">
        <div style={{ minWidth: 'max-content' }}>
          <LayerNode node={rootNode} depth={0} searchQuery={searchQuery} changedSelectors={changedSelectors} />
        </div>
      </div>
    </div>
  );
}

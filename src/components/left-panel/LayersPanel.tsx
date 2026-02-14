'use client';

import { useEditorStore } from '@/store';
import { LayerNode } from './LayerNode';
import { LayerSearch } from './LayerSearch';

export function LayersPanel() {
  const rootNode = useEditorStore((s) => s.rootNode);
  const searchQuery = useEditorStore((s) => s.searchQuery);

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
      <div className="flex-1 overflow-y-auto py-1">
        <LayerNode node={rootNode} depth={0} searchQuery={searchQuery} />
      </div>
    </div>
  );
}

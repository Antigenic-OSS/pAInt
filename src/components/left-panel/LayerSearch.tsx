'use client';

import { useEditorStore } from '@/store';

export function LayerSearch() {
  const searchQuery = useEditorStore((s) => s.searchQuery);
  const setSearchQuery = useEditorStore((s) => s.setSearchQuery);

  return (
    <div className="px-2 py-1.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search elements..."
        className="w-full text-xs py-1 px-2"
      />
    </div>
  );
}

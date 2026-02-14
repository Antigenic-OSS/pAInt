'use client';

import { useEffect } from 'react';
import { useEditorStore } from '@/store';

/**
 * Hook that syncs DOM tree state from the inspector.
 * The actual message handling is done in usePostMessage.
 * This hook provides convenient access to tree state.
 */
export function useDOMTree() {
  const rootNode = useEditorStore((s) => s.rootNode);
  const searchQuery = useEditorStore((s) => s.searchQuery);
  const highlightedNodeId = useEditorStore((s) => s.highlightedNodeId);
  const setSearchQuery = useEditorStore((s) => s.setSearchQuery);
  const toggleNodeExpanded = useEditorStore((s) => s.toggleNodeExpanded);

  return {
    rootNode,
    searchQuery,
    highlightedNodeId,
    setSearchQuery,
    toggleNodeExpanded,
  };
}

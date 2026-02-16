import type { StateCreator } from 'zustand';
import type { TreeNode } from '@/types/tree';

export interface TreeSlice {
  rootNode: TreeNode | null;
  expandedNodeIds: Set<string>;
  searchQuery: string;
  highlightedNodeId: string | null;

  setRootNode: (node: TreeNode | null) => void;
  setSearchQuery: (query: string) => void;
  setHighlightedNodeId: (id: string | null) => void;
  toggleNodeExpanded: (nodeId: string) => void;
  expandToNode: (nodeId: string) => void;
}

export const createTreeSlice: StateCreator<TreeSlice, [], [], TreeSlice> = (set, get) => ({
  rootNode: null,
  expandedNodeIds: new Set<string>(),
  searchQuery: '',
  highlightedNodeId: null,

  setRootNode: (node) => set({ rootNode: node }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setHighlightedNodeId: (id) => set({ highlightedNodeId: id }),

  toggleNodeExpanded: (nodeId) => {
    const { expandedNodeIds } = get();
    const next = new Set(expandedNodeIds);
    if (next.has(nodeId)) {
      next.delete(nodeId);
    } else {
      next.add(nodeId);
    }
    set({ expandedNodeIds: next });
  },

  expandToNode: (nodeId) => {
    const { expandedNodeIds } = get();
    // Parse ancestor IDs from selector path: "body > div.foo > section > p"
    // Ancestors are progressively longer prefixes: "body", "body > div.foo", etc.
    const parts = nodeId.split(' > ');
    if (parts.length <= 1) return;

    const next = new Set(expandedNodeIds);
    let changed = false;
    for (let i = 1; i < parts.length; i++) {
      const ancestorId = parts.slice(0, i).join(' > ');
      if (!next.has(ancestorId)) {
        next.add(ancestorId);
        changed = true;
      }
    }
    if (changed) {
      set({ expandedNodeIds: next });
    }
  },
});

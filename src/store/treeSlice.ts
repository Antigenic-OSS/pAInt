import type { StateCreator } from 'zustand';
import type { TreeNode } from '@/types/tree';

// Collect all node IDs that have children for full expansion
function collectAllIds(node: TreeNode, ids: Set<string>) {
  if (node.children.length === 0) return;
  ids.add(node.id);
  for (const child of node.children) {
    collectAllIds(child, ids);
  }
}

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

  setRootNode: (node) => {
    const { expandedNodeIds: prev } = get();
    // On first load (no previous state), start collapsed.
    // On subsequent updates (DOM_UPDATED), preserve user-expanded state.
    if (prev.size === 0) {
      set({ rootNode: node, expandedNodeIds: new Set<string>() });
    } else {
      set({ rootNode: node });
    }
  },
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
    // Merge ancestors into existing expanded state (preserve user-toggled branches)
    const { expandedNodeIds: prev } = get();
    const next = new Set(prev);
    const parts = nodeId.split(' > ');
    for (let i = 1; i <= parts.length; i++) {
      next.add(parts.slice(0, i).join(' > '));
    }
    set({ expandedNodeIds: next });
  },
});

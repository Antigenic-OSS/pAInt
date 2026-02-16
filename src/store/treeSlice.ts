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
    // Expand all layers by default
    const ids = new Set<string>();
    if (node) collectAllIds(node, ids);
    set({ rootNode: node, expandedNodeIds: ids });
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
    // Collapse all other branches — only expand ancestors + selected node itself
    const parts = nodeId.split(' > ');

    const next = new Set<string>();
    // Expand all ancestors
    for (let i = 1; i < parts.length; i++) {
      next.add(parts.slice(0, i).join(' > '));
    }
    // Also expand the selected node itself (so its children are visible)
    next.add(nodeId);
    set({ expandedNodeIds: next });
  },
});

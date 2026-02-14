import type { StateCreator } from 'zustand';
import type { TreeNode } from '@/types/tree';

export interface TreeSlice {
  rootNode: TreeNode | null;
  searchQuery: string;
  highlightedNodeId: string | null;

  setRootNode: (node: TreeNode | null) => void;
  setSearchQuery: (query: string) => void;
  setHighlightedNodeId: (id: string | null) => void;
  toggleNodeExpanded: (nodeId: string) => void;
}

function toggleExpanded(node: TreeNode, targetId: string): TreeNode {
  if (node.id === targetId) {
    return { ...node, isExpanded: !node.isExpanded };
  }
  return {
    ...node,
    children: node.children.map((child) => toggleExpanded(child, targetId)),
  };
}

export const createTreeSlice: StateCreator<TreeSlice, [], [], TreeSlice> = (set, get) => ({
  rootNode: null,
  searchQuery: '',
  highlightedNodeId: null,

  setRootNode: (node) => set({ rootNode: node }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setHighlightedNodeId: (id) => set({ highlightedNodeId: id }),

  toggleNodeExpanded: (nodeId) => {
    const { rootNode } = get();
    if (!rootNode) return;
    set({ rootNode: toggleExpanded(rootNode, nodeId) });
  },
});

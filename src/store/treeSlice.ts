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
  expandToNode: (nodeId: string) => void;
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

// Expand all ancestor nodes on the path to targetId so it becomes visible.
function expandAncestors(node: TreeNode, targetId: string): { node: TreeNode; found: boolean } {
  if (node.id === targetId) {
    return { node, found: true };
  }
  let anyFound = false;
  const newChildren = node.children.map((child) => {
    const result = expandAncestors(child, targetId);
    if (result.found) anyFound = true;
    return result.found ? result.node : child;
  });
  if (anyFound) {
    return { node: { ...node, children: newChildren, isExpanded: true }, found: true };
  }
  return { node, found: false };
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

  expandToNode: (nodeId) => {
    const { rootNode } = get();
    if (!rootNode) return;
    const result = expandAncestors(rootNode, nodeId);
    if (result.found) {
      set({ rootNode: result.node });
    }
  },
});

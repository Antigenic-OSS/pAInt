import type { StateCreator } from 'zustand'
import type { TreeNode } from '@/types/tree'

// Collect all node IDs that have children for full expansion
function _collectAllIds(node: TreeNode, ids: Set<string>) {
  if (node.children.length === 0) return
  ids.add(node.id)
  for (const child of node.children) {
    _collectAllIds(child, ids)
  }
}

export interface TreeSlice {
  rootNode: TreeNode | null
  expandedNodeIds: Set<string>
  collapsedNodeIds: Set<string>
  searchQuery: string
  highlightedNodeId: string | null

  setRootNode: (node: TreeNode | null) => void
  setSearchQuery: (query: string) => void
  setHighlightedNodeId: (id: string | null) => void
  toggleNodeExpanded: (nodeId: string) => void
  expandToNode: (nodeId: string) => void
}

export const createTreeSlice: StateCreator<TreeSlice, [], [], TreeSlice> = (
  set,
  get,
) => ({
  rootNode: null,
  expandedNodeIds: new Set<string>(),
  collapsedNodeIds: new Set<string>(),
  searchQuery: '',
  highlightedNodeId: null,

  setRootNode: (node) => {
    if (!node) {
      set({ rootNode: null, expandedNodeIds: new Set<string>(), collapsedNodeIds: new Set<string>() })
      return
    }
    // Expand all nodes by default, but respect user-collapsed nodes.
    const all = new Set<string>()
    _collectAllIds(node, all)
    const { collapsedNodeIds } = get()
    for (const id of collapsedNodeIds) {
      all.delete(id)
    }
    set({ rootNode: node, expandedNodeIds: all })
  },
  setSearchQuery: (query) => set({ searchQuery: query }),
  setHighlightedNodeId: (id) => set({ highlightedNodeId: id }),

  toggleNodeExpanded: (nodeId) => {
    const { expandedNodeIds, collapsedNodeIds } = get()
    const nextExpanded = new Set(expandedNodeIds)
    const nextCollapsed = new Set(collapsedNodeIds)
    if (nextExpanded.has(nodeId)) {
      nextExpanded.delete(nodeId)
      nextCollapsed.add(nodeId)
    } else {
      nextExpanded.add(nodeId)
      nextCollapsed.delete(nodeId)
    }
    set({ expandedNodeIds: nextExpanded, collapsedNodeIds: nextCollapsed })
  },

  expandToNode: (nodeId) => {
    // Merge ancestors into existing expanded state and clear them from collapsed
    const { expandedNodeIds: prev, collapsedNodeIds: prevCollapsed } = get()
    const next = new Set(prev)
    const nextCollapsed = new Set(prevCollapsed)
    const parts = nodeId.split(' > ')
    for (let i = 1; i <= parts.length; i++) {
      const ancestor = parts.slice(0, i).join(' > ')
      next.add(ancestor)
      nextCollapsed.delete(ancestor)
    }
    set({ expandedNodeIds: next, collapsedNodeIds: nextCollapsed })
  },
})

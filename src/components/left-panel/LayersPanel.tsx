'use client'

import { useMemo } from 'react'
import { useEditorStore } from '@/store'
import { LayerNode } from './LayerNode'
import { LayerSearch } from './LayerSearch'

export function LayersPanel() {
  const rootNode = useEditorStore((s) => s.rootNode)
  const searchQuery = useEditorStore((s) => s.searchQuery)
  const styleChanges = useEditorStore((s) => s.styleChanges)

  const { changedSelectors, deletedSelectors } = useMemo(() => {
    const changed = new Set<string>()
    const deleted = new Set<string>()
    for (const change of styleChanges) {
      changed.add(change.elementSelector)
      if (change.property === '__element_deleted__') {
        deleted.add(change.elementSelector)
      }
    }
    return { changedSelectors: changed, deletedSelectors: deleted }
  }, [styleChanges])

  if (!rootNode) {
    return (
      <div
        className="flex items-center justify-center flex-1 text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        Loading tree...
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <LayerSearch />
      <div className="flex-1 overflow-auto py-1">
        <div style={{ minWidth: 'max-content' }}>
          <LayerNode
            node={rootNode}
            depth={0}
            searchQuery={searchQuery}
            changedSelectors={changedSelectors}
            deletedSelectors={deletedSelectors}
          />
        </div>
      </div>
    </div>
  )
}

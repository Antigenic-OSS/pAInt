'use client'

import { useCallback } from 'react'
import { useEditorStore } from '@/store'
import { usePostMessage } from './usePostMessage'

/**
 * Hook that manages element selection with bidirectional sync.
 * Click tree node → sends SELECT_ELEMENT to inspector.
 * Inspector click → updates store (handled by usePostMessage).
 */
export function useSelectedElement() {
  const selectorPath = useEditorStore((s) => s.selectorPath)
  const tagName = useEditorStore((s) => s.tagName)
  const className = useEditorStore((s) => s.className)
  const elementId = useEditorStore((s) => s.elementId)
  const attributes = useEditorStore((s) => s.attributes)
  const innerText = useEditorStore((s) => s.innerText)
  const computedStyles = useEditorStore((s) => s.computedStyles)
  const boundingRect = useEditorStore((s) => s.boundingRect)
  const clearSelection = useEditorStore((s) => s.clearSelection)
  const { sendToInspector } = usePostMessage()

  const selectFromTree = useCallback(
    (selectorPath: string) => {
      sendToInspector({
        type: 'SELECT_ELEMENT',
        payload: { selectorPath },
      })
    },
    [sendToInspector],
  )

  const deselect = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  return {
    selectorPath,
    tagName,
    className,
    elementId,
    attributes,
    innerText,
    computedStyles,
    boundingRect,
    selectFromTree,
    deselect,
    isSelected: selectorPath !== null,
  }
}

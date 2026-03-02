'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useEditorStore } from '@/store'
import { usePostMessage, sendViaIframe } from './usePostMessage'
import { generateId } from '@/lib/utils'

/**
 * Perform undo — can be called outside React components (e.g., keyboard shortcuts).
 * Pops from undo stack, reverts the change in the iframe, updates store.
 */
export function performUndo() {
  const action = useEditorStore.getState().popUndo()
  if (!action) return

  if (action.property === '__element_moved__') {
    // Parse beforeValue: "parent:<selector>|index:<num>|selector:<oldSelector>"
    const mvParts = action.beforeValue.split('|')
    const mvOldParent = mvParts[0]?.replace('parent:', '') || ''
    const mvOldIndex = parseInt(mvParts[1]?.replace('index:', '') || '0', 10)
    sendViaIframe({
      type: 'REVERT_MOVE_ELEMENT',
      payload: {
        selectorPath: action.elementSelector,
        oldParentSelectorPath: mvOldParent,
        oldIndex: mvOldIndex,
      },
    })
  } else if (action.property === '__element_inserted__') {
    sendViaIframe({
      type: 'REMOVE_INSERTED_ELEMENT',
      payload: { selectorPath: action.elementSelector },
    })
  } else if (action.property === '__element_deleted__') {
    sendViaIframe({
      type: 'REVERT_DELETE',
      payload: {
        selectorPath: action.elementSelector,
        originalDisplay: action.beforeValue,
      },
    })
  } else if (action.property === '__text_content__') {
    if (action.wasNewChange) {
      sendViaIframe({
        type: 'REVERT_TEXT_CONTENT',
        payload: {
          selectorPath: action.elementSelector,
          originalText: action.beforeValue,
        },
      })
    } else {
      sendViaIframe({
        type: 'SET_TEXT_CONTENT',
        payload: {
          selectorPath: action.elementSelector,
          text: action.beforeValue,
        },
      })
    }
  } else if (action.wasNewChange) {
    sendViaIframe({
      type: 'REVERT_CHANGE',
      payload: {
        selectorPath: action.elementSelector,
        property: action.property,
      },
    })
  } else {
    sendViaIframe({
      type: 'PREVIEW_CHANGE',
      payload: {
        selectorPath: action.elementSelector,
        property: action.property,
        value: action.beforeValue,
      },
    })
  }

  // Update local computedStyles for undo
  if (
    action.property !== '__text_content__' &&
    action.property !== '__element_deleted__' &&
    action.property !== '__element_inserted__' &&
    action.property !== '__element_moved__'
  ) {
    const store = useEditorStore.getState()
    store.updateComputedStyles({
      ...store.computedStyles,
      [action.property]: action.beforeValue,
    })
  }
}

/**
 * Perform redo — can be called outside React components (e.g., keyboard shortcuts).
 * Pops from redo stack, re-applies the change in the iframe, updates store.
 */
export function performRedo() {
  // Check if this redo will auto-remove a change (value returns to original)
  const { redoStack, styleChanges } = useEditorStore.getState()
  if (redoStack.length === 0) return
  const peekAction = redoStack[redoStack.length - 1]
  const existingChange = styleChanges.find(
    (c) =>
      c.elementSelector === peekAction.elementSelector &&
      c.property === peekAction.property,
  )
  const willAutoRemove =
    existingChange && peekAction.afterValue === existingChange.originalValue

  const action = useEditorStore.getState().popRedo()
  if (!action) return

  if (action.property === '__element_moved__') {
    // Re-do the move: parse afterValue "parent:<selector>|index:<num>"
    const rdMvParts = action.afterValue.split('|')
    const rdMvParent = rdMvParts[0]?.replace('parent:', '') || ''
    const rdMvIndex = parseInt(rdMvParts[1]?.replace('index:', '') || '0', 10)
    // Parse beforeValue to get the old selector: "parent:...|index:...|selector:<oldSelector>"
    const rdMvBefore = action.beforeValue.split('|')
    const rdMvOldSelector =
      rdMvBefore[2]?.replace('selector:', '') || action.elementSelector
    sendViaIframe({
      type: 'MOVE_ELEMENT',
      payload: {
        selectorPath: rdMvOldSelector,
        newParentSelectorPath: rdMvParent,
        newIndex: rdMvIndex,
      },
    })
  } else if (action.property === '__element_inserted__') {
    // Re-insert: parse the originalValue which stores parent and tag info
    // For redo of element insertion, we'd need to re-insert, but since the element
    // was removed from DOM, a full redo isn't trivially possible. Reload instead.
    const iframe = document.querySelector<HTMLIFrameElement>(
      'iframe[title="Preview"]',
    )
    if (iframe?.src) iframe.src = iframe.src
  } else if (action.property === '__element_deleted__') {
    sendViaIframe({
      type: 'PREVIEW_CHANGE',
      payload: {
        selectorPath: action.elementSelector,
        property: 'display',
        value: 'none',
      },
    })
  } else if (action.property === '__text_content__') {
    sendViaIframe({
      type: 'SET_TEXT_CONTENT',
      payload: {
        selectorPath: action.elementSelector,
        text: action.afterValue,
      },
    })
  } else if (willAutoRemove) {
    // Value returned to original — revert inline style entirely
    sendViaIframe({
      type: 'REVERT_CHANGE',
      payload: {
        selectorPath: action.elementSelector,
        property: action.property,
      },
    })
  } else {
    sendViaIframe({
      type: 'PREVIEW_CHANGE',
      payload: {
        selectorPath: action.elementSelector,
        property: action.property,
        value: action.afterValue,
      },
    })
  }

  // Update local computedStyles for redo
  if (
    action.property !== '__text_content__' &&
    action.property !== '__element_deleted__' &&
    action.property !== '__element_inserted__' &&
    action.property !== '__element_moved__'
  ) {
    const store = useEditorStore.getState()
    store.updateComputedStyles({
      ...store.computedStyles,
      [action.property]: action.afterValue,
    })
  }
}

/**
 * Revert all changes — can be called outside React components.
 * Reverts text changes, clears the store, and reloads the iframe.
 */
export function performRevertAll() {
  const state = useEditorStore.getState()
  const textChanges = state.styleChanges.filter(
    (c) => c.property === '__text_content__',
  )
  for (const tc of textChanges) {
    sendViaIframe({
      type: 'REVERT_TEXT_CONTENT',
      payload: {
        selectorPath: tc.elementSelector,
        originalText: tc.originalValue,
      },
    })
  }
  const deleteChanges = state.styleChanges.filter(
    (c) => c.property === '__element_deleted__',
  )
  for (const dc of deleteChanges) {
    sendViaIframe({
      type: 'REVERT_DELETE',
      payload: {
        selectorPath: dc.elementSelector,
        originalDisplay: dc.originalValue,
      },
    })
  }
  const insertChanges = state.styleChanges.filter(
    (c) => c.property === '__element_inserted__',
  )
  for (const ic of insertChanges) {
    sendViaIframe({
      type: 'REMOVE_INSERTED_ELEMENT',
      payload: { selectorPath: ic.elementSelector },
    })
  }
  const moveChanges = state.styleChanges.filter(
    (c) => c.property === '__element_moved__',
  )
  for (const mc of moveChanges) {
    const parts = mc.originalValue.split('|')
    const oldParent = parts[0]?.replace('parent:', '') || ''
    const oldIndex = parseInt(parts[1]?.replace('index:', '') || '0', 10)
    sendViaIframe({
      type: 'REVERT_MOVE_ELEMENT',
      payload: {
        selectorPath: mc.elementSelector,
        oldParentSelectorPath: oldParent,
        oldIndex,
      },
    })
  }

  state.clearAllChanges()
  state.clearComponents()

  // Clear persisted changes from localStorage so they don't come back on refresh
  if (state.targetUrl) {
    state.persistChanges(state.targetUrl)
  }

  // Force-reload the iframe to guarantee a clean state
  const iframe = document.querySelector<HTMLIFrameElement>(
    'iframe[title="Preview"]',
  )
  if (iframe?.src) {
    iframe.src = iframe.src
  }
}

/**
 * Hook that tracks style changes, sends PREVIEW_CHANGE to inspector,
 * and auto-persists changes to localStorage.
 */
export function useChangeTracker() {
  const targetUrl = useEditorStore((s) => s.targetUrl)
  const addStyleChange = useEditorStore((s) => s.addStyleChange)
  const removeStyleChange = useEditorStore((s) => s.removeStyleChange)
  const saveElementSnapshot = useEditorStore((s) => s.saveElementSnapshot)
  const pushUndo = useEditorStore((s) => s.pushUndo)
  const { sendToInspector } = usePostMessage()

  // Auto-persist changes when they update (count OR content)
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevChangesRef = useRef<unknown>(null)

  useEffect(() => {
    const unsubscribe = useEditorStore.subscribe((state) => {
      // Trigger on any styleChanges or elementSnapshots reference change
      const ref = state.styleChanges
      if (ref === prevChangesRef.current) return
      prevChangesRef.current = ref

      const url = state.targetUrl
      if (!url) return

      // Debounce persistence
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current)
      persistTimeoutRef.current = setTimeout(() => {
        useEditorStore.getState().persistChanges(url)
      }, 300)
    })

    return () => {
      unsubscribe()
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current)
    }
  }, [])

  // Load persisted changes when target URL changes
  useEffect(() => {
    if (targetUrl) {
      useEditorStore.getState().loadPersistedChanges(targetUrl)
    }
  }, [targetUrl])

  const applyChange = useCallback(
    (property: string, value: string) => {
      // Read latest state directly to avoid stale closures and
      // prevent re-creating this callback on every computedStyles change.
      const { selectorPath, computedStyles, activeBreakpoint } =
        useEditorStore.getState()
      if (!selectorPath) return

      // Check if a change already exists for this element+property
      const existing = useEditorStore
        .getState()
        .styleChanges.find(
          (c) => c.elementSelector === selectorPath && c.property === property,
        )

      // When an existing change exists, compare against its newValue (exact format)
      // rather than computedStyles which may have been reformatted by the browser
      // (e.g., hex → rgb). This ensures rapid color picks always record the latest value.
      const currentValue = existing
        ? existing.newValue
        : computedStyles[property] || ''
      const originalValue = computedStyles[property] || ''

      // Don't track if value hasn't changed
      if (currentValue === value) return

      // Detect auto-reset: value returning to the true original
      const isAutoReset = existing && value === existing.originalValue

      // Push undo action
      const state0 = useEditorStore.getState()
      pushUndo({
        elementSelector: selectorPath,
        property,
        beforeValue: existing ? existing.newValue : originalValue,
        afterValue: value,
        breakpoint: activeBreakpoint,
        wasNewChange: !existing,
        changeScope: state0.changeScope,
      })

      if (isAutoReset) {
        // Revert inline style in iframe (remove it entirely)
        sendToInspector({
          type: 'REVERT_CHANGE',
          payload: { selectorPath, property },
        })
      } else {
        // Send preview change to inspector
        sendToInspector({
          type: 'PREVIEW_CHANGE',
          payload: { selectorPath, property, value },
        })
      }

      // Update local computedStyles so UI reacts immediately
      useEditorStore.getState().updateComputedStyles({
        ...useEditorStore.getState().computedStyles,
        [property]: value,
      })

      // Capture element snapshot at the time of change
      const state = useEditorStore.getState()
      saveElementSnapshot({
        selectorPath,
        tagName: state.tagName || 'unknown',
        className: state.className,
        elementId: state.elementId,
        attributes: state.attributes,
        innerText: state.innerText,
        computedStyles: { ...state.computedStyles },
        pagePath: state.currentPagePath,
        changeScope: state.changeScope,
        sourceInfo: state.sourceInfo,
      })

      // Track the change (addStyleChange auto-removes if newValue === originalValue)
      addStyleChange({
        id: generateId(),
        elementSelector: selectorPath,
        property,
        originalValue,
        newValue: value,
        breakpoint: activeBreakpoint,
        timestamp: Date.now(),
        changeScope: state.changeScope,
      })
    },
    [addStyleChange, saveElementSnapshot, sendToInspector, pushUndo],
  )

  const revertChange = useCallback(
    (changeId: string, selectorPath: string, property: string) => {
      if (property === '__element_moved__') {
        const change = useEditorStore
          .getState()
          .styleChanges.find((c) => c.id === changeId)
        if (change) {
          const parts = change.originalValue.split('|')
          const oldParent = parts[0]?.replace('parent:', '') || ''
          const oldIndex = parseInt(parts[1]?.replace('index:', '') || '0', 10)
          sendToInspector({
            type: 'REVERT_MOVE_ELEMENT',
            payload: {
              selectorPath,
              oldParentSelectorPath: oldParent,
              oldIndex,
            },
          })
        }
      } else if (property === '__element_inserted__') {
        sendToInspector({
          type: 'REMOVE_INSERTED_ELEMENT',
          payload: { selectorPath },
        })
      } else if (property === '__element_deleted__') {
        const change = useEditorStore
          .getState()
          .styleChanges.find((c) => c.id === changeId)
        if (change) {
          sendToInspector({
            type: 'REVERT_DELETE',
            payload: { selectorPath, originalDisplay: change.originalValue },
          })
        }
      } else if (property === '__text_content__') {
        const change = useEditorStore
          .getState()
          .styleChanges.find((c) => c.id === changeId)
        if (change) {
          sendToInspector({
            type: 'REVERT_TEXT_CONTENT',
            payload: { selectorPath, originalText: change.originalValue },
          })
        }
      } else {
        sendToInspector({
          type: 'REVERT_CHANGE',
          payload: { selectorPath, property },
        })
      }
      removeStyleChange(changeId)
    },
    [sendToInspector, removeStyleChange],
  )

  const revertAll = useCallback(() => {
    // Revert text and delete changes before clearing (iframe reload handles style changes)
    const state = useEditorStore.getState()
    const textChanges = state.styleChanges.filter(
      (c) => c.property === '__text_content__',
    )
    for (const tc of textChanges) {
      sendToInspector({
        type: 'REVERT_TEXT_CONTENT',
        payload: {
          selectorPath: tc.elementSelector,
          originalText: tc.originalValue,
        },
      })
    }
    const deleteChanges = state.styleChanges.filter(
      (c) => c.property === '__element_deleted__',
    )
    for (const dc of deleteChanges) {
      sendToInspector({
        type: 'REVERT_DELETE',
        payload: {
          selectorPath: dc.elementSelector,
          originalDisplay: dc.originalValue,
        },
      })
    }
    const insertChanges = state.styleChanges.filter(
      (c) => c.property === '__element_inserted__',
    )
    for (const ic of insertChanges) {
      sendToInspector({
        type: 'REMOVE_INSERTED_ELEMENT',
        payload: { selectorPath: ic.elementSelector },
      })
    }
    const moveChanges = state.styleChanges.filter(
      (c) => c.property === '__element_moved__',
    )
    for (const mc of moveChanges) {
      const parts = mc.originalValue.split('|')
      const oldParent = parts[0]?.replace('parent:', '') || ''
      const oldIndex = parseInt(parts[1]?.replace('index:', '') || '0', 10)
      sendToInspector({
        type: 'REVERT_MOVE_ELEMENT',
        payload: {
          selectorPath: mc.elementSelector,
          oldParentSelectorPath: oldParent,
          oldIndex,
        },
      })
    }

    state.clearAllChanges()

    // Persist empty state to localStorage so changes don't reappear on reconnect
    if (state.targetUrl) {
      state.persistChanges(state.targetUrl)
    }

    // Force-reload the iframe to guarantee a clean state — removing
    // inline styles via REVERT_ALL can leave layout artifacts.
    const iframe = document.querySelector<HTMLIFrameElement>(
      'iframe[title="Preview"]',
    )
    if (iframe?.src) {
      iframe.src = iframe.src
    }
  }, [sendToInspector])

  const resetProperty = useCallback(
    (property: string) => {
      const { selectorPath, styleChanges, computedStyles } =
        useEditorStore.getState()
      if (!selectorPath) return

      const change = styleChanges.find(
        (c) => c.elementSelector === selectorPath && c.property === property,
      )
      if (!change) return

      // Revert in iframe
      sendToInspector({
        type: 'REVERT_CHANGE',
        payload: { selectorPath, property },
      })

      // Remove from tracked changes
      removeStyleChange(change.id)

      // Restore original computedStyles
      useEditorStore.getState().updateComputedStyles({
        ...useEditorStore.getState().computedStyles,
        [property]: change.originalValue,
      })
    },
    [sendToInspector, removeStyleChange],
  )

  return {
    applyChange,
    revertChange,
    revertAll,
    resetProperty,
    undo: performUndo,
    redo: performRedo,
  }
}

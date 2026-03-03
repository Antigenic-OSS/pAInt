'use client'

import type React from 'react'
import { useEffect, useCallback } from 'react'
import { useEditorStore } from '@/store'
import type {
  InspectorToEditorMessage,
  EditorToInspectorMessage,
} from '@/types/messages'
import { generateId } from '@/lib/utils'
import { buildTailwindClassMap } from '@/lib/tailwindClassParser'
import { getApiBase } from '@/lib/apiBase'

function isAllowedOrigin(origin: string): boolean {
  try {
    const url = new URL(origin)
    // Always allow localhost/127.0.0.1 (primary use case)
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
      return true
    // Allow the editor's own origin (same-origin messages, e.g. proxy mode)
    if (typeof window !== 'undefined' && origin === window.location.origin)
      return true
    // Also allow if origin matches the current target URL (for live site editing)
    const targetUrl = useEditorStore.getState().targetUrl
    if (targetUrl) {
      const targetOrigin = new URL(targetUrl).origin
      if (origin === targetOrigin) return true
    }
    return false
  } catch {
    return false
  }
}

// Module-level shared iframe ref — ensures all callers of usePostMessage()
// share the same ref. PreviewFrame assigns it to the DOM element, and other
// components (DragModeToggle, etc.) can send messages through it.
const sharedIframeRef: React.MutableRefObject<HTMLIFrameElement | null> = {
  current: null,
}

// Singleton message listener — registered once to prevent duplicate handlers
// when multiple components call usePostMessage(). Uses useEditorStore.getState()
// so it always reads fresh state without stale closures.
let listenerRegistered = false
let heartbeatResolve: (() => void) | null = null
let componentRescanTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Returns true when the editor is running on localhost (proxy mode).
 * When false, the editor is deployed remotely and must use direct iframe loading.
 */
export function isEditorOnLocalhost(): boolean {
  const h = window.location.hostname
  return h === 'localhost' || h === '127.0.0.1'
}

export function sendViaIframe(message: EditorToInspectorMessage) {
  const iframe = sharedIframeRef.current
  if (!iframe?.contentWindow) return
  // Detect the iframe's actual origin by trying same-origin access.
  // This correctly handles all modes without relying on store state
  // (which may not yet reflect the iframe's actual URL):
  // - Proxy mode (same-origin): contentWindow.location.origin succeeds
  // - Preview/direct mode (cross-origin): throws, fall back to target origin or '*'
  // - Bridge mode (cross-origin): throws, fall back to bridge or target origin
  // Note: postMessage silently drops messages on origin mismatch (no throw),
  // so we must determine the correct origin upfront.
  let targetOrigin: string
  try {
    // Same-origin: can read iframe's location directly
    targetOrigin = iframe.contentWindow.location.origin
  } catch {
    // Cross-origin: fall back based on configuration
    const store = useEditorStore.getState()
    const bridgeUrl = store.bridgeUrl
    if (bridgeUrl) {
      try {
        targetOrigin = new URL(bridgeUrl).origin
      } catch {
        targetOrigin = '*'
      }
    } else if (store.targetUrl) {
      try {
        targetOrigin = new URL(store.targetUrl).origin
      } catch {
        targetOrigin = '*'
      }
    } else {
      targetOrigin = '*'
    }
  }
  iframe.contentWindow.postMessage(message, targetOrigin)
}

function handleMessage(event: MessageEvent) {
  if (!isAllowedOrigin(event.origin)) return
  const msg = event.data as InspectorToEditorMessage
  if (!msg || !msg.type) return

  const store = useEditorStore.getState()

  switch (msg.type) {
    case 'INSPECTOR_READY': {
      store.setConnectionStatus('connected')
      store.clearConsole()
      // Re-sync selection mode — the fresh inspector defaults to selectionModeEnabled=true,
      // but if the editor is in preview mode (or selection is toggled off), we need to
      // tell the inspector immediately so clicks pass through for navigation.
      const effectiveSelection = store.viewMode ? false : store.selectionMode
      sendViaIframe({
        type: 'SET_SELECTION_MODE',
        payload: { enabled: effectiveSelection },
      })
      sendViaIframe({ type: 'REQUEST_DOM_TREE' })
      sendViaIframe({ type: 'REQUEST_PAGE_LINKS' })
      sendViaIframe({ type: 'REQUEST_CSS_VARIABLES' })
      setTimeout(() => {
        sendViaIframe({ type: 'REQUEST_COMPONENTS', payload: {} })
      }, 500)

      // Re-apply persisted changes to the iframe after a fresh load/refresh.
      // The store already has them (loaded via useChangeTracker), but the
      // iframe DOM is fresh — so we need to replay every PREVIEW_CHANGE.
      const persisted = useEditorStore.getState().styleChanges
      if (persisted.length > 0) {
        for (const change of persisted) {
          if (change.property === '__element_deleted__') {
            // Re-hide deleted elements by sending DELETE_ELEMENT (without re-tracking,
            // the inspector will send ELEMENT_DELETED but we deduplicate below)
            sendViaIframe({
              type: 'DELETE_ELEMENT',
              payload: { selectorPath: change.elementSelector },
            })
            continue
          }
          if (
            change.property === '__text_content__' ||
            change.property === '__component_creation__' ||
            change.property === '__element_inserted__' ||
            change.property === '__element_moved__'
          )
            continue
          sendViaIframe({
            type: 'PREVIEW_CHANGE',
            payload: {
              selectorPath: change.elementSelector,
              property: change.property,
              value: change.newValue,
            },
          })
        }
      }
      break
    }

    case 'ELEMENT_SELECTED': {
      // Check for tracked changes on this element BEFORE updating the store.
      // When re-selecting an element, the inspector sends fresh computedStyles
      // that don't reflect previously applied inline changes (the inline styles
      // may have been lost to DOM re-renders). We merge tracked change values
      // into computedStyles so the store gets correct values in a single update,
      // and re-apply the inline styles to the iframe DOM.
      const trackedChanges = store.styleChanges.filter(
        (c) => c.elementSelector === msg.payload.selectorPath,
      )
      if (trackedChanges.length > 0) {
        const merged = { ...msg.payload.computedStyles }
        for (const change of trackedChanges) {
          merged[change.property] = change.newValue
          sendViaIframe({
            type: 'PREVIEW_CHANGE',
            payload: {
              selectorPath: msg.payload.selectorPath,
              property: change.property,
              value: change.newValue,
            },
          })
        }
        msg.payload.computedStyles = merged
      }
      store.selectElement(msg.payload)
      store.expandToNode(msg.payload.selectorPath)
      store.setCSSVariableUsages(msg.payload.cssVariableUsages || {})
      // Build Tailwind class → CSS property → variable mapping
      const twMap = buildTailwindClassMap(
        msg.payload.className,
        store.cssVariableDefinitions,
      )
      store.setTailwindClassMap(twMap)
      store.setActiveRightTab('design')
      break
    }

    case 'CSS_VARIABLES': {
      store.setCSSVariableDefinitions(
        msg.payload.definitions,
        msg.payload.isExplicit,
        msg.payload.scopes,
      )
      const varCount = Object.keys(msg.payload.definitions).length
      const csProjectRoot = useEditorStore.getState().projectRoot

      // If the inspector found no variables, try scanning the project folder
      if (varCount === 0 && csProjectRoot) {
        fetch(`${getApiBase()}/api/project-scan/css-variables`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectRoot: csProjectRoot }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.definitions && Object.keys(data.definitions).length > 0) {
              useEditorStore
                .getState()
                .setCSSVariableDefinitions(data.definitions, false)
            }
          })
          .catch(() => {
            /* ignore scan failures */
          })
      }

      // Also try Tailwind config parser to supplement with theme colors
      if (csProjectRoot) {
        fetch(`${getApiBase()}/api/project-scan/tailwind-config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectRoot: csProjectRoot }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.definitions && Object.keys(data.definitions).length > 0) {
              // Merge with existing definitions (don't overwrite runtime-scanned vars)
              const current = useEditorStore.getState().cssVariableDefinitions
              const merged = { ...data.definitions, ...current }
              useEditorStore.getState().setCSSVariableDefinitions(merged, false)
            }
          })
          .catch(() => {
            /* ignore tailwind config scan failures */
          })
      }
      break
    }

    case 'ELEMENT_HOVERED':
      store.setHighlightedNodeId(msg.payload.selectorPath)
      break

    case 'DOM_TREE':
      store.setRootNode(msg.payload.tree)
      break

    case 'DOM_UPDATED':
      store.setRootNode(msg.payload.tree)
      if (msg.payload.removedSelectors.length > 0) {
        const currentSelector = store.selectorPath
        if (
          currentSelector &&
          msg.payload.removedSelectors.includes(currentSelector)
        ) {
          store.clearSelection()
        }
      }
      // Debounced component rescan on DOM changes (2s to avoid
      // excessive scanning during rapid DOM mutations)
      if (componentRescanTimer) clearTimeout(componentRescanTimer)
      componentRescanTimer = setTimeout(() => {
        componentRescanTimer = null
        sendViaIframe({ type: 'REQUEST_COMPONENTS', payload: {} })
      }, 2000)
      break

    case 'HEARTBEAT_RESPONSE':
      if (heartbeatResolve) {
        heartbeatResolve()
        heartbeatResolve = null
      }
      break

    case 'PAGE_LINKS':
      store.setPageLinks(msg.payload.links)
      break

    case 'COMPONENTS_DETECTED':
      store.setDetectedComponents(msg.payload.components)
      break

    case 'VARIANT_APPLIED':
      if (msg.payload.selectorPath === store.selectorPath) {
        store.updateComputedStyles(msg.payload.computedStyles)
        store.setCSSVariableUsages(msg.payload.cssVariableUsages)
      }
      break

    case 'PAGE_NAVIGATE':
      store.setCurrentPagePath(msg.payload.path)
      store.clearSelection()
      store.clearComponents()
      break

    case 'CONSOLE_MESSAGE':
      store.addConsoleEntry(msg.payload)
      break

    case 'RECURSIVE_EMBED_DETECTED': {
      // The iframe loaded pAInt's own page instead of the target.
      // This happens when the navigation blocker failed to intercept a
      // programmatic navigation after history.replaceState. Reload the iframe
      // with the correct proxy URL to recover.
      console.warn(
        '[pAInt] Recursive embed detected — reloading iframe through proxy',
      )
      const iframe = sharedIframeRef.current
      const recoverTarget = store.targetUrl
      if (iframe && recoverTarget) {
        const encoded = encodeURIComponent(recoverTarget)
        const pagePath =
          store.currentPagePath === '/' ? '' : store.currentPagePath
        iframe.src = `/api/proxy${pagePath}?x-dev-editor-target=${encoded}`
      }
      break
    }

    case 'TEXT_CHANGED': {
      const { selectorPath: textSelector, originalText, newText } = msg.payload
      const textProperty = '__text_content__'

      // Check if a text change already exists for this element (dedup)
      const existingText = store.styleChanges.find(
        (c) =>
          c.elementSelector === textSelector && c.property === textProperty,
      )

      // Push undo action
      store.pushUndo({
        elementSelector: textSelector,
        property: textProperty,
        beforeValue: existingText ? existingText.newValue : originalText,
        afterValue: newText,
        breakpoint: store.activeBreakpoint,
        wasNewChange: !existingText,
        changeScope: store.changeScope,
      })

      // Save element snapshot
      const textEl = store.selectorPath === textSelector ? store : null
      store.saveElementSnapshot({
        selectorPath: textSelector,
        tagName: textEl?.tagName || 'unknown',
        className: textEl?.className ?? null,
        elementId: textEl?.elementId ?? null,
        attributes: textEl?.attributes || {},
        innerText: newText,
        computedStyles: textEl?.computedStyles
          ? { ...textEl.computedStyles }
          : {},
        pagePath: store.currentPagePath,
        changeScope: store.changeScope,
        sourceInfo: textEl?.sourceInfo ?? null,
      })

      // Add style change with sentinel property
      store.addStyleChange({
        id: generateId(),
        elementSelector: textSelector,
        property: textProperty,
        originalValue: originalText,
        newValue: newText,
        breakpoint: store.activeBreakpoint,
        timestamp: Date.now(),
        changeScope: store.changeScope,
      })
      break
    }

    case 'ELEMENT_INSERTED': {
      const {
        selectorPath: insSelector,
        parentSelectorPath: insParent,
        tagName: insTag,
        insertionIndex: insIndex,
        placeholderText: insText,
        defaultStyles: insDefaultStyles,
      } = msg.payload
      const insProperty = '__element_inserted__'

      // Push undo action
      store.pushUndo({
        elementSelector: insSelector,
        property: insProperty,
        beforeValue: '',
        afterValue: 'inserted',
        breakpoint: store.activeBreakpoint,
        wasNewChange: true,
        changeScope: store.changeScope,
      })

      // Save element snapshot with default styles as computedStyles
      store.saveElementSnapshot({
        selectorPath: insSelector,
        tagName: insTag,
        className: null,
        elementId: null,
        attributes: {},
        innerText: insText || null,
        computedStyles: insDefaultStyles ? { ...insDefaultStyles } : {},
        pagePath: store.currentPagePath,
        changeScope: store.changeScope,
        sourceInfo: null,
      })

      // Track the insertion
      store.addStyleChange({
        id: generateId(),
        elementSelector: insSelector,
        property: insProperty,
        originalValue: `parent:${insParent}|index:${insIndex}`,
        newValue: 'inserted',
        breakpoint: store.activeBreakpoint,
        timestamp: Date.now(),
        changeScope: store.changeScope,
      })

      // Record each default style as an individual style change
      if (insDefaultStyles) {
        const insTimestamp = Date.now()
        for (const [prop, val] of Object.entries(insDefaultStyles)) {
          store.addStyleChange({
            id: generateId(),
            elementSelector: insSelector,
            property: prop,
            originalValue: '',
            newValue: val,
            breakpoint: store.activeBreakpoint,
            timestamp: insTimestamp,
            changeScope: store.changeScope,
          })
        }
      }
      break
    }

    case 'ELEMENT_MOVED': {
      const {
        selectorPath: mvOldSelector,
        newSelectorPath: mvNewSelector,
        oldParentSelectorPath: mvOldParent,
        newParentSelectorPath: mvNewParent,
        oldIndex: mvOldIndex,
        newIndex: mvNewIndex,
        tagName: mvTag,
        className: mvClass,
        elementId: mvId,
        innerText: mvText,
        attributes: mvAttrs,
        computedStyles: mvStyles,
      } = msg.payload
      const mvProperty = '__element_moved__'

      // Push undo action
      store.pushUndo({
        elementSelector: mvNewSelector,
        property: mvProperty,
        beforeValue: `parent:${mvOldParent}|index:${mvOldIndex}|selector:${mvOldSelector}`,
        afterValue: `parent:${mvNewParent}|index:${mvNewIndex}`,
        breakpoint: store.activeBreakpoint,
        wasNewChange: true,
        changeScope: store.changeScope,
      })

      // Save element snapshot so move appears in Changes panel
      store.saveElementSnapshot({
        selectorPath: mvNewSelector,
        tagName: mvTag || 'unknown',
        className: mvClass ?? null,
        elementId: mvId ?? null,
        attributes: mvAttrs || {},
        innerText: mvText,
        computedStyles: mvStyles ? { ...mvStyles } : {},
        pagePath: store.currentPagePath,
        changeScope: store.changeScope,
        sourceInfo: null,
      })

      // Track the move
      store.addStyleChange({
        id: generateId(),
        elementSelector: mvNewSelector,
        property: mvProperty,
        originalValue: `parent:${mvOldParent}|index:${mvOldIndex}|selector:${mvOldSelector}`,
        newValue: `parent:${mvNewParent}|index:${mvNewIndex}`,
        breakpoint: store.activeBreakpoint,
        timestamp: Date.now(),
        changeScope: store.changeScope,
      })

      // Update selected element path if it changed — re-select via inspector
      if (
        store.selectorPath === mvOldSelector &&
        mvOldSelector !== mvNewSelector
      ) {
        sendViaIframe({
          type: 'SELECT_ELEMENT',
          payload: { selectorPath: mvNewSelector },
        })
      }

      // Request updated DOM tree
      sendViaIframe({ type: 'REQUEST_DOM_TREE' })
      break
    }

    case 'ELEMENT_DELETED': {
      const {
        selectorPath: delSelector,
        originalDisplay,
        tagName: delTag,
        className: delClass,
        elementId: delId,
        innerText: delText,
        attributes: delAttrs,
        computedStyles: delStyles,
      } = msg.payload
      const delProperty = '__element_deleted__'

      // Skip if already tracked (e.g., replayed on reconnect)
      const existingDelete = store.styleChanges.find(
        (c) => c.elementSelector === delSelector && c.property === delProperty,
      )
      if (existingDelete) break

      // Push undo action
      store.pushUndo({
        elementSelector: delSelector,
        property: delProperty,
        beforeValue: originalDisplay,
        afterValue: 'deleted',
        breakpoint: store.activeBreakpoint,
        wasNewChange: true,
        changeScope: store.changeScope,
      })

      // Save element snapshot
      store.saveElementSnapshot({
        selectorPath: delSelector,
        tagName: delTag || 'unknown',
        className: delClass ?? null,
        elementId: delId ?? null,
        attributes: delAttrs || {},
        innerText: delText,
        computedStyles: delStyles ? { ...delStyles } : {},
        pagePath: store.currentPagePath,
        changeScope: store.changeScope,
        sourceInfo: null,
      })

      // Track the deletion
      store.addStyleChange({
        id: generateId(),
        elementSelector: delSelector,
        property: delProperty,
        originalValue: originalDisplay,
        newValue: 'deleted',
        breakpoint: store.activeBreakpoint,
        timestamp: Date.now(),
        changeScope: store.changeScope,
      })

      // Clear selection since the element is now hidden
      store.clearSelection()
      break
    }
  }
}

function ensureListener() {
  if (listenerRegistered) return
  listenerRegistered = true
  window.addEventListener('message', handleMessage)
}

export function usePostMessage() {
  const iframeRef = sharedIframeRef

  // Register the singleton listener on first client-side mount
  useEffect(() => {
    ensureListener()
  }, [])

  const sendToInspector = useCallback((message: EditorToInspectorMessage) => {
    sendViaIframe(message)
  }, [])

  const sendHeartbeat = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      heartbeatResolve = () => resolve(true)
      sendToInspector({ type: 'HEARTBEAT' })
      setTimeout(() => {
        if (heartbeatResolve) {
          heartbeatResolve = null
          resolve(false)
        }
      }, 3000)
    })
  }, [sendToInspector])

  return { iframeRef, sendToInspector, sendHeartbeat }
}

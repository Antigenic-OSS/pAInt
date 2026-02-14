'use client';

import React, { useEffect, useCallback } from 'react';
import { useEditorStore } from '@/store';
import type { InspectorToEditorMessage, EditorToInspectorMessage } from '@/types/messages';

// Module-level shared iframe ref — ensures all callers of usePostMessage()
// share the same ref. PreviewFrame assigns it to the DOM element, and other
// components (DragModeToggle, etc.) can send messages through it.
const sharedIframeRef: React.MutableRefObject<HTMLIFrameElement | null> = { current: null };

// Singleton message listener — registered once to prevent duplicate handlers
// when multiple components call usePostMessage(). Uses useEditorStore.getState()
// so it always reads fresh state without stale closures.
let listenerRegistered = false;
let heartbeatResolve: (() => void) | null = null;
let componentRescanTimer: ReturnType<typeof setTimeout> | null = null;

export function sendViaIframe(message: EditorToInspectorMessage) {
  const iframe = sharedIframeRef.current;
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(message, '*');
}

function handleMessage(event: MessageEvent) {
  if (event.origin !== window.location.origin) return;
  const msg = event.data as InspectorToEditorMessage;
  if (!msg || !msg.type) return;

  const store = useEditorStore.getState();

  switch (msg.type) {
    case 'INSPECTOR_READY':
      store.setConnectionStatus('connected');
      sendViaIframe({ type: 'REQUEST_DOM_TREE' });
      sendViaIframe({ type: 'REQUEST_PAGE_LINKS' });
      sendViaIframe({ type: 'REQUEST_CSS_VARIABLES' });
      setTimeout(function() {
        sendViaIframe({ type: 'REQUEST_COMPONENTS', payload: {} });
      }, 500);
      break;

    case 'ELEMENT_SELECTED':
      store.selectElement(msg.payload);
      store.setCSSVariableUsages(msg.payload.cssVariableUsages || {});
      break;

    case 'CSS_VARIABLES':
      store.setCSSVariableDefinitions(msg.payload.definitions);
      break;

    case 'ELEMENT_HOVERED':
      store.setHighlightedNodeId(msg.payload.selectorPath);
      break;

    case 'DOM_TREE':
      store.setRootNode(msg.payload.tree);
      break;

    case 'DOM_UPDATED':
      store.setRootNode(msg.payload.tree);
      if (msg.payload.removedSelectors.length > 0) {
        const currentSelector = store.selectorPath;
        if (currentSelector && msg.payload.removedSelectors.includes(currentSelector)) {
          store.clearSelection();
        }
      }
      // Debounced component rescan on DOM changes (2s to avoid
      // excessive scanning during rapid DOM mutations)
      if (componentRescanTimer) clearTimeout(componentRescanTimer);
      componentRescanTimer = setTimeout(function() {
        componentRescanTimer = null;
        sendViaIframe({ type: 'REQUEST_COMPONENTS', payload: {} });
      }, 2000);
      break;

    case 'HEARTBEAT_RESPONSE':
      if (heartbeatResolve) {
        heartbeatResolve();
        heartbeatResolve = null;
      }
      break;

    case 'PAGE_LINKS':
      store.setPageLinks(msg.payload.links);
      break;

    case 'COMPONENTS_DETECTED':
      store.setDetectedComponents(msg.payload.components);
      break;

    case 'VARIANT_APPLIED':
      if (msg.payload.selectorPath === store.selectorPath) {
        store.updateComputedStyles(msg.payload.computedStyles);
        store.setCSSVariableUsages(msg.payload.cssVariableUsages);
      }
      break;

    case 'PAGE_NAVIGATE':
      store.setCurrentPagePath(msg.payload.path);
      store.setConnectionStatus('connecting');
      store.clearComponents();
      break;
  }
}

function ensureListener() {
  if (listenerRegistered) return;
  listenerRegistered = true;
  window.addEventListener('message', handleMessage);
}

export function usePostMessage() {
  const iframeRef = sharedIframeRef;

  // Register the singleton listener on first client-side mount
  useEffect(() => {
    ensureListener();
  }, []);

  const sendToInspector = useCallback((message: EditorToInspectorMessage) => {
    sendViaIframe(message);
  }, []);

  const sendHeartbeat = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      heartbeatResolve = () => resolve(true);
      sendToInspector({ type: 'HEARTBEAT' });
      setTimeout(() => {
        if (heartbeatResolve) {
          heartbeatResolve = null;
          resolve(false);
        }
      }, 3000);
    });
  }, [sendToInspector]);

  return { iframeRef, sendToInspector, sendHeartbeat };
}

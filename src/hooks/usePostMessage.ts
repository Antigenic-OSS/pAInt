'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { useEditorStore } from '@/store';
import type { InspectorToEditorMessage, EditorToInspectorMessage } from '@/types/messages';

// Module-level shared iframe ref — ensures all callers of usePostMessage()
// share the same ref. PreviewFrame assigns it to the DOM element, and other
// components (DragModeToggle, etc.) can send messages through it.
const sharedIframeRef: React.MutableRefObject<HTMLIFrameElement | null> = { current: null };

export function usePostMessage() {
  const iframeRef = sharedIframeRef;

  const setConnectionStatus = useEditorStore((s) => s.setConnectionStatus);
  const selectElement = useEditorStore((s) => s.selectElement);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const setRootNode = useEditorStore((s) => s.setRootNode);
  const setHighlightedNodeId = useEditorStore((s) => s.setHighlightedNodeId);
  const setPageLinks = useEditorStore((s) => s.setPageLinks);
  const setCSSVariableDefinitions = useEditorStore((s) => s.setCSSVariableDefinitions);
  const setCSSVariableUsages = useEditorStore((s) => s.setCSSVariableUsages);

  const heartbeatResolveRef = useRef<(() => void) | null>(null);

  const sendToInspector = useCallback((message: EditorToInspectorMessage) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(message, '*');
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // Only accept messages from our own origin
      if (event.origin !== window.location.origin) return;
      const msg = event.data as InspectorToEditorMessage;
      if (!msg || !msg.type) return;

      switch (msg.type) {
        case 'INSPECTOR_READY':
          setConnectionStatus('connected');
          sendToInspector({ type: 'REQUEST_DOM_TREE' });
          sendToInspector({ type: 'REQUEST_PAGE_LINKS' });
          sendToInspector({ type: 'REQUEST_CSS_VARIABLES' });
          break;

        case 'ELEMENT_SELECTED':
          selectElement(msg.payload);
          console.log('[DevEditor] cssVariableUsages received:', msg.payload.cssVariableUsages);
          setCSSVariableUsages(msg.payload.cssVariableUsages || {});
          break;

        case 'CSS_VARIABLES':
          console.log('[DevEditor] CSS variable definitions received:', Object.keys(msg.payload.definitions).length);
          setCSSVariableDefinitions(msg.payload.definitions);
          break;

        case 'ELEMENT_HOVERED':
          setHighlightedNodeId(msg.payload.selectorPath);
          break;

        case 'DOM_TREE':
          setRootNode(msg.payload.tree);
          break;

        case 'DOM_UPDATED':
          setRootNode(msg.payload.tree);
          if (msg.payload.removedSelectors.length > 0) {
            const currentSelector = useEditorStore.getState().selectorPath;
            if (currentSelector && msg.payload.removedSelectors.includes(currentSelector)) {
              clearSelection();
            }
          }
          break;

        case 'HEARTBEAT_RESPONSE':
          if (heartbeatResolveRef.current) {
            heartbeatResolveRef.current();
            heartbeatResolveRef.current = null;
          }
          break;

        case 'PAGE_LINKS':
          setPageLinks(msg.payload.links);
          break;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [
    setConnectionStatus,
    selectElement,
    clearSelection,
    setRootNode,
    setHighlightedNodeId,
    setPageLinks,
    setCSSVariableDefinitions,
    setCSSVariableUsages,
    sendToInspector,
  ]);

  const sendHeartbeat = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      heartbeatResolveRef.current = () => resolve(true);
      sendToInspector({ type: 'HEARTBEAT' });
      setTimeout(() => {
        if (heartbeatResolveRef.current) {
          heartbeatResolveRef.current = null;
          resolve(false);
        }
      }, 3000);
    });
  }, [sendToInspector]);

  return { iframeRef, sendToInspector, sendHeartbeat };
}

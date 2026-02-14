'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useEditorStore } from '@/store';
import { usePostMessage, sendViaIframe } from './usePostMessage';
import { generateId } from '@/lib/utils';

/**
 * Perform undo — can be called outside React components (e.g., keyboard shortcuts).
 * Pops from undo stack, reverts the change in the iframe, updates store.
 */
export function performUndo() {
  const action = useEditorStore.getState().popUndo();
  if (!action) return;

  if (action.property === '__text_content__') {
    if (action.wasNewChange) {
      sendViaIframe({ type: 'REVERT_TEXT_CONTENT', payload: { selectorPath: action.elementSelector, originalText: action.beforeValue } });
    } else {
      sendViaIframe({ type: 'SET_TEXT_CONTENT', payload: { selectorPath: action.elementSelector, text: action.beforeValue } });
    }
  } else if (action.wasNewChange) {
    sendViaIframe({ type: 'REVERT_CHANGE', payload: { selectorPath: action.elementSelector, property: action.property } });
  } else {
    sendViaIframe({ type: 'PREVIEW_CHANGE', payload: { selectorPath: action.elementSelector, property: action.property, value: action.beforeValue } });
  }
}

/**
 * Perform redo — can be called outside React components (e.g., keyboard shortcuts).
 * Pops from redo stack, re-applies the change in the iframe, updates store.
 */
export function performRedo() {
  const action = useEditorStore.getState().popRedo();
  if (!action) return;

  if (action.property === '__text_content__') {
    sendViaIframe({ type: 'SET_TEXT_CONTENT', payload: { selectorPath: action.elementSelector, text: action.afterValue } });
  } else {
    sendViaIframe({ type: 'PREVIEW_CHANGE', payload: { selectorPath: action.elementSelector, property: action.property, value: action.afterValue } });
  }
}

/**
 * Hook that tracks style changes, sends PREVIEW_CHANGE to inspector,
 * and auto-persists changes to localStorage.
 */
export function useChangeTracker() {
  const selectorPath = useEditorStore((s) => s.selectorPath);
  const computedStyles = useEditorStore((s) => s.computedStyles);
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint);
  const targetUrl = useEditorStore((s) => s.targetUrl);
  const addStyleChange = useEditorStore((s) => s.addStyleChange);
  const removeStyleChange = useEditorStore((s) => s.removeStyleChange);
  const saveElementSnapshot = useEditorStore((s) => s.saveElementSnapshot);
  const pushUndo = useEditorStore((s) => s.pushUndo);
  const { sendToInspector } = usePostMessage();

  // Auto-persist changes when they update
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    const unsubscribe = useEditorStore.subscribe((state) => {
      const count = state.styleChanges.length;
      if (count === prevCountRef.current) return;
      prevCountRef.current = count;

      const url = state.targetUrl;
      if (!url) return;

      // Debounce persistence
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
      persistTimeoutRef.current = setTimeout(() => {
        useEditorStore.getState().persistChanges(url);
      }, 300);
    });

    return () => {
      unsubscribe();
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    };
  }, []);

  // Load persisted changes when target URL changes
  useEffect(() => {
    if (targetUrl) {
      useEditorStore.getState().loadPersistedChanges(targetUrl);
    }
  }, [targetUrl]);

  const applyChange = useCallback(
    (property: string, value: string) => {
      if (!selectorPath) return;

      const originalValue = computedStyles[property] || '';

      // Don't track if value hasn't changed
      if (originalValue === value) return;

      // Check if a change already exists for this element+property
      const existing = useEditorStore.getState().styleChanges.find(
        (c) => c.elementSelector === selectorPath && c.property === property
      );

      // Push undo action
      pushUndo({
        elementSelector: selectorPath,
        property,
        beforeValue: existing ? existing.newValue : originalValue,
        afterValue: value,
        breakpoint: activeBreakpoint,
        wasNewChange: !existing,
      });

      // Send preview change to inspector
      sendToInspector({
        type: 'PREVIEW_CHANGE',
        payload: { selectorPath, property, value },
      });

      // Capture element snapshot at the time of change
      const state = useEditorStore.getState();
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
      });

      // Track the change
      addStyleChange({
        id: generateId(),
        elementSelector: selectorPath,
        property,
        originalValue,
        newValue: value,
        breakpoint: activeBreakpoint,
        timestamp: Date.now(),
      });
    },
    [selectorPath, computedStyles, activeBreakpoint, addStyleChange, saveElementSnapshot, sendToInspector, pushUndo]
  );

  const revertChange = useCallback(
    (changeId: string, selectorPath: string, property: string) => {
      if (property === '__text_content__') {
        const change = useEditorStore.getState().styleChanges.find((c) => c.id === changeId);
        if (change) {
          sendToInspector({
            type: 'REVERT_TEXT_CONTENT',
            payload: { selectorPath, originalText: change.originalValue },
          });
        }
      } else {
        sendToInspector({
          type: 'REVERT_CHANGE',
          payload: { selectorPath, property },
        });
      }
      removeStyleChange(changeId);
    },
    [sendToInspector, removeStyleChange]
  );

  const revertAll = useCallback(() => {
    // Revert text changes before clearing (iframe reload handles style changes)
    const textChanges = useEditorStore.getState().styleChanges.filter(
      (c) => c.property === '__text_content__'
    );
    for (const tc of textChanges) {
      sendToInspector({
        type: 'REVERT_TEXT_CONTENT',
        payload: { selectorPath: tc.elementSelector, originalText: tc.originalValue },
      });
    }

    useEditorStore.getState().clearAllChanges();
    // Force-reload the iframe to guarantee a clean state — removing
    // inline styles via REVERT_ALL can leave layout artifacts.
    const iframe = document.querySelector<HTMLIFrameElement>('iframe[title="Preview"]');
    if (iframe?.src) {
      iframe.src = iframe.src;
    }
  }, [sendToInspector]);

  return { applyChange, revertChange, revertAll, undo: performUndo, redo: performRedo };
}

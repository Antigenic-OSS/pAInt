'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useEditorStore } from '@/store';
import { usePostMessage } from './usePostMessage';
import { generateId } from '@/lib/utils';

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
    [selectorPath, computedStyles, activeBreakpoint, addStyleChange, saveElementSnapshot, sendToInspector]
  );

  const revertChange = useCallback(
    (changeId: string, selectorPath: string, property: string) => {
      sendToInspector({
        type: 'REVERT_CHANGE',
        payload: { selectorPath, property },
      });
      removeStyleChange(changeId);
    },
    [sendToInspector, removeStyleChange]
  );

  const revertAll = useCallback(() => {
    sendToInspector({ type: 'REVERT_ALL' });
    useEditorStore.getState().clearAllChanges();
  }, [sendToInspector]);

  return { applyChange, revertChange, revertAll };
}

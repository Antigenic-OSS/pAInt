'use client';

import { useEffect } from 'react';
import { useEditorStore } from '@/store';
import { performUndo, performRedo } from './useChangeTracker';

/**
 * Global keyboard shortcuts for the editor.
 *
 * - Escape: Deselect current element
 * - Cmd+Z / Ctrl+Z: Undo last style change
 * - Cmd+Shift+Z / Ctrl+Shift+Z: Redo last undone change
 * - Cmd+[ / Ctrl+[: Toggle left panel
 * - Cmd+] / Ctrl+]: Toggle right panel
 */
export function useKeyboardShortcuts() {
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const toggleLeftPanel = useEditorStore((s) => s.toggleLeftPanel);
  const toggleRightPanel = useEditorStore((s) => s.toggleRightPanel);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+Z / Ctrl+Z — undo (works even when focused on inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        performUndo();
        return;
      }

      // Cmd+Shift+Z / Ctrl+Shift+Z — redo (works even when focused on inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        performRedo();
        return;
      }

      // Don't intercept other shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        // Escape should still work to blur inputs
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      // Escape — deselect element
      if (e.key === 'Escape') {
        clearSelection();
        return;
      }

      // Cmd+[ or Ctrl+[ — toggle left panel
      if ((e.metaKey || e.ctrlKey) && e.key === '[') {
        e.preventDefault();
        toggleLeftPanel();
        return;
      }

      // Cmd+] or Ctrl+] — toggle right panel
      if ((e.metaKey || e.ctrlKey) && e.key === ']') {
        e.preventDefault();
        toggleRightPanel();
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [clearSelection, toggleLeftPanel, toggleRightPanel]);
}

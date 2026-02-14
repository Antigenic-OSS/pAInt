'use client';

import { useEffect } from 'react';
import { useEditorStore } from '@/store';

/**
 * Global keyboard shortcuts for the editor.
 *
 * - Escape: Deselect current element
 * - Cmd+[ / Ctrl+[: Toggle left panel
 * - Cmd+] / Ctrl+]: Toggle right panel
 * - Arrow Up/Down: Navigate tree nodes (when left panel focused)
 */
export function useKeyboardShortcuts() {
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const toggleLeftPanel = useEditorStore((s) => s.toggleLeftPanel);
  const toggleRightPanel = useEditorStore((s) => s.toggleRightPanel);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept shortcuts when typing in inputs
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

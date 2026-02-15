import type { StateCreator } from 'zustand';
import type { StyleChange, ElementSnapshot, UndoRedoAction } from '@/types/changelog';
import { LOCAL_STORAGE_KEYS } from '@/lib/constants';
import { generateId } from '@/lib/utils';

const MAX_UNDO_STACK = 50;

export interface ChangeSlice {
  styleChanges: StyleChange[];
  elementSnapshots: Record<string, ElementSnapshot>;
  undoStack: UndoRedoAction[];
  redoStack: UndoRedoAction[];

  addStyleChange: (change: StyleChange) => void;
  removeStyleChange: (id: string) => void;
  clearAllChanges: () => void;
  getChangeCount: () => number;
  saveElementSnapshot: (snapshot: ElementSnapshot) => void;
  updateAllSnapshotsScope: (scope: 'all' | 'breakpoint-only') => void;
  persistChanges: (urlKey: string) => void;
  loadPersistedChanges: (urlKey: string) => void;
  pushUndo: (action: UndoRedoAction) => void;
  popUndo: () => UndoRedoAction | null;
  popRedo: () => UndoRedoAction | null;
}

export const createChangeSlice: StateCreator<ChangeSlice, [], [], ChangeSlice> = (set, get) => ({
  styleChanges: [],
  elementSnapshots: {},
  undoStack: [],
  redoStack: [],

  addStyleChange: (change) => {
    set((state) => {
      const existing = state.styleChanges.findIndex(
        (c) => c.elementSelector === change.elementSelector && c.property === change.property
      );
      if (existing >= 0) {
        const trueOriginal = state.styleChanges[existing].originalValue;
        // Auto-remove: value returned to original — no net change
        if (change.newValue === trueOriginal) {
          const updated = state.styleChanges.filter((_, i) => i !== existing);
          const stillHasChanges = updated.some((c) => c.elementSelector === change.elementSelector);
          if (!stillHasChanges) {
            const { [change.elementSelector]: _, ...rest } = state.elementSnapshots;
            return { styleChanges: updated, elementSnapshots: rest };
          }
          return { styleChanges: updated };
        }
        const updated = [...state.styleChanges];
        updated[existing] = { ...change, originalValue: trueOriginal };
        return { styleChanges: updated };
      }
      return { styleChanges: [...state.styleChanges, change] };
    });
  },

  removeStyleChange: (id) => {
    set((state) => {
      const removed = state.styleChanges.find((c) => c.id === id);
      const updated = state.styleChanges.filter((c) => c.id !== id);
      // Clean up snapshot if no more changes for that element
      if (removed) {
        const stillHasChanges = updated.some((c) => c.elementSelector === removed.elementSelector);
        if (!stillHasChanges) {
          const { [removed.elementSelector]: _, ...rest } = state.elementSnapshots;
          return { styleChanges: updated, elementSnapshots: rest };
        }
      }
      return { styleChanges: updated };
    });
  },

  clearAllChanges: () => {
    set({ styleChanges: [], elementSnapshots: {} });
  },

  getChangeCount: () => {
    return get().styleChanges.length;
  },

  saveElementSnapshot: (snapshot) => {
    set((state) => {
      // Only save if we don't already have a snapshot for this selector
      if (state.elementSnapshots[snapshot.selectorPath]) return state;
      return {
        elementSnapshots: {
          ...state.elementSnapshots,
          [snapshot.selectorPath]: snapshot,
        },
      };
    });
  },

  updateAllSnapshotsScope: (scope) => {
    set((state) => {
      const updated: Record<string, ElementSnapshot> = {};
      for (const [key, snap] of Object.entries(state.elementSnapshots)) {
        updated[key] = { ...snap, changeScope: scope };
      }
      return { elementSnapshots: updated };
    });
  },

  persistChanges: (urlKey) => {
    const { styleChanges, elementSnapshots } = get();
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.CHANGES_PREFIX + urlKey,
        JSON.stringify({ style: styleChanges, snapshots: elementSnapshots })
      );
    } catch {}
  },

  loadPersistedChanges: (urlKey) => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.CHANGES_PREFIX + urlKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        set({
          styleChanges: parsed.style || [],
          elementSnapshots: parsed.snapshots || {},
        });
      }
    } catch {}
  },

  pushUndo: (action) => {
    set((state) => ({
      undoStack: [...state.undoStack.slice(-(MAX_UNDO_STACK - 1)), action],
      redoStack: [],
    }));
  },

  popUndo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return null;
    const action = undoStack[undoStack.length - 1];

    set((state) => {
      const newUndo = state.undoStack.slice(0, -1);
      const newRedo = [...state.redoStack, action];

      let newChanges = state.styleChanges;
      let newSnapshots = state.elementSnapshots;

      if (action.wasNewChange) {
        newChanges = newChanges.filter(
          (c) => !(c.elementSelector === action.elementSelector && c.property === action.property)
        );
        const stillHas = newChanges.some((c) => c.elementSelector === action.elementSelector);
        if (!stillHas) {
          const { [action.elementSelector]: _, ...rest } = newSnapshots;
          newSnapshots = rest;
        }
      } else {
        const exists = newChanges.some(
          (c) => c.elementSelector === action.elementSelector && c.property === action.property
        );
        if (exists) {
          newChanges = newChanges.map((c) =>
            c.elementSelector === action.elementSelector && c.property === action.property
              ? { ...c, newValue: action.beforeValue }
              : c
          );
        } else {
          // Change was auto-removed (value matched original) — re-create it
          newChanges = [...newChanges, {
            id: generateId(),
            elementSelector: action.elementSelector,
            property: action.property,
            originalValue: action.afterValue,
            newValue: action.beforeValue,
            breakpoint: action.breakpoint,
            timestamp: Date.now(),
            changeScope: action.changeScope,
          }];
        }
      }

      return { undoStack: newUndo, redoStack: newRedo, styleChanges: newChanges, elementSnapshots: newSnapshots };
    });

    return action;
  },

  popRedo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return null;
    const action = redoStack[redoStack.length - 1];

    set((state) => {
      const newRedo = state.redoStack.slice(0, -1);
      const newUndo = [...state.undoStack, action];

      let newChanges = state.styleChanges;
      const idx = newChanges.findIndex(
        (c) => c.elementSelector === action.elementSelector && c.property === action.property
      );

      let newSnapshots = state.elementSnapshots;

      if (idx >= 0) {
        const trueOriginal = newChanges[idx].originalValue;
        // Auto-remove: redo restores value to original — no net change
        if (action.afterValue === trueOriginal) {
          newChanges = newChanges.filter((_, i) => i !== idx);
          const stillHas = newChanges.some((c) => c.elementSelector === action.elementSelector);
          if (!stillHas) {
            const { [action.elementSelector]: _, ...rest } = newSnapshots;
            newSnapshots = rest;
          }
        } else {
          newChanges = [...newChanges];
          newChanges[idx] = { ...newChanges[idx], newValue: action.afterValue };
        }
      } else {
        newChanges = [
          ...newChanges,
          {
            id: generateId(),
            elementSelector: action.elementSelector,
            property: action.property,
            originalValue: action.beforeValue,
            newValue: action.afterValue,
            breakpoint: action.breakpoint,
            timestamp: Date.now(),
            changeScope: action.changeScope,
          },
        ];
      }

      return { undoStack: newUndo, redoStack: newRedo, styleChanges: newChanges, elementSnapshots: newSnapshots };
    });

    return action;
  },
});

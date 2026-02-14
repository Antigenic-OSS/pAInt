import type { StateCreator } from 'zustand';
import type { StyleChange, ElementSnapshot } from '@/types/changelog';
import { LOCAL_STORAGE_KEYS } from '@/lib/constants';

export interface ChangeSlice {
  styleChanges: StyleChange[];
  elementSnapshots: Record<string, ElementSnapshot>;

  addStyleChange: (change: StyleChange) => void;
  removeStyleChange: (id: string) => void;
  clearAllChanges: () => void;
  getChangeCount: () => number;
  saveElementSnapshot: (snapshot: ElementSnapshot) => void;
  updateAllSnapshotsScope: (scope: 'all' | 'breakpoint-only') => void;
  persistChanges: (urlKey: string) => void;
  loadPersistedChanges: (urlKey: string) => void;
}

export const createChangeSlice: StateCreator<ChangeSlice, [], [], ChangeSlice> = (set, get) => ({
  styleChanges: [],
  elementSnapshots: {},

  addStyleChange: (change) => {
    set((state) => {
      const existing = state.styleChanges.findIndex(
        (c) => c.elementSelector === change.elementSelector && c.property === change.property
      );
      if (existing >= 0) {
        const updated = [...state.styleChanges];
        updated[existing] = { ...change, originalValue: state.styleChanges[existing].originalValue };
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
});

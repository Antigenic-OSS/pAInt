import type { StateCreator } from 'zustand';
import type { Breakpoint } from '@/types/changelog';
import { PANEL_DEFAULTS, LOCAL_STORAGE_KEYS, PREVIEW_WIDTH_MIN, PREVIEW_WIDTH_MAX, BREAKPOINTS } from '@/lib/constants';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export type ConnectionStatus = 'disconnected' | 'confirming' | 'scanning' | 'connecting' | 'connected';

export interface UISlice {
  targetUrl: string | null;
  connectionStatus: ConnectionStatus;
  pendingTargetUrl: string | null;
  pendingFolderPath: string | null;
  recentUrls: string[];
  activeBreakpoint: Breakpoint;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  leftPanelWidth: number;
  rightPanelWidth: number;
  activeRightTab: 'design' | 'variables' | 'changes' | 'claude' | 'console';
  changeScope: 'all' | 'breakpoint-only';
  pageLinks: Array<{ href: string; text: string }>;
  currentPagePath: string;
  selectionMode: boolean;
  viewMode: boolean;
  activeLeftTab: 'layers' | 'pages' | 'components' | 'terminal';
  previewWidth: number;
  toasts: Toast[];

  setTargetUrl: (url: string | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setPendingConnection: (url: string, folder: string) => void;
  finalizeConnection: () => void;
  cancelPendingConnection: () => void;
  addRecentUrl: (url: string) => void;
  setActiveBreakpoint: (bp: Breakpoint) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  setActiveRightTab: (tab: 'design' | 'variables' | 'changes' | 'claude' | 'console') => void;
  setChangeScope: (scope: 'all' | 'breakpoint-only') => void;
  setPageLinks: (links: Array<{ href: string; text: string }>) => void;
  setCurrentPagePath: (path: string) => void;
  setSelectionMode: (enabled: boolean) => void;
  toggleSelectionMode: () => void;
  toggleViewMode: () => void;
  setActiveLeftTab: (tab: 'layers' | 'pages' | 'components' | 'terminal') => void;
  setPreviewWidth: (width: number) => void;
  showToast: (type: Toast['type'], message: string) => void;
  dismissToast: (id: string) => void;
  loadPersistedUI: () => void;
}

export const createUISlice: StateCreator<UISlice, [], [], UISlice> = (set, get) => ({
  targetUrl: null,
  connectionStatus: 'disconnected',
  pendingTargetUrl: null,
  pendingFolderPath: null,
  recentUrls: [],
  activeBreakpoint: 'desktop',
  leftPanelOpen: true,
  rightPanelOpen: true,
  leftPanelWidth: PANEL_DEFAULTS.leftWidth,
  rightPanelWidth: PANEL_DEFAULTS.rightWidth,
  activeRightTab: 'design',
  changeScope: 'breakpoint-only',
  pageLinks: [],
  currentPagePath: '/',
  selectionMode: true,
  viewMode: false,
  activeLeftTab: 'layers',
  previewWidth: 1920,
  toasts: [],

  setTargetUrl: (url) => {
    set({ targetUrl: url });
  },

  setConnectionStatus: (status) => {
    set({ connectionStatus: status });
  },

  setPendingConnection: (url, folder) => {
    set({
      pendingTargetUrl: url,
      pendingFolderPath: folder,
      connectionStatus: folder ? 'confirming' : 'connecting',
      // If no folder, go straight to connecting
      ...(folder ? {} : { targetUrl: url }),
    });
  },

  finalizeConnection: () => {
    const { pendingTargetUrl } = get();
    if (!pendingTargetUrl) return;
    set({
      targetUrl: pendingTargetUrl,
      connectionStatus: 'connecting',
      pendingTargetUrl: null,
      pendingFolderPath: null,
    });
  },

  cancelPendingConnection: () => {
    set({
      connectionStatus: 'disconnected',
      pendingTargetUrl: null,
      pendingFolderPath: null,
      targetUrl: null,
    });
  },

  addRecentUrl: (url) => {
    const { recentUrls } = get();
    const filtered = recentUrls.filter((u) => u !== url);
    const updated = [url, ...filtered].slice(0, 10);
    set({ recentUrls: updated });
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.RECENT_URLS, JSON.stringify(updated));
    } catch {}
  },

  setActiveBreakpoint: (bp) => set({ activeBreakpoint: bp }),

  toggleLeftPanel: () => {
    const next = !get().leftPanelOpen;
    set({ leftPanelOpen: next });
    try {
      const vis = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.PANEL_VISIBILITY) || '{}');
      vis.left = next;
      localStorage.setItem(LOCAL_STORAGE_KEYS.PANEL_VISIBILITY, JSON.stringify(vis));
    } catch {}
  },

  toggleRightPanel: () => {
    const next = !get().rightPanelOpen;
    set({ rightPanelOpen: next });
    try {
      const vis = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.PANEL_VISIBILITY) || '{}');
      vis.right = next;
      localStorage.setItem(LOCAL_STORAGE_KEYS.PANEL_VISIBILITY, JSON.stringify(vis));
    } catch {}
  },

  setLeftPanelWidth: (width) => {
    const clamped = Math.min(Math.max(width, PANEL_DEFAULTS.leftMin), PANEL_DEFAULTS.leftMax);
    set({ leftPanelWidth: clamped });
    try {
      const sizes = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.PANEL_SIZES) || '{}');
      sizes.left = clamped;
      localStorage.setItem(LOCAL_STORAGE_KEYS.PANEL_SIZES, JSON.stringify(sizes));
    } catch {}
  },

  setRightPanelWidth: (width) => {
    const clamped = Math.min(Math.max(width, PANEL_DEFAULTS.rightMin), PANEL_DEFAULTS.rightMax);
    set({ rightPanelWidth: clamped });
    try {
      const sizes = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.PANEL_SIZES) || '{}');
      sizes.right = clamped;
      localStorage.setItem(LOCAL_STORAGE_KEYS.PANEL_SIZES, JSON.stringify(sizes));
    } catch {}
  },

  setActiveRightTab: (tab) => set({ activeRightTab: tab }),

  setChangeScope: (scope) => set({ changeScope: scope }),

  setPageLinks: (links) => set({ pageLinks: links }),
  setCurrentPagePath: (path) => set({ currentPagePath: path }),
  setSelectionMode: (enabled) => set({ selectionMode: enabled }),
  toggleSelectionMode: () => set({ selectionMode: !get().selectionMode }),

  toggleViewMode: () => {
    const { viewMode } = get();
    if (viewMode) {
      // Exit preview — restore panels
      set({ viewMode: false, leftPanelOpen: true, rightPanelOpen: true, activeLeftTab: 'layers' });
    } else {
      // Enter preview — show left panel with pages tab, hide right panel
      set({ viewMode: true, leftPanelOpen: true, rightPanelOpen: false, activeLeftTab: 'pages' });
    }
  },

  setActiveLeftTab: (tab) => set({ activeLeftTab: tab }),

  showToast: (type, message) => {
    const id = Math.random().toString(36).slice(2, 9);
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  setPreviewWidth: (width) => {
    const clamped = Math.min(Math.max(width, PREVIEW_WIDTH_MIN), PREVIEW_WIDTH_MAX);
    // Auto-detect matching breakpoint
    const match = (Object.entries(BREAKPOINTS) as [Breakpoint, { label: string; width: number }][])
      .find(([, bp]) => bp.width === clamped);
    set({
      previewWidth: clamped,
      ...(match ? { activeBreakpoint: match[0] } : {}),
    });
  },

  loadPersistedUI: () => {
    try {
      const urls = localStorage.getItem(LOCAL_STORAGE_KEYS.RECENT_URLS);
      if (urls) set({ recentUrls: JSON.parse(urls) });

      const sizes = localStorage.getItem(LOCAL_STORAGE_KEYS.PANEL_SIZES);
      if (sizes) {
        const parsed = JSON.parse(sizes);
        if (parsed.left) set({ leftPanelWidth: parsed.left });
        if (parsed.right) set({ rightPanelWidth: parsed.right });
      }

      const vis = localStorage.getItem(LOCAL_STORAGE_KEYS.PANEL_VISIBILITY);
      if (vis) {
        const parsed = JSON.parse(vis);
        if (typeof parsed.left === 'boolean') set({ leftPanelOpen: parsed.left });
        if (typeof parsed.right === 'boolean') set({ rightPanelOpen: parsed.right });
      }
    } catch {}
  },
});

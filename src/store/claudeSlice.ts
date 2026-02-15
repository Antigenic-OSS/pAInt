import type { StateCreator } from 'zustand';
import type { ClaudeStatus, ClaudeError, ParsedDiff } from '@/types/claude';
import { LOCAL_STORAGE_KEYS } from '@/lib/constants';

export interface ClaudeSlice {
  claudeStatus: ClaudeStatus;
  projectRoot: string | null;
  portRoots: Record<string, string>;
  cliAvailable: boolean | null;
  sessionId: string | null;
  parsedDiffs: ParsedDiff[];
  claudeError: ClaudeError | null;

  setClaudeStatus: (status: ClaudeStatus) => void;
  setProjectRoot: (url: string, path: string | null) => void;
  getProjectRootForUrl: (url: string | null) => string | null;
  setCliAvailable: (available: boolean) => void;
  setSessionId: (id: string | null) => void;
  setParsedDiffs: (diffs: ParsedDiff[]) => void;
  setClaudeError: (error: ClaudeError | null) => void;
  resetClaude: () => void;
  loadPersistedClaude: () => void;
}

function persistPortRoots(portRoots: Record<string, string>) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.CLAUDE_PORT_ROOTS, JSON.stringify(portRoots));
  } catch {}
}

export const createClaudeSlice: StateCreator<ClaudeSlice, [], [], ClaudeSlice> = (set, get) => ({
  claudeStatus: 'idle',
  projectRoot: null,
  portRoots: {},
  cliAvailable: null,
  sessionId: null,
  parsedDiffs: [],
  claudeError: null,

  setClaudeStatus: (status) => set({ claudeStatus: status }),

  setProjectRoot: (url, path) => {
    const portRoots = { ...get().portRoots };
    if (path) {
      portRoots[url] = path;
    } else {
      delete portRoots[url];
    }
    set({ portRoots, projectRoot: path });
    persistPortRoots(portRoots);
  },

  getProjectRootForUrl: (url) => {
    if (!url) return null;
    return get().portRoots[url] ?? null;
  },

  setCliAvailable: (available) => {
    set({ cliAvailable: available });
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.CLAUDE_CLI_AVAILABLE, JSON.stringify(available));
    } catch {}
  },

  setSessionId: (id) => set({ sessionId: id }),
  setParsedDiffs: (diffs) => set({ parsedDiffs: diffs }),
  setClaudeError: (error) => set({ claudeError: error }),

  resetClaude: () => {
    set({
      claudeStatus: 'idle',
      sessionId: null,
      parsedDiffs: [],
      claudeError: null,
    });
  },

  loadPersistedClaude: () => {
    try {
      // Load port roots map
      const portRootsJson = localStorage.getItem(LOCAL_STORAGE_KEYS.CLAUDE_PORT_ROOTS);
      if (portRootsJson) {
        const portRoots = JSON.parse(portRootsJson) as Record<string, string>;
        set({ portRoots });
      }

      // Migrate old single-key value: just remove it (no way to know which port it was for)
      const oldRoot = localStorage.getItem(LOCAL_STORAGE_KEYS.CLAUDE_PROJECT_ROOT);
      if (oldRoot) {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.CLAUDE_PROJECT_ROOT);
      }

      const cli = localStorage.getItem(LOCAL_STORAGE_KEYS.CLAUDE_CLI_AVAILABLE);
      if (cli) set({ cliAvailable: JSON.parse(cli) });
    } catch {}
  },
});

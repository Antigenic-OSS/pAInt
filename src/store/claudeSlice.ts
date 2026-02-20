import type { StateCreator } from 'zustand';
import type { ClaudeStatus, ClaudeError, ParsedDiff, ProjectScanResult } from '@/types/claude';
import { LOCAL_STORAGE_KEYS } from '@/lib/constants';

export interface ClaudeSlice {
  claudeStatus: ClaudeStatus;
  projectRoot: string | null;
  portRoots: Record<string, string>;
  projectScans: Record<string, ProjectScanResult>;
  cliAvailable: boolean | null;
  sessionId: string | null;
  parsedDiffs: ParsedDiff[];
  claudeError: ClaudeError | null;

  setClaudeStatus: (status: ClaudeStatus) => void;
  setProjectRoot: (url: string, path: string | null) => void;
  getProjectRootForUrl: (url: string | null) => string | null;
  setProjectScan: (url: string, scan: ProjectScanResult) => void;
  getProjectScanForUrl: (url: string | null) => ProjectScanResult | null;
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

function persistProjectScans(scans: Record<string, ProjectScanResult>) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.CLAUDE_PROJECT_SCANS, JSON.stringify(scans));
  } catch {}
}

export const createClaudeSlice: StateCreator<ClaudeSlice, [], [], ClaudeSlice> = (set, get) => ({
  claudeStatus: 'idle',
  projectRoot: null,
  portRoots: {},
  projectScans: {},
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

  setProjectScan: (url, scan) => {
    const projectScans = { ...get().projectScans, [url]: scan };
    set({ projectScans });
    persistProjectScans(projectScans);
  },

  getProjectScanForUrl: (url) => {
    if (!url) return null;
    return get().projectScans[url] ?? null;
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

      // Load project scans
      const scansJson = localStorage.getItem(LOCAL_STORAGE_KEYS.CLAUDE_PROJECT_SCANS);
      if (scansJson) {
        const projectScans = JSON.parse(scansJson) as Record<string, ProjectScanResult>;
        set({ projectScans });
      }

      const cli = localStorage.getItem(LOCAL_STORAGE_KEYS.CLAUDE_CLI_AVAILABLE);
      if (cli) set({ cliAvailable: JSON.parse(cli) });
    } catch {}
  },
});

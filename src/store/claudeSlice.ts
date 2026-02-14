import type { StateCreator } from 'zustand';
import type { ClaudeStatus, ClaudeError, ParsedDiff } from '@/types/claude';
import { LOCAL_STORAGE_KEYS } from '@/lib/constants';

export interface ClaudeSlice {
  claudeStatus: ClaudeStatus;
  projectRoot: string | null;
  cliAvailable: boolean | null;
  sessionId: string | null;
  parsedDiffs: ParsedDiff[];
  claudeError: ClaudeError | null;

  setClaudeStatus: (status: ClaudeStatus) => void;
  setProjectRoot: (path: string | null) => void;
  setCliAvailable: (available: boolean) => void;
  setSessionId: (id: string | null) => void;
  setParsedDiffs: (diffs: ParsedDiff[]) => void;
  setClaudeError: (error: ClaudeError | null) => void;
  resetClaude: () => void;
  loadPersistedClaude: () => void;
}

export const createClaudeSlice: StateCreator<ClaudeSlice, [], [], ClaudeSlice> = (set) => ({
  claudeStatus: 'idle',
  projectRoot: null,
  cliAvailable: null,
  sessionId: null,
  parsedDiffs: [],
  claudeError: null,

  setClaudeStatus: (status) => set({ claudeStatus: status }),

  setProjectRoot: (path) => {
    set({ projectRoot: path });
    try {
      if (path) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.CLAUDE_PROJECT_ROOT, path);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.CLAUDE_PROJECT_ROOT);
      }
    } catch {}
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
      const root = localStorage.getItem(LOCAL_STORAGE_KEYS.CLAUDE_PROJECT_ROOT);
      if (root) set({ projectRoot: root });

      const cli = localStorage.getItem(LOCAL_STORAGE_KEYS.CLAUDE_CLI_AVAILABLE);
      if (cli) set({ cliAvailable: JSON.parse(cli) });
    } catch {}
  },
});

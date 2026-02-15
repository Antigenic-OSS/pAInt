import type { StateCreator } from 'zustand';
import type { ConsoleLevel } from '@/types/messages';

const MAX_CONSOLE_ENTRIES = 200;

export interface ConsoleEntry {
  id: number;
  level: ConsoleLevel;
  args: string[];
  timestamp: number;
  source?: string;
  line?: number;
  column?: number;
}

export interface ConsoleSlice {
  consoleEntries: ConsoleEntry[];
  consoleErrorCount: number;

  addConsoleEntry: (payload: Omit<ConsoleEntry, 'id'>) => void;
  clearConsole: () => void;
}

let nextConsoleId = 1;

export const createConsoleSlice: StateCreator<ConsoleSlice, [], [], ConsoleSlice> = (set) => ({
  consoleEntries: [],
  consoleErrorCount: 0,

  addConsoleEntry: (payload) => {
    const entry: ConsoleEntry = { ...payload, id: nextConsoleId++ };
    set((state) => {
      const entries = state.consoleEntries.length >= MAX_CONSOLE_ENTRIES
        ? [...state.consoleEntries.slice(1), entry]
        : [...state.consoleEntries, entry];
      return {
        consoleEntries: entries,
        consoleErrorCount: state.consoleErrorCount + (payload.level === 'error' ? 1 : 0),
      };
    });
  },

  clearConsole: () => set({ consoleEntries: [], consoleErrorCount: 0 }),
});

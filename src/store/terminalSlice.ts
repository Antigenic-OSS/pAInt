import type { StateCreator } from 'zustand';

export type TerminalStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface TerminalSlice {
  terminalStatus: TerminalStatus;
  terminalServerPort: number;
  writeToTerminal: ((data: string) => void) | null;

  setTerminalStatus: (status: TerminalStatus) => void;
  registerTerminalWriter: (writer: ((data: string) => void) | null) => void;
}

export const createTerminalSlice: StateCreator<TerminalSlice, [], [], TerminalSlice> = (set) => ({
  terminalStatus: 'disconnected',
  terminalServerPort: 4001,
  writeToTerminal: null,

  setTerminalStatus: (status) => set({ terminalStatus: status }),
  registerTerminalWriter: (writer) => set({ writeToTerminal: writer }),
});

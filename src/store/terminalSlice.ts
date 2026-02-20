import type { StateCreator } from 'zustand';

export type TerminalStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface TerminalSlice {
  terminalStatus: TerminalStatus;
  terminalServerPort: number;

  setTerminalStatus: (status: TerminalStatus) => void;
}

export const createTerminalSlice: StateCreator<TerminalSlice, [], [], TerminalSlice> = (set) => ({
  terminalStatus: 'disconnected',
  terminalServerPort: 4001,

  setTerminalStatus: (status) => set({ terminalStatus: status }),
});

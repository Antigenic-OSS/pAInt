import type { StateCreator } from 'zustand'
import type {
  ClaudeStatus,
  ClaudeError,
  ParsedDiff,
  ProjectScanResult,
  ClaudeScanResponse,
} from '@/types/claude'
import { LOCAL_STORAGE_KEYS } from '@/lib/constants'

export interface ClaudeSlice {
  claudeStatus: ClaudeStatus
  projectRoot: string | null
  portRoots: Record<string, string>
  projectScans: Record<string, ProjectScanResult>
  cliAvailable: boolean | null
  sessionId: string | null
  parsedDiffs: ParsedDiff[]
  claudeError: ClaudeError | null

  // Project scan state
  componentFileMap: Record<string, string> | null
  scanStatus: 'idle' | 'scanning' | 'complete' | 'error'
  scanError: string | null
  scannedProjectName: string | null

  // AI scan state (smart prompt generation)
  aiScanStatus: 'idle' | 'scanning' | 'complete' | 'error'
  aiScanResult: ClaudeScanResponse | null
  aiScanError: string | null

  // Client-side directory handle (File System Access API, non-serializable)
  directoryHandle: FileSystemDirectoryHandle | null

  setClaudeStatus: (status: ClaudeStatus) => void
  setProjectRoot: (url: string, path: string | null) => void
  getProjectRootForUrl: (url: string | null) => string | null
  setProjectScan: (url: string, scan: ProjectScanResult) => void
  getProjectScanForUrl: (url: string | null) => ProjectScanResult | null
  setCliAvailable: (available: boolean) => void
  setSessionId: (id: string | null) => void
  setParsedDiffs: (diffs: ParsedDiff[]) => void
  setClaudeError: (error: ClaudeError | null) => void
  resetClaude: () => void
  loadPersistedClaude: () => void

  // Project scan actions
  setComponentFileMap: (map: Record<string, string> | null) => void
  setScanStatus: (status: 'idle' | 'scanning' | 'complete' | 'error') => void
  setScanError: (error: string | null) => void
  setScannedProjectName: (name: string | null) => void
  clearScan: () => void

  // AI scan actions
  setAiScanStatus: (status: 'idle' | 'scanning' | 'complete' | 'error') => void
  setAiScanResult: (result: ClaudeScanResponse | null) => void
  setAiScanError: (error: string | null) => void
  resetAiScan: () => void

  // Client-side directory handle actions
  setDirectoryHandle: (handle: FileSystemDirectoryHandle | null) => void
}

function persistPortRoots(portRoots: Record<string, string>) {
  try {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.CLAUDE_PORT_ROOTS,
      JSON.stringify(portRoots),
    )
  } catch {}
}

function persistProjectScans(scans: Record<string, ProjectScanResult>) {
  try {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.CLAUDE_PROJECT_SCANS,
      JSON.stringify(scans),
    )
  } catch {}
}

export const createClaudeSlice: StateCreator<
  ClaudeSlice,
  [],
  [],
  ClaudeSlice
> = (set, get) => ({
  claudeStatus: 'idle',
  projectRoot: null,
  portRoots: {},
  projectScans: {},
  cliAvailable: null,
  sessionId: null,
  parsedDiffs: [],
  claudeError: null,

  componentFileMap: null,
  scanStatus: 'idle',
  scanError: null,
  scannedProjectName: null,

  aiScanStatus: 'idle',
  aiScanResult: null,
  aiScanError: null,

  directoryHandle: null,

  setClaudeStatus: (status) => set({ claudeStatus: status }),

  setProjectRoot: (url, path) => {
    const portRoots = { ...get().portRoots }
    if (path) {
      portRoots[url] = path
    } else {
      delete portRoots[url]
    }
    set({ portRoots, projectRoot: path })
    persistPortRoots(portRoots)
  },

  getProjectRootForUrl: (url) => {
    if (!url) return null
    return get().portRoots[url] ?? null
  },

  setProjectScan: (url, scan) => {
    const projectScans = { ...get().projectScans, [url]: scan }
    set({ projectScans })
    persistProjectScans(projectScans)
  },

  getProjectScanForUrl: (url) => {
    if (!url) return null
    return get().projectScans[url] ?? null
  },

  setCliAvailable: (available) => {
    set({ cliAvailable: available })
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.CLAUDE_CLI_AVAILABLE,
        JSON.stringify(available),
      )
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
      aiScanStatus: 'idle',
      aiScanResult: null,
      aiScanError: null,
    })
  },

  setComponentFileMap: (map) => set({ componentFileMap: map }),
  setScanStatus: (status) => set({ scanStatus: status }),
  setScanError: (error) => set({ scanError: error }),
  setScannedProjectName: (name) => set({ scannedProjectName: name }),
  clearScan: () =>
    set({
      componentFileMap: null,
      scanStatus: 'idle',
      scanError: null,
      scannedProjectName: null,
    }),

  setAiScanStatus: (status) => set({ aiScanStatus: status }),
  setAiScanResult: (result) => set({ aiScanResult: result }),
  setAiScanError: (error) => set({ aiScanError: error }),
  resetAiScan: () =>
    set({
      aiScanStatus: 'idle',
      aiScanResult: null,
      aiScanError: null,
    }),

  setDirectoryHandle: (handle) => set({ directoryHandle: handle }),

  loadPersistedClaude: () => {
    try {
      // Load port roots map
      const portRootsJson = localStorage.getItem(
        LOCAL_STORAGE_KEYS.CLAUDE_PORT_ROOTS,
      )
      if (portRootsJson) {
        const portRoots = JSON.parse(portRootsJson) as Record<string, string>
        set({ portRoots })
      }

      // Migrate old single-key value: just remove it (no way to know which port it was for)
      const oldRoot = localStorage.getItem(
        LOCAL_STORAGE_KEYS.CLAUDE_PROJECT_ROOT,
      )
      if (oldRoot) {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.CLAUDE_PROJECT_ROOT)
      }

      // Load project scans
      const scansJson = localStorage.getItem(
        LOCAL_STORAGE_KEYS.CLAUDE_PROJECT_SCANS,
      )
      if (scansJson) {
        const projectScans = JSON.parse(scansJson) as Record<
          string,
          ProjectScanResult
        >
        set({ projectScans })
      }

      const cli = localStorage.getItem(LOCAL_STORAGE_KEYS.CLAUDE_CLI_AVAILABLE)
      if (cli) set({ cliAvailable: JSON.parse(cli) })
    } catch {}
  },
})

export type ClaudeStatus =
  | 'idle'
  | 'analyzing'
  | 'complete'
  | 'applying'
  | 'applied'
  | 'error'

export type ClaudeErrorCode =
  | 'CLI_NOT_FOUND'
  | 'AUTH_REQUIRED'
  | 'TIMEOUT'
  | 'PARSE_FAILURE'
  | 'UNKNOWN'

export interface ClaudeError {
  code: ClaudeErrorCode
  message: string
}

export interface DiffLine {
  type: 'context' | 'addition' | 'removal'
  content: string
}

export interface DiffHunk {
  header: string
  lines: DiffLine[]
}

export interface ParsedDiff {
  filePath: string
  hunks: DiffHunk[]
  linesAdded: number
  linesRemoved: number
}

export interface ClaudeAnalyzeRequest {
  changelog: string
  projectRoot: string
  /** When provided (from AI Scan), used as-is instead of wrapping changelog. */
  smartPrompt?: string
}

export interface ClaudeAnalyzeResponse {
  sessionId: string
  diffs: ParsedDiff[]
  summary: string
}

export interface ClaudeApplyRequest {
  sessionId: string
  projectRoot: string
}

export interface ClaudeApplyResponse {
  success: boolean
  filesModified: string[]
  summary: string
}

export interface ClaudeStatusResponse {
  available: boolean
  version?: string
  error?: string
}

export interface ClaudeScanRequest {
  changelog: string
  projectRoot: string
}

export type ScanGroupCategory =
  | 'typography'
  | 'spacing'
  | 'colors'
  | 'layout'
  | 'borders'
  | 'background'
  | 'effects'
  | 'mixed'

export interface ScanGroup {
  label: string
  category: ScanGroupCategory
  changeCount: number
  suggestedFiles: string[]
}

export interface ClaudeScanResponse {
  smartPrompt: string
  intent: string
  groups: ScanGroup[]
  warnings: string[]
}

export interface RouteEntry {
  urlPattern: string // e.g. "/", "/about", "/blog/[slug]" (web only)
  filePath: string // relative to projectRoot
  type: 'page' | 'layout' | 'loading' | 'error' | 'not-found' | 'template'
}

export interface ComponentEntry {
  name: string // PascalCase: "Button", "HomeScreen", "ProfileWidget"
  filePath: string // relative to projectRoot
  nameLower: string // lowercase for matching: "button", "homescreen"
  category: 'component' | 'screen' | 'page' | 'layout' | 'widget' | 'view'
}

export interface FileMap {
  routes: RouteEntry[]
  components: ComponentEntry[]
}

export interface SourceInfo {
  fileName: string // Absolute path from React fiber _debugSource
  lineNumber: number
  columnNumber?: number
  componentName: string | null
  componentChain: string[]
}

export interface ProjectScanResult {
  framework: string | null
  cssStrategy: string[]
  cssFiles: string[]
  srcDirs: string[]
  packageName: string | null
  fileMap?: FileMap
  assetDirs?: string[]
}

export type ClaudeStatus =
  | 'idle'
  | 'analyzing'
  | 'complete'
  | 'applying'
  | 'applied'
  | 'error';

export type ClaudeErrorCode =
  | 'CLI_NOT_FOUND'
  | 'AUTH_REQUIRED'
  | 'TIMEOUT'
  | 'PARSE_FAILURE'
  | 'UNKNOWN';

export interface ClaudeError {
  code: ClaudeErrorCode;
  message: string;
}

export interface DiffLine {
  type: 'context' | 'addition' | 'removal';
  content: string;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface ParsedDiff {
  filePath: string;
  hunks: DiffHunk[];
  linesAdded: number;
  linesRemoved: number;
}

export interface ClaudeAnalyzeRequest {
  changelog: string;
  projectRoot: string;
}

export interface ClaudeAnalyzeResponse {
  sessionId: string;
  diffs: ParsedDiff[];
  summary: string;
}

export interface ClaudeApplyRequest {
  sessionId: string;
  projectRoot: string;
}

export interface ClaudeApplyResponse {
  success: boolean;
  filesModified: string[];
  summary: string;
}

export interface ClaudeStatusResponse {
  available: boolean;
  version?: string;
  error?: string;
}

export interface ProjectScanResult {
  framework: string | null;
  cssStrategy: string[];
  cssFiles: string[];
  srcDirs: string[];
  packageName: string | null;
}

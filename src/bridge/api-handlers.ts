/**
 * Bridge API handlers.
 *
 * Wraps existing shared modules (claude-bin, validatePath, projectScanner)
 * to provide the same API surface as the Next.js routes, but running
 * directly on the user's machine via the bridge server.
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import {
  getClaudeBin,
  spawnClaude,
  spawnClaudeStreaming,
  isAuthError,
} from '../lib/claude-bin'
import { validateProjectRoot } from '../lib/validatePath'
import { scanProject } from '../lib/projectScanner'
import { stripControlChars } from '../lib/utils'
import { buildSmartAnalysisPrompt } from '../lib/promptBuilder'

const execFileAsync = promisify(execFile)

const MAX_CHANGELOG_BYTES = 50 * 1024
const TIMEOUT_MS = 120_000

function json(
  data: unknown,
  init?: { status?: number; headers?: Record<string, string> },
): Response {
  const headers = {
    'Content-Type': 'application/json',
    ...(init?.headers || {}),
  }
  return new Response(JSON.stringify(data), {
    status: init?.status || 200,
    headers,
  })
}

// ─── Project Scan ────────────────────────────────────────────

async function handleProjectScan(
  req: Request,
  cors: Record<string, string>,
): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405, headers: cors })
  }

  let body: { projectRoot?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400, headers: cors })
  }

  const { projectRoot } = body
  if (!projectRoot || typeof projectRoot !== 'string') {
    return json(
      { error: 'projectRoot is required' },
      { status: 400, headers: cors },
    )
  }

  const rootError = validateProjectRoot(projectRoot)
  if (rootError) {
    return json({ error: rootError }, { status: 400, headers: cors })
  }

  const resolved = path.resolve(projectRoot)
  const pkgPath = path.join(resolved, 'package.json')
  if (!existsSync(pkgPath)) {
    return json(
      { error: 'Not a valid project directory — no package.json found' },
      { status: 400, headers: cors },
    )
  }

  const result = scanProject(resolved)
  return json(result, { headers: cors })
}

// ─── CSS Variables Scan ─────────────────────────────────────

const CSS_VAR_SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  '.git',
  '__tests__',
  '__mocks__',
  '.turbo',
  '.vercel',
  'coverage',
  '.cache',
  '.output',
])
const CSS_EXTENSIONS = new Set(['.css', '.scss', '.less'])
const MAX_SCAN_FILES = 2000
const MAX_FILE_SIZE = 512 * 1024
const CSS_VAR_RE = /^\s*(--[\w-]+)\s*:\s*([^;]+);/gm

const FRAMEWORK_PREFIXES = [
  '--tw-',
  '--next-',
  '--radix-',
  '--chakra-',
  '--mantine-',
  '--mui-',
  '--framer-',
  '--sb-',
  '--css-interop-',
]

interface ScannedVariable {
  value: string
  resolvedValue: string
  selector: string
  source: string
}

function walkForCSS(
  dir: string,
  projectRoot: string,
  results: Map<string, ScannedVariable>,
  counter: { count: number },
): void {
  if (counter.count >= MAX_SCAN_FILES) return
  let entries: import('node:fs').Dirent[]
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (counter.count >= MAX_SCAN_FILES) return
    if (entry.name.startsWith('.')) continue
    if (CSS_VAR_SKIP_DIRS.has(entry.name)) continue
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      walkForCSS(fullPath, projectRoot, results, counter)
      continue
    }
    if (!entry.isFile()) continue
    counter.count++

    const ext = path.extname(entry.name)
    if (!CSS_EXTENSIONS.has(ext)) continue

    let content: string
    try {
      const stat = statSync(fullPath)
      if (stat.size > MAX_FILE_SIZE) continue
      content = readFileSync(fullPath, 'utf-8')
    } catch {
      continue
    }

    const relativePath = path.relative(projectRoot, fullPath)
    CSS_VAR_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = CSS_VAR_RE.exec(content)) !== null) {
      const name = match[1].trim()
      const rawValue = match[2].trim()
      if (FRAMEWORK_PREFIXES.some((p) => name.startsWith(p))) continue
      if (!results.has(name)) {
        results.set(name, {
          value: rawValue,
          resolvedValue: rawValue,
          selector: ':root',
          source: relativePath,
        })
      }
    }
  }
}

async function handleCSSVariablesScan(
  req: Request,
  cors: Record<string, string>,
): Promise<Response> {
  if (req.method !== 'POST')
    return json({ error: 'Method not allowed' }, { status: 405, headers: cors })

  let body: { projectRoot?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400, headers: cors })
  }

  const { projectRoot } = body
  if (!projectRoot || typeof projectRoot !== 'string')
    return json(
      { error: 'projectRoot is required' },
      { status: 400, headers: cors },
    )

  const rootError = validateProjectRoot(projectRoot)
  if (rootError)
    return json({ error: rootError }, { status: 400, headers: cors })

  const resolved = path.resolve(projectRoot)
  try {
    const cssResults = new Map<string, ScannedVariable>()
    const counter = { count: 0 }
    walkForCSS(resolved, resolved, cssResults, counter)

    const definitions: Record<
      string,
      { value: string; resolvedValue: string; selector: string }
    > = {}
    for (const [name, def] of cssResults) {
      definitions[name] = {
        value: def.value,
        resolvedValue: def.resolvedValue,
        selector: def.selector,
      }
    }

    return json(
      {
        definitions,
        count: Object.keys(definitions).length,
        filesScanned: counter.count,
      },
      { headers: cors },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return json(
      { error: 'Scan failed', details: message },
      { status: 500, headers: cors },
    )
  }
}

// ─── Tailwind Config Scan ───────────────────────────────────

const TW_CONFIG_FILES = [
  'tailwind.config.ts',
  'tailwind.config.js',
  'tailwind.config.mjs',
  'tailwind.config.cjs',
]
const MAX_CONFIG_SIZE = 256 * 1024

function kebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

function parseColorBlock(
  body: string,
  prefix: string,
  results: Record<
    string,
    { value: string; resolvedValue: string; selector: string }
  >,
  filePath: string,
): void {
  const nestedRe = /(\w[\w-]*)\s*:\s*\{([^}]*)\}/g
  const nestedKeys = new Set<string>()
  let nestedMatch: RegExpExecArray | null
  nestedRe.lastIndex = 0
  while ((nestedMatch = nestedRe.exec(body)) !== null) {
    nestedKeys.add(nestedMatch[1])
    const nestedPrefix = prefix
      ? `${prefix}-${kebab(nestedMatch[1])}`
      : kebab(nestedMatch[1])
    parseColorBlock(nestedMatch[2], nestedPrefix, results, filePath)
  }

  const entryRe = /(\w[\w-]*)\s*:\s*(?:'([^']*)'|"([^"]*)")/g
  let entryMatch: RegExpExecArray | null
  entryRe.lastIndex = 0
  while ((entryMatch = entryRe.exec(body)) !== null) {
    const key = entryMatch[1]
    if (nestedKeys.has(key)) continue
    const value = entryMatch[2] ?? entryMatch[3] ?? ''
    if (!value) continue
    if (
      value.includes('(') &&
      !value.startsWith('rgb') &&
      !value.startsWith('hsl') &&
      !value.startsWith('oklch')
    )
      continue
    const varName = prefix ? `--${prefix}-${kebab(key)}` : `--${kebab(key)}`
    results[varName] = {
      value,
      resolvedValue: value,
      selector: `tailwind:${filePath}`,
    }
  }
}

async function handleTailwindConfigScan(
  req: Request,
  cors: Record<string, string>,
): Promise<Response> {
  if (req.method !== 'POST')
    return json({ error: 'Method not allowed' }, { status: 405, headers: cors })

  let body: { projectRoot?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400, headers: cors })
  }

  const { projectRoot } = body
  if (!projectRoot || typeof projectRoot !== 'string')
    return json(
      { error: 'projectRoot is required' },
      { status: 400, headers: cors },
    )

  const rootError = validateProjectRoot(projectRoot)
  if (rootError)
    return json({ error: rootError }, { status: 400, headers: cors })

  const resolved = path.resolve(projectRoot)

  let configPath: string | null = null
  for (const name of TW_CONFIG_FILES) {
    const candidate = path.join(resolved, name)
    if (existsSync(candidate)) {
      configPath = candidate
      break
    }
  }

  if (!configPath)
    return json({ definitions: {}, count: 0, found: false }, { headers: cors })

  try {
    const raw = readFileSync(configPath)
    if (raw.length > MAX_CONFIG_SIZE)
      return json(
        { error: 'Config file too large' },
        { status: 400, headers: cors },
      )

    const content = raw.toString('utf-8')
    const cleaned = content
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
    const relativePath = path.relative(resolved, configPath)
    const definitions: Record<
      string,
      { value: string; resolvedValue: string; selector: string }
    > = {}

    const colorsBlockRe = /colors\s*:\s*\{([^]*?)\}(?:\s*,|\s*\})/g
    let blockMatch: RegExpExecArray | null
    colorsBlockRe.lastIndex = 0
    while ((blockMatch = colorsBlockRe.exec(cleaned)) !== null) {
      parseColorBlock(blockMatch[1], '', definitions, relativePath)
    }

    return json(
      {
        definitions,
        count: Object.keys(definitions).length,
        found: true,
        configFile: relativePath,
      },
      { headers: cors },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return json(
      { error: 'Parse failed', details: message },
      { status: 500, headers: cors },
    )
  }
}

// ─── Claude Status ───────────────────────────────────────────

async function handleClaudeStatus(
  req: Request,
  cors: Record<string, string>,
): Promise<Response> {
  if (req.method === 'GET') {
    try {
      const claudeBin = getClaudeBin()
      const { stdout } = await execFileAsync(claudeBin, ['--version'], {
        timeout: 10_000,
      })
      return json(
        { available: true, version: stdout.trim() },
        { headers: cors },
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return json(
        {
          available: false,
          error: `claude CLI not found: ${msg.slice(0, 200)}`,
        },
        { headers: cors },
      )
    }
  }

  if (req.method === 'POST') {
    let body: { projectRoot?: string }
    try {
      body = await req.json()
    } catch {
      return json(
        { error: 'Invalid JSON body' },
        { status: 400, headers: cors },
      )
    }

    const { projectRoot } = body
    if (!projectRoot || typeof projectRoot !== 'string') {
      return json(
        { error: 'projectRoot is required' },
        { status: 400, headers: cors },
      )
    }

    const rootError = validateProjectRoot(projectRoot)
    if (rootError) {
      return json({ error: rootError }, { status: 400, headers: cors })
    }

    const resolved = path.resolve(projectRoot)
    return json({ valid: true, resolved }, { headers: cors })
  }

  return json({ error: 'Method not allowed' }, { status: 405, headers: cors })
}

// ─── Claude Analyze ──────────────────────────────────────────

function parseDiffs(output: string) {
  const diffs: Array<{
    filePath: string
    hunks: Array<{
      header: string
      lines: Array<{ type: string; content: string }>
    }>
    linesAdded: number
    linesRemoved: number
  }> = []
  const lines = output.split('\n')
  let currentDiff: (typeof diffs)[0] | null = null
  let currentHunk: (typeof diffs)[0]['hunks'][0] | null = null

  for (const line of lines) {
    if (line.startsWith('+++ b/') || line.startsWith('+++ ')) {
      const filePath = line.startsWith('+++ b/')
        ? line.slice(6).trim()
        : line.slice(4).trim()
      if (filePath && filePath !== '/dev/null') {
        currentDiff = { filePath, hunks: [], linesAdded: 0, linesRemoved: 0 }
        diffs.push(currentDiff)
        currentHunk = null
      }
      continue
    }
    if (line.startsWith('--- a/') || line.startsWith('--- ')) continue

    const hunkMatch = line.match(/^@@\s+[^@]+\s+@@(.*)?$/)
    if (hunkMatch && currentDiff) {
      currentHunk = { header: line, lines: [] }
      currentDiff.hunks.push(currentHunk)
      continue
    }

    if (currentHunk && currentDiff) {
      if (line.startsWith('+')) {
        currentHunk.lines.push({ type: 'addition', content: line.slice(1) })
        currentDiff.linesAdded++
      } else if (line.startsWith('-')) {
        currentHunk.lines.push({ type: 'removal', content: line.slice(1) })
        currentDiff.linesRemoved++
      } else if (line.startsWith(' ')) {
        currentHunk.lines.push({ type: 'context', content: line.slice(1) })
      }
    }
  }
  return diffs
}

function buildSummary(diffs: ReturnType<typeof parseDiffs>): string {
  if (diffs.length === 0)
    return 'No file changes detected in the analysis output.'
  const totalAdded = diffs.reduce((sum, d) => sum + d.linesAdded, 0)
  const totalRemoved = diffs.reduce((sum, d) => sum + d.linesRemoved, 0)
  const fileList = diffs.map((d) => d.filePath).join(', ')
  return `${diffs.length} file${diffs.length !== 1 ? 's' : ''} to modify: ${fileList}. +${totalAdded} / -${totalRemoved} lines.`
}

async function handleClaudeAnalyze(
  req: Request,
  cors: Record<string, string>,
): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405, headers: cors })
  }

  let body: { changelog?: string; projectRoot?: string; smartPrompt?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400, headers: cors })
  }

  const { changelog, projectRoot, smartPrompt } = body
  const hasSmartPrompt =
    typeof smartPrompt === 'string' && smartPrompt.length > 0

  if (
    !hasSmartPrompt &&
    (!changelog || typeof changelog !== 'string' || changelog.length === 0)
  ) {
    return json(
      { error: 'changelog is required' },
      { status: 400, headers: cors },
    )
  }
  if (!projectRoot || typeof projectRoot !== 'string') {
    return json(
      { error: 'projectRoot is required' },
      { status: 400, headers: cors },
    )
  }

  const rootError = validateProjectRoot(projectRoot)
  if (rootError) {
    return json({ error: rootError }, { status: 400, headers: cors })
  }

  const resolvedRoot = path.resolve(projectRoot)

  let prompt: string
  if (hasSmartPrompt) {
    const sanitized = stripControlChars(smartPrompt).slice(
      0,
      MAX_CHANGELOG_BYTES,
    )
    prompt = buildSmartAnalysisPrompt(sanitized, resolvedRoot)
  } else {
    const sanitizedChangelog = stripControlChars(changelog!).slice(
      0,
      MAX_CHANGELOG_BYTES,
    )
    prompt = [
      'You are a code assistant. A user has made visual changes in a design editor.',
      'Below is the changelog of changes they made. Analyze the project source code',
      'and generate unified diffs that would apply these visual changes to the source files.',
      '',
      'IMPORTANT:',
      '- Output ONLY unified diff format (diff --git a/... b/...)',
      '- Use paths relative to the project root',
      '- Do not include any explanatory text outside of the diff',
      '- Make minimal, targeted changes',
      '',
      '--- CHANGELOG START ---',
      sanitizedChangelog,
      '--- CHANGELOG END ---',
    ].join('\n')
  }

  // Check if client wants SSE
  const wantsStream = req.headers.get('accept')?.includes('text/event-stream')

  if (wantsStream) {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        const enqueue = (event: string, data: Record<string, unknown>) => {
          try {
            controller.enqueue(
              encoder.encode(
                `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
              ),
            )
          } catch {
            /* closed */
          }
        }

        spawnClaudeStreaming(
          ['--print', '--allowedTools', 'Read', '-p', prompt],
          {
            cwd: resolvedRoot,
            timeout: TIMEOUT_MS,
            onStderr: (line) => enqueue('stderr', { line }),
          },
        )
          .then((result) => {
            if (result.exitCode !== 0) {
              enqueue('error', {
                code: 'CLI_ERROR',
                message: 'Claude CLI exited with an error',
              })
            } else {
              const diffs = parseDiffs(result.stdout)
              const summary = buildSummary(diffs)
              const sessionId = crypto.randomUUID()
              enqueue('result', { sessionId, diffs, summary })
            }
          })
          .catch((err) => {
            const message = err instanceof Error ? err.message : 'Unknown error'
            enqueue('error', {
              code: message === 'TIMEOUT' ? 'TIMEOUT' : 'SPAWN_ERROR',
              message,
            })
          })
          .finally(() => {
            enqueue('done', {})
            controller.close()
          })
      },
    })

    return new Response(stream, {
      headers: {
        ...cors,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }

  // JSON fallback
  try {
    const result = await spawnClaude(
      ['--print', '--allowedTools', 'Read', '-p', prompt],
      { cwd: resolvedRoot, timeout: TIMEOUT_MS },
    )

    if (result.exitCode !== 0) {
      const stderr = result.stderr.trim()
      if (isAuthError(stderr)) {
        return json(
          {
            error:
              'Claude CLI is not authenticated. Run `claude login` in your terminal.',
            authRequired: true,
          },
          { status: 401, headers: cors },
        )
      }
      return json(
        {
          error: 'Claude CLI exited with an error',
          details: stderr || 'Unknown CLI error',
        },
        { status: 500, headers: cors },
      )
    }

    const sessionIdMatch = result.stderr.match(/session[:\s]+([a-f0-9-]+)/i)
    const sessionId = sessionIdMatch ? sessionIdMatch[1] : crypto.randomUUID()
    const diffs = parseDiffs(result.stdout)
    const summary = buildSummary(diffs)
    return json({ sessionId, diffs, summary }, { headers: cors })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message === 'TIMEOUT') {
      return json(
        { error: 'Claude CLI timed out after 120 seconds' },
        { status: 504, headers: cors },
      )
    }
    return json(
      { error: 'Failed to run Claude CLI', details: message },
      { status: 500, headers: cors },
    )
  }
}

// ─── Claude Apply ────────────────────────────────────────────

function extractModifiedFiles(output: string): string[] {
  const files = new Set<string>()
  const lines = output.split('\n')
  for (const line of lines) {
    const editMatch = line.match(
      /(?:Edit(?:ed)?|Modified|Updated|Changed)\s+([^\s]+\.\w+)/i,
    )
    if (editMatch) files.add(editMatch[1])
    if (line.startsWith('+++ b/')) {
      const filePath = line.slice(6).trim()
      if (filePath && filePath !== '/dev/null') files.add(filePath)
    }
  }
  return Array.from(files)
}

async function handleClaudeApply(
  req: Request,
  cors: Record<string, string>,
): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405, headers: cors })
  }

  let body: { sessionId?: string; projectRoot?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400, headers: cors })
  }

  const { sessionId, projectRoot } = body

  if (!sessionId || typeof sessionId !== 'string') {
    return json(
      { error: 'sessionId is required' },
      { status: 400, headers: cors },
    )
  }
  if (!/^[a-f0-9-]+$/i.test(sessionId)) {
    return json(
      { error: 'sessionId contains invalid characters' },
      { status: 400, headers: cors },
    )
  }
  if (!projectRoot || typeof projectRoot !== 'string') {
    return json(
      { error: 'projectRoot is required' },
      { status: 400, headers: cors },
    )
  }

  const rootError = validateProjectRoot(projectRoot)
  if (rootError) {
    return json({ error: rootError }, { status: 400, headers: cors })
  }

  const resolvedRoot = path.resolve(projectRoot)

  try {
    const result = await spawnClaude(
      [
        '--resume',
        sessionId,
        '--allowedTools',
        'Read,Edit',
        '--print',
        '-p',
        'Apply the changes discussed in the previous analysis. Edit the source files to implement all the visual changes from the changelog.',
      ],
      { cwd: resolvedRoot, timeout: TIMEOUT_MS },
    )

    if (result.exitCode !== 0) {
      return json(
        {
          error: 'Claude CLI exited with an error',
          details: result.stderr.trim() || 'Unknown CLI error',
        },
        { status: 500, headers: cors },
      )
    }

    const combinedOutput = `${result.stdout}\n${result.stderr}`
    const filesModified = extractModifiedFiles(combinedOutput)
    const fileCount = filesModified.length
    const summary =
      fileCount > 0
        ? `Successfully modified ${fileCount} file${fileCount !== 1 ? 's' : ''}: ${filesModified.join(', ')}`
        : result.stdout.trim().slice(0, 200) || 'Changes applied.'

    return json({ success: true, filesModified, summary }, { headers: cors })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message === 'TIMEOUT') {
      return json(
        { error: 'Claude CLI timed out after 120 seconds' },
        { status: 504, headers: cors },
      )
    }
    return json(
      { error: 'Failed to run Claude CLI', details: message },
      { status: 500, headers: cors },
    )
  }
}

// ─── Folder Picker ───────────────────────────────────────────

async function handlePickFolder(
  cors: Record<string, string>,
): Promise<Response> {
  const platform = process.platform

  try {
    let folderPath: string | null = null

    if (platform === 'darwin') {
      const { stdout } = await execFileAsync(
        'osascript',
        [
          '-e',
          'set theFolder to POSIX path of (choose folder with prompt "Select your project root folder")',
          '-e',
          'return theFolder',
        ],
        { timeout: 60_000 },
      )
      folderPath = stdout.trim().replace(/\/$/, '')
    } else if (platform === 'linux') {
      const { stdout } = await execFileAsync(
        'zenity',
        [
          '--file-selection',
          '--directory',
          '--title=Select your project root folder',
        ],
        { timeout: 60_000 },
      )
      folderPath = stdout.trim()
    } else {
      return json(
        { error: 'Folder picker not supported on this platform' },
        { status: 501, headers: cors },
      )
    }

    if (!folderPath) {
      return json({ cancelled: true }, { headers: cors })
    }
    return json({ path: folderPath }, { headers: cors })
  } catch (err) {
    const code = (err as { code?: number }).code
    if (code === 1) {
      return json({ cancelled: true }, { headers: cors })
    }
    return json(
      { error: 'Failed to open folder picker' },
      { status: 500, headers: cors },
    )
  }
}

// ─── Main Router ─────────────────────────────────────────────

export async function handleAPI(
  req: Request,
  url: URL,
  cors: Record<string, string>,
): Promise<Response> {
  const pathname = url.pathname

  if (pathname === '/api/project-scan') {
    return handleProjectScan(req, cors)
  }
  if (pathname === '/api/project-scan/css-variables') {
    return handleCSSVariablesScan(req, cors)
  }
  if (pathname === '/api/project-scan/tailwind-config') {
    return handleTailwindConfigScan(req, cors)
  }
  if (pathname === '/api/claude/status') {
    return handleClaudeStatus(req, cors)
  }
  if (pathname === '/api/claude/analyze') {
    return handleClaudeAnalyze(req, cors)
  }
  if (pathname === '/api/claude/apply') {
    return handleClaudeApply(req, cors)
  }
  if (pathname === '/api/claude/pick-folder') {
    return handlePickFolder(cors)
  }

  return json({ error: 'Not found' }, { status: 404, headers: cors })
}

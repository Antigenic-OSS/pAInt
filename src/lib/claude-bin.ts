import { existsSync, readdirSync } from 'node:fs'
import { spawn, execFileSync } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'

let cached: string | null = null

/**
 * Resolve the absolute path to the `claude` CLI binary.
 * Next.js server processes often lack HOME and have a minimal PATH,
 * so we use os.homedir() and scan multiple known locations.
 */
export function getClaudeBin(): string {
  if (cached) return cached

  // os.homedir() works even when $HOME is unset (reads /etc/passwd)
  const home = homedir()
  const candidates = [
    `${home}/.local/bin/claude`,
    `${home}/.claude/local/claude`,
    '/usr/local/bin/claude',
    `${home}/.npm-global/bin/claude`,
    `${home}/.bun/bin/claude`,
    `${home}/.volta/bin/claude`,
  ]

  // Also check nvm versioned dirs (the "current" symlink may not exist)
  try {
    const nvmDir = `${home}/.nvm/versions/node`
    if (existsSync(nvmDir)) {
      for (const ver of readdirSync(nvmDir)) {
        candidates.push(join(nvmDir, ver, 'bin', 'claude'))
      }
    }
  } catch {
    /* ignore */
  }

  for (const p of candidates) {
    if (existsSync(p)) {
      cached = p
      return cached
    }
  }

  // Scan PATH directories as a last resort
  const pathDirs = (process.env.PATH || '').split(':')
  for (const dir of pathDirs) {
    if (!dir) continue
    const p = join(dir, 'claude')
    if (existsSync(p)) {
      cached = p
      return cached
    }
  }

  // Fall back to bare name — will only work if PATH happens to include it
  return 'claude'
}

export interface SpawnResult {
  exitCode: number
  stdout: string
  stderr: string
}

export interface StreamingSpawnResult {
  exitCode: number
  stdout: string
}

export interface StreamingSpawnOptions {
  cwd?: string
  timeout?: number
  onStderr?: (line: string) => void
}

const AUTH_PATTERNS = [
  /not authenticated/i,
  /not logged in/i,
  /authentication required/i,
  /api key/i,
  /unauthorized/i,
  /login required/i,
  /please log in/i,
  /claude login/i,
  /ANTHROPIC_API_KEY/,
]

/** Check if stderr indicates an authentication / login issue. */
export function isAuthError(stderr: string): boolean {
  return AUTH_PATTERNS.some((re) => re.test(stderr))
}

/**
 * Spawn the claude CLI with given args using Node's child_process.
 * Works in both Bun and Node runtimes (Next.js Turbopack uses Node).
 */
export function spawnClaude(
  args: string[],
  options: { cwd?: string; timeout?: number } = {},
): Promise<SpawnResult> {
  const claudeBin = getClaudeBin()
  const { cwd, timeout = 120_000 } = options

  return new Promise((resolve, reject) => {
    const proc = spawn(claudeBin, args, {
      cwd,
      env: { ...process.env, CLAUDECODE: undefined },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []

    proc.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk))
    proc.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk))

    const timer = setTimeout(() => {
      proc.kill('SIGKILL')
      reject(new Error('TIMEOUT'))
    }, timeout)

    proc.on('close', (code) => {
      clearTimeout(timer)
      resolve({
        exitCode: code ?? 1,
        stdout: Buffer.concat(stdoutChunks).toString('utf-8'),
        stderr: Buffer.concat(stderrChunks).toString('utf-8'),
      })
    })

    proc.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

/**
 * Spawn the claude CLI with streaming stderr.
 * stderr is line-buffered and delivered via onStderr callback.
 * stdout is fully buffered (contains diffs/JSON that need complete parsing).
 */
export function spawnClaudeStreaming(
  args: string[],
  options: StreamingSpawnOptions = {},
): Promise<StreamingSpawnResult> {
  const claudeBin = getClaudeBin()
  const { cwd, timeout = 120_000, onStderr } = options

  return new Promise((resolve, reject) => {
    const proc = spawn(claudeBin, args, {
      cwd,
      env: { ...process.env, CLAUDECODE: undefined },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const stdoutChunks: Buffer[] = []
    let stderrPartial = ''

    proc.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk))

    proc.stderr.on('data', (chunk: Buffer) => {
      if (!onStderr) return
      stderrPartial += chunk.toString('utf-8')
      const lines = stderrPartial.split('\n')
      // Hold the last element — it may be a partial line
      stderrPartial = lines.pop() || ''
      for (const line of lines) {
        if (line) onStderr(line)
      }
    })

    const timer = setTimeout(() => {
      proc.kill('SIGKILL')
      reject(new Error('TIMEOUT'))
    }, timeout)

    proc.on('close', (code) => {
      clearTimeout(timer)
      // Flush remaining partial line
      if (onStderr && stderrPartial) {
        onStderr(stderrPartial)
      }
      resolve({
        exitCode: code ?? 1,
        stdout: Buffer.concat(stdoutChunks).toString('utf-8'),
      })
    })

    proc.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

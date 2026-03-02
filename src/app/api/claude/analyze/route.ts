import { NextResponse } from 'next/server'
import path from 'node:path'
import { stripControlChars } from '@/lib/utils'
import {
  spawnClaude,
  spawnClaudeStreaming,
  isAuthError,
} from '@/lib/claude-bin'
import { validateProjectRoot } from '@/lib/validatePath'
import { buildSmartAnalysisPrompt } from '@/lib/promptBuilder'
import type {
  ClaudeAnalyzeRequest,
  ClaudeAnalyzeResponse,
  ParsedDiff,
  DiffHunk,
  DiffLine,
} from '@/types/claude'

const MAX_CHANGELOG_BYTES = 50 * 1024 // 50KB
const TIMEOUT_MS = 120_000 // 120 seconds

/**
 * Parse unified diff output into structured ParsedDiff objects.
 */
function parseDiffs(output: string): ParsedDiff[] {
  const diffs: ParsedDiff[] = []

  // Split on diff headers: "diff --git a/... b/..." or "--- a/..." patterns
  // We look for file markers: "--- a/<path>" followed by "+++ b/<path>"
  const lines = output.split('\n')
  let currentDiff: ParsedDiff | null = null
  let currentHunk: DiffHunk | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Detect file path from +++ line (the "new" file in unified diff)
    if (line.startsWith('+++ b/') || line.startsWith('+++ ')) {
      // Start a new diff for this file
      const filePath = line.startsWith('+++ b/')
        ? line.slice(6).trim()
        : line.slice(4).trim()

      if (filePath && filePath !== '/dev/null') {
        currentDiff = {
          filePath,
          hunks: [],
          linesAdded: 0,
          linesRemoved: 0,
        }
        diffs.push(currentDiff)
        currentHunk = null
      }
      continue
    }

    // Detect --- line for removed file (skip, we use +++ for file path)
    if (line.startsWith('--- a/') || line.startsWith('--- ')) {
      continue
    }

    // Detect hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    const hunkMatch = line.match(/^@@\s+[^@]+\s+@@(.*)?$/)
    if (hunkMatch && currentDiff) {
      currentHunk = {
        header: line,
        lines: [],
      }
      currentDiff.hunks.push(currentHunk)
      continue
    }

    // Inside a hunk, classify lines
    if (currentHunk && currentDiff) {
      if (line.startsWith('+')) {
        const diffLine: DiffLine = {
          type: 'addition',
          content: line.slice(1),
        }
        currentHunk.lines.push(diffLine)
        currentDiff.linesAdded++
      } else if (line.startsWith('-')) {
        const diffLine: DiffLine = {
          type: 'removal',
          content: line.slice(1),
        }
        currentHunk.lines.push(diffLine)
        currentDiff.linesRemoved++
      } else if (line.startsWith(' ')) {
        const diffLine: DiffLine = {
          type: 'context',
          content: line.slice(1),
        }
        currentHunk.lines.push(diffLine)
      }
      // Lines that don't start with +, -, or space end the hunk
      // (e.g. "\ No newline at end of file" or blank separator)
    }
  }

  return diffs
}

/**
 * Build a summary string from parsed diffs.
 */
function buildSummary(diffs: ParsedDiff[]): string {
  if (diffs.length === 0) {
    return 'No file changes detected in the analysis output.'
  }

  const totalAdded = diffs.reduce((sum, d) => sum + d.linesAdded, 0)
  const totalRemoved = diffs.reduce((sum, d) => sum + d.linesRemoved, 0)
  const fileList = diffs.map((d) => d.filePath).join(', ')

  return (
    `${diffs.length} file${diffs.length !== 1 ? 's' : ''} to modify: ${fileList}. ` +
    `+${totalAdded} / -${totalRemoved} lines.`
  )
}

/**
 * Validate the request body and build the prompt. Returns an error NextResponse or the resolved data.
 */
function parseAndValidate(
  body: ClaudeAnalyzeRequest,
): { error: NextResponse } | { prompt: string; resolvedRoot: string } {
  const { changelog, projectRoot, smartPrompt } = body
  const hasSmartPrompt =
    typeof smartPrompt === 'string' && smartPrompt.length > 0

  if (!hasSmartPrompt) {
    if (!changelog || typeof changelog !== 'string' || changelog.length === 0) {
      return {
        error: NextResponse.json(
          { error: 'changelog is required and must be a non-empty string' },
          { status: 400 },
        ),
      }
    }
  }

  if (!projectRoot || typeof projectRoot !== 'string') {
    return {
      error: NextResponse.json(
        { error: 'projectRoot is required and must be a string' },
        { status: 400 },
      ),
    }
  }

  const rootError = validateProjectRoot(projectRoot)
  if (rootError) {
    return { error: NextResponse.json({ error: rootError }, { status: 400 }) }
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
    const sanitizedChangelog = stripControlChars(changelog).slice(
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

  return { prompt, resolvedRoot }
}

/** Format an SSE event. */
function sseEvent(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function POST(request: Request): Promise<Response> {
  let body: ClaudeAnalyzeRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validated = parseAndValidate(body)
  if ('error' in validated) return validated.error
  const { prompt, resolvedRoot } = validated

  const wantsStream = request.headers
    .get('accept')
    ?.includes('text/event-stream')

  // ── SSE streaming path ──
  if (wantsStream) {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        const enqueue = (event: string, data: Record<string, unknown>) => {
          try {
            controller.enqueue(encoder.encode(sseEvent(event, data)))
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
              const response: ClaudeAnalyzeResponse = {
                sessionId,
                diffs,
                summary,
              }
              enqueue('result', response as unknown as Record<string, unknown>)
            }
          })
          .catch((err) => {
            const message = err instanceof Error ? err.message : 'Unknown error'
            const code = message === 'TIMEOUT' ? 'TIMEOUT' : 'SPAWN_ERROR'
            enqueue('error', { code, message })
          })
          .finally(() => {
            enqueue('done', {})
            controller.close()
          })
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }

  // ── JSON fallback path (backward compatible) ──
  try {
    const result = await spawnClaude(
      ['--print', '--allowedTools', 'Read', '-p', prompt],
      { cwd: resolvedRoot, timeout: TIMEOUT_MS },
    )

    if (result.exitCode !== 0) {
      const stderr = result.stderr.trim()
      if (isAuthError(stderr)) {
        return NextResponse.json(
          {
            error:
              'Claude CLI is not authenticated. Run `claude login` in your terminal.',
            authRequired: true,
          },
          { status: 401 },
        )
      }
      return NextResponse.json(
        {
          error: 'Claude CLI exited with an error',
          details: stderr || 'Unknown CLI error',
        },
        { status: 500 },
      )
    }

    const sessionIdMatch = result.stderr.match(/session[:\s]+([a-f0-9-]+)/i)
    const sessionId = sessionIdMatch ? sessionIdMatch[1] : crypto.randomUUID()
    const diffs = parseDiffs(result.stdout)
    const summary = buildSummary(diffs)
    const response: ClaudeAnalyzeResponse = { sessionId, diffs, summary }
    return NextResponse.json(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message === 'TIMEOUT') {
      return NextResponse.json(
        { error: 'Claude CLI timed out after 120 seconds' },
        { status: 504 },
      )
    }
    return NextResponse.json(
      { error: 'Failed to run Claude CLI', details: message },
      { status: 500 },
    )
  }
}

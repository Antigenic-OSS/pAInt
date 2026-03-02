import { NextResponse } from 'next/server'
import path from 'node:path'
import { stripControlChars } from '@/lib/utils'
import {
  spawnClaude,
  spawnClaudeStreaming,
  isAuthError,
} from '@/lib/claude-bin'
import { validateProjectRoot } from '@/lib/validatePath'
import { buildScanPrompt } from '@/lib/promptBuilder'
import type {
  ClaudeScanRequest,
  ClaudeScanResponse,
  ScanGroup,
  ProjectScanResult,
} from '@/types/claude'

const MAX_CHANGELOG_BYTES = 50 * 1024 // 50KB
const TIMEOUT_MS = 300_000 // 5 minutes — scan reads project files + analyzes

/**
 * Parse Claude's output to extract the structured scan result.
 * Falls back to raw output as the smartPrompt if JSON parsing fails.
 */
function parseScanOutput(stdout: string): ClaudeScanResponse {
  const jsonMatch = stdout.match(
    /--- SCAN RESULT JSON ---\s*([\s\S]*?)\s*--- END SCAN RESULT ---/,
  )

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1])
      return {
        smartPrompt:
          typeof parsed.smartPrompt === 'string'
            ? parsed.smartPrompt
            : stdout.trim(),
        intent:
          typeof parsed.intent === 'string'
            ? parsed.intent
            : 'Visual styling updates',
        groups: Array.isArray(parsed.groups)
          ? (parsed.groups as ScanGroup[])
          : [],
        warnings: Array.isArray(parsed.warnings)
          ? (parsed.warnings as string[])
          : [],
      }
    } catch {
      // JSON parse failed — fall through to raw fallback
    }
  }

  // Fallback: use entire output as the prompt
  return {
    smartPrompt: stdout.trim(),
    intent: 'Visual styling updates',
    groups: [],
    warnings: [],
  }
}

/** Format an SSE event. */
function sseEvent(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

/**
 * Validate request body and return parsed inputs or an error response.
 */
function parseAndValidateScan(
  body: ClaudeScanRequest & { projectScan?: ProjectScanResult },
): { error: NextResponse } | { prompt: string; resolvedRoot: string } {
  const { changelog, projectRoot, projectScan } = body

  if (!changelog || typeof changelog !== 'string' || changelog.length === 0) {
    return {
      error: NextResponse.json(
        { error: 'changelog is required and must be a non-empty string' },
        { status: 400 },
      ),
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
  const sanitizedChangelog = stripControlChars(changelog).slice(
    0,
    MAX_CHANGELOG_BYTES,
  )
  const prompt = buildScanPrompt(sanitizedChangelog, resolvedRoot, projectScan)

  return { prompt, resolvedRoot }
}

export async function POST(request: Request): Promise<Response> {
  let body: ClaudeScanRequest & { projectScan?: ProjectScanResult }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validated = parseAndValidateScan(body)
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
              const response = parseScanOutput(result.stdout)
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

    const response = parseScanOutput(result.stdout)
    return NextResponse.json(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message === 'TIMEOUT') {
      return NextResponse.json(
        { error: 'Claude CLI timed out after 5 minutes' },
        { status: 504 },
      )
    }
    return NextResponse.json(
      { error: 'Failed to run Claude CLI', details: message },
      { status: 500 },
    )
  }
}

import { NextResponse } from 'next/server'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { getClaudeBin } from '@/lib/claude-bin'
import { validateProjectRoot } from '@/lib/validatePath'
import type { ClaudeStatusResponse } from '@/types/claude'

const execFileAsync = promisify(execFile)

export async function GET(): Promise<NextResponse<ClaudeStatusResponse>> {
  try {
    const claudeBin = getClaudeBin()
    const { stdout } = await execFileAsync(claudeBin, ['--version'], {
      timeout: 10_000,
    })

    return NextResponse.json({
      available: true,
      version: stdout.trim(),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({
      available: false,
      error: `claude CLI not found: ${msg.slice(0, 200)}`,
    })
  }
}

/** Validate that projectRoot is absolute, exists, and is under HOME. */
export async function POST(request: Request): Promise<NextResponse> {
  let body: { projectRoot?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { projectRoot } = body
  if (!projectRoot || typeof projectRoot !== 'string') {
    return NextResponse.json(
      { error: 'projectRoot is required' },
      { status: 400 },
    )
  }

  const rootError = validateProjectRoot(projectRoot)
  if (rootError) {
    return NextResponse.json({ error: rootError }, { status: 400 })
  }

  const resolved = path.resolve(projectRoot)
  return NextResponse.json({ valid: true, resolved })
}

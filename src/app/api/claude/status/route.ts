import { NextResponse } from 'next/server';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import { getClaudeBin } from '@/lib/claude-bin';
import type { ClaudeStatusResponse } from '@/types/claude';

const execFileAsync = promisify(execFile);

export async function GET(): Promise<NextResponse<ClaudeStatusResponse>> {
  try {
    const claudeBin = getClaudeBin();
    const { stdout } = await execFileAsync(claudeBin, ['--version'], { timeout: 10_000 });

    return NextResponse.json({
      available: true,
      version: stdout.trim(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      available: false,
      error: `claude CLI not found: ${msg.slice(0, 200)}`,
    });
  }
}

/** Validate that projectRoot is absolute, exists, and is under HOME. */
export async function POST(request: Request): Promise<NextResponse> {
  let body: { projectRoot?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { projectRoot } = body;
  if (!projectRoot || typeof projectRoot !== 'string') {
    return NextResponse.json({ error: 'projectRoot is required' }, { status: 400 });
  }

  if (!path.isAbsolute(projectRoot)) {
    return NextResponse.json({ error: 'Path must be absolute (start with /)' }, { status: 400 });
  }

  const home = homedir();
  const resolved = path.resolve(projectRoot);

  if (!resolved.startsWith(home + path.sep) && resolved !== home) {
    return NextResponse.json({ error: 'Path must be under your home directory' }, { status: 400 });
  }

  if (!existsSync(resolved)) {
    return NextResponse.json({ error: 'Directory does not exist' }, { status: 400 });
  }

  try {
    if (!statSync(resolved).isDirectory()) {
      return NextResponse.json({ error: 'Path is not a directory' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Unable to access path' }, { status: 400 });
  }

  return NextResponse.json({ valid: true, resolved });
}

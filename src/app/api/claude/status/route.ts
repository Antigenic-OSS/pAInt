import { NextResponse } from 'next/server';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
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

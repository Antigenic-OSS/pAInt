import { NextResponse } from 'next/server';
import { getClaudeBin } from '@/lib/claude-bin';
import type { ClaudeStatusResponse } from '@/types/claude';

export async function GET(): Promise<NextResponse<ClaudeStatusResponse>> {
  try {
    const claudeBin = getClaudeBin();
    const proc = Bun.spawn([claudeBin, '--version'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const exitCode = await proc.exited;

    if (exitCode === 0) {
      const stdout = await new Response(proc.stdout).text();
      return NextResponse.json({
        available: true,
        version: stdout.trim(),
      });
    }

    return NextResponse.json({
      available: false,
      error: 'claude CLI exited with non-zero status',
    });
  } catch {
    return NextResponse.json({
      available: false,
      error: 'claude CLI not found in PATH',
    });
  }
}

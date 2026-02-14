import { NextResponse } from 'next/server';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { getClaudeBin } from '@/lib/claude-bin';
import type {
  ClaudeApplyRequest,
  ClaudeApplyResponse,
} from '@/types/claude';

const TIMEOUT_MS = 120_000; // 120 seconds

/**
 * Validate that projectRoot is an absolute path, exists as a directory,
 * and resides under the user's HOME directory.
 */
function validateProjectRoot(projectRoot: string): string | null {
  if (!path.isAbsolute(projectRoot)) {
    return 'projectRoot must be an absolute path';
  }

  const home = process.env.HOME;
  if (!home) {
    return 'HOME environment variable is not set';
  }

  const resolved = path.resolve(projectRoot);
  const resolvedHome = path.resolve(home);

  if (!resolved.startsWith(resolvedHome + path.sep) && resolved !== resolvedHome) {
    return 'projectRoot must be under the user home directory';
  }

  if (!existsSync(resolved)) {
    return 'projectRoot does not exist';
  }

  try {
    const stat = statSync(resolved);
    if (!stat.isDirectory()) {
      return 'projectRoot is not a directory';
    }
  } catch {
    return 'Unable to stat projectRoot';
  }

  return null;
}

/**
 * Extract modified file paths from Claude CLI output.
 * Looks for patterns like "Edited <path>" or "Modified <path>" or diff file headers.
 */
function extractModifiedFiles(output: string): string[] {
  const files = new Set<string>();

  const lines = output.split('\n');
  for (const line of lines) {
    // Match "Edit" / "Edited" / "Modified" patterns from Claude CLI output
    const editMatch = line.match(/(?:Edit(?:ed)?|Modified|Updated|Changed)\s+([^\s]+\.\w+)/i);
    if (editMatch) {
      files.add(editMatch[1]);
    }

    // Match diff-style file headers: "+++ b/<path>"
    if (line.startsWith('+++ b/')) {
      const filePath = line.slice(6).trim();
      if (filePath && filePath !== '/dev/null') {
        files.add(filePath);
      }
    }
  }

  return Array.from(files);
}

/**
 * Build a summary from the apply output.
 */
function buildSummary(output: string, filesModified: string[]): string {
  if (filesModified.length === 0) {
    // If no files were detected, try to extract a meaningful summary
    const trimmed = output.trim();
    if (trimmed.length === 0) {
      return 'Changes applied. No specific file modifications detected in output.';
    }
    // Return the first 200 chars of the output as summary
    return trimmed.length > 200
      ? trimmed.slice(0, 200) + '...'
      : trimmed;
  }

  return (
    `Successfully modified ${filesModified.length} file${filesModified.length !== 1 ? 's' : ''}: ` +
    filesModified.join(', ')
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  // Parse and validate request body
  let body: ClaudeApplyRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const { sessionId, projectRoot } = body;

  // Validate sessionId
  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json(
      { error: 'sessionId is required and must be a non-empty string' },
      { status: 400 },
    );
  }

  // Basic sessionId format validation (UUID or hex string)
  if (!/^[a-f0-9-]+$/i.test(sessionId)) {
    return NextResponse.json(
      { error: 'sessionId contains invalid characters' },
      { status: 400 },
    );
  }

  // Validate projectRoot
  if (!projectRoot || typeof projectRoot !== 'string') {
    return NextResponse.json(
      { error: 'projectRoot is required and must be a string' },
      { status: 400 },
    );
  }

  const rootError = validateProjectRoot(projectRoot);
  if (rootError) {
    return NextResponse.json(
      { error: rootError },
      { status: 400 },
    );
  }

  const resolvedRoot = path.resolve(projectRoot);

  try {
    const claudeBin = getClaudeBin();
    const proc = Bun.spawn(
      [
        claudeBin,
        '--resume', sessionId,
        '--allowedTools', 'Read,Edit',
        '--print',
        '-p', 'Apply the changes discussed in the previous analysis. Edit the source files to implement all the visual changes from the changelog.',
      ],
      {
        cwd: resolvedRoot,
        stdout: 'pipe',
        stderr: 'pipe',
        env: { ...process.env },
      },
    );

    // Race between process completion and timeout
    const timeoutPromise = new Promise<'timeout'>((resolve) => {
      setTimeout(() => resolve('timeout'), TIMEOUT_MS);
    });

    const result = await Promise.race([proc.exited, timeoutPromise]);

    if (result === 'timeout') {
      proc.kill();
      return NextResponse.json(
        { error: 'Claude CLI timed out after 120 seconds' },
        { status: 504 },
      );
    }

    const exitCode = result;
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    if (exitCode !== 0) {
      return NextResponse.json(
        {
          error: 'Claude CLI exited with an error',
          details: stderr.trim() || 'Unknown CLI error',
        },
        { status: 500 },
      );
    }

    // Combine stdout and stderr to look for file modification signals
    const combinedOutput = stdout + '\n' + stderr;
    const filesModified = extractModifiedFiles(combinedOutput);
    const summary = buildSummary(stdout, filesModified);

    const response: ClaudeApplyResponse = {
      success: true,
      filesModified,
      summary,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to run Claude CLI', details: message },
      { status: 500 },
    );
  }
}

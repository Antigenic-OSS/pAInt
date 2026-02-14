import { NextResponse } from 'next/server';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { stripControlChars } from '@/lib/utils';
import type {
  ClaudeAnalyzeRequest,
  ClaudeAnalyzeResponse,
  ParsedDiff,
  DiffHunk,
  DiffLine,
} from '@/types/claude';

const MAX_CHANGELOG_BYTES = 50 * 1024; // 50KB
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

  // Resolve to canonical form to prevent traversal tricks (e.g. /home/user/../other)
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
 * Parse unified diff output into structured ParsedDiff objects.
 */
function parseDiffs(output: string): ParsedDiff[] {
  const diffs: ParsedDiff[] = [];

  // Split on diff headers: "diff --git a/... b/..." or "--- a/..." patterns
  // We look for file markers: "--- a/<path>" followed by "+++ b/<path>"
  const lines = output.split('\n');
  let currentDiff: ParsedDiff | null = null;
  let currentHunk: DiffHunk | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect file path from +++ line (the "new" file in unified diff)
    if (line.startsWith('+++ b/') || line.startsWith('+++ ')) {
      // Start a new diff for this file
      const filePath = line.startsWith('+++ b/')
        ? line.slice(6).trim()
        : line.slice(4).trim();

      if (filePath && filePath !== '/dev/null') {
        currentDiff = {
          filePath,
          hunks: [],
          linesAdded: 0,
          linesRemoved: 0,
        };
        diffs.push(currentDiff);
        currentHunk = null;
      }
      continue;
    }

    // Detect --- line for removed file (skip, we use +++ for file path)
    if (line.startsWith('--- a/') || line.startsWith('--- ')) {
      continue;
    }

    // Detect hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    const hunkMatch = line.match(/^@@\s+[^@]+\s+@@(.*)?$/);
    if (hunkMatch && currentDiff) {
      currentHunk = {
        header: line,
        lines: [],
      };
      currentDiff.hunks.push(currentHunk);
      continue;
    }

    // Inside a hunk, classify lines
    if (currentHunk && currentDiff) {
      if (line.startsWith('+')) {
        const diffLine: DiffLine = {
          type: 'addition',
          content: line.slice(1),
        };
        currentHunk.lines.push(diffLine);
        currentDiff.linesAdded++;
      } else if (line.startsWith('-')) {
        const diffLine: DiffLine = {
          type: 'removal',
          content: line.slice(1),
        };
        currentHunk.lines.push(diffLine);
        currentDiff.linesRemoved++;
      } else if (line.startsWith(' ')) {
        const diffLine: DiffLine = {
          type: 'context',
          content: line.slice(1),
        };
        currentHunk.lines.push(diffLine);
      }
      // Lines that don't start with +, -, or space end the hunk
      // (e.g. "\ No newline at end of file" or blank separator)
    }
  }

  return diffs;
}

/**
 * Build a summary string from parsed diffs.
 */
function buildSummary(diffs: ParsedDiff[]): string {
  if (diffs.length === 0) {
    return 'No file changes detected in the analysis output.';
  }

  const totalAdded = diffs.reduce((sum, d) => sum + d.linesAdded, 0);
  const totalRemoved = diffs.reduce((sum, d) => sum + d.linesRemoved, 0);
  const fileList = diffs.map((d) => d.filePath).join(', ');

  return (
    `${diffs.length} file${diffs.length !== 1 ? 's' : ''} to modify: ${fileList}. ` +
    `+${totalAdded} / -${totalRemoved} lines.`
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  // Parse and validate request body
  let body: ClaudeAnalyzeRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const { changelog, projectRoot } = body;

  // Validate changelog
  if (!changelog || typeof changelog !== 'string') {
    return NextResponse.json(
      { error: 'changelog is required and must be a non-empty string' },
      { status: 400 },
    );
  }

  if (changelog.length === 0) {
    return NextResponse.json(
      { error: 'changelog must not be empty' },
      { status: 400 },
    );
  }

  // Strip control characters and enforce 50KB max
  const sanitizedChangelog = stripControlChars(changelog).slice(0, MAX_CHANGELOG_BYTES);

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

  // Build the prompt for Claude CLI
  const prompt = [
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
  ].join('\n');

  try {
    const proc = Bun.spawn(
      [
        'claude',
        '--print',
        '--allowedTools', 'Read',
        '-p', prompt,
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

    // Generate a session ID from the output for potential --resume usage
    // In practice, Claude CLI prints a session ID on stderr or we derive one
    const sessionIdMatch = stderr.match(/session[:\s]+([a-f0-9-]+)/i);
    const sessionId = sessionIdMatch
      ? sessionIdMatch[1]
      : crypto.randomUUID();

    // Parse diffs from CLI output
    const diffs = parseDiffs(stdout);
    const summary = buildSummary(diffs);

    const response: ClaudeAnalyzeResponse = {
      sessionId,
      diffs,
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

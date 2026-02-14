/**
 * Unified diff parser for Claude CLI output.
 *
 * Parses standard unified diff text into structured `ParsedDiff` objects
 * that the editor can render in the diff viewer.
 *
 * The parser is intentionally lenient: Claude output may include
 * commentary, fenced code blocks, or slight formatting variations.
 */

import type { ParsedDiff, DiffHunk, DiffLine } from '@/types/claude';

/**
 * Strip wrapping markdown fenced code blocks (``` or ```diff) that
 * Claude sometimes emits around diff output.
 */
function stripCodeFences(text: string): string {
  // Remove fenced blocks that wrap the entire output or individual diffs.
  // We keep the inner content intact.
  return text.replace(/^```(?:diff)?\s*$/gm, '');
}

/**
 * Detect whether a line is the start of a new file diff header.
 *
 * We accept both `--- a/path` and `--- path` variants.
 */
function isFileHeaderLine(line: string): boolean {
  return /^---\s+(?:a\/)?/.test(line);
}

/**
 * Extract the file path from a `+++ b/path` line.
 *
 * Falls back to the `--- a/path` line if the +++ variant is
 * missing or malformed.
 */
function extractFilePath(plusLine: string, minusLine: string): string {
  // Try +++ first — this represents the "new" file.
  const plusMatch = plusLine.match(/^\+\+\+\s+(?:b\/)?(.+)/);
  if (plusMatch) {
    return plusMatch[1].trim();
  }

  // Fall back to --- (the "old" file).
  const minusMatch = minusLine.match(/^---\s+(?:a\/)?(.+)/);
  if (minusMatch) {
    return minusMatch[1].trim();
  }

  return 'unknown';
}

/**
 * Parse a single hunk starting from the @@ header line.
 *
 * Returns the parsed hunk and the index of the first line AFTER
 * this hunk (i.e. the next @@ header or file header).
 */
function parseHunk(
  lines: string[],
  startIndex: number,
): { hunk: DiffHunk; nextIndex: number } {
  const header = lines[startIndex];
  const hunkLines: DiffLine[] = [];

  let i = startIndex + 1;
  while (i < lines.length) {
    const line = lines[i];

    // Stop at the next hunk or file header.
    if (line.startsWith('@@') || isFileHeaderLine(line)) {
      break;
    }

    // Classify the line.
    if (line.startsWith('+')) {
      hunkLines.push({ type: 'addition', content: line.slice(1) });
    } else if (line.startsWith('-')) {
      hunkLines.push({ type: 'removal', content: line.slice(1) });
    } else {
      // Context line — may start with a space, or may be a bare line
      // if Claude omitted the leading space.
      const content = line.startsWith(' ') ? line.slice(1) : line;
      hunkLines.push({ type: 'context', content });
    }

    i++;
  }

  return {
    hunk: { header, lines: hunkLines },
    nextIndex: i,
  };
}

/**
 * Parse a single file diff block (from `---` through all its hunks).
 *
 * Returns the parsed diff and the index of the first line AFTER
 * this file block.
 */
function parseFileDiff(
  lines: string[],
  startIndex: number,
): { diff: ParsedDiff; nextIndex: number } | null {
  const minusLine = lines[startIndex];

  // The +++ line should follow immediately.
  const plusLineIndex = startIndex + 1;
  if (plusLineIndex >= lines.length) {
    return null;
  }

  const plusLine = lines[plusLineIndex];
  if (!plusLine.startsWith('+++')) {
    // Malformed — skip this block.
    return null;
  }

  const filePath = extractFilePath(plusLine, minusLine);

  const hunks: DiffHunk[] = [];
  let linesAdded = 0;
  let linesRemoved = 0;

  let i = plusLineIndex + 1;

  // Consume all hunks belonging to this file.
  while (i < lines.length) {
    const line = lines[i];

    // A new file header means we are done with this file.
    if (isFileHeaderLine(line)) {
      break;
    }

    if (line.startsWith('@@')) {
      const { hunk, nextIndex } = parseHunk(lines, i);
      hunks.push(hunk);

      // Count additions / removals.
      for (const hl of hunk.lines) {
        if (hl.type === 'addition') linesAdded++;
        if (hl.type === 'removal') linesRemoved++;
      }

      i = nextIndex;
    } else {
      // Non-hunk, non-header line (e.g. blank line between file blocks
      // or stray commentary). Skip it.
      i++;
    }
  }

  // If we found no hunks at all this was probably not a real diff block.
  if (hunks.length === 0) {
    return null;
  }

  return {
    diff: { filePath, hunks, linesAdded, linesRemoved },
    nextIndex: i,
  };
}

/**
 * Parse unified diff output (potentially mixed with commentary) into
 * an array of `ParsedDiff` objects.
 *
 * Handles:
 * - Standard `git diff` / unified diff format.
 * - Multiple files in one output block.
 * - Markdown code fences wrapping the diffs.
 * - Leading/trailing prose from Claude.
 * - Empty or entirely non-diff input (returns `[]`).
 */
export function parseDiffs(output: string): ParsedDiff[] {
  if (!output || output.trim().length === 0) {
    return [];
  }

  const cleaned = stripCodeFences(output);
  const lines = cleaned.split('\n');
  const results: ParsedDiff[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (isFileHeaderLine(line)) {
      const parsed = parseFileDiff(lines, i);
      if (parsed) {
        results.push(parsed.diff);
        i = parsed.nextIndex;
      } else {
        // Could not parse — skip past this line.
        i++;
      }
    } else {
      i++;
    }
  }

  return results;
}

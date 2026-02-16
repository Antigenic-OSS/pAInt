/**
 * Prompt construction utilities for Claude CLI integration.
 *
 * buildAnalysisPrompt  — read-only analysis session (--allowedTools Read)
 * buildApplyPrompt     — resume session to apply edits (--allowedTools Read,Edit)
 */

import type { ProjectScanResult } from '@/types/claude';

/**
 * Build a "## Project Context" section from scan results.
 */
function buildProjectContextSection(scan: ProjectScanResult): string {
  const lines: string[] = ['', '## Project Context', ''];
  if (scan.framework) {
    lines.push(`- Framework: ${scan.framework}`);
  }
  if (scan.cssStrategy.length > 0) {
    lines.push(`- CSS: ${scan.cssStrategy.join(', ')}`);
  }
  if (scan.cssFiles.length > 0) {
    lines.push(`- Key CSS files: ${scan.cssFiles.join(', ')}`);
  }
  if (scan.srcDirs.length > 0) {
    lines.push(`- Source directories: ${scan.srcDirs.join(', ')}`);
  }
  if (scan.packageName) {
    lines.push(`- Package: ${scan.packageName}`);
  }
  return lines.join('\n');
}

/**
 * Construct an analysis prompt from a changelog and project root.
 *
 * The resulting prompt instructs Claude to:
 * 1. Read the relevant source files in the project.
 * 2. Analyse the visual changelog entries.
 * 3. Produce unified diffs that implement every change.
 *
 * If a ProjectScanResult is provided, a "Project Context" section is appended
 * so Claude has immediate knowledge of the project's framework and CSS approach.
 */
export function buildAnalysisPrompt(
  changelog: string,
  projectRoot: string,
  scan?: ProjectScanResult | null,
): string {
  const prompt = [
    'You are a front-end code assistant. A user has made visual edits to their',
    'web application via a design editor. Your job is to translate those visual',
    'changes into concrete source-code modifications.',
    '',
    `The project is located at: ${projectRoot}`,
    '',
    '## Changelog',
    '',
    'Below is the changelog exported from the visual editor. Each entry',
    'describes a CSS property change applied to a specific DOM element',
    '(identified by its CSS selector path), the original value, and the new',
    'value.',
    '',
    '```',
    changelog.trim(),
    '```',
    '',
    '## Instructions',
    '',
    '1. Read the relevant source files in the project to understand the',
    '   current code (components, stylesheets, Tailwind classes, inline',
    '   styles, etc.).',
    '2. For every change listed in the changelog, determine which source',
    '   file(s) need to be modified and how.',
    '3. When a CSS property maps to a Tailwind utility class, prefer',
    '   updating the class name. When the property is set via inline',
    '   styles or a CSS/SCSS file, edit the corresponding declaration.',
    '4. Output unified diffs for every file that needs to change.',
    '',
    '## Output format',
    '',
    'Return ONLY unified diffs — no commentary before or after.',
    'Use the standard unified diff format:',
    '',
    '```',
    '--- a/<relative-path-to-file>',
    '+++ b/<relative-path-to-file>',
    '@@ -<old-start>,<old-count> +<new-start>,<new-count> @@',
    ' context line',
    '-removed line',
    '+added line',
    '```',
    '',
    'Include enough context lines (3 is ideal) around each change so the',
    'diff can be applied unambiguously. If multiple hunks affect the same',
    'file, combine them under a single --- / +++ header.',
  ].join('\n');

  if (scan) {
    return prompt + buildProjectContextSection(scan);
  }
  return prompt;
}

/**
 * Construct the follow-up prompt used when resuming the Claude session
 * to apply the diffs that were previously analysed.
 *
 * This prompt is used with `--allowedTools Read,Edit` so that Claude
 * can read and then edit the source files directly.
 */
export function buildApplyPrompt(): string {
  return [
    'Apply the changes you previously analysed.',
    '',
    'Use the Edit tool to modify each file exactly as described in the',
    'unified diffs you generated. Follow these rules:',
    '',
    '1. Read each file before editing to confirm current contents.',
    '2. Apply changes in the order they were listed.',
    '3. Do NOT make any changes beyond what was specified in the diffs.',
    '4. After all edits are applied, output a brief summary listing each',
    '   file modified and the number of hunks applied.',
  ].join('\n');
}

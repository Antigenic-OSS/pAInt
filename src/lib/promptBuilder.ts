/**
 * Prompt construction utilities for Claude CLI integration.
 *
 * buildAnalysisPrompt  — read-only analysis session (--allowedTools Read)
 * buildApplyPrompt     — resume session to apply edits (--allowedTools Read,Edit)
 */

import type { ProjectScanResult } from '@/types/claude'

/**
 * Build framework-specific styling instructions for Claude analysis prompts.
 */
function buildFrameworkInstructions(scan?: ProjectScanResult | null): string {
  const framework = scan?.framework ?? null
  const usesTailwind = scan?.cssStrategy?.includes('tailwind') ?? false

  if (framework === 'flutter') {
    return [
      '**Flutter / Dart**: This is a Flutter project. Styles are applied via widget',
      '   properties, NOT CSS. Map CSS changes to Dart equivalents:',
      '   - padding/margin → EdgeInsets (EdgeInsets.all(n), EdgeInsets.symmetric(...))',
      '   - font-size → TextStyle(fontSize: n)',
      '   - font-weight → TextStyle(fontWeight: FontWeight.w500)',
      '   - color → TextStyle(color: Color(0xFF______))',
      '   - background-color → Container(color: ...) or ColoredBox',
      '   - display: flex → Row (horizontal) or Column (vertical)',
      '   - justify-content → MainAxisAlignment.center/spaceBetween/etc.',
      '   - align-items → CrossAxisAlignment.center/start/etc.',
      '   - border-radius → BoxDecoration(borderRadius: BorderRadius.circular(n))',
      '   - width/height → SizedBox(width: n, height: n)',
      '   - opacity → Opacity(opacity: n, child: ...)',
    ].join('\n')
  }

  if (framework === 'react-native') {
    return [
      '**React Native**: This is a React Native project. Styles use StyleSheet objects,',
      '   NOT CSS classes or Tailwind. Map CSS changes to RN style properties:',
      '   - Styles applied via `style` prop: `<View style={styles.container} />`',
      '   - Defined in `StyleSheet.create({ ... })`',
      '   - padding/margin → padding, paddingHorizontal, margin, marginVertical, etc. (number, no units)',
      '   - font-size → fontSize: n',
      '   - font-weight → fontWeight: "600" (string values)',
      '   - color → color: "#hex"',
      '   - background-color → backgroundColor: "#hex"',
      '   - display: flex is default; flexDirection defaults to "column" (opposite of web)',
      '   - justify-content → justifyContent: "center"',
      '   - align-items → alignItems: "center"',
      '   - border-radius → borderRadius: n (number only)',
      '   - box-shadow → iOS: shadowColor/shadowOffset/shadowOpacity; Android: elevation',
    ].join('\n')
  }

  if (usesTailwind) {
    return [
      '**Tailwind CSS (detected)**: Styles are applied via `className` on JSX elements.',
      '   Find the component rendering the element and update its Tailwind utility classes.',
      '   NEVER add inline styles when the project uses Tailwind.',
      '   - Replace old Tailwind classes with new ones (e.g., `p-2` → `p-4`,',
      '     `text-sm` → `text-lg`, `bg-gray-100` → `bg-blue-500`).',
      '   - Use the Tailwind spacing scale: 4px = 1 unit (p-1=4px, p-2=8px,',
      '     p-4=16px, p-6=24px, p-8=32px).',
      '   - For values not on the scale, use arbitrary syntax: `p-[13px]`,',
      '     `text-[15px]`, `bg-[#1e1e1e]`.',
      '   - For responsive changes, use mobile-first prefixes:',
      '     - Changes marked [mobile] → base classes (no prefix)',
      '     - Changes marked [tablet] → `md:` prefix (768px+)',
      '     - Changes marked [desktop] → `lg:` or `xl:` prefix (1024px+ / 1280px+)',
      '     - Example: `className="text-sm md:text-base lg:text-lg"`',
      '   - When using clsx/cn helper, preserve the conditional structure:',
      '     `cn("base-classes", condition && "conditional-classes")`.',
    ].join('\n')
  }

  // Generic web — unknown CSS approach
  return [
    '   Determine the CSS approach used (Tailwind classes, CSS modules,',
    '   styled-components, inline styles, global stylesheets, etc.) and',
    '   apply changes using that same approach. For Tailwind, update className',
    '   utility classes. For CSS files, edit the declarations directly.',
  ].join('\n')
}

/**
 * Build a "## Project Context" section from scan results.
 */
function buildProjectContextSection(scan: ProjectScanResult): string {
  const lines: string[] = ['', '## Project Context', '']
  if (scan.framework) {
    lines.push(`- Framework: ${scan.framework}`)
  }
  if (scan.cssStrategy.length > 0) {
    lines.push(`- CSS: ${scan.cssStrategy.join(', ')}`)
  }
  if (scan.cssFiles.length > 0) {
    lines.push(`- Key CSS files: ${scan.cssFiles.join(', ')}`)
  }
  if (scan.srcDirs.length > 0) {
    lines.push(`- Source directories: ${scan.srcDirs.join(', ')}`)
  }
  if (scan.packageName) {
    lines.push(`- Package: ${scan.packageName}`)
  }

  // File map summary
  if (scan.fileMap) {
    const { routes, components } = scan.fileMap

    if (routes.length > 0) {
      const pageRoutes = routes.filter((r) => r.type === 'page')
      const layoutRoutes = routes.filter((r) => r.type === 'layout')
      lines.push('')
      lines.push('### Route Files')
      for (const r of pageRoutes) {
        lines.push(`- ${r.urlPattern} → ${r.filePath}`)
      }
      for (const r of layoutRoutes) {
        lines.push(`- ${r.urlPattern} (layout) → ${r.filePath}`)
      }
    }

    if (components.length > 0) {
      // Group by category and list directory with counts
      const dirCounts = new Map<string, { count: number; category: string }>()
      for (const comp of components) {
        const dir =
          comp.filePath.substring(0, comp.filePath.lastIndexOf('/')) || '.'
        const existing = dirCounts.get(dir)
        if (existing) {
          existing.count++
        } else {
          dirCounts.set(dir, { count: 1, category: comp.category })
        }
      }
      lines.push('')
      lines.push('### Source Files')
      for (const [dir, { count, category }] of dirCounts) {
        lines.push(`- ${dir}/ (${count} ${category}${count !== 1 ? 's' : ''})`)
      }
    }
  }

  return lines.join('\n')
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
    '   current code.',
    '2. For every change listed in the changelog, determine which source',
    '   file(s) need to be modified and how.',
    buildFrameworkInstructions(scan),
    '3. Output unified diffs for every file that needs to change.',
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
  ].join('\n')

  if (scan) {
    return prompt + buildProjectContextSection(scan)
  }
  return prompt
}

/**
 * Construct the follow-up prompt used when resuming the Claude session
 * to apply the diffs that were previously analysed.
 *
 * This prompt is used with `--allowedTools Read,Edit` so that Claude
 * can read and then edit the source files directly.
 */
/**
 * Construct a scan prompt that asks Claude to analyse the changelog and
 * produce a structured, context-aware "smart prompt" another Claude Code
 * instance can use to apply the changes.
 *
 * Uses `--allowedTools Read` so Claude can inspect source files for
 * file-routing accuracy and CSS-approach detection.
 */
export function buildScanPrompt(
  changelog: string,
  projectRoot: string,
  scan?: ProjectScanResult | null,
): string {
  const prompt = [
    'You are a front-end design system analyst. A user has made visual changes',
    'to their web application using a design editor. Your job is to analyse',
    'those changes and produce a smart, context-aware prompt that another',
    'Claude Code instance will use to apply the changes to source code.',
    '',
    `The project is located at: ${projectRoot}`,
    '',
    '## Your Task',
    '',
    '1. Read the changelog below carefully.',
    '2. Use the Read tool to examine the relevant source files in the project.',
    '3. Analyse the pattern and intent behind the changes.',
    '4. Produce a structured JSON result wrapped in markers.',
    '',
    '## Analysis Steps',
    '',
    '### Intent Detection',
    'Look at the combination of properties changed across all elements:',
    '- Mostly font-size, font-weight, line-height, letter-spacing, color on text => "Typography redesign"',
    '- Mostly margin, padding, gap => "Spacing normalization"',
    '- Mostly background-color, color, border-color => "Color palette update"',
    '- Mostly display, flex-direction, justify-content, align-items, grid-* => "Layout restructuring"',
    '- Mostly border-radius, box-shadow, opacity => "Visual refinement"',
    '- Mixed => describe the primary intent based on the dominant pattern',
    '',
    '### Logical Grouping',
    'Group the changes into these categories:',
    '- typography: font-*, text-*, letter-spacing, line-height, color (on text)',
    '- spacing: margin-*, padding-*, gap, row-gap, column-gap',
    '- colors: background-color, color, border-color, fill, stroke',
    '- layout: display, flex-*, grid-*, justify-*, align-*, order',
    '- borders: border-width, border-style, border-radius',
    '- background: background-image, background-size, background-position',
    '- effects: box-shadow, opacity, filter, transform',
    '',
    '### File Routing',
    'For each CSS selector in the changelog:',
    '1. Read the project source files to find where the matching element is defined.',
    '2. Determine the CSS approach:',
    '   - **Tailwind CSS (React/Next.js)**: Styles live in `className` on JSX elements.',
    '     Look for the component file (.tsx/.jsx) that renders the element.',
    '     Changes must modify the Tailwind utility classes in className.',
    '   - **CSS Modules**: Look for `*.module.css` imports and matching class names.',
    '   - **Global CSS**: Check `globals.css`, `app.css`, or similar.',
    '   - **Inline styles**: `style={{ }}` prop on JSX elements.',
    '3. Record the file path where changes should be applied.',
    '',
    '### Scope Expansion',
    'Look for patterns suggesting broader changes:',
    '- Same color changed on multiple elements => suggest a CSS variable or design token.',
    '- Spacing follows a consistent system (multiples of 4px/8px) => note the grid.',
    '- Font-size changes map to a Tailwind scale => suggest using the scale consistently.',
    '',
    '### Conflict Detection',
    'Flag potential issues:',
    '- Breakpoint-specific changes that might conflict with other breakpoints',
    "- Values that don't match the project's existing design system",
    '- Accessibility concerns (font-size below 12px, insufficient contrast)',
    '',
    '## Changelog',
    '',
    '```',
    changelog.trim(),
    '```',
    '',
    '## Output Format',
    '',
    'Output a JSON object wrapped in these exact markers:',
    '',
    '--- SCAN RESULT JSON ---',
    '{',
    '  "intent": "Brief description of the overall design intent",',
    '  "smartPrompt": "A detailed, actionable prompt that another Claude Code',
    '    instance can use to apply these changes. Include specific file paths,',
    '    the CSS approach used (Tailwind, CSS modules, etc.), grouped instructions,',
    '    and any design system considerations. Write as clear instructions, not',
    '    as a changelog. The recipient will not have the original changelog.",',
    '  "groups": [',
    '    {',
    '      "label": "Human-readable group name",',
    '      "category": "typography|spacing|colors|layout|borders|background|effects|mixed",',
    '      "changeCount": 3,',
    '      "suggestedFiles": ["src/components/Header.tsx"]',
    '    }',
    '  ],',
    '  "warnings": ["Any potential conflicts, accessibility issues, or concerns"]',
    '}',
    '--- END SCAN RESULT ---',
    '',
    'IMPORTANT: The smartPrompt field must be a complete, self-contained prompt.',
    'It should read naturally as instructions — do not reference "the changelog"',
    'since the recipient will not have it. Include actual values, selectors, and',
    'file paths inline.',
    '',
    'PERFORMANCE: Minimise the number of Read calls. If Project Context is',
    'provided below, use it to infer file paths instead of reading the filesystem.',
    'Only read 1-3 key files to confirm the CSS approach (Tailwind, CSS modules, etc.).',
    'Do not read every component file — focus on the most relevant ones.',
  ].join('\n')

  if (scan) {
    return prompt + buildProjectContextSection(scan)
  }
  return prompt
}

/**
 * Wrap an AI-Scan smart prompt with diff-output instructions so the
 * analyze route can produce unified diffs from it.
 */
export function buildSmartAnalysisPrompt(
  smartPrompt: string,
  projectRoot: string,
): string {
  return [
    'You are a front-end code assistant. Below are detailed instructions',
    "describing visual changes to apply to a web application's source code.",
    '',
    `The project is located at: ${projectRoot}`,
    '',
    '## Change Instructions',
    '',
    smartPrompt.trim(),
    '',
    '## Your Task',
    '',
    '1. Read the relevant source files mentioned in the instructions above.',
    '2. Apply every change described — use the CSS approach already in place.',
    '   For Tailwind CSS projects: modify className utility classes on JSX elements.',
    '   Never add inline styles if the project uses Tailwind.',
    '   Use arbitrary value syntax [value] when no Tailwind scale matches.',
    '   Use responsive prefixes (md:, lg:, xl:) for breakpoint-specific changes.',
    '3. Output unified diffs for every file that needs to change.',
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
  ].join('\n')
}

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
  ].join('\n')
}

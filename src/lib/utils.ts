import { getBreakpointDeviceInfo, buildInstructionsFooter } from '@/lib/constants';

/**
 * Convert a camelCase CSS property name to kebab-case.
 * Handles vendor prefixes: webkitTextStroke → -webkit-text-stroke
 */
export function camelToKebab(s: string): string {
  const k = s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
  if (/^(webkit|moz|ms)-/.test(k)) return '-' + k;
  return k;
}

/**
 * Generate a CSS selector path for a DOM element.
 */
export function generateSelectorPath(element: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector += `#${current.id}`;
      parts.unshift(selector);
      break;
    }

    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(Boolean);
      if (classes.length > 0) {
        selector += '.' + classes.join('.');
      }
    }

    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child) => child.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    parts.unshift(selector);
    current = current.parentElement;
  }

  return parts.join(' > ');
}

/**
 * Find an element by its CSS selector path.
 */
export function findElementBySelector(selectorPath: string): Element | null {
  try {
    return document.querySelector(selectorPath);
  } catch {
    return null;
  }
}

/**
 * Parse a CSS value into number and unit parts.
 */
export function parseCSSValue(value: string): { number: number; unit: string } {
  const match = value.match(/^(-?\d*\.?\d+)(px|%|em|rem|vh|vw|pt|ch|ex)?$/);
  if (match) {
    return { number: parseFloat(match[1]), unit: match[2] || 'px' };
  }
  return { number: 0, unit: 'px' };
}

/**
 * Format a CSS value from number and unit parts.
 */
export function formatCSSValue(num: number, unit: string): string {
  if (unit === 'auto') return 'auto';
  return `${num}${unit}`;
}

/**
 * Validate that a URL is a localhost address.
 */
export function isLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
    );
  } catch {
    return false;
  }
}

/**
 * Normalize a target URL (ensure trailing slash, etc.)
 */
export function normalizeTargetUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch {
    return url;
  }
}

/**
 * Generate a unique ID.
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Strip control characters from a string (keep newlines and tabs).
 */
export function stripControlChars(str: string): string {
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Generate a structured changelog text from tracked changes.
 */
export function formatChangelog(opts: {
  targetUrl: string;
  pagePath: string;
  breakpoint: import('@/types/changelog').Breakpoint;
  breakpointWidth: number;
  styleChanges: import('@/types/changelog').StyleChange[];
  framework?: string | null;
  cssStrategy?: string[] | null;
}): string {
  const {
    targetUrl,
    pagePath,
    breakpoint,
    styleChanges,
  } = opts;

  const { deviceName, range } = getBreakpointDeviceInfo(breakpoint);

  const lines: string[] = [];
  const timestamp = new Date().toISOString();

  lines.push('=== DEV EDITOR CHANGELOG ===');
  lines.push(`Project URL: ${targetUrl}`);
  lines.push(`Page: ${pagePath || '/'}`);
  lines.push(`Device Name: ${deviceName}`);
  lines.push(`Breakpoint: ${range}`);
  lines.push(`Generated: ${timestamp}`);
  lines.push('');

  // Separate special entries from regular style changes
  const componentExtractions = styleChanges.filter((c) => c.property === '__component_creation__');
  const variableDefinitions = styleChanges.filter((c) => c.elementSelector === ':root' && c.property.startsWith('--'));
  const regularChanges = styleChanges.filter((c) => c.property !== '__component_creation__' && !(c.elementSelector === ':root' && c.property.startsWith('--')));

  // Component Extractions section
  if (componentExtractions.length > 0) {
    lines.push('## Component Extractions');
    lines.push('');

    for (const extraction of componentExtractions) {
      try {
        const data = JSON.parse(extraction.newValue) as {
          name: string;
          variants: Array<{ groupName: string; options: string[] }>;
        };
        const kebabName = data.name
          .replace(/([a-z])([A-Z])/g, '$1-$2')
          .replace(/\s+/g, '-')
          .toLowerCase();
        lines.push(`### ${data.name} Component`);
        lines.push(`- Selector: \`${extraction.elementSelector}\``);
        lines.push(`- Suggested file: \`src/components/${kebabName}.tsx\``);
        if (data.variants.length > 0) {
          lines.push('- Suggested props:');
          for (const v of data.variants) {
            lines.push(`  - ${v.groupName.toLowerCase()}: ${v.options.join(' | ')}`);
          }
        }
        lines.push('');
      } catch {
        // Skip malformed extraction entries
      }
    }
  }

  // CSS Variable Definitions section
  if (variableDefinitions.length > 0) {
    lines.push('## CSS Variable Definitions');
    lines.push('');
    lines.push('Add these CSS custom properties to the project\'s root stylesheet (`:root` or `html` selector):');
    lines.push('');
    for (const v of variableDefinitions) {
      // Find which element property references this variable
      const varRef = `var(${v.property})`;
      const referencing = regularChanges.filter((c) => c.newValue === varRef);
      lines.push(`- \`${v.property}: ${v.newValue}\``);
      for (const ref of referencing) {
        lines.push(`  - Used by: \`${ref.elementSelector}\` → ${ref.property}: var(${v.property})`);
      }
    }
    lines.push('');
  }

  // Group regular style changes by element selector
  if (regularChanges.length > 0) {
    lines.push('## Style Changes');
    lines.push('');

    const grouped = new Map<string, typeof regularChanges>();
    for (const change of regularChanges) {
      const existing = grouped.get(change.elementSelector) || [];
      existing.push(change);
      grouped.set(change.elementSelector, existing);
    }

    for (const [selector, changes] of grouped) {
      lines.push(`### ${selector}`);
      for (const c of changes) {
        lines.push(`- ${c.property}: "${c.originalValue}" → "${c.newValue}" [${c.breakpoint}]`);
      }
      lines.push('');
    }
  }

  // Summary + instructions footer (framework-aware)
  const totalChanges = styleChanges.length;
  const uniqueElements = new Set(styleChanges.map((c) => c.elementSelector)).size;

  // Temporarily override summary line in the footer with component extraction count
  const summaryPrefix = `${totalChanges} change${totalChanges !== 1 ? 's' : ''} across ${uniqueElements} element${uniqueElements !== 1 ? 's' : ''}${componentExtractions.length > 0 ? ` (${componentExtractions.length} component extraction${componentExtractions.length !== 1 ? 's' : ''})` : ''}`;
  lines.push('---');
  lines.push(`Summary: ${summaryPrefix}`);
  lines.push('');

  // Get the framework-aware instructions (skip the first 3 lines which are --- / Summary / blank)
  const footer = buildInstructionsFooter(totalChanges, uniqueElements, {
    framework: opts.framework,
    cssStrategy: opts.cssStrategy,
  });
  const footerLines = footer.split('\n');
  // Skip "---", "Summary: ...", and blank line from footer — we already wrote our own summary
  const instructionsStart = footerLines.findIndex((l) => l.startsWith('## Instructions'));
  if (instructionsStart >= 0) {
    lines.push(footerLines.slice(instructionsStart).join('\n'));
  } else {
    // Fallback: append entire footer
    lines.push(footer);
  }

  if (variableDefinitions.length > 0) {
    // Insert CSS variable guidance before the closing marker
    const closingIdx = lines.lastIndexOf('=== END CHANGELOG ===');
    const varLines = [
      '',
      '### CSS Variable Guidance',
      'When the changelog includes CSS Variable Definitions, create the custom',
      "properties in the project's root stylesheet or theme file. Then update",
      'the referencing elements to use var(--name) instead of hardcoded values.',
      'If using Tailwind, consider adding the variables to the theme config.',
    ];
    if (closingIdx >= 0) {
      lines.splice(closingIdx, 0, ...varLines);
    } else {
      lines.push(...varLines);
      lines.push('=== END CHANGELOG ===');
    }
  }

  const result = lines.join('\n');
  return stripControlChars(result).slice(0, 50 * 1024);
}

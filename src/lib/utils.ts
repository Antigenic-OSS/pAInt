import { getBreakpointDeviceInfo } from '@/lib/constants';

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

  // Summary
  const totalChanges = styleChanges.length;
  const uniqueElements = new Set(styleChanges.map((c) => c.elementSelector)).size;
  lines.push('---');
  lines.push(`Summary: ${totalChanges} change${totalChanges !== 1 ? 's' : ''} across ${uniqueElements} element${uniqueElements !== 1 ? 's' : ''}${componentExtractions.length > 0 ? ` (${componentExtractions.length} component extraction${componentExtractions.length !== 1 ? 's' : ''})` : ''}`);
  lines.push('');
  lines.push('## Instructions for Claude Code');
  lines.push('Apply these visual changes to the source files. For each style change,');
  lines.push('find the element matching the selector and update its CSS (inline styles,');
  lines.push('CSS classes, or stylesheet rules) to reflect the new values.');
  lines.push('');
  lines.push('### Tailwind CSS Guidance');
  lines.push('If the project uses Tailwind CSS, prefer updating utility classes over');
  lines.push('adding inline styles. Common mappings:');
  lines.push('- font-size → text-{size} (text-sm, text-base, text-lg, text-xl, etc.)');
  lines.push('- margin/padding → m-{n}/p-{n} (m-4, px-6, py-2, etc.)');
  lines.push('- color → text-{color} (text-gray-500, text-blue-600, etc.)');
  lines.push('- background-color → bg-{color} (bg-white, bg-gray-100, etc.)');
  lines.push('- width/height → w-{n}/h-{n} (w-full, h-screen, w-64, etc.)');
  lines.push('- display: flex → flex, display: grid → grid');
  lines.push('- border-radius → rounded-{size} (rounded, rounded-lg, rounded-full)');
  lines.push('- gap → gap-{n} (gap-4, gap-x-2, etc.)');
  if (variableDefinitions.length > 0) {
    lines.push('');
    lines.push('### CSS Variable Guidance');
    lines.push('When the changelog includes CSS Variable Definitions, create the custom');
    lines.push('properties in the project\'s root stylesheet or theme file. Then update');
    lines.push('the referencing elements to use var(--name) instead of hardcoded values.');
    lines.push('If using Tailwind, consider adding the variables to the theme config.');
  }
  lines.push('=== END CHANGELOG ===');

  const result = lines.join('\n');
  return stripControlChars(result).slice(0, 50 * 1024);
}

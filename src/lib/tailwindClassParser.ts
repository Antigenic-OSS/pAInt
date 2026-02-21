import type { CSSVariableDefinition } from '@/types/cssVariables';

export interface TailwindColorClass {
  className: string;       // e.g. 'text-primary'
  prefix: string;          // e.g. 'text'
  tokenName: string;       // e.g. 'primary'
  cssProperty: string;     // e.g. 'color'
}

/**
 * Map of Tailwind color prefixes to their corresponding CSS properties.
 */
const PREFIX_TO_PROPERTY: Record<string, string> = {
  'text': 'color',
  'bg': 'backgroundColor',
  'border': 'borderColor',
  'outline': 'outlineColor',
  'ring': '--tw-ring-color',
  'decoration': 'textDecorationColor',
  'accent': 'accentColor',
  'fill': 'fill',
  'stroke': 'stroke',
};

/**
 * Non-color suffixes that look like color classes but aren't.
 * These follow a color prefix (e.g. text-center, bg-clip-text, border-collapse).
 */
const NON_COLOR_SUFFIXES = new Set([
  // text- non-color
  'center', 'left', 'right', 'justify', 'start', 'end',
  'wrap', 'nowrap', 'balance', 'pretty',
  'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl',
  'ellipsis', 'clip', 'truncate',
  // bg- non-color
  'repeat', 'no-repeat', 'contain', 'cover', 'auto', 'fixed', 'local', 'scroll',
  'clip', 'origin', 'bottom', 'top', 'center', 'left', 'right',
  'gradient-to-t', 'gradient-to-tr', 'gradient-to-r', 'gradient-to-br',
  'gradient-to-b', 'gradient-to-bl', 'gradient-to-l', 'gradient-to-tl',
  'none',
  // border- non-color
  'collapse', 'separate', 'solid', 'dashed', 'dotted', 'double', 'hidden',
  '0', '1', '2', '4', '8',
  'x', 'y', 't', 'r', 'b', 'l', 'e', 's',
  'spacing',
  // outline- non-color
  'offset', 'dashed', 'dotted', 'double',
  // fill/stroke non-color
  'rule',
  // ring- non-color
  'offset', 'inset',
  // General
  'inherit', 'current', 'transparent',
]);

/**
 * Multi-word non-color suffixes where the first token alone
 * might look like a color but the combination is not.
 */
const NON_COLOR_COMPOUND = new Set([
  'clip-text', 'clip-border', 'clip-padding', 'clip-content',
  'origin-border', 'origin-padding', 'origin-content',
  'repeat-x', 'repeat-y', 'repeat-round', 'repeat-space',
  'decoration-slice', 'decoration-clone',
  'offset-0', 'offset-1', 'offset-2', 'offset-4', 'offset-8',
]);

/**
 * Parse a className string and extract Tailwind color class mappings.
 * Returns one mapping per CSS property (last class wins if duplicates).
 */
export function parseTailwindColorClasses(className: string | null): TailwindColorClass[] {
  if (!className) return [];

  const classes = className.trim().split(/\s+/).filter(Boolean);
  const results: TailwindColorClass[] = [];

  for (const cls of classes) {
    // Strip responsive/state prefixes: md:text-primary → text-primary
    // Also handles chained: hover:md:text-primary → text-primary
    const stripped = cls.replace(/^(?:[a-z0-9-]+:)+/, '');

    // Skip arbitrary values: text-[#ff0000], bg-[rgb(0,0,0)]
    if (stripped.includes('[')) continue;

    // Try to match each known prefix
    for (const [prefix, cssProperty] of Object.entries(PREFIX_TO_PROPERTY)) {
      const prefixWithDash = prefix + '-';
      if (!stripped.startsWith(prefixWithDash)) continue;

      const suffix = stripped.slice(prefixWithDash.length);
      if (!suffix) continue;

      // Check against non-color suffixes
      if (NON_COLOR_SUFFIXES.has(suffix)) continue;
      if (NON_COLOR_COMPOUND.has(suffix)) continue;

      // Skip if suffix starts with a non-color compound prefix
      const firstPart = suffix.split('-')[0];
      if (NON_COLOR_SUFFIXES.has(firstPart) && suffix.includes('-')) {
        // e.g. bg-clip-text → firstPart is 'clip' which is non-color
        if (NON_COLOR_COMPOUND.has(suffix)) continue;
      }

      // Skip pure numeric suffixes for non-border prefixes
      // (border-2 is sizing, but text-500 could be a shade if no base)
      if (/^\d+$/.test(suffix) && prefix !== 'border') continue;

      results.push({
        className: stripped,
        prefix,
        tokenName: suffix,
        cssProperty,
      });
      break; // matched a prefix, stop checking others
    }
  }

  return results;
}

/**
 * Resolve a Tailwind token name to a CSS variable from available definitions.
 *
 * Search order:
 * 1. --{tokenName}          (e.g. --primary)
 * 2. --color-{tokenName}    (Tailwind v4 convention)
 * 3. --colors-{tokenName}   (common naming)
 *
 * Returns the matching variable name or null.
 */
export function resolveTokenToVariable(
  tokenName: string,
  definitions: Record<string, CSSVariableDefinition>
): string | null {
  const candidates = [
    `--${tokenName}`,
    `--color-${tokenName}`,
    `--colors-${tokenName}`,
  ];

  for (const candidate of candidates) {
    if (candidate in definitions) return candidate;
  }

  return null;
}

/**
 * Build a map of CSS property → TailwindColorClass with resolved variable,
 * from a className string and available CSS variable definitions.
 */
export function buildTailwindClassMap(
  className: string | null,
  definitions: Record<string, CSSVariableDefinition>
): Record<string, TailwindColorClass & { variableName: string | null }> {
  const parsed = parseTailwindColorClasses(className);
  const map: Record<string, TailwindColorClass & { variableName: string | null }> = {};

  for (const entry of parsed) {
    const variableName = resolveTokenToVariable(entry.tokenName, definitions);
    map[entry.cssProperty] = { ...entry, variableName };
  }

  return map;
}

import type { ShadowData } from '@/types/shadow';

/**
 * Split a box-shadow CSS string by commas, respecting nested parentheses.
 */
function splitShadows(css: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/**
 * Parse a single shadow string like "2px 4px 6px 1px rgba(0,0,0,0.3)" or "inset 0 2px 4px #000"
 */
function parseSingleShadow(str: string): ShadowData | null {
  const trimmed = str.trim();
  if (!trimmed || trimmed === 'none') return null;

  let inset = false;
  let working = trimmed;

  // Check for inset keyword
  if (working.startsWith('inset ')) {
    inset = true;
    working = working.slice(6).trim();
  } else if (working.endsWith(' inset')) {
    inset = true;
    working = working.slice(0, -6).trim();
  }

  // Extract color — could be at start or end, could be rgb/rgba/hsl/hsla/hex/named
  // Strategy: try to find a color function or hex at the end first, then at the start
  let color = 'rgba(0,0,0,0.25)';
  let numericPart = working;

  // Try color at end: rgb(...), rgba(...), hsl(...), hsla(...), #hex, or named color
  const colorFuncEnd = working.match(/((?:rgba?|hsla?)\([^)]+\))$/);
  if (colorFuncEnd) {
    color = colorFuncEnd[1];
    numericPart = working.slice(0, working.length - colorFuncEnd[0].length).trim();
  } else {
    const hexEnd = working.match(/(#[0-9a-fA-F]{3,8})$/);
    if (hexEnd) {
      color = hexEnd[1];
      numericPart = working.slice(0, working.length - hexEnd[0].length).trim();
    } else {
      // Try color at start
      const colorFuncStart = working.match(/^((?:rgba?|hsla?)\([^)]+\))\s+/);
      if (colorFuncStart) {
        color = colorFuncStart[1];
        numericPart = working.slice(colorFuncStart[0].length).trim();
      } else {
        // Try named color at the end (last token)
        const tokens = working.split(/\s+/);
        if (tokens.length >= 3) {
          const lastToken = tokens[tokens.length - 1];
          if (!/^-?\d/.test(lastToken) && !lastToken.includes('px')) {
            color = lastToken;
            numericPart = tokens.slice(0, -1).join(' ');
          }
        }
      }
    }
  }

  // Parse numeric values: x y blur spread
  const numTokens = numericPart.split(/\s+/).map((t) => parseFloat(t));
  const x = numTokens[0] || 0;
  const y = numTokens[1] || 0;
  const blur = numTokens[2] || 0;
  const spread = numTokens[3] || 0;

  return { x, y, blur, spread, color, inset };
}

/**
 * Parse a box-shadow CSS string into an array of ShadowData objects.
 * Returns [] for "none" or unparseable.
 */
export function parseShadow(css: string): ShadowData[] {
  if (!css || css === 'none') return [];
  const parts = splitShadows(css);
  const shadows: ShadowData[] = [];
  for (const part of parts) {
    const shadow = parseSingleShadow(part);
    if (shadow) shadows.push(shadow);
  }
  return shadows;
}

/**
 * Serialize ShadowData array back to a valid CSS box-shadow string.
 * Returns "none" for empty array.
 */
export function serializeShadow(shadows: ShadowData[]): string {
  if (shadows.length === 0) return 'none';
  return shadows
    .map((s) => {
      const parts: string[] = [];
      if (s.inset) parts.push('inset');
      parts.push(`${s.x}px`);
      parts.push(`${s.y}px`);
      parts.push(`${s.blur}px`);
      parts.push(`${s.spread}px`);
      parts.push(s.color);
      return parts.join(' ');
    })
    .join(', ');
}

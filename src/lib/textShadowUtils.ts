export interface TextShadowData {
  x: number;
  y: number;
  blur: number;
  color: string;
}

/**
 * Split a text-shadow CSS string by commas, respecting nested parentheses.
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
 * Parse a single text-shadow string like "2px 4px 6px rgba(0,0,0,0.3)"
 */
function parseSingleTextShadow(str: string): TextShadowData | null {
  const trimmed = str.trim();
  if (!trimmed || trimmed === 'none') return null;

  let working = trimmed;
  let color = 'rgba(0,0,0,0.25)';
  let numericPart = working;

  // Try color at end: rgb(...), rgba(...), hsl(...), hsla(...)
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

  // Parse numeric values: x y [blur]
  const numTokens = numericPart.split(/\s+/).map((t) => parseFloat(t));
  const x = numTokens[0] || 0;
  const y = numTokens[1] || 0;
  const blur = numTokens[2] || 0;

  return { x, y, blur, color };
}

/**
 * Parse a text-shadow CSS string into an array of TextShadowData objects.
 * Returns [] for "none" or unparseable.
 */
export function parseTextShadow(value: string): TextShadowData[] {
  if (!value || value === 'none') return [];
  const parts = splitShadows(value);
  const shadows: TextShadowData[] = [];
  for (const part of parts) {
    const shadow = parseSingleTextShadow(part);
    if (shadow) shadows.push(shadow);
  }
  return shadows;
}

/**
 * Serialize TextShadowData array back to a valid CSS text-shadow string.
 * Returns "none" for empty array.
 */
export function serializeTextShadow(shadows: TextShadowData[]): string {
  if (shadows.length === 0) return 'none';
  return shadows
    .map((s) => `${s.x}px ${s.y}px ${s.blur}px ${s.color}`)
    .join(', ');
}

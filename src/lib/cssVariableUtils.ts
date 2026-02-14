import type { CSSVariableDefinition, CSSVariableFamily } from '@/types/cssVariables';

/**
 * Extract the variable name from a var() expression.
 * e.g. 'var(--primary-500)' → '--primary-500'
 *      'var(--primary-500, #fff)' → '--primary-500'
 */
export function extractVariableName(expr: string): string | null {
  const match = expr.match(/var\(\s*(--[^,)]+)/);
  return match ? match[1].trim() : null;
}

/**
 * Group CSS variable definitions into families by shared prefix.
 * Only creates a family when 2+ members share the same prefix.
 * e.g. --primary-100, --primary-200 → family prefix '--primary'
 */
export function groupVariablesIntoFamilies(
  definitions: Record<string, CSSVariableDefinition>
): CSSVariableFamily[] {
  const prefixMap = new Map<string, { name: string; suffix: string; value: string; resolvedValue: string }[]>();

  for (const [name, def] of Object.entries(definitions)) {
    // Find last hyphen-separated segment as suffix
    const lastDash = name.lastIndexOf('-');
    if (lastDash <= 2) continue; // skip if no meaningful prefix (-- is index 0-1)

    const prefix = name.substring(0, lastDash);
    const suffix = name.substring(lastDash + 1);

    if (!prefixMap.has(prefix)) {
      prefixMap.set(prefix, []);
    }
    prefixMap.get(prefix)!.push({
      name,
      suffix,
      value: def.value,
      resolvedValue: def.resolvedValue,
    });
  }

  const families: CSSVariableFamily[] = [];
  for (const [prefix, members] of prefixMap) {
    if (members.length >= 2) {
      families.push({ prefix, members });
    }
  }

  return families;
}

/**
 * Find the family that contains a given variable name.
 */
export function findFamilyForVariable(
  name: string,
  families: CSSVariableFamily[]
): CSSVariableFamily | null {
  for (const family of families) {
    if (family.members.some((m) => m.name === name)) {
      return family;
    }
  }
  return null;
}

const COLOR_PATTERN = /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\(|transparent|currentcolor|inherit)$/i;
const NAMED_COLORS = new Set([
  'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque',
  'black', 'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue',
  'chartreuse', 'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan',
  'darkblue', 'darkcyan', 'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey',
  'darkkhaki', 'darkmagenta', 'darkolivegreen', 'darkorange', 'darkorchid', 'darkred',
  'darksalmon', 'darkseagreen', 'darkslateblue', 'darkslategray', 'darkslategrey',
  'darkturquoise', 'darkviolet', 'deeppink', 'deepskyblue', 'dimgray', 'dimgrey',
  'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen', 'fuchsia', 'gainsboro',
  'ghostwhite', 'gold', 'goldenrod', 'gray', 'green', 'greenyellow', 'grey',
  'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory', 'khaki', 'lavender',
  'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan',
  'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey', 'lightpink',
  'lightsalmon', 'lightseagreen', 'lightskyblue', 'lightslategray', 'lightslategrey',
  'lightsteelblue', 'lightyellow', 'lime', 'limegreen', 'linen', 'magenta', 'maroon',
  'mediumaquamarine', 'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen',
  'mediumslateblue', 'mediumspringgreen', 'mediumturquoise', 'mediumvioletred',
  'midnightblue', 'mintcream', 'mistyrose', 'moccasin', 'navajowhite', 'navy',
  'oldlace', 'olive', 'olivedrab', 'orange', 'orangered', 'orchid', 'palegoldenrod',
  'palegreen', 'paleturquoise', 'palevioletred', 'papayawhip', 'peachpuff', 'peru',
  'pink', 'plum', 'powderblue', 'purple', 'rebeccapurple', 'red', 'rosybrown',
  'royalblue', 'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell', 'sienna',
  'silver', 'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow', 'springgreen',
  'steelblue', 'tan', 'teal', 'thistle', 'tomato', 'turquoise', 'violet', 'wheat',
  'white', 'whitesmoke', 'yellow', 'yellowgreen',
]);

/**
 * Check if a resolved value looks like a color.
 */
function isColorValue(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  if (COLOR_PATTERN.test(trimmed)) return true;
  if (NAMED_COLORS.has(trimmed)) return true;
  return false;
}

/**
 * Filter variable definitions to only those whose resolved values are colors.
 */
export function filterColorVariables(
  definitions: Record<string, CSSVariableDefinition>
): Record<string, CSSVariableDefinition> {
  const result: Record<string, CSSVariableDefinition> = {};
  for (const [name, def] of Object.entries(definitions)) {
    if (isColorValue(def.resolvedValue)) {
      result[name] = def;
    }
  }
  return result;
}

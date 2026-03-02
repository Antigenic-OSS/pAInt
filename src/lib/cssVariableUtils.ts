import type {
  CSSVariableDefinition,
  CSSVariableFamily,
} from '@/types/cssVariables'

/**
 * Extract the variable name from a var() expression.
 * e.g. 'var(--primary-500)' → '--primary-500'
 *      'var(--primary-500, #fff)' → '--primary-500'
 */
export function extractVariableName(expr: string): string | null {
  const match = expr.match(/var\(\s*(--[^,)]+)/)
  return match ? match[1].trim() : null
}

/**
 * Group CSS variable definitions into families by shared prefix.
 * Only creates a family when 2+ members share the same prefix.
 * e.g. --primary-100, --primary-200 → family prefix '--primary'
 */
export function groupVariablesIntoFamilies(
  definitions: Record<string, CSSVariableDefinition>,
): CSSVariableFamily[] {
  const prefixMap = new Map<
    string,
    { name: string; suffix: string; value: string; resolvedValue: string }[]
  >()

  for (const [name, def] of Object.entries(definitions)) {
    // Find last hyphen-separated segment as suffix
    const lastDash = name.lastIndexOf('-')
    if (lastDash <= 2) continue // skip if no meaningful prefix (-- is index 0-1)

    const prefix = name.substring(0, lastDash)
    const suffix = name.substring(lastDash + 1)

    if (!prefixMap.has(prefix)) {
      prefixMap.set(prefix, [])
    }
    prefixMap.get(prefix)!.push({
      name,
      suffix,
      value: def.value,
      resolvedValue: def.resolvedValue,
    })
  }

  const families: CSSVariableFamily[] = []
  for (const [prefix, members] of prefixMap) {
    if (members.length >= 2) {
      families.push({ prefix, members })
    }
  }

  return families
}

/**
 * Find the family that contains a given variable name.
 */
export function findFamilyForVariable(
  name: string,
  families: CSSVariableFamily[],
): CSSVariableFamily | null {
  for (const family of families) {
    if (family.members.some((m) => m.name === name)) {
      return family
    }
  }
  return null
}

const COLOR_PATTERN =
  /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\(|transparent|currentcolor|inherit)$/i

// Tailwind CSS channel formats: space-separated RGB (e.g. "5 5 5", "74 255 215")
// or HSL (e.g. "0 0% 3.9%", "220 70% 50%") used with opacity support.
const RGB_CHANNELS_PATTERN = /^\d{1,3}\s+\d{1,3}\s+\d{1,3}$/
const HSL_CHANNELS_PATTERN =
  /^\d{1,3}(\.\d+)?\s+\d{1,3}(\.\d+)?%\s+\d{1,3}(\.\d+)?%$/

const NAMED_COLORS = new Set([
  'aliceblue',
  'antiquewhite',
  'aqua',
  'aquamarine',
  'azure',
  'beige',
  'bisque',
  'black',
  'blanchedalmond',
  'blue',
  'blueviolet',
  'brown',
  'burlywood',
  'cadetblue',
  'chartreuse',
  'chocolate',
  'coral',
  'cornflowerblue',
  'cornsilk',
  'crimson',
  'cyan',
  'darkblue',
  'darkcyan',
  'darkgoldenrod',
  'darkgray',
  'darkgreen',
  'darkgrey',
  'darkkhaki',
  'darkmagenta',
  'darkolivegreen',
  'darkorange',
  'darkorchid',
  'darkred',
  'darksalmon',
  'darkseagreen',
  'darkslateblue',
  'darkslategray',
  'darkslategrey',
  'darkturquoise',
  'darkviolet',
  'deeppink',
  'deepskyblue',
  'dimgray',
  'dimgrey',
  'dodgerblue',
  'firebrick',
  'floralwhite',
  'forestgreen',
  'fuchsia',
  'gainsboro',
  'ghostwhite',
  'gold',
  'goldenrod',
  'gray',
  'green',
  'greenyellow',
  'grey',
  'honeydew',
  'hotpink',
  'indianred',
  'indigo',
  'ivory',
  'khaki',
  'lavender',
  'lavenderblush',
  'lawngreen',
  'lemonchiffon',
  'lightblue',
  'lightcoral',
  'lightcyan',
  'lightgoldenrodyellow',
  'lightgray',
  'lightgreen',
  'lightgrey',
  'lightpink',
  'lightsalmon',
  'lightseagreen',
  'lightskyblue',
  'lightslategray',
  'lightslategrey',
  'lightsteelblue',
  'lightyellow',
  'lime',
  'limegreen',
  'linen',
  'magenta',
  'maroon',
  'mediumaquamarine',
  'mediumblue',
  'mediumorchid',
  'mediumpurple',
  'mediumseagreen',
  'mediumslateblue',
  'mediumspringgreen',
  'mediumturquoise',
  'mediumvioletred',
  'midnightblue',
  'mintcream',
  'mistyrose',
  'moccasin',
  'navajowhite',
  'navy',
  'oldlace',
  'olive',
  'olivedrab',
  'orange',
  'orangered',
  'orchid',
  'palegoldenrod',
  'palegreen',
  'paleturquoise',
  'palevioletred',
  'papayawhip',
  'peachpuff',
  'peru',
  'pink',
  'plum',
  'powderblue',
  'purple',
  'rebeccapurple',
  'red',
  'rosybrown',
  'royalblue',
  'saddlebrown',
  'salmon',
  'sandybrown',
  'seagreen',
  'seashell',
  'sienna',
  'silver',
  'skyblue',
  'slateblue',
  'slategray',
  'slategrey',
  'snow',
  'springgreen',
  'steelblue',
  'tan',
  'teal',
  'thistle',
  'tomato',
  'turquoise',
  'violet',
  'wheat',
  'white',
  'whitesmoke',
  'yellow',
  'yellowgreen',
])

/**
 * Check if a resolved value looks like a color.
 */
export function isColorValue(value: string): boolean {
  const trimmed = value.trim().toLowerCase()
  if (COLOR_PATTERN.test(trimmed)) return true
  if (NAMED_COLORS.has(trimmed)) return true
  // Tailwind-style space-separated RGB channels (e.g. "5 5 5", "74 255 215")
  if (RGB_CHANNELS_PATTERN.test(trimmed)) return true
  // Tailwind-style space-separated HSL channels (e.g. "0 0% 3.9%", "220 70% 50%")
  if (HSL_CHANNELS_PATTERN.test(trimmed)) return true
  return false
}

/**
 * Convert a resolved value to a displayable CSS color string.
 * Handles Tailwind-style channel values (e.g. "5 5 5" → "rgb(5, 5, 5)",
 * "220 70% 50%" → "hsl(220, 70%, 50%)") that aren't valid CSS by themselves.
 * Returns the original value if it's already a valid CSS color.
 */
export function toDisplayableColor(value: string): string {
  const trimmed = value.trim()
  if (RGB_CHANNELS_PATTERN.test(trimmed)) {
    const parts = trimmed.split(/\s+/)
    return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`
  }
  if (HSL_CHANNELS_PATTERN.test(trimmed)) {
    const parts = trimmed.split(/\s+/)
    return `hsl(${parts[0]}, ${parts[1]}, ${parts[2]})`
  }
  return trimmed
}

/**
 * Filter variable definitions to only those whose resolved values are colors.
 */
export function filterColorVariables(
  definitions: Record<string, CSSVariableDefinition>,
): Record<string, CSSVariableDefinition> {
  const result: Record<string, CSSVariableDefinition> = {}
  for (const [name, def] of Object.entries(definitions)) {
    if (isColorValue(def.resolvedValue)) {
      result[name] = def
    }
  }
  return result
}

/**
 * Format a CSS variable name as a slash-separated token path for display.
 * e.g. '--primary-500' → 'primary/500'
 *      '--color-red-400' → 'color/red/400'
 */
export function formatTokenDisplayName(cssVarName: string): string {
  const stripped = cssVarName.startsWith('--')
    ? cssVarName.slice(2)
    : cssVarName
  return stripped.replace(/-/g, '/')
}

/**
 * Convert a camelCase or PascalCase string to kebab-case.
 * e.g. 'coreBlue' → 'core-blue', 'textPrimary' → 'text-primary'
 */
function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

// Matches: key: '#hex' or key: 'rgba(...)' or key: "value" or key: number
const TOKEN_ENTRY_RE =
  /(\w+)\s*:\s*(?:'([^']*)'|"([^"]*)"|(\d+(?:\.\d+)?))\s*,?/g

// Matches: export const NAME = { ... } as const  (captures NAME and the braced body)
const EXPORT_BLOCK_RE =
  /export\s+const\s+(\w+)\s*=\s*\{([^]*?)\}\s*(?:as\s+const\s*)?;/g

/**
 * Extract design tokens from a JS/TS/Dart source file and convert them
 * to CSSVariableDefinition records.
 *
 * Handles patterns like:
 *   export const colors = { teal: '#2CEAE1', coreBlue: '#1F8EE7' } as const;
 *   export const spacing = { xs: 4, sm: 8 } as const;
 *
 * Produces:
 *   '--colors-teal': { value: '#2CEAE1', resolvedValue: '#2CEAE1', selector: 'tokens' }
 *   '--spacing-xs':  { value: '4',       resolvedValue: '4',       selector: 'tokens' }
 */
export function extractDesignTokensFromSource(
  source: string,
  filePath: string,
): Record<string, CSSVariableDefinition> {
  const results: Record<string, CSSVariableDefinition> = {}

  // Strip single-line and block comments to avoid matching inside them
  const cleaned = source.replace(/\/\/.*$/gm, '').replace(/\/\*[^]*?\*\//g, '')

  EXPORT_BLOCK_RE.lastIndex = 0
  let blockMatch: RegExpExecArray | null

  while ((blockMatch = EXPORT_BLOCK_RE.exec(cleaned)) !== null) {
    const groupName = blockMatch[1] // e.g. 'colors', 'spacing', 'onGradient'
    const body = blockMatch[2]

    // Check for nested objects: key: { subKey: value }
    // Split into top-level entries and nested blocks
    const nestedRe = /(\w+)\s*:\s*\{([^}]*)\}/g
    const nestedKeys = new Set<string>()
    let nestedMatch: RegExpExecArray | null
    nestedRe.lastIndex = 0

    while ((nestedMatch = nestedRe.exec(body)) !== null) {
      const nestedGroupName = nestedMatch[1]
      nestedKeys.add(nestedGroupName)
      const nestedBody = nestedMatch[2]

      TOKEN_ENTRY_RE.lastIndex = 0
      let entryMatch: RegExpExecArray | null
      while ((entryMatch = TOKEN_ENTRY_RE.exec(nestedBody)) !== null) {
        const key = entryMatch[1]
        const value = entryMatch[2] ?? entryMatch[3] ?? entryMatch[4] ?? ''
        if (!value) continue

        const varName = `--${camelToKebab(groupName)}-${camelToKebab(nestedGroupName)}-${camelToKebab(key)}`
        results[varName] = {
          value,
          resolvedValue: value,
          selector: `tokens:${filePath}`,
        }
      }
    }

    // Top-level entries (skip keys that were nested objects)
    TOKEN_ENTRY_RE.lastIndex = 0
    let entryMatch: RegExpExecArray | null
    while ((entryMatch = TOKEN_ENTRY_RE.exec(body)) !== null) {
      const key = entryMatch[1]
      if (nestedKeys.has(key)) continue
      // Skip non-value keys (functions, objects, arrays)
      const value = entryMatch[2] ?? entryMatch[3] ?? entryMatch[4] ?? ''
      if (!value) continue

      const varName = `--${camelToKebab(groupName)}-${camelToKebab(key)}`
      results[varName] = {
        value,
        resolvedValue: value,
        selector: `tokens:${filePath}`,
      }
    }
  }

  return results
}

/** File names commonly used for design tokens in JS/TS/Dart projects */
export const TOKEN_FILE_NAMES = new Set([
  'colors.ts',
  'colors.js',
  'colors.dart',
  'theme.ts',
  'theme.js',
  'theme.dart',
  'tokens.ts',
  'tokens.js',
  'tokens.dart',
  'design-tokens.ts',
  'design-tokens.js',
  'palette.ts',
  'palette.js',
  'palette.dart',
  'app_colors.dart',
  'app_theme.dart',
  'constants.ts',
  'constants.js',
  'styles.ts',
  'styles.js',
])

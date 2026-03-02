import type { Breakpoint } from '@/types/changelog'

export const MESSAGE_TYPES = {
  // Inspector → Editor
  INSPECTOR_READY: 'INSPECTOR_READY',
  ELEMENT_SELECTED: 'ELEMENT_SELECTED',
  ELEMENT_HOVERED: 'ELEMENT_HOVERED',
  DOM_UPDATED: 'DOM_UPDATED',
  DOM_TREE: 'DOM_TREE',
  PAGE_LINKS: 'PAGE_LINKS',
  HEARTBEAT_RESPONSE: 'HEARTBEAT_RESPONSE',
  CSS_VARIABLES: 'CSS_VARIABLES',
  COMPONENTS_DETECTED: 'COMPONENTS_DETECTED',
  VARIANT_APPLIED: 'VARIANT_APPLIED',
  CONSOLE_MESSAGE: 'CONSOLE_MESSAGE',
  ELEMENT_INSERTED: 'ELEMENT_INSERTED',
  // Editor → Inspector
  SELECT_ELEMENT: 'SELECT_ELEMENT',
  PREVIEW_CHANGE: 'PREVIEW_CHANGE',
  REVERT_CHANGE: 'REVERT_CHANGE',
  REVERT_ALL: 'REVERT_ALL',
  SET_BREAKPOINT: 'SET_BREAKPOINT',
  REQUEST_DOM_TREE: 'REQUEST_DOM_TREE',
  REQUEST_PAGE_LINKS: 'REQUEST_PAGE_LINKS',
  HEARTBEAT: 'HEARTBEAT',
  REQUEST_CSS_VARIABLES: 'REQUEST_CSS_VARIABLES',
  SET_SELECTION_MODE: 'SET_SELECTION_MODE',
  REQUEST_COMPONENTS: 'REQUEST_COMPONENTS',
  APPLY_VARIANT: 'APPLY_VARIANT',
  REVERT_VARIANT: 'REVERT_VARIANT',
  INSERT_ELEMENT: 'INSERT_ELEMENT',
  REMOVE_INSERTED_ELEMENT: 'REMOVE_INSERTED_ELEMENT',
} as const

export const BREAKPOINTS: Record<
  Breakpoint,
  { label: string; deviceName: string; width: number }
> = {
  mobile: { label: 'Mobile', deviceName: 'iPhone SE', width: 375 },
  tablet: { label: 'Tablet', deviceName: 'iPad Mini', width: 768 },
  desktop: { label: 'Desktop', deviceName: 'Laptop', width: 1280 },
}

/**
 * Get the breakpoint range string for a given breakpoint.
 * E.g., tablet (768px) affects down to mobile's max (430px) → "768px > 430px"
 * Mobile is the lowest, so it just shows "375px".
 * Desktop has no upper bound, so it shows "1280px+".
 */
const LOWER_BOUND_MAP: Record<Breakpoint, number | null> = {
  desktop: 1024, // affects down to tablet upper range
  tablet: 430, // affects down to mobile upper range (iPhone 14 Pro Max)
  mobile: 0, // lowest breakpoint
}

export function getBreakpointRange(bp: Breakpoint): string {
  const width = BREAKPOINTS[bp].width
  const lowerBound = LOWER_BOUND_MAP[bp]
  if (bp === 'mobile') return `${width}px`
  if (lowerBound != null && lowerBound > 0)
    return `${width}px > ${lowerBound}px`
  return `${width}px`
}

export function getBreakpointDeviceInfo(bp: Breakpoint): {
  deviceName: string
  range: string
} {
  return {
    deviceName: BREAKPOINTS[bp].deviceName,
    range: getBreakpointRange(bp),
  }
}

export const CSS_PROPERTIES = {
  size: [
    'width',
    'height',
    'min-width',
    'min-height',
    'max-width',
    'max-height',
    'overflow',
    'box-sizing',
  ],
  spacing: [
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
  ],
  typography: [
    'font-family',
    'font-size',
    'font-weight',
    'line-height',
    'letter-spacing',
    'text-align',
    'text-decoration',
    'text-transform',
    'color',
  ],
  border: [
    'border-width',
    'border-style',
    'border-color',
    'border-radius',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
    'border-top-left-radius',
    'border-top-right-radius',
    'border-bottom-right-radius',
    'border-bottom-left-radius',
  ],
  background: [
    'background-color',
    'background-image',
    'background-size',
    'background-position',
    'background-repeat',
    'background-attachment',
    'background-clip',
  ],
  layout: [
    'display',
    'flex-direction',
    'justify-content',
    'align-items',
    'align-content',
    'flex-wrap',
    'gap',
    'row-gap',
    'column-gap',
    'grid-template-columns',
    'grid-template-rows',
  ],
  position: ['position', 'top', 'right', 'bottom', 'left', 'z-index'],
  appearance: ['opacity'],
  shadow: ['box-shadow'],
  'flex-item': [
    'flex-grow',
    'flex-shrink',
    'flex-basis',
    'align-self',
    'order',
  ],
  transform: ['transform'],
  filter: ['filter'],
  svg: ['fill', 'stroke'],
} as const

export const ALL_EDITABLE_PROPERTIES = Object.values(CSS_PROPERTIES).flat()

export const DARK_MODE_TOKENS = {
  bgPrimary: '#1e1e1e',
  bgSecondary: '#252526',
  bgTertiary: '#2d2d30',
  bgHover: '#3c3c3c',
  bgActive: '#37373d',
  textPrimary: '#e0e0e0',
  textSecondary: '#a0a0a0',
  textMuted: '#6a6a6a',
  accent: '#4a9eff',
  accentHover: '#5aafff',
  border: '#3c3c3c',
  borderHover: '#555555',
  success: '#4ec9b0',
  warning: '#dcdcaa',
  error: '#f44747',
} as const

export const LOCAL_STORAGE_KEYS = {
  RECENT_URLS: 'dev-editor:recent-urls',
  PANEL_SIZES: 'dev-editor:panel-sizes',
  PANEL_VISIBILITY: 'dev-editor:panel-visibility',
  CHANGES_PREFIX: 'dev-editor:changes:',
  CLAUDE_PROJECT_ROOT: 'dev-editor:claude:project-root',
  CLAUDE_PORT_ROOTS: 'dev-editor:claude:port-roots',
  CLAUDE_CLI_AVAILABLE: 'dev-editor:claude:cli-available',
  CLAUDE_PROJECT_SCANS: 'dev-editor:claude:project-scans',
} as const

export const PROXY_HEADER = 'x-dev-editor-target'

export const HEARTBEAT_INTERVAL_MS = 5000
export const HEARTBEAT_TIMEOUT_MS = 3000
export const RECONNECT_MAX_RETRIES = 5
export const RECONNECT_BASE_DELAY_MS = 1000

export function buildInstructionsFooter(
  changeCount: number,
  elementCount: number,
  opts?: { framework?: string | null; cssStrategy?: string[] | null },
): string {
  const lines: string[] = []
  const framework = opts?.framework ?? null
  const cssStrategy = opts?.cssStrategy ?? null
  const usesTailwind = cssStrategy?.includes('tailwind') ?? false

  lines.push('---')
  lines.push(
    `Summary: ${changeCount} change${changeCount !== 1 ? 's' : ''} across ${elementCount} element${elementCount !== 1 ? 's' : ''}`,
  )
  lines.push('')
  lines.push('## Instructions for Claude Code')
  lines.push(
    'Apply these visual changes to the source files. For each style change,',
  )
  lines.push('find the element matching the selector and update its styles.')

  if (framework === 'flutter') {
    // Flutter-specific guidance
    lines.push('')
    lines.push('### Flutter / Dart Styling')
    lines.push(
      'Flutter does NOT use CSS. Styles are applied via widget properties and style objects.',
    )
    lines.push('')
    lines.push('**Spacing**')
    lines.push(
      '- padding → EdgeInsets.all(n), EdgeInsets.symmetric(horizontal: n, vertical: n), EdgeInsets.only(left: n, top: n, ...)',
    )
    lines.push(
      '- margin → wrap in Padding widget or use Container(margin: EdgeInsets.all(n))',
    )
    lines.push(
      '- gap (in Row/Column) → use SizedBox(width: n) or SizedBox(height: n) between children, or MainAxisAlignment.spaceEvenly',
    )
    lines.push('')
    lines.push('**Typography**')
    lines.push('- font-size → TextStyle(fontSize: n)')
    lines.push(
      '- font-weight → TextStyle(fontWeight: FontWeight.w400/w500/w600/w700/bold)',
    )
    lines.push(
      '- line-height → TextStyle(height: n) where n is multiplier (1.5 = 150%)',
    )
    lines.push('- color → TextStyle(color: Color(0xFF______)) or Colors.blue')
    lines.push(
      '- text-align → Text("...", textAlign: TextAlign.center/left/right)',
    )
    lines.push('')
    lines.push('**Colors**')
    lines.push(
      '- background-color → Container(color: Color(0xFF______)) or ColoredBox',
    )
    lines.push(
      '- border-color → BoxDecoration(border: Border.all(color: Color(0xFF______)))',
    )
    lines.push(
      '- Use Color(0xAARRGGBB) for hex, Colors.blue for Material palette',
    )
    lines.push('')
    lines.push('**Layout**')
    lines.push('- display: flex → Row (horizontal) or Column (vertical)')
    lines.push(
      '- justify-content → MainAxisAlignment.start/center/end/spaceBetween/spaceAround/spaceEvenly',
    )
    lines.push('- align-items → CrossAxisAlignment.start/center/end/stretch')
    lines.push('- flex-wrap → use Wrap widget instead of Row/Column')
    lines.push('- flex: 1 → Expanded(child: ...) or Flexible(child: ...)')
    lines.push('')
    lines.push('**Sizing**')
    lines.push(
      '- width/height → SizedBox(width: n, height: n) or Container(width: n, height: n)',
    )
    lines.push('- width: 100% → double.infinity')
    lines.push(
      '- max-width → ConstrainedBox(constraints: BoxConstraints(maxWidth: n))',
    )
    lines.push('')
    lines.push('**Borders**')
    lines.push(
      '- border-radius → BoxDecoration(borderRadius: BorderRadius.circular(n))',
    )
    lines.push('- border-width → BoxDecoration(border: Border.all(width: n))')
    lines.push('')
    lines.push('**Effects**')
    lines.push('- opacity → Opacity(opacity: 0.5, child: ...)')
    lines.push(
      '- box-shadow → BoxDecoration(boxShadow: [BoxShadow(blurRadius: n, offset: Offset(x, y))])',
    )
  } else if (framework === 'react-native') {
    // React Native-specific guidance
    lines.push('')
    lines.push('### React Native Styling')
    lines.push(
      'React Native does NOT use CSS classes or Tailwind. Styles are applied via the `style` prop with StyleSheet objects.',
    )
    lines.push('')
    lines.push('**How to Apply**')
    lines.push(
      'Find the component and update its StyleSheet.create() definitions or inline style prop.',
    )
    lines.push('```')
    lines.push('const styles = StyleSheet.create({')
    lines.push('  container: { padding: 16, backgroundColor: "#fff" },')
    lines.push('});')
    lines.push('<View style={styles.container} />')
    lines.push('```')
    lines.push('')
    lines.push('**Spacing** — Uses raw numbers (dp, not px). No units needed.')
    lines.push(
      '- padding → padding, paddingHorizontal, paddingVertical, paddingTop, paddingRight, paddingBottom, paddingLeft',
    )
    lines.push(
      '- margin → margin, marginHorizontal, marginVertical, marginTop, marginRight, marginBottom, marginLeft',
    )
    lines.push('- gap → gap (RN 0.71+), rowGap, columnGap')
    lines.push('')
    lines.push('**Typography**')
    lines.push('- font-size → fontSize: n')
    lines.push('- font-weight → fontWeight: "400"/"500"/"600"/"700"/"bold"')
    lines.push('- line-height → lineHeight: n (absolute value, not multiplier)')
    lines.push('- color → color: "#hex" or "rgb(r,g,b)"')
    lines.push('- text-align → textAlign: "left"/"center"/"right"')
    lines.push('')
    lines.push('**Colors** — Use hex strings or rgba')
    lines.push('- background-color → backgroundColor: "#hex"')
    lines.push('- border-color → borderColor: "#hex"')
    lines.push('')
    lines.push(
      '**Layout** — Flexbox by default (flex-direction defaults to column, not row)',
    )
    lines.push('- display: flex → display: "flex" (default, usually omitted)')
    lines.push(
      '- flex-direction → flexDirection: "row"/"column" (NOTE: default is "column", opposite of web)',
    )
    lines.push(
      '- justify-content → justifyContent: "flex-start"/"center"/"flex-end"/"space-between"/"space-around"',
    )
    lines.push(
      '- align-items → alignItems: "flex-start"/"center"/"flex-end"/"stretch"',
    )
    lines.push('- flex: 1 → flex: 1')
    lines.push('')
    lines.push('**Sizing**')
    lines.push(
      '- width/height → width: n / height: n (number for dp, "100%" for percentage)',
    )
    lines.push('')
    lines.push('**Borders**')
    lines.push('- border-radius → borderRadius: n (number only, no px)')
    lines.push('- border-width → borderWidth: n')
    lines.push('')
    lines.push('**Effects**')
    lines.push('- opacity → opacity: n (0-1)')
    lines.push(
      '- box-shadow → iOS: shadowColor/shadowOffset/shadowOpacity/shadowRadius; Android: elevation: n',
    )
  } else if (usesTailwind) {
    // Tailwind CSS guidance (web frameworks)
    lines.push('')
    lines.push('### How to Apply in React / Next.js')
    lines.push(
      'Styles in React are applied via the `className` prop on JSX elements.',
    )
    lines.push(
      'Find the component that renders the matching element and edit its className.',
    )
    lines.push('')
    lines.push('### Tailwind CSS Mappings')
    lines.push(
      'This project uses Tailwind CSS. Update utility classes in className — never add inline styles.',
    )
    lines.push('')
    lines.push(
      '**Spacing** (Tailwind uses a 4px = 1 unit scale: 4px=1, 8px=2, 12px=3, 16px=4, 20px=5, 24px=6, 32px=8, 40px=10, 48px=12, 64px=16)',
    )
    lines.push(
      '- padding → p-{n}, px-{n}, py-{n}, pt-{n}, pr-{n}, pb-{n}, pl-{n}',
    )
    lines.push(
      '- margin → m-{n}, mx-{n}, my-{n}, mt-{n}, mr-{n}, mb-{n}, ml-{n} (supports negative: -mt-4)',
    )
    lines.push('- gap → gap-{n}, gap-x-{n}, gap-y-{n}')
    lines.push('')
    lines.push('**Typography**')
    lines.push(
      '- font-size → text-xs(12px), text-sm(14px), text-base(16px), text-lg(18px), text-xl(20px), text-2xl(24px), text-3xl(30px), text-4xl(36px)',
    )
    lines.push(
      '- font-weight → font-thin(100), font-light(300), font-normal(400), font-medium(500), font-semibold(600), font-bold(700), font-extrabold(800)',
    )
    lines.push(
      '- line-height → leading-none(1), leading-tight(1.25), leading-snug(1.375), leading-normal(1.5), leading-relaxed(1.625), leading-loose(2)',
    )
    lines.push(
      '- letter-spacing → tracking-tighter(-0.05em), tracking-tight(-0.025em), tracking-normal(0), tracking-wide(0.025em), tracking-wider(0.05em)',
    )
    lines.push(
      '- text-align → text-left, text-center, text-right, text-justify',
    )
    lines.push(
      '- text-transform → uppercase, lowercase, capitalize, normal-case',
    )
    lines.push('- text-decoration → underline, line-through, no-underline')
    lines.push('')
    lines.push('**Colors**')
    lines.push(
      '- color → text-{color}-{shade} (text-gray-500, text-blue-600, text-red-500)',
    )
    lines.push(
      '- background-color → bg-{color}-{shade} (bg-white, bg-gray-100, bg-blue-500)',
    )
    lines.push('- border-color → border-{color}-{shade}')
    lines.push(
      '- For hex/rgb values not in the palette, use arbitrary: text-[#1a1a1a], bg-[rgb(30,30,30)]',
    )
    lines.push('')
    lines.push('**Layout**')
    lines.push(
      '- display: flex → flex, display: grid → grid, display: none → hidden, display: block → block, display: inline-flex → inline-flex',
    )
    lines.push(
      '- flex-direction → flex-row, flex-col, flex-row-reverse, flex-col-reverse',
    )
    lines.push(
      '- justify-content → justify-start, justify-center, justify-end, justify-between, justify-around, justify-evenly',
    )
    lines.push(
      '- align-items → items-start, items-center, items-end, items-baseline, items-stretch',
    )
    lines.push('- flex-wrap → flex-wrap, flex-nowrap')
    lines.push('- flex-grow: 1 → grow or flex-1, flex-shrink: 0 → shrink-0')
    lines.push('- order → order-first, order-last, order-none, order-{n}')
    lines.push('')
    lines.push('**Sizing**')
    lines.push(
      '- width → w-{n}(spacing scale), w-full(100%), w-screen(100vw), w-auto, w-1/2(50%), w-1/3(33.3%), w-fit',
    )
    lines.push('- height → h-{n}, h-full, h-screen, h-auto, h-fit')
    lines.push(
      '- max-width → max-w-sm(384px), max-w-md(448px), max-w-lg(512px), max-w-xl(576px), max-w-2xl(672px), max-w-full, max-w-none',
    )
    lines.push('- min-height → min-h-0, min-h-full, min-h-screen')
    lines.push('')
    lines.push('**Borders**')
    lines.push(
      '- border-width → border(1px), border-0, border-2(2px), border-4(4px), border-t, border-b, border-l, border-r',
    )
    lines.push(
      '- border-radius → rounded-none(0), rounded-sm(2px), rounded(4px), rounded-md(6px), rounded-lg(8px), rounded-xl(12px), rounded-2xl(16px), rounded-full(9999px)',
    )
    lines.push(
      '- border-style → border-solid, border-dashed, border-dotted, border-none',
    )
    lines.push('')
    lines.push('**Effects**')
    lines.push(
      '- opacity → opacity-0, opacity-25, opacity-50, opacity-75, opacity-100',
    )
    lines.push(
      '- box-shadow → shadow-sm, shadow, shadow-md, shadow-lg, shadow-xl, shadow-2xl, shadow-none',
    )
    lines.push('')
    lines.push('**Position**')
    lines.push('- position → static, relative, absolute, fixed, sticky')
    lines.push(
      '- top/right/bottom/left → top-{n}, right-{n}, bottom-{n}, left-{n} (uses spacing scale), inset-0(all sides 0)',
    )
    lines.push('- z-index → z-0, z-10, z-20, z-30, z-40, z-50, z-auto')
    lines.push('')
    lines.push(
      '**Arbitrary values**: When no Tailwind scale value matches, use bracket syntax: w-[200px], mt-[13px], text-[15px], bg-[#1e1e1e], grid-cols-[1fr_2fr]',
    )
    lines.push('')
    lines.push('### Responsive Breakpoints')
    lines.push(
      'Tailwind uses mobile-first breakpoint prefixes. Unprefixed classes apply to all sizes.',
    )
    lines.push(
      '- sm: → 640px+, md: → 768px+, lg: → 1024px+, xl: → 1280px+, 2xl: → 1536px+',
    )
    lines.push('- Changes marked [desktop] may need lg: or xl: prefix')
    lines.push('- Changes marked [tablet] may need md: prefix')
    lines.push('- Changes marked [mobile] apply as the base (no prefix)')
    lines.push(
      '- Example: className="text-sm md:text-base lg:text-lg" (small on mobile, base on tablet, large on desktop)',
    )
  } else {
    // Generic web CSS guidance (no Tailwind detected, or unknown framework)
    lines.push('')
    lines.push('### How to Apply')
    lines.push(
      'Find the element matching the selector and update its styles using the',
    )
    lines.push(
      "project's CSS approach (CSS files, CSS modules, styled-components, inline styles, etc.).",
    )
    lines.push('')
    lines.push('If the project uses CSS classes, update the class definitions.')
    lines.push(
      'If the project uses inline styles in JSX (`style={{ }}`), update the style object.',
    )
    lines.push('')
    lines.push('### Responsive Breakpoints')
    lines.push(
      '- Changes marked [desktop] apply at wider viewports (typically @media (min-width: 1024px))',
    )
    lines.push(
      '- Changes marked [tablet] apply at medium viewports (typically @media (min-width: 768px))',
    )
    lines.push(
      '- Changes marked [mobile] apply at the base / smallest viewports',
    )
  }

  lines.push('=== END CHANGELOG ===')
  return lines.join('\n')
}

export interface DevicePreset {
  name: string
  width: number
  category: 'phone' | 'tablet' | 'desktop'
}

export const DEVICE_PRESETS: DevicePreset[] = [
  // Phones
  { name: 'iPhone SE', width: 375, category: 'phone' },
  { name: 'iPhone 14 Pro', width: 393, category: 'phone' },
  { name: 'iPhone 14 Pro Max', width: 430, category: 'phone' },
  { name: 'Samsung Galaxy S24', width: 360, category: 'phone' },
  { name: 'Samsung Galaxy S24 Ultra', width: 412, category: 'phone' },
  { name: 'Google Pixel 9', width: 412, category: 'phone' },
  { name: 'Google Pixel 9 Pro XL', width: 448, category: 'phone' },
  { name: 'OnePlus 12', width: 400, category: 'phone' },
  // Tablets
  { name: 'iPad Mini', width: 768, category: 'tablet' },
  { name: 'iPad Air', width: 820, category: 'tablet' },
  { name: 'iPad Pro 12.9"', width: 1024, category: 'tablet' },
  { name: 'Samsung Galaxy Tab S9', width: 800, category: 'tablet' },
  { name: 'Samsung Galaxy Tab S9+', width: 930, category: 'tablet' },
  { name: 'Samsung Galaxy Tab S9 Ultra', width: 1038, category: 'tablet' },
  { name: 'Google Pixel Tablet', width: 834, category: 'tablet' },
  { name: 'Lenovo Tab P12 Pro', width: 960, category: 'tablet' },
  { name: 'Amazon Fire HD 10', width: 600, category: 'tablet' },
  // Desktop
  { name: 'Laptop', width: 1280, category: 'desktop' },
  { name: 'Desktop', width: 1440, category: 'desktop' },
  { name: 'Wide', width: 1920, category: 'desktop' },
]

// Maps breakpoint names to device categories
export const BREAKPOINT_CATEGORY_MAP: Record<
  Breakpoint,
  DevicePreset['category']
> = {
  mobile: 'phone',
  tablet: 'tablet',
  desktop: 'desktop',
}

export const PREVIEW_WIDTH_MIN = 320
export const PREVIEW_WIDTH_MAX = 1920

export const LEFT_ICON_SIDEBAR_WIDTH = 40

export const PANEL_DEFAULTS = {
  leftWidth: 240,
  rightWidth: 300,
  leftMin: 180,
  leftMax: 400,
  rightMin: 240,
  rightMax: 500,
} as const

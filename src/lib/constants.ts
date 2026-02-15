import type { Breakpoint } from '@/types/changelog';

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
} as const;

export const BREAKPOINTS: Record<Breakpoint, { label: string; deviceName: string; width: number }> = {
  mobile: { label: 'Mobile', deviceName: 'iPhone SE', width: 375 },
  tablet: { label: 'Tablet', deviceName: 'iPad Mini', width: 768 },
  desktop: { label: 'Desktop', deviceName: 'Laptop', width: 1280 },
};

/**
 * Get the breakpoint range string for a given breakpoint.
 * E.g., tablet (768px) affects down to mobile's max (430px) → "768px > 430px"
 * Mobile is the lowest, so it just shows "375px".
 * Desktop has no upper bound, so it shows "1280px+".
 */
const LOWER_BOUND_MAP: Record<Breakpoint, number | null> = {
  desktop: 1024, // affects down to tablet upper range
  tablet: 430,   // affects down to mobile upper range (iPhone 14 Pro Max)
  mobile: 0,     // lowest breakpoint
};

export function getBreakpointRange(bp: Breakpoint): string {
  const width = BREAKPOINTS[bp].width;
  const lowerBound = LOWER_BOUND_MAP[bp];
  if (bp === 'mobile') return `${width}px`;
  if (lowerBound != null && lowerBound > 0) return `${width}px > ${lowerBound}px`;
  return `${width}px`;
}

export function getBreakpointDeviceInfo(bp: Breakpoint): { deviceName: string; range: string } {
  return {
    deviceName: BREAKPOINTS[bp].deviceName,
    range: getBreakpointRange(bp),
  };
}

export const CSS_PROPERTIES = {
  size: ['width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'overflow', 'box-sizing'],
  spacing: [
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  ],
  typography: [
    'font-family', 'font-size', 'font-weight', 'line-height',
    'letter-spacing', 'text-align', 'text-decoration', 'text-transform', 'color',
  ],
  border: [
    'border-width', 'border-style', 'border-color', 'border-radius',
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
    'border-top-left-radius', 'border-top-right-radius',
    'border-bottom-right-radius', 'border-bottom-left-radius',
  ],
  background: ['background-color', 'background-image'],
  layout: [
    'display', 'flex-direction', 'justify-content', 'align-items',
    'align-content', 'flex-wrap', 'gap', 'row-gap', 'column-gap',
    'grid-template-columns', 'grid-template-rows',
  ],
  position: ['position', 'top', 'right', 'bottom', 'left', 'z-index'],
  appearance: ['opacity'],
  shadow: ['box-shadow'],
  'flex-item': ['flex-grow', 'flex-shrink', 'flex-basis', 'align-self', 'order'],
  transform: ['transform'],
  filter: ['filter'],
} as const;

export const ALL_EDITABLE_PROPERTIES = Object.values(CSS_PROPERTIES).flat();

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
} as const;

export const LOCAL_STORAGE_KEYS = {
  RECENT_URLS: 'dev-editor:recent-urls',
  PANEL_SIZES: 'dev-editor:panel-sizes',
  PANEL_VISIBILITY: 'dev-editor:panel-visibility',
  CHANGES_PREFIX: 'dev-editor:changes:',
  CLAUDE_PROJECT_ROOT: 'dev-editor:claude:project-root',
  CLAUDE_CLI_AVAILABLE: 'dev-editor:claude:cli-available',
} as const;

export const PROXY_HEADER = 'x-dev-editor-target';

export const HEARTBEAT_INTERVAL_MS = 5000;
export const HEARTBEAT_TIMEOUT_MS = 3000;
export const RECONNECT_MAX_RETRIES = 5;
export const RECONNECT_BASE_DELAY_MS = 1000;

export function buildInstructionsFooter(changeCount: number, elementCount: number): string {
  const lines: string[] = [];
  lines.push('---');
  lines.push(`Summary: ${changeCount} change${changeCount !== 1 ? 's' : ''} across ${elementCount} element${elementCount !== 1 ? 's' : ''}`);
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
  lines.push('=== END CHANGELOG ===');
  return lines.join('\n');
}

export interface DevicePreset {
  name: string;
  width: number;
  category: 'phone' | 'tablet' | 'desktop';
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
];

// Maps breakpoint names to device categories
export const BREAKPOINT_CATEGORY_MAP: Record<Breakpoint, DevicePreset['category']> = {
  mobile: 'phone',
  tablet: 'tablet',
  desktop: 'desktop',
};

export const PREVIEW_WIDTH_MIN = 320;
export const PREVIEW_WIDTH_MAX = 1920;

export const PANEL_DEFAULTS = {
  leftWidth: 240,
  rightWidth: 300,
  leftMin: 180,
  leftMax: 400,
  rightMin: 240,
  rightMax: 500,
} as const;

/**
 * Infer a likely source file path for a DOM element based on its
 * tag name, class names, id, the current page path, and selector depth.
 *
 * Returns a Next.js App Router-style path like:
 *   src/app/page.tsx
 *   src/app/about/page.tsx
 *   src/app/layout.tsx
 *   src/components/Navbar.tsx
 */

const LAYOUT_TAGS = new Set([
  'html', 'body', 'header', 'footer', 'nav', 'aside', 'main',
]);

const LAYOUT_HINTS = [
  'layout', 'wrapper', 'container', 'sidebar', 'navbar', 'topbar',
  'app-shell', 'shell', 'scaffold', 'frame', 'toolbar', 'drawer',
  'app-bar', 'navigation', 'menu-bar',
];

const PAGE_HINTS = [
  'page', 'view', 'screen', 'content', 'hero', 'banner', 'landing',
  'home', 'dashboard', 'profile', 'settings', 'about', 'checkout',
  'feed', 'detail', 'overview',
];

const COMPONENT_MAP: Record<string, string> = {
  btn: 'Button', button: 'Button', card: 'Card', modal: 'Modal',
  dialog: 'Dialog', dropdown: 'Dropdown', popover: 'Popover',
  tooltip: 'Tooltip', badge: 'Badge', chip: 'Chip', avatar: 'Avatar',
  icon: 'Icon', alert: 'Alert', toast: 'Toast', accordion: 'Accordion',
  tab: 'Tabs', carousel: 'Carousel', slider: 'Slider',
  pagination: 'Pagination', stepper: 'Stepper', progress: 'Progress',
  breadcrumb: 'Breadcrumb', spinner: 'Spinner', skeleton: 'Skeleton',
  form: 'Form', table: 'Table', navbar: 'Navbar', header: 'Header',
  footer: 'Footer', sidebar: 'Sidebar',
};

function matchesAny(text: string, hints: string[]): boolean {
  const lower = text.toLowerCase();
  return hints.some((h) => lower.includes(h));
}

function findComponentName(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [hint, name] of Object.entries(COMPONENT_MAP)) {
    if (lower.includes(hint)) return name;
  }
  return null;
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join('');
}

export function inferSourcePath(opts: {
  tagName: string;
  className: string | null;
  id: string | null;
  selectorPath: string | null;
  pagePath: string;
}): string {
  const tag = opts.tagName.toLowerCase();
  const cls = opts.className || '';
  const id = opts.id || '';
  const combined = `${cls} ${id} ${tag}`;
  const pagePath = opts.pagePath || '/';

  // 1. Layout — structural wrappers
  if (LAYOUT_TAGS.has(tag) || matchesAny(combined, LAYOUT_HINTS)) {
    // Try to guess specific component name from classes/id
    const name = findComponentName(combined);
    if (name && tag !== 'html' && tag !== 'body' && tag !== 'main') {
      return `src/components/${name}.tsx`;
    }
    // Root layout
    if (pagePath === '/') return 'src/app/layout.tsx';
    const segments = pagePath.replace(/^\/|\/$/g, '').split('/');
    return `src/app/${segments.join('/')}/layout.tsx`;
  }

  // 2. Page-level content
  if (matchesAny(combined, PAGE_HINTS)) {
    if (pagePath === '/') return 'src/app/page.tsx';
    const segments = pagePath.replace(/^\/|\/$/g, '').split('/');
    return `src/app/${segments.join('/')}/page.tsx`;
  }

  // 3. Component — match known component names
  const componentName = findComponentName(combined);
  if (componentName) {
    return `src/components/${componentName}.tsx`;
  }

  // 4. Interactive HTML elements → components
  if (
    tag === 'button' || tag === 'input' || tag === 'select' ||
    tag === 'textarea' || tag === 'a' || tag === 'img' ||
    tag === 'table' || tag === 'form' || tag === 'label'
  ) {
    // Try to derive name from id or first meaningful class
    if (id) return `src/components/${toPascalCase(id)}.tsx`;
    const firstClass = cls.split(/\s+/).find((c) => c.length > 2 && !c.startsWith('text-') && !c.startsWith('bg-') && !c.startsWith('flex') && !c.startsWith('p-') && !c.startsWith('m-'));
    if (firstClass) return `src/components/${toPascalCase(firstClass)}.tsx`;
    return 'src/components/';
  }

  // 5. Depth heuristic — shallow = layout/page, deep = component
  if (opts.selectorPath) {
    const depth = opts.selectorPath.split(' > ').length;
    if (depth <= 2) {
      if (pagePath === '/') return 'src/app/layout.tsx';
      return `src/app/${pagePath.replace(/^\/|\/$/g, '')}/layout.tsx`;
    }
    if (depth <= 4) {
      if (pagePath === '/') return 'src/app/page.tsx';
      return `src/app/${pagePath.replace(/^\/|\/$/g, '')}/page.tsx`;
    }
  }

  // Default — page file
  if (pagePath === '/') return 'src/app/page.tsx';
  const segments = pagePath.replace(/^\/|\/$/g, '').split('/');
  return `src/app/${segments.join('/')}/page.tsx`;
}

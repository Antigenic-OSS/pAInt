/**
 * Infer a likely source file path for a DOM element based on its
 * tag name, class names, id, the current page path, and selector depth.
 *
 * When a FileMap is provided (from project scan), attempts filesystem-backed
 * resolution first. Falls back to heuristics when no match is found.
 */

import type {
  FileMap,
  RouteEntry,
  SourceInfo,
} from '@/types/claude'

const LAYOUT_TAGS = new Set([
  'html',
  'body',
  'header',
  'footer',
  'nav',
  'aside',
  'main',
])

const LAYOUT_HINTS = [
  'layout',
  'wrapper',
  'container',
  'sidebar',
  'navbar',
  'topbar',
  'app-shell',
  'shell',
  'scaffold',
  'frame',
  'toolbar',
  'drawer',
  'app-bar',
  'navigation',
  'menu-bar',
]

const PAGE_HINTS = [
  'page',
  'view',
  'screen',
  'content',
  'hero',
  'banner',
  'landing',
  'home',
  'dashboard',
  'profile',
  'settings',
  'about',
  'checkout',
  'feed',
  'detail',
  'overview',
]

const COMPONENT_MAP: Record<string, string> = {
  btn: 'Button',
  button: 'Button',
  card: 'Card',
  modal: 'Modal',
  dialog: 'Dialog',
  dropdown: 'Dropdown',
  popover: 'Popover',
  tooltip: 'Tooltip',
  badge: 'Badge',
  chip: 'Chip',
  avatar: 'Avatar',
  icon: 'Icon',
  alert: 'Alert',
  toast: 'Toast',
  accordion: 'Accordion',
  tab: 'Tabs',
  carousel: 'Carousel',
  slider: 'Slider',
  pagination: 'Pagination',
  stepper: 'Stepper',
  progress: 'Progress',
  breadcrumb: 'Breadcrumb',
  spinner: 'Spinner',
  skeleton: 'Skeleton',
  form: 'Form',
  table: 'Table',
  navbar: 'Navbar',
  header: 'Header',
  footer: 'Footer',
  sidebar: 'Sidebar',
}

function matchesAny(text: string, hints: string[]): boolean {
  const lower = text.toLowerCase()
  return hints.some((h) => lower.includes(h))
}

function findComponentName(text: string): string | null {
  const lower = text.toLowerCase()
  for (const [hint, name] of Object.entries(COMPONENT_MAP)) {
    if (lower.includes(hint)) return name
  }
  return null
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join('')
}

/** Check if a URL path matches a route pattern with dynamic segments. */
function matchesUrlPattern(urlPath: string, pattern: string): boolean {
  const urlSegs = urlPath
    .replace(/^\/|\/$/g, '')
    .split('/')
    .filter(Boolean)
  const patSegs = pattern
    .replace(/^\/|\/$/g, '')
    .split('/')
    .filter(Boolean)

  // Handle catch-all: [...slug] or [[...slug]]
  if (patSegs.length > 0) {
    const last = patSegs[patSegs.length - 1]
    if (/^\[{1,2}\.\.\./.test(last)) {
      // Catch-all matches if all preceding segments match
      for (let i = 0; i < patSegs.length - 1; i++) {
        if (i >= urlSegs.length) return false
        if (!patSegs[i].startsWith('[') && patSegs[i] !== urlSegs[i])
          return false
      }
      return urlSegs.length >= patSegs.length - 1
    }
  }

  if (urlSegs.length !== patSegs.length) return false
  for (let i = 0; i < patSegs.length; i++) {
    // Dynamic segment matches anything
    if (patSegs[i].startsWith('[') && patSegs[i].endsWith(']')) continue
    if (patSegs[i] !== urlSegs[i]) return false
  }
  return true
}

/** Find the best page route match for a given pagePath. */
function findPageRoute(
  routes: RouteEntry[],
  pagePath: string,
): RouteEntry | null {
  const pageRoutes = routes.filter((r) => r.type === 'page')
  // Exact match first
  const exact = pageRoutes.find((r) => r.urlPattern === pagePath)
  if (exact) return exact
  // Dynamic segment match
  const dynamic = pageRoutes.find((r) =>
    matchesUrlPattern(pagePath, r.urlPattern),
  )
  if (dynamic) return dynamic
  return null
}

/** Attempt to resolve a source path from the FileMap. Returns null on no match. */
function resolveFromFileMap(opts: {
  tagName: string
  className: string | null
  id: string | null
  selectorPath: string | null
  pagePath: string
  fileMap: FileMap
}): string | null {
  const { fileMap } = opts
  const tag = opts.tagName.toLowerCase()
  const cls = (opts.className || '').toLowerCase()
  const id = (opts.id || '').toLowerCase()
  const combined = `${cls} ${id} ${tag}`
  const pagePath = opts.pagePath || '/'

  // 1. Component match — check className/id/tagName against ComponentEntry.nameLower
  for (const comp of fileMap.components) {
    if (
      comp.category === 'page' ||
      comp.category === 'screen' ||
      comp.category === 'layout'
    )
      continue
    // Exact substring match: component name appears in the combined text
    if (comp.nameLower.length >= 3 && combined.includes(comp.nameLower)) {
      return comp.filePath
    }
  }

  // Also try COMPONENT_MAP mapping: e.g. "btn" → look for "Button"
  for (const [hint, name] of Object.entries(COMPONENT_MAP)) {
    if (combined.includes(hint)) {
      const nameLower = name.toLowerCase()
      const match = fileMap.components.find((c) => c.nameLower === nameLower)
      if (match) return match.filePath
    }
  }

  // 2. Layout match — if element looks like a layout, find the most specific layout route
  const isLayoutHint =
    LAYOUT_TAGS.has(tag) || matchesAny(combined, LAYOUT_HINTS)
  if (isLayoutHint && fileMap.routes.length > 0) {
    const layouts = fileMap.routes
      .filter((r) => r.type === 'layout')
      .filter(
        (r) =>
          matchesUrlPattern(pagePath, r.urlPattern) || r.urlPattern === '/',
      )
    if (layouts.length > 0) {
      // Most specific layout = longest urlPattern
      layouts.sort((a, b) => b.urlPattern.length - a.urlPattern.length)
      return layouts[0].filePath
    }
  }

  // 3. Page/route match (strict) — for shallow elements or page-hint elements
  if (fileMap.routes.length > 0) {
    const pageRoute = findPageRoute(fileMap.routes, pagePath)
    if (pageRoute) {
      const depth = opts.selectorPath
        ? opts.selectorPath.split(' > ').length
        : 0
      if (depth <= 4 || matchesAny(combined, PAGE_HINTS))
        return pageRoute.filePath
    }
  }

  // 4. Screen/view match — look for screen/page entries with name matching URL segment
  const urlSegments = pagePath
    .replace(/^\/|\/$/g, '')
    .split('/')
    .filter(Boolean)
  if (urlSegments.length > 0) {
    const screenEntries = fileMap.components.filter(
      (c) =>
        c.category === 'screen' ||
        c.category === 'page' ||
        c.category === 'view',
    )
    for (const seg of urlSegments) {
      const segLower = seg.toLowerCase()
      const match = screenEntries.find((c) => c.nameLower.includes(segLower))
      if (match) return match.filePath
    }
  }

  // 5. Root page fallback — for "/" when no route matched, look for index/home screen entries
  if (pagePath === '/' || pagePath === '') {
    const screenEntries = fileMap.components.filter(
      (c) =>
        c.category === 'screen' ||
        c.category === 'page' ||
        c.category === 'view',
    )
    const homeNames = [
      'index',
      'home',
      'main',
      'app',
      'homescreen',
      'homeview',
      'homepage',
      'mainscreen',
    ]
    const homeMatch = screenEntries.find((c) => homeNames.includes(c.nameLower))
    if (homeMatch) return homeMatch.filePath
  }

  // 6. Lenient page route fallback — return the page route file for the current path
  //    regardless of element depth (better than a hardcoded heuristic path)
  if (fileMap.routes.length > 0) {
    const pageRoute = findPageRoute(fileMap.routes, pagePath)
    if (pageRoute) return pageRoute.filePath
  }

  // 7. Last resort — if we have any routes at all, return the root page
  //    This is always better than the hardcoded heuristic fallback
  if (fileMap.routes.length > 0) {
    const rootPage = fileMap.routes.find(
      (r) => r.type === 'page' && r.urlPattern === '/',
    )
    if (rootPage) return rootPage.filePath
  }

  return null
}

export function inferComponentWidgetName(opts: {
  tagName: string
  className: string | null
  elementId: string | null
  sourceInfo?: SourceInfo | null
}): string {
  if (opts.sourceInfo?.componentName) {
    return opts.sourceInfo.componentName
  }
  if (opts.sourceInfo?.componentChain?.length) {
    return opts.sourceInfo.componentChain[
      opts.sourceInfo.componentChain.length - 1
    ]
  }
  const combined = `${opts.className || ''} ${opts.elementId || ''} ${opts.tagName}`
  const mapped = findComponentName(combined)
  if (mapped) return mapped
  return opts.tagName
}

export function inferSourcePath(opts: {
  tagName: string
  className: string | null
  id: string | null
  selectorPath: string | null
  pagePath: string
  fileMap?: FileMap | null
  sourceInfo?: SourceInfo | null
  projectRoot?: string | null
}): string {
  // Priority 0: React fiber _debugSource (exact file + line)
  if (opts.sourceInfo?.fileName) {
    const abs = opts.sourceInfo.fileName
    if (opts.projectRoot) {
      const root = opts.projectRoot.replace(/\/$/, '')
      if (abs.startsWith(`${root}/`)) {
        return abs.substring(root.length + 1)
      }
    }
    // Return absolute path if can't make relative (still accurate)
    return abs
  }

  // Try filesystem-backed resolution first
  if (opts.fileMap) {
    const resolved = resolveFromFileMap({
      tagName: opts.tagName,
      className: opts.className,
      id: opts.id,
      selectorPath: opts.selectorPath,
      pagePath: opts.pagePath,
      fileMap: opts.fileMap,
    })
    if (resolved) return resolved
  }

  const tag = opts.tagName.toLowerCase()
  const cls = opts.className || ''
  const id = opts.id || ''
  const combined = `${cls} ${id} ${tag}`
  const pagePath = opts.pagePath || '/'

  // 1. Layout — structural wrappers
  if (LAYOUT_TAGS.has(tag) || matchesAny(combined, LAYOUT_HINTS)) {
    // Try to guess specific component name from classes/id
    const name = findComponentName(combined)
    if (name && tag !== 'html' && tag !== 'body' && tag !== 'main') {
      return `src/components/${name}.tsx`
    }
    // Root layout
    if (pagePath === '/') return 'src/app/layout.tsx'
    const segments = pagePath.replace(/^\/|\/$/g, '').split('/')
    return `src/app/${segments.join('/')}/layout.tsx`
  }

  // 2. Page-level content
  if (matchesAny(combined, PAGE_HINTS)) {
    if (pagePath === '/') return 'src/app/page.tsx'
    const segments = pagePath.replace(/^\/|\/$/g, '').split('/')
    return `src/app/${segments.join('/')}/page.tsx`
  }

  // 3. Component — match known component names
  const componentName = findComponentName(combined)
  if (componentName) {
    return `src/components/${componentName}.tsx`
  }

  // 4. Interactive HTML elements → components
  if (
    tag === 'button' ||
    tag === 'input' ||
    tag === 'select' ||
    tag === 'textarea' ||
    tag === 'a' ||
    tag === 'img' ||
    tag === 'table' ||
    tag === 'form' ||
    tag === 'label'
  ) {
    // Try to derive name from id or first meaningful class
    if (id) return `src/components/${toPascalCase(id)}.tsx`
    const firstClass = cls
      .split(/\s+/)
      .find(
        (c) =>
          c.length > 2 &&
          !c.startsWith('text-') &&
          !c.startsWith('bg-') &&
          !c.startsWith('flex') &&
          !c.startsWith('p-') &&
          !c.startsWith('m-'),
      )
    if (firstClass) return `src/components/${toPascalCase(firstClass)}.tsx`
    return 'src/components/'
  }

  // 5. Depth heuristic — shallow = layout/page, deep = component
  if (opts.selectorPath) {
    const depth = opts.selectorPath.split(' > ').length
    if (depth <= 2) {
      if (pagePath === '/') return 'src/app/layout.tsx'
      return `src/app/${pagePath.replace(/^\/|\/$/g, '')}/layout.tsx`
    }
    if (depth <= 4) {
      if (pagePath === '/') return 'src/app/page.tsx'
      return `src/app/${pagePath.replace(/^\/|\/$/g, '')}/page.tsx`
    }
  }

  // Default — page file
  if (pagePath === '/') return 'src/app/page.tsx'
  const segments = pagePath.replace(/^\/|\/$/g, '').split('/')
  return `src/app/${segments.join('/')}/page.tsx`
}

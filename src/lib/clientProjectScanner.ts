/**
 * Client-side project scanner using the File System Access API.
 * Mirrors the server-side /api/project-scan logic but runs entirely in the browser.
 */

import type { RouteEntry } from '@/types/claude'

export interface ClientScanResult {
  projectName: string
  componentCount: number
  componentFileMap: Record<string, string>
  framework: string | null
  cssStrategy: string[]
  cssFiles: string[]
  srcDirs: string[]
  assetDirs: string[]
  routes: RouteEntry[]
}

const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  '.git',
  '__tests__',
  '__mocks__',
  '.turbo',
  '.vercel',
  'coverage',
])

const COMPONENT_EXTENSIONS = new Set(['.tsx', '.jsx'])
const MAYBE_COMPONENT_EXTENSIONS = new Set(['.ts', '.js'])
const CSS_EXTENSIONS = new Set(['.css', '.scss', '.sass', '.less'])
const MAX_FILES = 5000

const CONVENTION_FILES = new Set([
  'page',
  'layout',
  'loading',
  'error',
  'not-found',
  'template',
  'default',
  'route',
  'proxy',
  'middleware',
  'global-error',
  'instrumentation',
])

const ROUTE_CONVENTION_MAP: Record<string, RouteEntry['type']> = {
  page: 'page',
  layout: 'layout',
  loading: 'loading',
  error: 'error',
  'not-found': 'not-found',
  template: 'template',
}

const PREFERRED_SEGMENTS = new Set(['components', 'ui', 'common', 'shared'])

const ASSET_DIR_NAMES = new Set([
  'images',
  'img',
  'fonts',
  'icons',
  'media',
  'assets',
  'static',
  'videos',
  'svgs',
  'illustrations',
])

function isPascalCase(name: string): boolean {
  return /^[A-Z][a-zA-Z0-9]*$/.test(name)
}

function getExtension(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i) : ''
}

function getBaseName(name: string): string {
  const ext = getExtension(name)
  return ext ? name.slice(0, -ext.length) : name
}

function hasPreferredSegment(relativePath: string): boolean {
  const segments = relativePath.split('/')
  return segments.some((s) => PREFERRED_SEGMENTS.has(s))
}

function filePathToUrlPattern(relativePath: string): string {
  const parts = relativePath.split('/')
  const routeParts = parts.slice(1, -1)
  const filtered = routeParts.filter((p) => !p.startsWith('('))
  return '/' + filtered.join('/')
}

interface Collectors {
  componentFileMap: Record<string, string>
  cssFiles: string[]
  routes: RouteEntry[]
  assetDirs: Set<string>
  hasCssModules: boolean
}

async function walkDir(
  dirHandle: FileSystemDirectoryHandle,
  relativePath: string,
  collectors: Collectors,
  counter: { count: number },
): Promise<void> {
  if (counter.count >= MAX_FILES) return

  for await (const [name, entryHandle] of dirHandle.entries()) {
    if (counter.count >= MAX_FILES) return
    if (SKIP_DIRS.has(name)) continue

    if (entryHandle.kind === 'directory') {
      if (ASSET_DIR_NAMES.has(name.toLowerCase())) {
        const relDir = relativePath ? `${relativePath}/${name}` : name
        collectors.assetDirs.add(relDir)
      }
      const childPath = relativePath ? `${relativePath}/${name}` : name
      await walkDir(
        entryHandle as FileSystemDirectoryHandle,
        childPath,
        collectors,
        counter,
      )
      continue
    }

    counter.count++
    const ext = getExtension(name)
    const baseName = getBaseName(name)
    const filePath = relativePath ? `${relativePath}/${name}` : name

    if (baseName.startsWith('.')) continue

    // CSS files
    if (CSS_EXTENSIONS.has(ext)) {
      collectors.cssFiles.push(filePath)
      if (name.includes('.module.')) {
        collectors.hasCssModules = true
      }
      continue
    }

    // Test files
    if (baseName.endsWith('.test') || baseName.endsWith('.spec')) continue

    // Route/convention files
    const routeType = ROUTE_CONVENTION_MAP[baseName]
    if (
      routeType &&
      (COMPONENT_EXTENSIONS.has(ext) || MAYBE_COMPONENT_EXTENSIONS.has(ext))
    ) {
      if (filePath.startsWith('app/') || filePath.startsWith('src/app/')) {
        const normalizedPath = filePath.startsWith('src/')
          ? filePath.slice(4)
          : filePath
        collectors.routes.push({
          urlPattern: filePathToUrlPattern(normalizedPath),
          filePath,
          type: routeType,
        })
      }
      continue
    }

    if (baseName === 'index') continue
    if (CONVENTION_FILES.has(baseName)) continue

    // Component files
    const isComponentExt = COMPONENT_EXTENSIONS.has(ext)
    const isMaybeComponentExt = MAYBE_COMPONENT_EXTENSIONS.has(ext)
    if (!isComponentExt && !isMaybeComponentExt) continue
    if (isMaybeComponentExt && !isPascalCase(baseName)) continue

    if (collectors.componentFileMap[baseName]) {
      const existingPreferred = hasPreferredSegment(
        collectors.componentFileMap[baseName],
      )
      const newPreferred = hasPreferredSegment(filePath)
      if (newPreferred && !existingPreferred) {
        collectors.componentFileMap[baseName] = filePath
      }
    } else {
      collectors.componentFileMap[baseName] = filePath
    }
  }
}

function detectFramework(
  deps: Record<string, string>,
  devDeps: Record<string, string>,
): string | null {
  const all = { ...deps, ...devDeps }
  if (all['next']) return 'Next.js'
  if (all['@remix-run/react'] || all['remix']) return 'Remix'
  if (all['gatsby']) return 'Gatsby'
  if (all['astro']) return 'Astro'
  if (all['@angular/core']) return 'Angular'
  if (all['vue']) return 'Vue'
  if (all['svelte']) return 'Svelte'
  if (all['react']) return 'React'
  return null
}

function detectCssStrategy(
  deps: Record<string, string>,
  devDeps: Record<string, string>,
  hasCssModules: boolean,
  cssFiles: string[],
): string[] {
  const all = { ...deps, ...devDeps }
  const strategies: string[] = []
  if (all['tailwindcss']) strategies.push('Tailwind')
  if (hasCssModules) strategies.push('CSS Modules')
  if (all['styled-components']) strategies.push('styled-components')
  if (all['@emotion/react'] || all['@emotion/styled'])
    strategies.push('Emotion')
  if (all['sass'] || all['node-sass']) strategies.push('Sass')
  if (all['less']) strategies.push('Less')
  if (all['@vanilla-extract/css']) strategies.push('Vanilla Extract')
  if (strategies.length === 0 && cssFiles.length > 0) strategies.push('CSS')
  return strategies
}

/**
 * Scan a project directory using the File System Access API.
 * Returns the same shape as the server-side /api/project-scan endpoint.
 */
export async function scanProjectClient(
  rootHandle: FileSystemDirectoryHandle,
): Promise<ClientScanResult> {
  // Read package.json
  let projectName = rootHandle.name || 'unknown'
  let deps: Record<string, string> = {}
  let devDeps: Record<string, string> = {}

  try {
    const pkgHandle = await rootHandle.getFileHandle('package.json')
    const pkgFile = await pkgHandle.getFile()
    const pkgText = await pkgFile.text()
    const pkg = JSON.parse(pkgText)
    projectName = pkg.name || projectName
    deps = pkg.dependencies || {}
    devDeps = pkg.devDependencies || {}
  } catch {
    // No package.json or couldn't parse — continue with defaults
  }

  const collectors: Collectors = {
    componentFileMap: {},
    cssFiles: [],
    routes: [],
    assetDirs: new Set(),
    hasCssModules: false,
  }
  const counter = { count: 0 }
  const srcDirs: string[] = []
  const candidateDirs = ['src', 'app', 'components', 'lib', 'pages', 'styles']
  const scannedRoots: string[] = []

  for (const dir of candidateDirs) {
    const alreadyCovered = scannedRoots.some((root) =>
      dir.startsWith(root + '/'),
    )
    if (alreadyCovered) continue

    try {
      const dirHandle = await rootHandle.getDirectoryHandle(dir)
      await walkDir(dirHandle, dir, collectors, counter)
      scannedRoots.push(dir)
      srcDirs.push(dir)
    } catch {
      // Directory doesn't exist — skip
    }
  }

  // Detect root-level config files
  const configPatterns = [
    'tailwind.config.js',
    'tailwind.config.ts',
    'tailwind.config.mjs',
    'tailwind.config.cjs',
    'postcss.config.js',
    'postcss.config.ts',
    'postcss.config.mjs',
    'postcss.config.cjs',
  ]
  for (const config of configPatterns) {
    try {
      await rootHandle.getFileHandle(config)
      collectors.cssFiles.push(config)
    } catch {
      // Not found — skip
    }
  }

  // Detect asset dirs under public/
  try {
    const publicHandle = await rootHandle.getDirectoryHandle('public')
    for await (const [name, entry] of publicHandle.entries()) {
      if (
        entry.kind === 'directory' &&
        ASSET_DIR_NAMES.has(name.toLowerCase())
      ) {
        collectors.assetDirs.add('public/' + name)
      }
      if (entry.kind === 'file') {
        collectors.assetDirs.add('public')
      }
    }
  } catch {
    // No public dir
  }

  const framework = detectFramework(deps, devDeps)
  const cssStrategy = detectCssStrategy(
    deps,
    devDeps,
    collectors.hasCssModules,
    collectors.cssFiles,
  )

  return {
    projectName,
    componentCount: Object.keys(collectors.componentFileMap).length,
    componentFileMap: collectors.componentFileMap,
    framework,
    cssStrategy,
    cssFiles: collectors.cssFiles,
    srcDirs,
    assetDirs: Array.from(collectors.assetDirs),
    routes: collectors.routes,
  }
}

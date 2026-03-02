/**
 * Shared project scanner logic.
 * Used by both the Next.js /api/project-scan route and the bridge server.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { RouteEntry } from '@/types/claude'

export interface ProjectScanData {
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

function hasPreferredSegment(relativePath: string): boolean {
  const segments = relativePath.split(path.sep)
  return segments.some((s) => PREFERRED_SEGMENTS.has(s))
}

function filePathToUrlPattern(relativePath: string): string {
  const parts = relativePath.split(path.sep)
  const routeParts = parts.slice(1, -1)
  const filtered = routeParts.filter((p) => !p.startsWith('('))
  return '/' + filtered.join('/')
}

interface WalkCollectors {
  componentFileMap: Record<string, string>
  cssFiles: string[]
  routes: RouteEntry[]
  assetDirs: Set<string>
  hasCssModules: boolean
}

function walkDir(
  dir: string,
  projectRoot: string,
  collectors: WalkCollectors,
  counter: { count: number },
): void {
  if (counter.count >= MAX_FILES) return

  let entries: import('node:fs').Dirent[]
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (counter.count >= MAX_FILES) return
    if (SKIP_DIRS.has(entry.name)) continue

    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (ASSET_DIR_NAMES.has(entry.name.toLowerCase())) {
        const relDir = path.relative(projectRoot, fullPath)
        collectors.assetDirs.add(relDir)
      }
      walkDir(fullPath, projectRoot, collectors, counter)
      continue
    }

    if (!entry.isFile()) continue
    counter.count++

    const ext = path.extname(entry.name)
    const baseName = path.basename(entry.name, ext)
    const relativePath = path.relative(projectRoot, fullPath)

    if (baseName.startsWith('.')) continue

    if (CSS_EXTENSIONS.has(ext)) {
      collectors.cssFiles.push(relativePath)
      if (entry.name.includes('.module.')) {
        collectors.hasCssModules = true
      }
      continue
    }

    if (baseName.endsWith('.test') || baseName.endsWith('.spec')) continue

    const routeType = ROUTE_CONVENTION_MAP[baseName]
    if (
      routeType &&
      (COMPONENT_EXTENSIONS.has(ext) || MAYBE_COMPONENT_EXTENSIONS.has(ext))
    ) {
      if (
        relativePath.startsWith('app' + path.sep) ||
        relativePath.startsWith('src' + path.sep + 'app' + path.sep)
      ) {
        collectors.routes.push({
          urlPattern: filePathToUrlPattern(
            relativePath.startsWith('src' + path.sep)
              ? relativePath.slice(4)
              : relativePath,
          ),
          filePath: relativePath,
          type: routeType,
        })
      }
      continue
    }

    if (baseName === 'index') continue
    if (CONVENTION_FILES.has(baseName)) continue

    const isComponentExt = COMPONENT_EXTENSIONS.has(ext)
    const isMaybeComponentExt = MAYBE_COMPONENT_EXTENSIONS.has(ext)

    if (!isComponentExt && !isMaybeComponentExt) continue
    if (isMaybeComponentExt && !isPascalCase(baseName)) continue

    if (collectors.componentFileMap[baseName]) {
      const existingPreferred = hasPreferredSegment(
        collectors.componentFileMap[baseName],
      )
      const newPreferred = hasPreferredSegment(relativePath)
      if (newPreferred && !existingPreferred) {
        collectors.componentFileMap[baseName] = relativePath
      }
    } else {
      collectors.componentFileMap[baseName] = relativePath
    }
  }
}

export function detectFramework(
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

export function detectCssStrategy(
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

  if (strategies.length === 0 && cssFiles.length > 0) {
    strategies.push('CSS')
  }

  return strategies
}

function detectRootConfigs(resolved: string, cssFiles: string[]) {
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
    const configPath = path.join(resolved, config)
    if (existsSync(configPath)) {
      cssFiles.push(config)
    }
  }
}

function detectAssetDirs(resolved: string, assetDirs: Set<string>) {
  const publicDir = path.join(resolved, 'public')
  if (existsSync(publicDir)) {
    try {
      const entries = readdirSync(publicDir, { withFileTypes: true })
      for (const entry of entries) {
        if (
          entry.isDirectory() &&
          ASSET_DIR_NAMES.has(entry.name.toLowerCase())
        ) {
          assetDirs.add('public/' + entry.name)
        }
      }
      if (entries.some((e) => e.isFile())) {
        assetDirs.add('public')
      }
    } catch {
      /* skip */
    }
  }
}

/**
 * Scan a project directory and return structured metadata.
 * Requires a validated, resolved absolute path.
 */
export function scanProject(resolvedRoot: string): ProjectScanData {
  const pkgPath = path.join(resolvedRoot, 'package.json')
  let projectName = 'unknown'
  let deps: Record<string, string> = {}
  let devDeps: Record<string, string> = {}

  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      projectName = pkg.name || 'unknown'
      deps = pkg.dependencies || {}
      devDeps = pkg.devDependencies || {}
    } catch {
      // couldn't parse — continue with defaults
    }
  }

  const collectors: WalkCollectors = {
    componentFileMap: {},
    cssFiles: [],
    routes: [],
    assetDirs: new Set(),
    hasCssModules: false,
  }
  const counter = { count: 0 }
  const scannedRoots: string[] = []
  const candidateDirs = ['src', 'app', 'components', 'lib', 'pages', 'styles']
  const srcDirs: string[] = []

  for (const dir of candidateDirs) {
    const fullDir = path.join(resolvedRoot, dir)
    if (!existsSync(fullDir)) continue

    const alreadyCovered = scannedRoots.some((root) =>
      fullDir.startsWith(root + path.sep),
    )
    if (alreadyCovered) continue

    try {
      const entries = readdirSync(fullDir, { withFileTypes: true })
      if (entries.length > 0) {
        walkDir(fullDir, resolvedRoot, collectors, counter)
        scannedRoots.push(fullDir)
        srcDirs.push(dir)
      }
    } catch {
      /* skip inaccessible dirs */
    }
  }

  detectRootConfigs(resolvedRoot, collectors.cssFiles)
  detectAssetDirs(resolvedRoot, collectors.assetDirs)

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

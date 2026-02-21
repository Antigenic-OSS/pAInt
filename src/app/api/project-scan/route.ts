import { NextResponse } from 'next/server';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { validateProjectRoot } from '@/lib/validatePath';
import type { RouteEntry } from '@/types/claude';

const SKIP_DIRS = new Set([
  'node_modules', '.next', 'dist', 'build', '.git',
  '__tests__', '__mocks__', '.turbo', '.vercel', 'coverage',
]);

const COMPONENT_EXTENSIONS = new Set(['.tsx', '.jsx']);
const MAYBE_COMPONENT_EXTENSIONS = new Set(['.ts', '.js']);
const CSS_EXTENSIONS = new Set(['.css', '.scss', '.sass', '.less']);
const MAX_FILES = 5000;

/** Next.js / framework convention filenames that aren't reusable components. */
const CONVENTION_FILES = new Set([
  'page', 'layout', 'loading', 'error', 'not-found',
  'template', 'default', 'route', 'middleware',
  'global-error', 'instrumentation',
]);

/** Route-type convention files (pages and layouts we want to capture). */
const ROUTE_CONVENTION_MAP: Record<string, RouteEntry['type']> = {
  'page': 'page',
  'layout': 'layout',
  'loading': 'loading',
  'error': 'error',
  'not-found': 'not-found',
  'template': 'template',
};

/** Paths containing these segments are ranked higher for duplicate resolution. */
const PREFERRED_SEGMENTS = new Set(['components', 'ui', 'common', 'shared']);

/** Common asset directory names. */
const ASSET_DIR_NAMES = new Set([
  'images', 'img', 'fonts', 'icons', 'media', 'assets', 'static',
  'videos', 'svgs', 'illustrations',
]);

function isPascalCase(name: string): boolean {
  return /^[A-Z][a-zA-Z0-9]*$/.test(name);
}

function hasPreferredSegment(relativePath: string): boolean {
  const segments = relativePath.split(path.sep);
  return segments.some((s) => PREFERRED_SEGMENTS.has(s));
}

/** Convert a Next.js App Router file path to a URL pattern. */
function filePathToUrlPattern(relativePath: string): string {
  // e.g. "app/blog/[slug]/page.tsx" → "/blog/[slug]"
  const parts = relativePath.split(path.sep);
  // Remove the "app" prefix and the filename
  const routeParts = parts.slice(1, -1); // remove "app" and "page.tsx"
  // Filter out route groups (parenthesized segments like "(marketing)")
  const filtered = routeParts.filter((p) => !p.startsWith('('));
  return '/' + filtered.join('/');
}

interface WalkCollectors {
  componentFileMap: Record<string, string>;
  cssFiles: string[];
  routes: RouteEntry[];
  assetDirs: Set<string>;
  hasCssModules: boolean;
}

function walkDir(
  dir: string,
  projectRoot: string,
  collectors: WalkCollectors,
  counter: { count: number },
): void {
  if (counter.count >= MAX_FILES) return;

  let entries: import('node:fs').Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (counter.count >= MAX_FILES) return;
    if (SKIP_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Check for asset directories
      if (ASSET_DIR_NAMES.has(entry.name.toLowerCase())) {
        const relDir = path.relative(projectRoot, fullPath);
        collectors.assetDirs.add(relDir);
      }
      walkDir(fullPath, projectRoot, collectors, counter);
      continue;
    }

    if (!entry.isFile()) continue;
    counter.count++;

    const ext = path.extname(entry.name);
    const baseName = path.basename(entry.name, ext);
    const relativePath = path.relative(projectRoot, fullPath);

    // Skip hidden files
    if (baseName.startsWith('.')) continue;

    // ── CSS files ──
    if (CSS_EXTENSIONS.has(ext)) {
      collectors.cssFiles.push(relativePath);
      if (entry.name.includes('.module.')) {
        collectors.hasCssModules = true;
      }
      continue;
    }

    // Skip test files
    if (baseName.endsWith('.test') || baseName.endsWith('.spec')) continue;

    // ── Route/convention files (pages, layouts, etc.) ──
    const routeType = ROUTE_CONVENTION_MAP[baseName];
    if (routeType && (COMPONENT_EXTENSIONS.has(ext) || MAYBE_COMPONENT_EXTENSIONS.has(ext))) {
      // Only capture routes under an "app" directory (Next.js App Router)
      if (relativePath.startsWith('app' + path.sep) || relativePath.startsWith('src' + path.sep + 'app' + path.sep)) {
        collectors.routes.push({
          urlPattern: filePathToUrlPattern(relativePath.startsWith('src' + path.sep) ? relativePath.slice(4) : relativePath),
          filePath: relativePath,
          type: routeType,
        });
      }
      continue;
    }

    // Skip index files and other convention files
    if (baseName === 'index') continue;
    if (CONVENTION_FILES.has(baseName)) continue;

    // ── Component files ──
    const isComponentExt = COMPONENT_EXTENSIONS.has(ext);
    const isMaybeComponentExt = MAYBE_COMPONENT_EXTENSIONS.has(ext);

    if (!isComponentExt && !isMaybeComponentExt) continue;

    // .tsx/.jsx files are always included; .ts/.js only if PascalCase
    if (isMaybeComponentExt && !isPascalCase(baseName)) continue;

    // If duplicate basename, prefer paths under components/ui/common/shared dirs
    if (collectors.componentFileMap[baseName]) {
      const existingPreferred = hasPreferredSegment(collectors.componentFileMap[baseName]);
      const newPreferred = hasPreferredSegment(relativePath);
      if (newPreferred && !existingPreferred) {
        collectors.componentFileMap[baseName] = relativePath;
      }
    } else {
      collectors.componentFileMap[baseName] = relativePath;
    }
  }
}

/** Detect framework from package.json dependencies. */
function detectFramework(deps: Record<string, string>, devDeps: Record<string, string>): string | null {
  const all = { ...deps, ...devDeps };
  if (all['next']) return 'Next.js';
  if (all['@remix-run/react'] || all['remix']) return 'Remix';
  if (all['gatsby']) return 'Gatsby';
  if (all['astro']) return 'Astro';
  if (all['@angular/core']) return 'Angular';
  if (all['vue']) return 'Vue';
  if (all['svelte']) return 'Svelte';
  if (all['react']) return 'React';
  return null;
}

/** Detect CSS strategies from package.json and discovered files. */
function detectCssStrategy(
  deps: Record<string, string>,
  devDeps: Record<string, string>,
  hasCssModules: boolean,
  cssFiles: string[],
): string[] {
  const all = { ...deps, ...devDeps };
  const strategies: string[] = [];

  if (all['tailwindcss']) strategies.push('Tailwind');
  if (hasCssModules) strategies.push('CSS Modules');
  if (all['styled-components']) strategies.push('styled-components');
  if (all['@emotion/react'] || all['@emotion/styled']) strategies.push('Emotion');
  if (all['sass'] || all['node-sass']) strategies.push('Sass');
  if (all['less']) strategies.push('Less');
  if (all['@vanilla-extract/css']) strategies.push('Vanilla Extract');

  // If we found CSS files but no specific strategy, note plain CSS
  if (strategies.length === 0 && cssFiles.length > 0) {
    strategies.push('CSS');
  }

  return strategies;
}

/** Check for config files at project root. */
function detectRootConfigs(resolved: string, cssFiles: string[]) {
  const configPatterns = [
    'tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs', 'tailwind.config.cjs',
    'postcss.config.js', 'postcss.config.ts', 'postcss.config.mjs', 'postcss.config.cjs',
  ];
  for (const config of configPatterns) {
    const configPath = path.join(resolved, config);
    if (existsSync(configPath)) {
      cssFiles.push(config);
    }
  }
}

/** Detect asset directories at common locations. */
function detectAssetDirs(resolved: string, assetDirs: Set<string>) {
  // Check "public" and its subdirectories
  const publicDir = path.join(resolved, 'public');
  if (existsSync(publicDir)) {
    try {
      const entries = readdirSync(publicDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && ASSET_DIR_NAMES.has(entry.name.toLowerCase())) {
          assetDirs.add('public/' + entry.name);
        }
      }
      // If public dir has files directly, include it
      if (entries.some((e) => e.isFile())) {
        assetDirs.add('public');
      }
    } catch { /* skip */ }
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: { projectRoot?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { projectRoot } = body;
  if (!projectRoot || typeof projectRoot !== 'string') {
    return NextResponse.json({ error: 'projectRoot is required' }, { status: 400 });
  }

  const rootError = validateProjectRoot(projectRoot);
  if (rootError) {
    return NextResponse.json({ error: rootError }, { status: 400 });
  }

  const resolved = path.resolve(projectRoot);

  // Check package.json
  const pkgPath = path.join(resolved, 'package.json');
  if (!existsSync(pkgPath)) {
    return NextResponse.json(
      { error: 'Not a valid project directory — no package.json found' },
      { status: 400 },
    );
  }

  let projectName = 'unknown';
  let deps: Record<string, string> = {};
  let devDeps: Record<string, string> = {};

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    projectName = pkg.name || 'unknown';
    deps = pkg.dependencies || {};
    devDeps = pkg.devDependencies || {};
  } catch {
    // package.json exists but couldn't parse — continue with defaults
  }

  // Walk candidate directories, avoiding double-scanning nested paths
  const collectors: WalkCollectors = {
    componentFileMap: {},
    cssFiles: [],
    routes: [],
    assetDirs: new Set(),
    hasCssModules: false,
  };
  const counter = { count: 0 };
  const scannedRoots: string[] = [];
  const candidateDirs = ['src', 'app', 'components', 'lib', 'pages', 'styles'];
  const srcDirs: string[] = [];

  for (const dir of candidateDirs) {
    const fullDir = path.join(resolved, dir);
    if (!existsSync(fullDir)) continue;

    // Skip if this directory is already covered by a previously scanned root
    const alreadyCovered = scannedRoots.some(
      (root) => fullDir.startsWith(root + path.sep),
    );
    if (alreadyCovered) continue;

    try {
      const entries = readdirSync(fullDir, { withFileTypes: true });
      if (entries.length > 0) {
        walkDir(fullDir, resolved, collectors, counter);
        scannedRoots.push(fullDir);
        srcDirs.push(dir);
      }
    } catch { /* skip inaccessible dirs */ }
  }

  // Detect root-level config files and asset dirs
  detectRootConfigs(resolved, collectors.cssFiles);
  detectAssetDirs(resolved, collectors.assetDirs);

  // Detect framework and CSS strategy
  const framework = detectFramework(deps, devDeps);
  const cssStrategy = detectCssStrategy(deps, devDeps, collectors.hasCssModules, collectors.cssFiles);

  const result = {
    projectName,
    componentCount: Object.keys(collectors.componentFileMap).length,
    componentFileMap: collectors.componentFileMap,
    framework,
    cssStrategy,
    cssFiles: collectors.cssFiles,
    srcDirs,
    assetDirs: Array.from(collectors.assetDirs),
    routes: collectors.routes,
  };

  return NextResponse.json(result);
}

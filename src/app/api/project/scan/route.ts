import { NextResponse } from 'next/server';
import { existsSync, statSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import type { ProjectScanResult, ComponentEntry, RouteEntry, FileMap } from '@/types/claude';

/**
 * Validate that projectRoot is an absolute path, exists as a directory,
 * and resides under the user's HOME directory.
 */
function validateProjectRoot(projectRoot: string): string | null {
  if (!path.isAbsolute(projectRoot)) {
    return 'projectRoot must be an absolute path';
  }

  const resolvedHome = path.resolve(homedir());
  const resolved = path.resolve(projectRoot);

  if (!resolved.startsWith(resolvedHome + path.sep) && resolved !== resolvedHome) {
    return 'projectRoot must be under the user home directory';
  }

  if (!existsSync(resolved)) {
    return 'projectRoot does not exist';
  }

  try {
    const stat = statSync(resolved);
    if (!stat.isDirectory()) {
      return 'projectRoot is not a directory';
    }
  } catch {
    return 'Unable to stat projectRoot';
  }

  return null;
}

/** Read and parse package.json from the project root, returning null on failure. */
function readPackageJson(root: string): Record<string, unknown> | null {
  const pkgPath = path.join(root, 'package.json');
  if (!existsSync(pkgPath)) return null;
  try {
    return JSON.parse(readFileSync(pkgPath, 'utf-8'));
  } catch {
    return null;
  }
}

/** Detect the primary framework from package.json dependencies and project files. */
function detectFramework(root: string, pkg: Record<string, unknown> | null): string | null {
  // Check pubspec.yaml for Flutter (no package.json needed)
  if (existsSync(path.join(root, 'pubspec.yaml'))) return 'flutter';

  if (!pkg) return null;
  const allDeps: Record<string, string> = {
    ...(pkg.dependencies as Record<string, string> ?? {}),
    ...(pkg.devDependencies as Record<string, string> ?? {}),
  };
  if ('next' in allDeps) return 'next';
  if ('nuxt' in allDeps) return 'nuxt';
  if ('astro' in allDeps) return 'astro';
  if ('@sveltejs/kit' in allDeps || 'svelte' in allDeps) return 'svelte';
  if ('@angular/core' in allDeps) return 'angular';
  if ('react-native' in allDeps) return 'react-native';
  if ('vue' in allDeps) return 'vue';
  if ('react' in allDeps) return 'react';
  return null;
}

/** Detect CSS strategies from config files and dependencies. */
function detectCssStrategy(root: string, pkg: Record<string, unknown> | null): string[] {
  const strategies: string[] = [];
  const allDeps: Record<string, string> = pkg
    ? { ...(pkg.dependencies as Record<string, string> ?? {}), ...(pkg.devDependencies as Record<string, string> ?? {}) }
    : {};

  // Tailwind
  const tailwindConfigs = ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs', 'tailwind.config.cjs'];
  if (tailwindConfigs.some((f) => existsSync(path.join(root, f))) || 'tailwindcss' in allDeps) {
    strategies.push('tailwind');
  }

  // CSS Modules — check for *.module.css in src/
  const srcDir = path.join(root, 'src');
  if (existsSync(srcDir)) {
    try {
      const hasCssModules = findFiles(srcDir, /\.module\.(css|scss|sass)$/, 1);
      if (hasCssModules.length > 0) strategies.push('css-modules');
    } catch { /* ignore */ }
  }

  // styled-components / emotion
  if ('styled-components' in allDeps) strategies.push('styled-components');
  if ('@emotion/react' in allDeps || '@emotion/styled' in allDeps) strategies.push('emotion');

  // Sass
  if ('sass' in allDeps || 'node-sass' in allDeps) strategies.push('sass');

  // Vanilla CSS fallback — check for .css files in src/
  if (strategies.length === 0) strategies.push('vanilla-css');

  return strategies;
}

/** Shallow recursive file search (max 3 levels deep) that stops after `limit` matches. */
function findFiles(dir: string, pattern: RegExp, limit: number, depth = 0): string[] {
  if (depth > 3 || limit <= 0) return [];
  const results: string[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (results.length >= limit) break;
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile() && pattern.test(entry.name)) {
        results.push(fullPath);
      } else if (entry.isDirectory()) {
        results.push(...findFiles(fullPath, pattern, limit - results.length, depth + 1));
      }
    }
  } catch { /* ignore permission errors */ }
  return results;
}

/** Find key CSS files in the project (up to 10). */
function findCssFiles(root: string): string[] {
  const cssFiles: string[] = [];

  // Check for tailwind config
  const tailwindConfigs = ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs', 'tailwind.config.cjs'];
  for (const f of tailwindConfigs) {
    if (existsSync(path.join(root, f))) {
      cssFiles.push(f);
      break;
    }
  }

  // Search src/ for CSS files
  const srcDir = path.join(root, 'src');
  if (existsSync(srcDir)) {
    const found = findFiles(srcDir, /\.(css|scss|sass)$/, 10);
    for (const f of found) {
      cssFiles.push(path.relative(root, f));
    }
  }

  // Also check root-level globals
  for (const name of ['globals.css', 'global.css', 'styles.css', 'index.css']) {
    if (existsSync(path.join(root, name)) && !cssFiles.includes(name)) {
      cssFiles.push(name);
    }
  }

  return cssFiles.slice(0, 10);
}

/** List top-level directories under src/. */
function listSrcDirs(root: string): string[] {
  const srcDir = path.join(root, 'src');
  if (!existsSync(srcDir)) return [];
  try {
    return readdirSync(srcDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

/* ── Universal File Scanner ─────────────────────────────────────────── */

/** Map directory names to component categories. */
const DIR_CATEGORIES: Record<string, ComponentEntry['category']> = {
  screens: 'screen',
  pages: 'page',
  views: 'view',
  routes: 'page',
  components: 'component',
  widgets: 'widget',
  ui: 'component',
  atoms: 'component',
  molecules: 'component',
  organisms: 'component',
  common: 'component',
  shared: 'component',
  layouts: 'layout',
  templates: 'layout',
};

const SKIP_DIRS = new Set([
  'node_modules', '__tests__', 'test', 'tests', 'build', 'dist',
  '.dart_tool', 'android', 'ios', 'web', 'macos', 'windows', 'linux',
  '.next', '.nuxt', '.svelte-kit', '.astro', 'coverage', '.git',
]);

const SKIP_FILE_PATTERNS = /\.(test|spec|stories|d)\.[^.]+$/;

/** Determine source roots for a given framework. */
function getSourceRoots(projectRoot: string, framework: string | null): string[] {
  const roots: string[] = [];
  const candidates = framework === 'flutter'
    ? ['lib']
    : ['src', 'app', 'components', 'pages', 'views', 'screens', 'lib'];

  for (const dir of candidates) {
    const full = path.join(projectRoot, dir);
    if (existsSync(full)) roots.push(full);
  }
  return roots;
}

/** Get file extension regex for framework source files. */
function getSourceExtensions(framework: string | null): RegExp {
  switch (framework) {
    case 'flutter': return /\.dart$/;
    case 'svelte': return /\.(svelte|ts|js)$/;
    case 'astro': return /\.(astro|tsx|ts|jsx|js)$/;
    case 'vue':
    case 'nuxt': return /\.(vue|ts|js)$/;
    default: return /\.(tsx|ts|jsx|js)$/;
  }
}

/** Convert a filename to PascalCase component name. */
function fileNameToPascalCase(name: string): string {
  // Strip extension
  const base = name.replace(/\.[^.]+$/, '');
  return base
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

/** Find the category for a file path by checking ancestor directory names. */
function getCategoryFromPath(relPath: string): ComponentEntry['category'] {
  const segments = relPath.split(path.sep);
  // Walk from the file upward toward root, first match wins
  for (let i = segments.length - 2; i >= 0; i--) {
    const cat = DIR_CATEGORIES[segments[i].toLowerCase()];
    if (cat) return cat;
  }
  return 'component';
}

/** Recursively walk a source directory collecting ComponentEntry items. */
function walkSourceDir(
  dir: string,
  sourceRoot: string,
  projectRoot: string,
  extensions: RegExp,
  components: ComponentEntry[],
  seenPaths: Set<string>,
  depth: number,
): void {
  if (depth > 6) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walkSourceDir(fullPath, sourceRoot, projectRoot, extensions, components, seenPaths, depth + 1);
    } else if (entry.isFile() && extensions.test(entry.name)) {
      if (SKIP_FILE_PATTERNS.test(entry.name)) continue;
      const relPath = path.relative(projectRoot, fullPath);
      if (seenPaths.has(relPath)) continue;
      seenPaths.add(relPath);

      // For index files, use parent dir name
      const baseName = entry.name.replace(/\.[^.]+$/, '');
      const isIndex = baseName === 'index' || baseName === 'main';
      const nameSource = isIndex ? path.basename(dir) : entry.name;
      const name = fileNameToPascalCase(nameSource);
      if (!name) continue;

      const category = getCategoryFromPath(relPath);
      components.push({
        name,
        filePath: relPath,
        nameLower: name.toLowerCase(),
        category,
      });
    }
  }
}

/** Scan all source files in the project and categorize them. */
function scanAllSourceFiles(
  projectRoot: string,
  framework: string | null,
): ComponentEntry[] {
  const sourceRoots = getSourceRoots(projectRoot, framework);
  const extensions = getSourceExtensions(framework);
  const components: ComponentEntry[] = [];
  const seenPaths = new Set<string>();

  for (const root of sourceRoots) {
    walkSourceDir(root, root, projectRoot, extensions, components, seenPaths, 0);
  }
  return components;
}

/**
 * Detect the routing convention used in an app/ directory.
 * Returns 'nextjs' (page.tsx), 'index' (index.tsx — Expo, SvelteKit, etc.), or null.
 */
function detectRoutingConvention(appDir: string): 'nextjs' | 'index' | null {
  try {
    const entries = readdirSync(appDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (/^page\.(tsx|ts|jsx|js)$/.test(entry.name)) return 'nextjs';
      if (/^index\.(tsx|ts|jsx|js|svelte|astro|vue)$/.test(entry.name)) return 'index';
    }
    // Check one level deeper (e.g. app/(group)/page.tsx)
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const subEntries = readdirSync(path.join(appDir, entry.name), { withFileTypes: true });
        for (const sub of subEntries) {
          if (!sub.isFile()) continue;
          if (/^page\.(tsx|ts|jsx|js)$/.test(sub.name)) return 'nextjs';
          if (/^index\.(tsx|ts|jsx|js|svelte|astro|vue)$/.test(sub.name)) return 'index';
        }
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  return null;
}

/** Source file extensions for route scanning (broader than framework-specific). */
const ROUTE_SOURCE_EXT = /\.(tsx|ts|jsx|js|svelte|astro|vue|dart)$/;

/**
 * Universal file-based route scanner.
 * Auto-detects routing convention by inspecting the app/ directory.
 * Works for Next.js, Expo Router, SvelteKit, Astro, Nuxt, and any
 * framework using file-based routing in an app/ or src/app/ directory.
 */
function scanAppRoutes(projectRoot: string): RouteEntry[] {
  const routes: RouteEntry[] = [];
  const maybeAppDir = existsSync(path.join(projectRoot, 'src', 'app'))
    ? path.join(projectRoot, 'src', 'app')
    : existsSync(path.join(projectRoot, 'app'))
      ? path.join(projectRoot, 'app')
      : null;

  if (!maybeAppDir) return routes;
  const appDir: string = maybeAppDir;

  const convention = detectRoutingConvention(appDir);
  if (!convention) return routes;

  // Build regex based on detected convention
  const routeFilePattern = convention === 'nextjs'
    ? /^(page|layout|loading|error|not-found|template)\.(tsx|ts|jsx|js|svelte|astro|vue)$/
    : /^(index|_layout)\.(tsx|ts|jsx|js|svelte|astro|vue)$/;

  function walkAppDir(dir: string, depth: number): void {
    if (depth > 8) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      if (entry.name.startsWith('_') && entry.isDirectory()) continue;
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === 'api' || entry.name.startsWith('@')) continue;
        walkAppDir(fullPath, depth + 1);
      } else if (entry.isFile()) {
        const match = entry.name.match(routeFilePattern);
        if (!match) continue;

        const rawType = match[1];
        const type: RouteEntry['type'] = rawType === 'index' ? 'page'
          : rawType === '_layout' ? 'layout'
          : rawType as RouteEntry['type'];

        const relDir = path.relative(appDir, dir);
        const urlSegments = relDir
          .split(path.sep)
          .filter(Boolean)
          .filter((seg) => !seg.startsWith('('));

        const urlPattern = '/' + urlSegments.join('/');
        const filePath = path.relative(projectRoot, fullPath);

        routes.push({ urlPattern: urlPattern === '/' ? '/' : urlPattern.replace(/\/$/, ''), filePath, type });
      }
    }
  }

  walkAppDir(appDir, 0);

  // For index-based conventions, also treat top-level source files as routes
  // e.g. app/about.tsx → /about, app/settings.tsx → /settings
  if (convention === 'index') {
    try {
      const topEntries = readdirSync(appDir, { withFileTypes: true });
      for (const entry of topEntries) {
        if (!entry.isFile()) continue;
        if (entry.name.startsWith('_') || entry.name.startsWith('.') || entry.name.startsWith('+')) continue;
        if (!ROUTE_SOURCE_EXT.test(entry.name)) continue;
        const baseName = entry.name.replace(ROUTE_SOURCE_EXT, '');
        if (baseName === 'index' || baseName === '_layout') continue;
        const fullPath = path.join(appDir, entry.name);
        const filePath = path.relative(projectRoot, fullPath);
        routes.push({ urlPattern: `/${baseName}`, filePath, type: 'page' });
      }
    } catch { /* ignore */ }
  }

  return routes;
}

/**
 * For non-web frameworks (Flutter, etc.), scan screen/page directories
 * and synthesize route-like entries from the file structure.
 * e.g. lib/screens/home_screen.dart → RouteEntry { urlPattern: '/', type: 'page' }
 */
function synthesizeRoutesFromComponents(components: ComponentEntry[]): RouteEntry[] {
  const routes: RouteEntry[] = [];
  const seenUrls = new Set<string>();

  for (const comp of components) {
    if (comp.category !== 'screen' && comp.category !== 'page' && comp.category !== 'view') continue;

    // Derive a URL from the component name
    // HomeScreen → /, IndexScreen → /, SettingsScreen → /settings
    let nameLower = comp.nameLower;
    // Strip common suffixes
    for (const suffix of ['screen', 'page', 'view', 'widget']) {
      if (nameLower.endsWith(suffix) && nameLower.length > suffix.length) {
        nameLower = nameLower.slice(0, -suffix.length);
      }
    }

    const urlPattern = (nameLower === 'home' || nameLower === 'index' || nameLower === 'main' || nameLower === 'app')
      ? '/'
      : `/${nameLower}`;

    if (seenUrls.has(urlPattern)) continue;
    seenUrls.add(urlPattern);

    routes.push({ urlPattern, filePath: comp.filePath, type: 'page' });
  }

  return routes;
}

/** Scan routes universally — tries file-based routing first, then synthesizes from components. */
function scanRoutes(projectRoot: string, components: ComponentEntry[]): RouteEntry[] {
  const fileRoutes = scanAppRoutes(projectRoot);
  if (fileRoutes.length > 0) return fileRoutes;
  // No file-based routes found — synthesize from screen/page components
  return synthesizeRoutesFromComponents(components);
}

/** Build the complete FileMap for a project. */
function buildFileMap(projectRoot: string, framework: string | null): FileMap {
  const components = scanAllSourceFiles(projectRoot, framework);
  return {
    routes: scanRoutes(projectRoot, components),
    components,
  };
}

/**
 * POST /api/project/scan
 * Scans a project folder and returns framework, CSS strategy, key files, and structure.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: { projectRoot: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { projectRoot } = body;
  if (!projectRoot || typeof projectRoot !== 'string') {
    return NextResponse.json({ error: 'projectRoot is required' }, { status: 400 });
  }

  const validationError = validateProjectRoot(projectRoot);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const resolved = path.resolve(projectRoot);
  const pkg = readPackageJson(resolved);
  const framework = detectFramework(resolved, pkg);

  const result: ProjectScanResult = {
    framework,
    cssStrategy: detectCssStrategy(resolved, pkg),
    cssFiles: findCssFiles(resolved),
    srcDirs: listSrcDirs(resolved),
    packageName: (pkg?.name as string) ?? null,
    fileMap: buildFileMap(resolved, framework),
  };

  return NextResponse.json(result);
}

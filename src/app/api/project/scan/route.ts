import { NextResponse } from 'next/server';
import { existsSync, statSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import type { ProjectScanResult } from '@/types/claude';

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

/** Detect the primary framework from package.json dependencies. */
function detectFramework(pkg: Record<string, unknown> | null): string | null {
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

  const result: ProjectScanResult = {
    framework: detectFramework(pkg),
    cssStrategy: detectCssStrategy(resolved, pkg),
    cssFiles: findCssFiles(resolved),
    srcDirs: listSrcDirs(resolved),
    packageName: (pkg?.name as string) ?? null,
  };

  return NextResponse.json(result);
}

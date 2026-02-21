import { NextResponse } from 'next/server';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { validateProjectRoot } from '@/lib/validatePath';
import { extractDesignTokensFromSource, TOKEN_FILE_NAMES } from '@/lib/cssVariableUtils';

const SKIP_DIRS = new Set([
  'node_modules', '.next', 'dist', 'build', '.git',
  '__tests__', '__mocks__', '.turbo', '.vercel', 'coverage',
  '.cache', '.output',
]);

const CSS_EXTENSIONS = new Set(['.css', '.scss', '.less']);
const MAX_FILES = 2000;
const MAX_FILE_SIZE = 512 * 1024; // 512KB per file

/**
 * Regex to match CSS custom property definitions:
 *   --variable-name: value;
 * Captures: group 1 = variable name, group 2 = value (before ;)
 */
const CSS_VAR_RE = /^\s*(--[\w-]+)\s*:\s*([^;]+);/gm;

interface ScannedVariable {
  value: string;
  resolvedValue: string;
  selector: string;
  source: string; // relative file path
}

function walkForCSS(
  dir: string,
  projectRoot: string,
  results: Map<string, ScannedVariable>,
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
    if (entry.name.startsWith('.')) continue;
    if (SKIP_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkForCSS(fullPath, projectRoot, results, counter);
      continue;
    }

    if (!entry.isFile()) continue;
    counter.count++;

    const ext = path.extname(entry.name);
    if (!CSS_EXTENSIONS.has(ext)) continue;

    let content: string;
    try {
      const stat = statSync(fullPath);
      if (stat.size > MAX_FILE_SIZE) continue;
      content = readFileSync(fullPath, 'utf-8');
    } catch {
      continue;
    }

    const relativePath = path.relative(projectRoot, fullPath);
    let match: RegExpExecArray | null;
    CSS_VAR_RE.lastIndex = 0;

    while ((match = CSS_VAR_RE.exec(content)) !== null) {
      const name = match[1].trim();
      const rawValue = match[2].trim();

      // Skip framework internal variables
      if (
        name.startsWith('--tw-') ||
        name.startsWith('--next-') ||
        name.startsWith('--radix-') ||
        name.startsWith('--chakra-') ||
        name.startsWith('--mantine-') ||
        name.startsWith('--mui-') ||
        name.startsWith('--framer-') ||
        name.startsWith('--sb-') ||
        name.startsWith('--css-interop-')
      ) {
        continue;
      }

      // Only add first occurrence (keeps the most "root" definition)
      if (!results.has(name)) {
        results.set(name, {
          value: rawValue,
          resolvedValue: rawValue, // static scan — no computed resolution
          selector: ':root',
          source: relativePath,
        });
      }
    }
  }
}

/**
 * Walk the project tree looking for JS/TS/Dart design-token files
 * (e.g. colors.ts, theme.dart, palette.js) and extract exported constants.
 */
function walkForTokenFiles(
  dir: string,
  projectRoot: string,
  results: Record<string, { value: string; resolvedValue: string; selector: string }>,
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
    if (entry.name.startsWith('.')) continue;
    if (SKIP_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkForTokenFiles(fullPath, projectRoot, results, counter);
      continue;
    }

    if (!entry.isFile()) continue;
    counter.count++;

    if (!TOKEN_FILE_NAMES.has(entry.name)) continue;

    let content: string;
    try {
      const stat = statSync(fullPath);
      if (stat.size > MAX_FILE_SIZE) continue;
      content = readFileSync(fullPath, 'utf-8');
    } catch {
      continue;
    }

    const relativePath = path.relative(projectRoot, fullPath);
    const tokens = extractDesignTokensFromSource(content, relativePath);

    for (const [name, def] of Object.entries(tokens)) {
      if (!results[name]) {
        results[name] = def;
      }
    }
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

  try {
    const cssResults = new Map<string, ScannedVariable>();
    const counter = { count: 0 };

    walkForCSS(resolved, resolved, cssResults, counter);

    // Convert CSS results to the format expected by the store
    const definitions: Record<string, { value: string; resolvedValue: string; selector: string }> = {};
    for (const [name, def] of cssResults) {
      definitions[name] = {
        value: def.value,
        resolvedValue: def.resolvedValue,
        selector: def.selector,
      };
    }

    // Also scan for JS/TS/Dart token files (React Native, Flutter, etc.)
    const tokenCounter = { count: 0 };
    walkForTokenFiles(resolved, resolved, definitions, tokenCounter);

    return NextResponse.json({
      definitions,
      count: Object.keys(definitions).length,
      filesScanned: counter.count + tokenCounter.count,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Scan failed', details: message }, { status: 500 });
  }
}

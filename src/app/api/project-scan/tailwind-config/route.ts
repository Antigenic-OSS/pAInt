import { NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { validateProjectRoot } from '@/lib/validatePath';
import type { CSSVariableDefinition } from '@/types/cssVariables';

const MAX_FILE_SIZE = 256 * 1024; // 256KB

/** Config file names to search for, in priority order */
const CONFIG_FILES = [
  'tailwind.config.ts',
  'tailwind.config.js',
  'tailwind.config.mjs',
  'tailwind.config.cjs',
];

/**
 * Extract color definitions from a Tailwind v3 config file.
 *
 * Parses patterns like:
 *   theme: { extend: { colors: { primary: '#4a9eff', secondary: { 50: '#fff', 500: '#333' } } } }
 *   theme: { colors: { ... } }
 *
 * Uses regex-based extraction (no JS eval for security).
 */
function extractTailwindColors(source: string, filePath: string): Record<string, CSSVariableDefinition> {
  const results: Record<string, CSSVariableDefinition> = {};

  // Strip comments
  const cleaned = source
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  // Find colors blocks in theme.extend.colors or theme.colors
  // Match: colors: { ... } or colors: { ... },
  const colorsBlockRe = /colors\s*:\s*\{([^]*?)\}(?:\s*,|\s*\})/g;
  let blockMatch: RegExpExecArray | null;
  colorsBlockRe.lastIndex = 0;

  while ((blockMatch = colorsBlockRe.exec(cleaned)) !== null) {
    const body = blockMatch[1];
    parseColorBlock(body, '', results, filePath);
  }

  return results;
}

/**
 * Recursively parse a color block, handling nested objects.
 */
function parseColorBlock(
  body: string,
  prefix: string,
  results: Record<string, CSSVariableDefinition>,
  filePath: string
): void {
  // Match nested objects: key: { ... }
  const nestedRe = /(\w[\w-]*)\s*:\s*\{([^}]*)\}/g;
  const nestedKeys = new Set<string>();
  let nestedMatch: RegExpExecArray | null;
  nestedRe.lastIndex = 0;

  while ((nestedMatch = nestedRe.exec(body)) !== null) {
    const key = nestedMatch[1];
    nestedKeys.add(key);
    const nestedBody = nestedMatch[2];
    const nestedPrefix = prefix ? `${prefix}-${kebab(key)}` : kebab(key);
    parseColorBlock(nestedBody, nestedPrefix, results, filePath);
  }

  // Match flat entries: key: 'value' or key: "value" or key: value
  const entryRe = /(\w[\w-]*)\s*:\s*(?:'([^']*)'|"([^"]*)")/g;
  let entryMatch: RegExpExecArray | null;
  entryRe.lastIndex = 0;

  while ((entryMatch = entryRe.exec(body)) !== null) {
    const key = entryMatch[1];
    if (nestedKeys.has(key)) continue;

    const value = entryMatch[2] ?? entryMatch[3] ?? '';
    if (!value) continue;

    // Skip non-color values (functions, references)
    if (value.includes('(') && !value.startsWith('rgb') && !value.startsWith('hsl') && !value.startsWith('oklch')) continue;

    const varName = prefix ? `--${prefix}-${kebab(key)}` : `--${kebab(key)}`;
    results[varName] = {
      value,
      resolvedValue: value,
      selector: `tailwind:${filePath}`,
    };
  }
}

/** Convert camelCase to kebab-case */
function kebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
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

  // Find the Tailwind config file
  let configPath: string | null = null;
  for (const name of CONFIG_FILES) {
    const candidate = path.join(resolved, name);
    if (existsSync(candidate)) {
      configPath = candidate;
      break;
    }
  }

  if (!configPath) {
    return NextResponse.json({ definitions: {}, count: 0, found: false });
  }

  try {
    const stat = readFileSync(configPath);
    if (stat.length > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Config file too large' }, { status: 400 });
    }

    const content = stat.toString('utf-8');
    const relativePath = path.relative(resolved, configPath);
    const definitions = extractTailwindColors(content, relativePath);

    return NextResponse.json({
      definitions,
      count: Object.keys(definitions).length,
      found: true,
      configFile: relativePath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Parse failed', details: message }, { status: 500 });
  }
}

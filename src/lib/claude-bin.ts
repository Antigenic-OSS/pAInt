import { execFileSync } from 'child_process';

let cached: string | null = null;

/**
 * Resolve the absolute path to the `claude` CLI binary.
 * Next.js server processes may not inherit the user's full shell PATH,
 * so we probe common install locations as a fallback.
 */
export function getClaudeBin(): string {
  if (cached) return cached;

  // Try `which` first (works if PATH includes the install dir)
  try {
    cached = execFileSync('which', ['claude'], { encoding: 'utf-8' }).trim();
    return cached;
  } catch { /* fall through */ }

  // Probe common locations
  const home = process.env.HOME || '';
  const candidates = [
    `${home}/.local/bin/claude`,
    '/usr/local/bin/claude',
    `${home}/.npm-global/bin/claude`,
    `${home}/.bun/bin/claude`,
  ];

  for (const p of candidates) {
    try {
      execFileSync(p, ['--version'], { encoding: 'utf-8', timeout: 5000 });
      cached = p;
      return cached;
    } catch { /* next */ }
  }

  // Last resort — let the caller handle the error
  return 'claude';
}

import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

let cached: string | null = null;

/**
 * Resolve the absolute path to the `claude` CLI binary.
 * Next.js server processes may not inherit the user's full shell PATH,
 * so we check common install locations directly on the filesystem.
 */
export function getClaudeBin(): string {
  if (cached) return cached;

  const home = process.env.HOME || '';
  const candidates = [
    `${home}/.local/bin/claude`,
    `${home}/.claude/local/claude`,
    '/usr/local/bin/claude',
    `${home}/.npm-global/bin/claude`,
    `${home}/.bun/bin/claude`,
    `${home}/.nvm/versions/node/current/bin/claude`,
  ];

  for (const p of candidates) {
    if (existsSync(p)) {
      cached = p;
      return cached;
    }
  }

  // Fall back to bare name — will only work if PATH happens to include it
  return 'claude';
}

export interface SpawnResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Spawn the claude CLI with given args using Node's child_process.
 * Works in both Bun and Node runtimes (Next.js Turbopack uses Node).
 */
export function spawnClaude(
  args: string[],
  options: { cwd?: string; timeout?: number } = {},
): Promise<SpawnResult> {
  const claudeBin = getClaudeBin();
  const { cwd, timeout = 120_000 } = options;

  return new Promise((resolve, reject) => {
    const proc = spawn(claudeBin, args, {
      cwd,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    proc.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
    proc.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('TIMEOUT'));
    }, timeout);

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: code ?? 1,
        stdout: Buffer.concat(stdoutChunks).toString('utf-8'),
        stderr: Buffer.concat(stderrChunks).toString('utf-8'),
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

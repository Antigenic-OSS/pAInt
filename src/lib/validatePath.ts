import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';

/**
 * Validate that projectRoot is an absolute path, exists as a directory,
 * and resides under the user's HOME directory.
 *
 * Returns an error message string if invalid, or null if valid.
 */
export function validateProjectRoot(projectRoot: string): string | null {
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

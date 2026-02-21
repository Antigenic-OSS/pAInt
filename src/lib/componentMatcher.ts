/**
 * Match a selected DOM element to a component file from the scanned file map.
 *
 * Pure function — only returns paths that exist in the provided file map.
 * Never fabricates paths.
 */

interface ElementSignals {
  attributes: Record<string, string>;
  id: string | null;
  className: string | null;
  selectorPath: string;
  tagName: string;
}

function kebabToPascal(str: string): string {
  return str
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function lookup(name: string, map: Record<string, string>): string | null {
  if (map[name]) return map[name];
  // Try without common suffixes
  for (const suffix of ['Component', 'View', 'Page', 'Section', 'Widget']) {
    if (map[name + suffix]) return map[name + suffix];
  }
  return null;
}

/**
 * Extract potential component names from a CSS class string.
 * Looks for PascalCase class names or kebab-case names that convert to PascalCase.
 */
function extractClassCandidates(className: string): string[] {
  const candidates: string[] = [];
  const classes = className.split(/\s+/).filter(Boolean);

  for (const cls of classes) {
    // Skip Tailwind utility classes (contain brackets, colons, slashes, or start with lowercase single segment)
    if (cls.includes('[') || cls.includes(':') || cls.includes('/')) continue;
    if (cls.startsWith('-')) continue;

    // Already PascalCase
    if (/^[A-Z][a-zA-Z0-9]+$/.test(cls)) {
      candidates.push(cls);
      continue;
    }

    // Kebab-case that looks like a component name (at least 2 segments, no numbers-only segments)
    if (cls.includes('-') && !cls.startsWith('_')) {
      const parts = cls.split('-');
      if (parts.length >= 2 && parts.every((p) => p.length > 0 && !/^\d+$/.test(p))) {
        const pascal = kebabToPascal(cls);
        if (/^[A-Z][a-zA-Z0-9]+$/.test(pascal)) {
          candidates.push(pascal);
        }
      }
    }
  }

  return candidates;
}

/**
 * Extract ancestor tag/class hints from the selectorPath.
 * selectorPath format: "body > div.container > main > section.hero > h1"
 */
function extractAncestorCandidates(selectorPath: string): string[] {
  const candidates: string[] = [];
  const segments = selectorPath.split('>').map((s) => s.trim());

  // Walk from innermost to outermost (skip the element itself)
  for (let i = segments.length - 2; i >= 0; i--) {
    const seg = segments[i];

    // Extract class names from segment like "div.ClassName" or "section.hero-section"
    const classMatch = seg.match(/\.([a-zA-Z][\w-]*)/g);
    if (classMatch) {
      for (const cls of classMatch) {
        const name = cls.slice(1); // remove leading dot
        if (/^[A-Z][a-zA-Z0-9]+$/.test(name)) {
          candidates.push(name);
        } else if (name.includes('-')) {
          const pascal = kebabToPascal(name);
          if (/^[A-Z][a-zA-Z0-9]+$/.test(pascal)) {
            candidates.push(pascal);
          }
        }
      }
    }

    // Extract from data attributes in the segment (rare in selectorPath, but possible)
    const dataMatch = seg.match(/\[data-component="([^"]+)"\]/);
    if (dataMatch) {
      candidates.push(dataMatch[1]);
    }
  }

  return candidates;
}

export function matchElementToComponent(
  signals: ElementSignals,
  fileMap: Record<string, string>,
): string | null {
  // Strategy 1: data-component attribute → exact lookup
  const dataComponent = signals.attributes['data-component'];
  if (dataComponent) {
    const result = lookup(dataComponent, fileMap);
    if (result) return result;
  }

  // Strategy 2: data-testid → convert kebab-to-PascalCase → lookup
  const testId = signals.attributes['data-testid'];
  if (testId) {
    const pascal = kebabToPascal(testId);
    const result = lookup(pascal, fileMap);
    if (result) return result;
  }

  // Strategy 3: Element id → convert to PascalCase → lookup
  if (signals.id) {
    const pascal = kebabToPascal(signals.id);
    const result = lookup(pascal, fileMap);
    if (result) return result;

    // Try the id as-is if it's already PascalCase
    if (/^[A-Z]/.test(signals.id)) {
      const result2 = lookup(signals.id, fileMap);
      if (result2) return result2;
    }
  }

  // Strategy 4: Walk up selectorPath ancestors
  const ancestorCandidates = extractAncestorCandidates(signals.selectorPath);
  for (const candidate of ancestorCandidates) {
    const result = lookup(candidate, fileMap);
    if (result) return result;
  }

  // Strategy 5: Class names that look PascalCase or convert from kebab-case
  if (signals.className) {
    const classCandidates = extractClassCandidates(signals.className);
    for (const candidate of classCandidates) {
      const result = lookup(candidate, fileMap);
      if (result) return result;
    }
  }

  return null;
}

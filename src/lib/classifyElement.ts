/**
 * Determine the source file path and component path for a selected DOM element.
 *
 * sourcePath — always the route-based page/layout file (deterministic, never wrong):
 *   body/html → src/app/{route}/layout.tsx
 *   everything else → src/app/{route}/page.tsx
 *
 * componentPath — the actual React component file (from fiber _debugSource or
 *   data-source-file attribute). May be null when unavailable.
 *
 * NEVER fabricate paths from CSS class names or heuristics.
 */

const LAYOUT_TAGS = new Set(['html', 'body']);

function pageDir(pagePath: string): string {
  if (!pagePath || pagePath === '/') return 'src/app';
  const segments = pagePath.replace(/^\/|\/$/g, '').split('/');
  return `src/app/${segments.join('/')}`;
}

export function getSourcePath(opts: {
  tagName: string;
  pagePath: string;
}): string {
  const tag = opts.tagName.toLowerCase();
  const dir = pageDir(opts.pagePath);

  if (LAYOUT_TAGS.has(tag)) {
    return `${dir}/layout.tsx`;
  }
  return `${dir}/page.tsx`;
}

export function getComponentPath(componentPath: string | null | undefined): string | null {
  return componentPath || null;
}

import { NextRequest, NextResponse } from 'next/server';

const PROXY_HEADER = 'x-dev-editor-target';

/**
 * Middleware that catches requests for target app resources (/_next/*, /assets/*, etc.)
 * that come from the proxied iframe. These requests bypass our HTML attribute rewriting
 * because they're created dynamically by JavaScript (webpack chunk loading, etc.).
 *
 * Detection: If the cookie `x-dev-editor-target` is set (by the proxy when serving HTML),
 * the request is from the proxied iframe and should be forwarded to the target server.
 *
 * We rewrite these to go through the proxy route: /api/proxy/[path]?x-dev-editor-target=[target]
 */
export function middleware(request: NextRequest) {
  const targetUrl = request.cookies.get(PROXY_HEADER)?.value;
  if (!targetUrl) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Only intercept paths that look like target app resources, not our own editor routes
  const shouldProxy =
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/fonts/') ||
    pathname.startsWith('/static/');

  if (!shouldProxy) return NextResponse.next();

  // Check if this is actually OUR editor's own /_next/ resource by looking at the Referer.
  // If the referer is our editor page (not the proxy), skip rewriting.
  const referer = request.headers.get('referer') || '';
  const isFromProxy = referer.includes('/api/proxy');

  // For /_next/ paths, we need to distinguish between editor's chunks and target's chunks.
  // If the referer comes from a proxy page, it's a target resource.
  // If there's no referer or it's from the editor, let it through normally.
  if (pathname.startsWith('/_next/') && !isFromProxy) {
    return NextResponse.next();
  }

  // Rewrite to proxy route
  const proxyUrl = new URL(`/api/proxy${pathname}`, request.url);
  proxyUrl.searchParams.set(PROXY_HEADER, targetUrl);

  // Preserve original query params
  request.nextUrl.searchParams.forEach((value, key) => {
    if (key !== PROXY_HEADER) {
      proxyUrl.searchParams.set(key, value);
    }
  });

  return NextResponse.rewrite(proxyUrl);
}

export const config = {
  matcher: [
    '/_next/static/:path*',
    '/assets/:path*',
    '/images/:path*',
    '/fonts/:path*',
    '/static/:path*',
  ],
};

import { NextRequest, NextResponse } from 'next/server';

const PROXY_HEADER = 'x-dev-editor-target';

/**
 * Middleware that intercepts /_next/static/* and /_next/image requests
 * originating from the proxied iframe and rewrites them to go through
 * the proxy API route.
 *
 * IMPORTANT: We intentionally do NOT match page-level paths (e.g. /works,
 * /about). Those are handled by the proxy's HTML URL rewriting which
 * rewrites <a href="/works"> to <a href="/api/proxy/works?...">. Matching
 * page paths here caused Next.js to track them in its HMR route tree,
 * generating "unrecognized HMR message" errors and infinite reload loops.
 */
export function middleware(request: NextRequest) {
  const targetUrl = request.cookies.get(PROXY_HEADER)?.value;
  if (!targetUrl) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Never intercept our own editor API routes
  if (pathname.startsWith('/api/')) return NextResponse.next();

  // Check if this request originates from the proxied iframe
  const referer = request.headers.get('referer') || '';
  const isFromProxy = referer.includes('/api/proxy');
  const fetchDest = request.headers.get('sec-fetch-dest') || '';

  if (!isFromProxy && fetchDest !== 'iframe') {
    return NextResponse.next();
  }

  // Rewrite to proxy route (rewrite is transparent — doesn't change the
  // client-visible URL and doesn't confuse HMR since these are asset paths,
  // not page routes).
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
    // Only intercept /_next/ asset paths from the proxied iframe.
    // Do NOT match page-level paths — those are already rewritten in HTML.
    '/_next/static/:path*',
    '/_next/image',
  ],
};

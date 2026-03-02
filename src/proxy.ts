import { type NextRequest, NextResponse } from 'next/server'

const PROXY_HEADER = 'x-dev-editor-target'

/**
 * Middleware that intercepts asset requests originating from the proxied
 * iframe and rewrites them to go through the proxy API route.
 *
 * Matches /_next/ paths (static assets, images) and common asset paths
 * (fonts, images, icons, media) that target apps may serve. This ensures
 * icon font files, images, and other resources load correctly through
 * the proxy even when CSS url() references aren't rewritten.
 *
 * IMPORTANT: We do NOT match page-level paths (e.g. /works, /about).
 * Those are handled by the proxy's HTML URL rewriting. Matching page
 * paths pollutes Next.js HMR route tree and causes reload loops.
 * The referer/fetch-dest check below ensures only iframe-originated
 * requests are proxied.
 */

// Asset file extensions that should be proxied from the iframe
const ASSET_EXT_RE =
  /\.(woff2?|ttf|eot|otf|svg|png|jpe?g|gif|webp|avif|ico|mp4|webm|css|js|json|map)(\?|$)/i

export function proxy(request: NextRequest) {
  const targetUrl = request.cookies.get(PROXY_HEADER)?.value
  if (!targetUrl) return NextResponse.next()

  const { pathname } = request.nextUrl

  // Never intercept our own editor API routes
  if (pathname.startsWith('/api/')) return NextResponse.next()

  // Check if this request originates from the proxied iframe.
  // After the navigation blocker calls history.replaceState, the referer
  // no longer contains /api/proxy. For dynamically loaded chunks, the
  // navigation blocker adds ?_devproxy=1 to /_next/ URLs as a proxy marker.
  // NOTE: Do NOT use "_dp" — Next.js uses ?_dp=1 internally for CSS preloading.
  const referer = request.headers.get('referer') || ''
  const isFromProxy = referer.includes('/api/proxy')
  const fetchDest = request.headers.get('sec-fetch-dest') || ''
  const hasDynamicProxyMarker = request.nextUrl.searchParams.has('_devproxy')

  if (!isFromProxy && fetchDest !== 'iframe' && !hasDynamicProxyMarker) {
    return NextResponse.next()
  }

  // Only proxy requests that look like assets (have a file extension).
  // This prevents page-level paths from being proxied.
  if (!pathname.startsWith('/_next/') && !ASSET_EXT_RE.test(pathname)) {
    return NextResponse.next()
  }

  // Rewrite to proxy route (rewrite is transparent — doesn't change the
  // client-visible URL and doesn't confuse HMR since these are asset paths,
  // not page routes).
  const proxyUrl = new URL(`/api/proxy${pathname}`, request.url)
  proxyUrl.searchParams.set(PROXY_HEADER, targetUrl)

  // Preserve original query params (strip internal markers)
  request.nextUrl.searchParams.forEach((value, key) => {
    if (key !== PROXY_HEADER && key !== '_devproxy') {
      proxyUrl.searchParams.set(key, value)
    }
  })

  return NextResponse.rewrite(proxyUrl)
}

export const config = {
  matcher: [
    // /_next/ asset paths (static files, images, fonts)
    '/_next/static/:path*',
    '/_next/image',
    // Common asset directories that target apps may serve
    // (fonts, icons, images, media, static files)
    '/fonts/:path*',
    '/webfonts/:path*',
    '/assets/:path*',
    '/images/:path*',
    '/icons/:path*',
    '/media/:path*',
    '/static/:path*',
    '/public/:path*',
    '/avatars/:path*',
    '/uploads/:path*',
    '/files/:path*',
    '/content/:path*',
    '/img/:path*',
    '/pics/:path*',
  ],
}

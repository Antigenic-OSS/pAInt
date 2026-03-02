/**
 * Bridge proxy handler.
 *
 * Simplified version of /api/proxy/[[...path]]/route.ts.
 * Since the bridge IS the iframe origin, relative URLs naturally
 * route back through it — eliminates most URL rewriting.
 */

const PROXY_HEADER = 'x-dev-editor-target'

// In-memory target URL (set on first request with the query param)
let storedTargetUrl: string | null = null

const SECURITY_HEADERS_TO_STRIP = new Set([
  'content-security-policy',
  'content-security-policy-report-only',
  'x-frame-options',
  'cross-origin-embedder-policy',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
])

const HMR_PATTERNS = [
  '.hot-update.',
  'webpack-hmr',
  'turbopack-hmr',
  '__webpack_hmr',
  '_next/webpack-hmr',
]

const SCRIPT_STRIP_RE =
  /<script\b(?![^>]*type\s*=\s*["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script\s*>/gi
const SCRIPT_SELF_CLOSING_RE =
  /<script\b(?![^>]*type\s*=\s*["']application\/ld\+json["'])[^>]*\/\s*>/gi

function isLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

function getTargetUrl(req: Request, url: URL): string | null {
  // Check query param first
  const fromQuery = url.searchParams.get(PROXY_HEADER)
  if (fromQuery && isLocalhostUrl(fromQuery)) {
    storedTargetUrl = fromQuery
    return fromQuery
  }

  // Check header
  const fromHeader = req.headers.get(PROXY_HEADER)
  if (fromHeader && isLocalhostUrl(fromHeader)) {
    storedTargetUrl = fromHeader
    return fromHeader
  }

  // Fall back to stored target
  return storedTargetUrl
}

function isHtmlResponse(contentType: string | null): boolean {
  if (!contentType) return false
  return contentType.includes('text/html')
}

function isCssResponse(contentType: string | null): boolean {
  if (!contentType) return false
  return contentType.includes('text/css')
}

function buildNavigationBlocker(): string {
  return `<script>
(function() {
  // HMR mock — prevent target app's HMR from connecting
  var _origWS = window.WebSocket;
  window.WebSocket = function(url) {
    var ws = { readyState: 3, send: function(){}, close: function(){},
      addEventListener: function(){}, removeEventListener: function(){},
      onopen: null, onclose: null, onerror: null, onmessage: null,
      CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 };
    setTimeout(function() { if (ws.onerror) ws.onerror(new Event('error')); }, 50);
    return ws;
  };
  window.WebSocket.CONNECTING = 0;
  window.WebSocket.OPEN = 1;
  window.WebSocket.CLOSING = 2;
  window.WebSocket.CLOSED = 3;

  // Mock EventSource (Turbopack HMR)
  var _origES = window.EventSource;
  window.EventSource = function() {
    var es = { readyState: 2, close: function(){},
      addEventListener: function(){}, removeEventListener: function(){},
      onopen: null, onerror: null, onmessage: null,
      CONNECTING: 0, OPEN: 1, CLOSED: 2 };
    setTimeout(function() { if (es.onerror) es.onerror(new Event('error')); }, 50);
    return es;
  };
  window.EventSource.CONNECTING = 0;
  window.EventSource.OPEN = 1;
  window.EventSource.CLOSED = 2;

  // Suppress unhandled rejection errors from HMR
  window.addEventListener('unhandledrejection', function(e) {
    var msg = e.reason && (e.reason.message || String(e.reason));
    if (msg && (/hmr|hot.update|webpack|turbopack/i.test(msg))) {
      e.preventDefault();
    }
  });

  // Prevent navigation loops — block location changes
  var _reloadCount = 0;
  var _origReload = window.location.reload;
  window.location.reload = function() {
    _reloadCount++;
    if (_reloadCount > 2) return;
    _origReload.call(window.location);
  };
})();
</script>`
}

function injectIntoHtml(html: string, inspectorScript: string | null): string {
  // Strip all script tags (except ld+json)
  let result = html.replace(SCRIPT_STRIP_RE, '')
  result = result.replace(SCRIPT_SELF_CLOSING_RE, '')

  const navBlocker = buildNavigationBlocker()

  // Inspector injection
  const inspectorTag = inspectorScript
    ? `<script>${inspectorScript}</script>`
    : '<script src="/dev-editor-inspector.js"></script>'

  // Inject navigation blocker in <head>, inspector before </body>
  if (result.includes('</head>')) {
    result = result.replace('</head>', `${navBlocker}</head>`)
  } else {
    result = navBlocker + result
  }

  if (result.includes('</body>')) {
    result = result.replace('</body>', `${inspectorTag}</body>`)
  } else {
    result = result + inspectorTag
  }

  return result
}

function stripSecurityHeaders(headers: Headers): Headers {
  const cleaned = new Headers()
  headers.forEach((value, key) => {
    if (!SECURITY_HEADERS_TO_STRIP.has(key.toLowerCase())) {
      cleaned.append(key, value)
    }
  })
  return cleaned
}

function rewriteCssUrls(css: string, targetOrigin: string): string {
  // Rewrite absolute URLs pointing to the target to be relative (go through bridge)
  return css.replace(
    new RegExp(
      `url\\(\\s*['"]?${targetOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/[^'")\\s]*)['"]?\\s*\\)`,
      'g',
    ),
    'url($1)',
  )
}

export async function handleProxy(
  req: Request,
  url: URL,
  cors: Record<string, string>,
  inspectorScript: string | null,
): Promise<Response> {
  const targetUrl = getTargetUrl(req, url)

  if (!targetUrl) {
    return Response.json(
      {
        error:
          'No target URL. Add ?x-dev-editor-target=http://localhost:PORT to your first request.',
      },
      { status: 400, headers: cors },
    )
  }

  // Short-circuit HMR requests
  const pathname = url.pathname
  if (HMR_PATTERNS.some((p) => pathname.includes(p))) {
    if (pathname.endsWith('.json')) {
      return new Response('{}', {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    if (pathname.endsWith('.js')) {
      return new Response('', {
        headers: { ...cors, 'Content-Type': 'application/javascript' },
      })
    }
    return new Response(null, { status: 204, headers: cors })
  }

  // Build the target fetch URL
  const targetOrigin = new URL(targetUrl).origin
  const _fetchUrl = `${targetOrigin}${pathname}${url.search ? url.search.replace(new RegExp(`[?&]${PROXY_HEADER}=[^&]*`), '') : ''}`

  // Strip the proxy header from the search params
  const cleanSearch = url.search
    .replace(new RegExp(`[?&]${PROXY_HEADER}=[^&]*`), '')
    .replace(/^\?$/, '')

  const finalFetchUrl = `${targetOrigin}${pathname}${cleanSearch}`

  try {
    const targetRes = await fetch(finalFetchUrl, {
      method: req.method,
      headers: {
        Accept: req.headers.get('accept') || '*/*',
        'Accept-Encoding': 'identity',
      },
      redirect: 'manual',
    })

    // Handle redirects — rewrite Location to stay within bridge
    if (targetRes.status >= 300 && targetRes.status < 400) {
      const location = targetRes.headers.get('location')
      if (location) {
        let rewrittenLocation = location
        if (location.startsWith(targetOrigin)) {
          rewrittenLocation = location.slice(targetOrigin.length)
        }
        const redirectHeaders = new Headers(cors)
        redirectHeaders.set('Location', rewrittenLocation)
        // Preserve cookies
        targetRes.headers.forEach((value, key) => {
          if (key.toLowerCase() === 'set-cookie') {
            redirectHeaders.append('Set-Cookie', value)
          }
        })
        return new Response(null, {
          status: targetRes.status,
          headers: redirectHeaders,
        })
      }
    }

    const contentType = targetRes.headers.get('content-type')
    const responseHeaders = stripSecurityHeaders(targetRes.headers)

    // Add CORS headers
    for (const [key, value] of Object.entries(cors)) {
      responseHeaders.set(key, value)
    }

    // HTML response — strip scripts, inject inspector
    if (isHtmlResponse(contentType)) {
      const html = await targetRes.text()
      const modified = injectIntoHtml(html, inspectorScript)

      responseHeaders.set('Content-Type', 'text/html; charset=utf-8')
      responseHeaders.delete('content-length')
      responseHeaders.set(
        'Cache-Control',
        'no-cache, no-store, must-revalidate',
      )

      return new Response(modified, {
        status: targetRes.status,
        headers: responseHeaders,
      })
    }

    // CSS response — rewrite absolute target URLs
    if (isCssResponse(contentType)) {
      const css = await targetRes.text()
      const modified = rewriteCssUrls(css, targetOrigin)

      responseHeaders.delete('content-length')
      responseHeaders.set('Cache-Control', 'public, max-age=3600')

      return new Response(modified, {
        status: targetRes.status,
        headers: responseHeaders,
      })
    }

    // Font response — long cache
    if (
      contentType &&
      (contentType.includes('font') ||
        pathname.match(/\.(woff2?|ttf|otf|eot)$/i))
    ) {
      responseHeaders.set(
        'Cache-Control',
        'public, max-age=31536000, immutable',
      )
    }

    // Image response — always revalidate so updated assets on the target
    // are reflected immediately instead of being served from browser cache.
    if (
      (contentType?.includes('image/')) ||
      pathname.match(/\.(png|jpe?g|gif|svg|ico|webp|avif)(\?|$)/i)
    ) {
      responseHeaders.set(
        'Cache-Control',
        'no-cache, no-store, must-revalidate',
      )
    }

    // All other responses — passthrough
    return new Response(targetRes.body, {
      status: targetRes.status,
      headers: responseHeaders,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json(
      { error: `Failed to proxy request: ${message}` },
      { status: 502, headers: cors },
    )
  }
}

import { type NextRequest, NextResponse } from 'next/server'

/**
 * Lightweight server-side proxy for the SW proxy.
 * Fetches from the target localhost server and returns the raw response
 * (no script stripping, no inspector injection — the SW handles all that).
 * This exists because the SW runs in the browser and can't fetch cross-origin
 * (localhost:3000) without CORS headers from the target.
 */

const STRIP_HEADERS = new Set([
  'content-encoding',
  'transfer-encoding',
  'cross-origin-embedder-policy',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
  'content-security-policy',
  'content-security-policy-report-only',
  'x-frame-options',
])

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const targetUrl = request.headers.get('x-sw-target')
  if (!targetUrl) {
    return new NextResponse('Missing x-sw-target header', { status: 400 })
  }

  // Validate localhost only
  try {
    const parsed = new URL(targetUrl)
    if (
      parsed.hostname !== 'localhost' &&
      parsed.hostname !== '127.0.0.1'
    ) {
      return new NextResponse('Only localhost targets allowed', { status: 403 })
    }
  } catch {
    return new NextResponse('Invalid target URL', { status: 400 })
  }

  const { path } = await params
  const targetPath = path ? `/${path.join('/')}` : '/'
  const targetOrigin = new URL(targetUrl).origin
  const search = request.nextUrl.search
  const fetchUrl = targetOrigin + targetPath + search

  try {
    // Forward all request headers to the target server. This ensures RSC
    // headers (RSC, Next-Router-State-Tree, Next-Router-Prefetch), auth
    // headers, Supabase headers, and any custom API headers reach the target.
    // Only skip headers that must reflect the actual target or are internal.
    const SKIP_REQUEST_HEADERS = new Set([
      'host',
      'origin',
      'referer',
      'connection',
      'x-sw-target',
      'x-forwarded-for',
      'x-forwarded-host',
      'x-forwarded-proto',
      'x-forwarded-port',
      'x-invoke-path',
      'x-invoke-query',
      'x-middleware-invoke',
      'x-middleware-prefetch',
    ])
    const forwardHeaders: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      if (!SKIP_REQUEST_HEADERS.has(key.toLowerCase())) {
        forwardHeaders[key] = value
      }
    })

    const init: RequestInit = {
      method: request.method,
      headers: forwardHeaders,
      redirect: 'manual',
    }
    // Forward body for non-GET/HEAD requests
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = request.body
      // @ts-expect-error -- Node fetch supports duplex for streaming body
      init.duplex = 'half'
    }

    // Follow redirects manually so we can track the final URL
    let response = await fetch(fetchUrl, init)
    let finalUrl: string | null = null
    let redirectCount = 0
    while (
      redirectCount < 10 &&
      response.status >= 300 &&
      response.status < 400 &&
      response.headers.get('location')
    ) {
      const location = response.headers.get('location')!
      const redirectTo = new URL(location, fetchUrl).href
      finalUrl = redirectTo
      response = await fetch(redirectTo, {
        headers: forwardHeaders,
        redirect: 'manual',
      })
      redirectCount++
    }

    // Copy headers, stripping security headers
    const responseHeaders = new Headers()
    for (const [key, value] of response.headers.entries()) {
      if (!STRIP_HEADERS.has(key.toLowerCase())) {
        responseHeaders.set(key, value)
      }
    }
    responseHeaders.delete('content-length')

    // Forward set-cookie headers from the target (auth tokens, sessions)
    const setCookies = response.headers.getSetCookie?.()
    if (setCookies?.length) {
      for (const sc of setCookies) {
        responseHeaders.append('set-cookie', sc)
      }
    }

    // If the target redirected, tell the SW the final URL so the navigation
    // blocker can set the correct path (prevents hydration mismatch).
    if (finalUrl) {
      responseHeaders.set('x-sw-final-url', finalUrl)
    }

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    })
  } catch (err) {
    return new NextResponse(
      `Failed to fetch from ${fetchUrl}: ${err instanceof Error ? err.message : String(err)}`,
      { status: 502 },
    )
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler

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

export async function GET(
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
    const response = await fetch(fetchUrl, {
      headers: {
        accept: request.headers.get('accept') || '*/*',
        'accept-language': request.headers.get('accept-language') || '',
      },
      redirect: 'follow',
    })

    // Copy headers, stripping security headers
    const responseHeaders = new Headers()
    for (const [key, value] of response.headers.entries()) {
      if (!STRIP_HEADERS.has(key.toLowerCase())) {
        responseHeaders.set(key, value)
      }
    }
    responseHeaders.delete('content-length')

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

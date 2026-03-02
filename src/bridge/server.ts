/**
 * pAInt Bridge Server (Node runtime)
 *
 * A lightweight HTTP server that runs on the user's machine.
 * When pAInt is deployed on Vercel, it connects to this bridge
 * to proxy localhost pages, scan project directories, and run Claude CLI.
 */

import { existsSync, readFileSync } from 'node:fs'
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleAPI } from './api-handlers'
import { handleProxy } from './proxy-handler'

const BRIDGE_PORT = Number(process.env.BRIDGE_PORT) || 4002
const BRIDGE_HOST = process.env.BRIDGE_HOST || '127.0.0.1'

const ALLOWED_ORIGIN_PATTERNS = [
  'https://dev-editor-flow.vercel.app',
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
]

function isAllowedOrigin(origin: string): boolean {
  for (const pattern of ALLOWED_ORIGIN_PATTERNS) {
    if (typeof pattern === 'string') {
      if (origin === pattern) return true
    } else {
      if (pattern.test(origin)) return true
    }
  }
  return false
}

function corsHeaders(requestOrigin: string | null): Record<string, string> {
  const origin =
    requestOrigin && isAllowedOrigin(requestOrigin)
      ? requestOrigin
      : 'https://dev-editor-flow.vercel.app'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-dev-editor-target, Accept',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  }
}

// Cache the inspector script at startup
let inspectorScript: string | null = null
const thisDir = dirname(fileURLToPath(import.meta.url))
const inspectorPath = join(thisDir, '../../public/dev-editor-inspector.js')
if (existsSync(inspectorPath)) {
  inspectorScript = readFileSync(inspectorPath, 'utf-8')
}

function toRequest(req: IncomingMessage): Request {
  const protocol = 'http'
  const host = req.headers.host || `${BRIDGE_HOST}:${BRIDGE_PORT}`
  const url = new URL(req.url || '/', `${protocol}://${host}`)

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'undefined') continue
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v)
    } else {
      headers.set(key, value)
    }
  }

  const method = req.method || 'GET'
  if (method === 'GET' || method === 'HEAD') {
    return new Request(url, { method, headers })
  }

  return new Request(url, {
    method,
    headers,
    body: req as unknown as BodyInit,
    duplex: 'half',
  } as RequestInit)
}

async function writeResponse(
  res: ServerResponse,
  response: Response,
): Promise<void> {
  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })

  // Preserve multiple Set-Cookie headers when available.
  const getSetCookie = (
    response.headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie
  if (typeof getSetCookie === 'function') {
    const cookies = getSetCookie.call(response.headers)
    if (cookies.length > 0) {
      res.setHeader('set-cookie', cookies)
    }
  }

  if (!response.body) {
    res.end()
    return
  }

  const reader = response.body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value || value.length === 0) continue
    if (!res.write(Buffer.from(value))) {
      await new Promise<void>((resolve) => {
        res.once('drain', resolve)
      })
    }
  }
  res.end()
}

const server = createServer(async (incomingReq, outgoingRes) => {
  try {
    const req = toRequest(incomingReq)
    const url = new URL(req.url)
    const origin = req.headers.get('origin')
    const cors = corsHeaders(origin)

    // CORS preflight
    if (req.method === 'OPTIONS') {
      await writeResponse(
        outgoingRes,
        new Response(null, { status: 204, headers: cors }),
      )
      return
    }

    // Health check (used for auto-discovery from Vercel editor)
    if (url.pathname === '/health') {
      await writeResponse(
        outgoingRes,
        Response.json(
          { status: 'ok', version: '1.0.0', bridge: true },
          { headers: cors },
        ),
      )
      return
    }

    // Serve the inspector script
    if (url.pathname === '/dev-editor-inspector.js') {
      if (!inspectorScript) {
        await writeResponse(
          outgoingRes,
          new Response('Inspector script not found', {
            status: 404,
            headers: cors,
          }),
        )
        return
      }
      await writeResponse(
        outgoingRes,
        new Response(inspectorScript, {
          headers: {
            ...cors,
            'Content-Type': 'application/javascript',
            'Cache-Control': 'public, max-age=3600',
          },
        }),
      )
      return
    }

    // API routes
    if (url.pathname.startsWith('/api/')) {
      await writeResponse(outgoingRes, await handleAPI(req, url, cors))
      return
    }

    // Everything else: proxy to target localhost
    await writeResponse(
      outgoingRes,
      await handleProxy(req, url, cors, inspectorScript),
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown bridge error'
    outgoingRes.statusCode = 500
    outgoingRes.setHeader('Content-Type', 'application/json')
    outgoingRes.end(JSON.stringify({ error: message }))
  }
})

server.listen(BRIDGE_PORT, BRIDGE_HOST, () => {
  console.log(
    `\n  pAInt Bridge running on http://${BRIDGE_HOST}:${BRIDGE_PORT}`,
  )
  console.log(
    `  Connect from: https://dev-editor-flow.vercel.app?bridge=${BRIDGE_HOST}:${BRIDGE_PORT}\n`,
  )
})

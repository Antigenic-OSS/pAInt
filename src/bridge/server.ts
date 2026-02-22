/**
 * Dev Editor Bridge Server
 *
 * A lightweight Bun HTTP server that runs on the user's machine.
 * When the Dev Editor is deployed on Vercel, it connects to this bridge
 * to proxy localhost pages, scan project directories, and run Claude CLI.
 *
 * Usage:
 *   bun run src/bridge/server.ts
 *   # or
 *   bun run bridge
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { handleProxy } from './proxy-handler';
import { handleAPI } from './api-handlers';

const BRIDGE_PORT = Number(process.env.BRIDGE_PORT) || 4002;

const ALLOWED_ORIGIN_PATTERNS = [
  'https://dev-editor-flow.vercel.app',
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

function isAllowedOrigin(origin: string): boolean {
  for (const pattern of ALLOWED_ORIGIN_PATTERNS) {
    if (typeof pattern === 'string') {
      if (origin === pattern) return true;
    } else {
      if (pattern.test(origin)) return true;
    }
  }
  return false;
}

function corsHeaders(requestOrigin: string | null): Record<string, string> {
  const origin = requestOrigin && isAllowedOrigin(requestOrigin)
    ? requestOrigin
    : 'https://dev-editor-flow.vercel.app';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-dev-editor-target, Accept',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

// Cache the inspector script at startup
let inspectorScript: string | null = null;
const inspectorPath = join(import.meta.dir, '../../public/dev-editor-inspector.js');
if (existsSync(inspectorPath)) {
  inspectorScript = readFileSync(inspectorPath, 'utf-8');
}

Bun.serve({
  port: BRIDGE_PORT,

  async fetch(req) {
    const url = new URL(req.url);
    const origin = req.headers.get('origin');
    const cors = corsHeaders(origin);

    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // Health check (used for auto-discovery from Vercel editor)
    if (url.pathname === '/health') {
      return Response.json(
        { status: 'ok', version: '1.0.0', bridge: true },
        { headers: cors },
      );
    }

    // Serve the inspector script
    if (url.pathname === '/dev-editor-inspector.js') {
      if (!inspectorScript) {
        return new Response('Inspector script not found', { status: 404, headers: cors });
      }
      return new Response(inspectorScript, {
        headers: {
          ...cors,
          'Content-Type': 'application/javascript',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // API routes
    if (url.pathname.startsWith('/api/')) {
      return handleAPI(req, url, cors);
    }

    // Everything else: proxy to target localhost
    return handleProxy(req, url, cors, inspectorScript);
  },
});

console.log(`\n  Dev Editor Bridge running on http://localhost:${BRIDGE_PORT}`);
console.log(`  Connect from: https://dev-editor-flow.vercel.app?bridge=localhost:${BRIDGE_PORT}\n`);

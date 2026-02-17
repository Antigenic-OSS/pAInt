import * as pty from 'node-pty';

const TERMINAL_PORT = Number(process.env.TERMINAL_PORT) || 4001;

interface WsData {
  pty: pty.IPty;
}

Bun.serve<WsData>({
  port: TERMINAL_PORT,

  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === '/ws') {
      const ok = server.upgrade(req);
      if (!ok) return new Response('WebSocket upgrade failed', { status: 400 });
      return undefined;
    }

    if (url.pathname === '/health') {
      return new Response('ok', {
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    return new Response('Not found', { status: 404 });
  },

  websocket: {
    open(ws) {
      const shell = process.env.SHELL || '/bin/bash';
      const term = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: process.env.HOME || '/',
        env: process.env as Record<string, string>,
      });

      ws.data = { pty: term };

      term.onData((data: string) => {
        try {
          ws.send(data);
        } catch {
          // WebSocket already closed
        }
      });

      term.onExit(() => {
        try {
          ws.close();
        } catch {
          // Already closed
        }
      });
    },

    message(ws, message) {
      const { pty: term } = ws.data;
      if (typeof message === 'string') {
        // Resize messages prefixed with \x01
        if (message.startsWith('\x01')) {
          try {
            const { cols, rows } = JSON.parse(message.slice(1));
            if (cols && rows) {
              term.resize(cols, rows);
            }
          } catch {
            // Invalid resize message, ignore
          }
          return;
        }
        term.write(message);
      } else {
        // Binary data
        term.write(Buffer.from(message).toString());
      }
    },

    close(ws) {
      if (ws.data?.pty) {
        ws.data.pty.kill();
      }
    },
  },
});

console.log(`Terminal WebSocket server running on ws://localhost:${TERMINAL_PORT}/ws`);

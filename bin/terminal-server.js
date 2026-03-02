#!/usr/bin/env node

const http = require('node:http')
const { URL } = require('node:url')
const pty = require('node-pty')
const { WebSocketServer } = require('ws')

const TERMINAL_PORT = Number(process.env.TERMINAL_PORT) || 4001

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

  if (url.pathname === '/health') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/plain; charset=utf-8',
    })
    res.end('ok')
    return
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': '*',
    })
    res.end()
    return
  }

  res.writeHead(404)
  res.end('Not found')
})

const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  if (url.pathname !== '/ws') {
    socket.destroy()
    return
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req)
  })
})

wss.on('connection', (ws) => {
  const shell = process.env.SHELL || '/bin/bash'
  const term = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: process.env.HOME || process.cwd(),
    env: process.env,
  })

  term.onData((data) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(data)
    }
  })

  term.onExit(() => {
    try {
      ws.close()
    } catch {
      // already closed
    }
  })

  ws.on('message', (message) => {
    const str = Buffer.isBuffer(message) ? message.toString() : String(message)

    // Resize messages prefixed with \x01
    if (str.startsWith('\x01')) {
      try {
        const { cols, rows } = JSON.parse(str.slice(1))
        if (cols && rows) {
          term.resize(cols, rows)
        }
      } catch {
        // ignore invalid resize messages
      }
      return
    }

    term.write(str)
  })

  ws.on('close', () => {
    try {
      term.kill()
    } catch {
      // already closed
    }
  })
})

server.listen(TERMINAL_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Terminal WebSocket server running on ws://localhost:${TERMINAL_PORT}/ws`)
})

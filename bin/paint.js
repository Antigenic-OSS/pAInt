#!/usr/bin/env node

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const http = require('node:http')
const https = require('node:https')
const { spawn, spawnSync } = require('node:child_process')

const APP_ROOT = path.resolve(__dirname, '..')
const STATE_DIR = path.join(os.homedir(), '.paint')

const APP_STATE_FILE = path.join(STATE_DIR, 'server.json')
const TERMINAL_STATE_FILE = path.join(STATE_DIR, 'terminal.json')
const BRIDGE_STATE_FILE = path.join(STATE_DIR, 'bridge.json')

const WEB_LOG_FILE = path.join(STATE_DIR, 'web.log')
const TERMINAL_LOG_FILE = path.join(STATE_DIR, 'terminal.log')
const BRIDGE_LOG_FILE = path.join(STATE_DIR, 'bridge.log')

const NEXT_BIN = path.join(
  APP_ROOT,
  'node_modules',
  'next',
  'dist',
  'bin',
  'next',
)
const TERMINAL_SERVER_BIN = path.join(APP_ROOT, 'bin', 'terminal-server.js')
const BRIDGE_SERVER_BIN = path.join(APP_ROOT, 'bin', 'bridge-server.js')

const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_WEB_PORT = 4000
const DEFAULT_TERMINAL_PORT = 4001
const DEFAULT_BRIDGE_PORT = 4002

function ensureStateDir() {
  fs.mkdirSync(STATE_DIR, { recursive: true })
}

function now() {
  return new Date().toISOString()
}

function parseArgs(argv) {
  const mode = ['bridge', 'terminal'].includes(argv[0]) ? argv[0] : 'app'
  const command = mode === 'app' ? argv[0] || 'help' : argv[1] || 'help'
  const args = mode === 'app' ? argv.slice(1) : argv.slice(2)

  const parsed = {
    mode,
    command,
    host: DEFAULT_HOST,
    port: DEFAULT_WEB_PORT,
    terminalPort: DEFAULT_TERMINAL_PORT,
    bridgePort: DEFAULT_BRIDGE_PORT,
    rebuild: false,
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]

    if (arg === '--host' && args[i + 1]) {
      parsed.host = args[i + 1]
      i += 1
      continue
    }
    if (arg.startsWith('--host=')) {
      parsed.host = arg.slice('--host='.length)
      continue
    }

    if (arg === '--port' && args[i + 1]) {
      parsed.port = Number(args[i + 1])
      i += 1
      continue
    }
    if (arg.startsWith('--port=')) {
      parsed.port = Number(arg.slice('--port='.length))
      continue
    }

    if (arg === '--terminal-port' && args[i + 1]) {
      parsed.terminalPort = Number(args[i + 1])
      i += 1
      continue
    }
    if (arg.startsWith('--terminal-port=')) {
      parsed.terminalPort = Number(arg.slice('--terminal-port='.length))
      continue
    }

    if (arg === '--bridge-port' && args[i + 1]) {
      parsed.bridgePort = Number(args[i + 1])
      i += 1
      continue
    }
    if (arg.startsWith('--bridge-port=')) {
      parsed.bridgePort = Number(arg.slice('--bridge-port='.length))
      continue
    }

    if (arg === '--rebuild') {
      parsed.rebuild = true
    }
  }

  return parsed
}

function readState(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

function writeState(filePath, state) {
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2))
}

function removeState(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function stopProcess(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return true

  if (process.platform === 'win32') {
    const result = spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
      stdio: 'ignore',
    })
    return result.status === 0
  }

  try {
    process.kill(-pid, 'SIGTERM')
    return true
  } catch {
    try {
      process.kill(pid, 'SIGTERM')
      return true
    } catch {
      return false
    }
  }
}

function validatePort(port, flagName) {
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    console.error(`Invalid ${flagName} value: ${port}`)
    process.exit(1)
  }
}

function spawnDetached(command, args, opts) {
  const { env, logFile } = opts
  const fd = fs.openSync(logFile, 'a')
  fs.writeSync(fd, `\n[${now()}] spawn: ${command} ${args.join(' ')}\n`)

  const child = spawn(command, args, {
    cwd: APP_ROOT,
    env,
    detached: true,
    stdio: ['ignore', fd, fd],
  })

  child.unref()
  return child
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function probeHttp(url, validator) {
  return new Promise((resolve) => {
    const parsed = new URL(url)
    const client = parsed.protocol === 'https:' ? https : http
    const req = client.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        method: 'GET',
        timeout: 1200,
      },
      (res) => {
        const chunks = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8')
          if (typeof validator === 'function') {
            resolve(Boolean(validator(res, body)))
            return
          }
          resolve(res.statusCode >= 200 && res.statusCode < 400)
        })
      },
    )

    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })

    req.on('error', () => resolve(false))
    req.end()
  })
}

async function waitForHttp(url, timeoutMs = 30000, validator) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await probeHttp(url, validator)
    if (ok) return true
    // eslint-disable-next-line no-await-in-loop
    await delay(300)
  }
  return false
}

function ensureNextInstalled() {
  if (!fs.existsSync(NEXT_BIN)) {
    console.error(
      'pAInt runtime is missing Next.js binaries. Reinstall the package.',
    )
    process.exit(1)
  }
}

function ensureBuilt(forceRebuild) {
  ensureStateDir()
  ensureNextInstalled()

  const buildIdPath = path.join(APP_ROOT, '.next', 'BUILD_ID')
  if (!forceRebuild && fs.existsSync(buildIdPath)) {
    return
  }

  console.log(
    forceRebuild ? 'Rebuilding pAInt…' : 'Building pAInt for first run…',
  )
  const result = spawnSync(process.execPath, [NEXT_BIN, 'build'], {
    cwd: APP_ROOT,
    env: process.env,
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
}

async function startApp(options) {
  validatePort(options.port, '--port')

  const existing = readState(APP_STATE_FILE)
  if (existing && isProcessAlive(existing.webPid)) {
    console.log(
      `pAInt is already running (web pid ${existing.webPid}) at http://${existing.host}:${existing.port}`,
    )
    return
  }

  if (existing) {
    stopProcess(existing.webPid)
    removeState(APP_STATE_FILE)
  }

  ensureBuilt(options.rebuild)
  ensureStateDir()

  const webChild = spawnDetached(
    process.execPath,
    [
      NEXT_BIN,
      'start',
      '--port',
      String(options.port),
      '--hostname',
      options.host,
    ],
    {
      env: process.env,
      logFile: WEB_LOG_FILE,
    },
  )

  const webReady = await waitForHttp(
    `http://${options.host}:${options.port}/api/claude/status`,
    25000,
    (res, body) => {
      const ct = String(res.headers['content-type'] || '')
      return (
        res.statusCode >= 200 &&
        res.statusCode < 400 &&
        ct.includes('application/json') &&
        body.includes('"available"')
      )
    },
  )

  if (!webReady) {
    stopProcess(webChild.pid)
    removeState(APP_STATE_FILE)
    console.error('Failed to start pAInt web server cleanly.')
    console.error(
      `- web server did not become ready at http://${options.host}:${options.port}/`,
    )
    console.error(`Web logs: ${WEB_LOG_FILE}`)
    process.exit(1)
  }

  writeState(APP_STATE_FILE, {
    webPid: webChild.pid,
    host: options.host,
    port: options.port,
    startedAt: now(),
    logs: {
      web: WEB_LOG_FILE,
    },
  })

  console.log(`pAInt started at http://${options.host}:${options.port}`)
  console.log(`Web pid: ${webChild.pid}`)
  console.log(`Web logs: ${WEB_LOG_FILE}`)
}

function stopApp() {
  const existing = readState(APP_STATE_FILE)
  if (!existing) {
    console.log('pAInt is not running.')
    return
  }

  const alive = isProcessAlive(existing.webPid)
  const ok = alive ? stopProcess(existing.webPid) : true
  removeState(APP_STATE_FILE)

  if (!alive) {
    console.log('pAInt was not running. Cleared stale state.')
    return
  }

  if (!ok) {
    console.error(`Failed to stop web process ${existing.webPid}`)
    process.exit(1)
  }

  console.log(`Stopped pAInt (web ${existing.webPid}).`)
}

function appStatus() {
  const existing = readState(APP_STATE_FILE)
  if (!existing || !isProcessAlive(existing.webPid)) {
    console.log('pAInt is not running.')
    return
  }

  console.log('pAInt is running')
  console.log(`Web: up (pid ${existing.webPid})`)
  console.log(`URL: http://${existing.host}:${existing.port}`)
  console.log(`Started: ${existing.startedAt}`)
  if (existing.logs?.web) console.log(`Web logs: ${existing.logs.web}`)
}

function appLogs() {
  if (!fs.existsSync(WEB_LOG_FILE)) {
    console.log('No web logs found yet.')
    return
  }
  process.stdout.write('===== web.log =====\n')
  process.stdout.write(fs.readFileSync(WEB_LOG_FILE, 'utf8'))
}

async function startTerminal(options) {
  validatePort(options.terminalPort, '--terminal-port')

  const existing = readState(TERMINAL_STATE_FILE)
  if (existing && isProcessAlive(existing.terminalPid)) {
    console.log(
      `Terminal is already running (pid ${existing.terminalPid}) at ws://localhost:${existing.terminalPort}/ws`,
    )
    return
  }

  if (existing) {
    stopProcess(existing.terminalPid)
    removeState(TERMINAL_STATE_FILE)
  }

  ensureStateDir()

  const terminalChild = spawnDetached(process.execPath, [TERMINAL_SERVER_BIN], {
    env: {
      ...process.env,
      TERMINAL_PORT: String(options.terminalPort),
    },
    logFile: TERMINAL_LOG_FILE,
  })

  const terminalReady = await waitForHttp(
    `http://127.0.0.1:${options.terminalPort}/health`,
    25000,
    (res, body) =>
      res.statusCode >= 200 && res.statusCode < 400 && body.trim() === 'ok',
  )

  if (!terminalReady) {
    stopProcess(terminalChild.pid)
    removeState(TERMINAL_STATE_FILE)
    console.error(
      `Terminal failed to become ready at http://127.0.0.1:${options.terminalPort}/health`,
    )
    console.error(`Terminal logs: ${TERMINAL_LOG_FILE}`)
    process.exit(1)
  }

  writeState(TERMINAL_STATE_FILE, {
    terminalPid: terminalChild.pid,
    terminalPort: options.terminalPort,
    startedAt: now(),
    logs: {
      terminal: TERMINAL_LOG_FILE,
    },
  })

  console.log(`Terminal started at ws://localhost:${options.terminalPort}/ws`)
  console.log(`Terminal pid: ${terminalChild.pid}`)
  console.log(`Terminal logs: ${TERMINAL_LOG_FILE}`)
}

function stopTerminal() {
  const existing = readState(TERMINAL_STATE_FILE)
  if (!existing) {
    console.log('Terminal is not running.')
    return
  }

  const alive = isProcessAlive(existing.terminalPid)
  const ok = alive ? stopProcess(existing.terminalPid) : true
  removeState(TERMINAL_STATE_FILE)

  if (!alive) {
    console.log('Terminal was not running. Cleared stale state.')
    return
  }

  if (!ok) {
    console.error(`Failed to stop terminal process ${existing.terminalPid}`)
    process.exit(1)
  }

  console.log(`Stopped terminal (pid ${existing.terminalPid}).`)
}

function terminalStatus() {
  const existing = readState(TERMINAL_STATE_FILE)
  if (!existing || !isProcessAlive(existing.terminalPid)) {
    console.log('Terminal is not running.')
    return
  }

  console.log('Terminal is running')
  console.log(`PID: ${existing.terminalPid}`)
  console.log(`WS: ws://localhost:${existing.terminalPort}/ws`)
  console.log(`Started: ${existing.startedAt}`)
  if (existing.logs?.terminal)
    console.log(`Terminal logs: ${existing.logs.terminal}`)
}

function terminalLogs() {
  if (!fs.existsSync(TERMINAL_LOG_FILE)) {
    console.log('No terminal logs found yet.')
    return
  }
  process.stdout.write('===== terminal.log =====\n')
  process.stdout.write(fs.readFileSync(TERMINAL_LOG_FILE, 'utf8'))
}

async function startBridge(options) {
  validatePort(options.bridgePort, '--bridge-port')

  const existing = readState(BRIDGE_STATE_FILE)
  if (existing && isProcessAlive(existing.bridgePid)) {
    console.log(
      `Bridge is already running (pid ${existing.bridgePid}) at http://127.0.0.1:${existing.bridgePort}`,
    )
    return
  }

  if (existing) {
    stopProcess(existing.bridgePid)
    removeState(BRIDGE_STATE_FILE)
  }

  ensureStateDir()

  const child = spawnDetached(process.execPath, [BRIDGE_SERVER_BIN], {
    env: {
      ...process.env,
      BRIDGE_PORT: String(options.bridgePort),
    },
    logFile: BRIDGE_LOG_FILE,
  })

  const ready = await waitForHttp(
    `http://127.0.0.1:${options.bridgePort}/health`,
    25000,
  )

  if (!ready) {
    stopProcess(child.pid)
    removeState(BRIDGE_STATE_FILE)
    console.error(
      `Bridge failed to become ready at http://127.0.0.1:${options.bridgePort}/health`,
    )
    console.error(`Bridge logs: ${BRIDGE_LOG_FILE}`)
    process.exit(1)
  }

  writeState(BRIDGE_STATE_FILE, {
    bridgePid: child.pid,
    bridgePort: options.bridgePort,
    startedAt: now(),
    logs: {
      bridge: BRIDGE_LOG_FILE,
    },
  })

  console.log(`Bridge started at http://127.0.0.1:${options.bridgePort}`)
  console.log(`Bridge pid: ${child.pid}`)
  console.log(`Bridge logs: ${BRIDGE_LOG_FILE}`)
}

function stopBridge() {
  const existing = readState(BRIDGE_STATE_FILE)
  if (!existing) {
    console.log('Bridge is not running.')
    return
  }

  const alive = isProcessAlive(existing.bridgePid)
  const ok = alive ? stopProcess(existing.bridgePid) : true
  removeState(BRIDGE_STATE_FILE)

  if (!alive) {
    console.log('Bridge was not running. Cleared stale state.')
    return
  }

  if (!ok) {
    console.error(`Failed to stop bridge process ${existing.bridgePid}`)
    process.exit(1)
  }

  console.log(`Stopped bridge (pid ${existing.bridgePid}).`)
}

function bridgeStatus() {
  const existing = readState(BRIDGE_STATE_FILE)
  if (!existing || !isProcessAlive(existing.bridgePid)) {
    console.log('Bridge is not running.')
    return
  }

  console.log('Bridge is running')
  console.log(`PID: ${existing.bridgePid}`)
  console.log(`URL: http://127.0.0.1:${existing.bridgePort}`)
  console.log(`Started: ${existing.startedAt}`)
  if (existing.logs?.bridge) console.log(`Bridge logs: ${existing.logs.bridge}`)
}

function bridgeLogs() {
  if (!fs.existsSync(BRIDGE_LOG_FILE)) {
    console.log('No bridge logs found yet.')
    return
  }
  process.stdout.write('===== bridge.log =====\n')
  process.stdout.write(fs.readFileSync(BRIDGE_LOG_FILE, 'utf8'))
}

function showHelp() {
  console.log(`paint - pAInt server manager

App usage:
  paint start [--port 4000] [--host 127.0.0.1] [--rebuild]
  paint stop
  paint restart [--port 4000] [--host 127.0.0.1] [--rebuild]
  paint status
  paint logs

Terminal usage:
  paint terminal start [--terminal-port 4001]
  paint terminal stop
  paint terminal restart [--terminal-port 4001]
  paint terminal status
  paint terminal logs

Bridge usage:
  paint bridge start [--bridge-port 4002]
  paint bridge stop
  paint bridge restart [--bridge-port 4002]
  paint bridge status
  paint bridge logs

General:
  paint help
`)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.mode === 'bridge') {
    switch (options.command) {
      case 'start':
        await startBridge(options)
        return
      case 'stop':
        stopBridge()
        return
      case 'restart':
        stopBridge()
        await startBridge(options)
        return
      case 'status':
        bridgeStatus()
        return
      case 'logs':
        bridgeLogs()
        return
      default:
        showHelp()
        return
    }
  }

  if (options.mode === 'terminal') {
    switch (options.command) {
      case 'start':
        await startTerminal(options)
        return
      case 'stop':
        stopTerminal()
        return
      case 'restart':
        stopTerminal()
        await startTerminal(options)
        return
      case 'status':
        terminalStatus()
        return
      case 'logs':
        terminalLogs()
        return
      default:
        showHelp()
        return
    }
  }

  switch (options.command) {
    case 'start':
      await startApp(options)
      break
    case 'stop':
      stopApp()
      break
    case 'restart':
      stopApp()
      await startApp(options)
      break
    case 'status':
      appStatus()
      break
    case 'logs':
      appLogs()
      break
    default:
      showHelp()
      break
  }
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err)
  console.error(`paint failed: ${msg}`)
  process.exit(1)
})

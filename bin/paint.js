#!/usr/bin/env node

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawn, spawnSync } = require('node:child_process')

const APP_ROOT = path.resolve(__dirname, '..')
const STATE_DIR = path.join(os.homedir(), '.paint')
const STATE_FILE = path.join(STATE_DIR, 'server.json')
const LOG_FILE = path.join(STATE_DIR, 'server.log')
const NEXT_BIN = path.join(APP_ROOT, 'node_modules', 'next', 'dist', 'bin', 'next')

function ensureStateDir() {
  fs.mkdirSync(STATE_DIR, { recursive: true })
}

function now() {
  return new Date().toISOString()
}

function parseArgs(argv) {
  const parsed = {
    command: argv[0] || 'help',
    port: 4000,
    host: '127.0.0.1',
    rebuild: false,
  }

  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--port' && argv[i + 1]) {
      parsed.port = Number(argv[i + 1])
      i += 1
      continue
    }
    if (arg.startsWith('--port=')) {
      parsed.port = Number(arg.slice('--port='.length))
      continue
    }
    if (arg === '--host' && argv[i + 1]) {
      parsed.host = argv[i + 1]
      i += 1
      continue
    }
    if (arg.startsWith('--host=')) {
      parsed.host = arg.slice('--host='.length)
      continue
    }
    if (arg === '--rebuild') {
      parsed.rebuild = true
    }
  }

  return parsed
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  } catch {
    return null
  }
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

function removeState() {
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE)
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

function ensureNextInstalled() {
  if (!fs.existsSync(NEXT_BIN)) {
    console.error('pAInt runtime is missing Next.js binaries. Reinstall the package.')
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

  console.log(forceRebuild ? 'Rebuilding pAInt…' : 'Building pAInt for first run…')
  const result = spawnSync(process.execPath, [NEXT_BIN, 'build'], {
    cwd: APP_ROOT,
    env: process.env,
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
}

function stopProcess(pid) {
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

function startServer({ port, host, rebuild }) {
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    console.error(`Invalid --port value: ${port}`)
    process.exit(1)
  }

  const existing = readState()
  if (existing && isProcessAlive(existing.pid)) {
    console.log(`pAInt is already running (pid ${existing.pid}) at http://${existing.host}:${existing.port}`)
    process.exit(0)
  }

  ensureBuilt(rebuild)
  ensureStateDir()

  const logFd = fs.openSync(LOG_FILE, 'a')
  fs.writeSync(logFd, `\n[${now()}] starting pAInt server\n`)

  const child = spawn(
    process.execPath,
    [NEXT_BIN, 'start', '--port', String(port), '--hostname', host],
    {
      cwd: APP_ROOT,
      env: process.env,
      detached: true,
      stdio: ['ignore', logFd, logFd],
    },
  )

  child.unref()

  writeState({
    pid: child.pid,
    host,
    port,
    startedAt: now(),
    logFile: LOG_FILE,
  })

  console.log(`pAInt started (pid ${child.pid}) at http://${host}:${port}`)
  console.log(`Logs: ${LOG_FILE}`)
}

function stopServer() {
  const existing = readState()
  if (!existing) {
    console.log('pAInt is not running.')
    return
  }

  if (!isProcessAlive(existing.pid)) {
    removeState()
    console.log('pAInt was not running. Cleared stale state.')
    return
  }

  const ok = stopProcess(existing.pid)
  removeState()

  if (!ok) {
    console.error(`Failed to stop process ${existing.pid}`)
    process.exit(1)
  }

  console.log(`Stopped pAInt (pid ${existing.pid}).`)
}

function serverStatus() {
  const existing = readState()
  if (!existing || !isProcessAlive(existing.pid)) {
    console.log('pAInt is not running.')
    return
  }

  console.log(`pAInt is running (pid ${existing.pid})`)
  console.log(`URL: http://${existing.host}:${existing.port}`)
  console.log(`Started: ${existing.startedAt}`)
  console.log(`Logs: ${existing.logFile}`)
}

function showHelp() {
  console.log(`paint - pAInt server manager

Usage:
  paint start [--port 4000] [--host 127.0.0.1] [--rebuild]
  paint stop
  paint restart [--port 4000] [--host 127.0.0.1] [--rebuild]
  paint status
  paint logs
  paint help
`)
}

function showLogs() {
  if (!fs.existsSync(LOG_FILE)) {
    console.log('No logs found yet.')
    return
  }
  const content = fs.readFileSync(LOG_FILE, 'utf8')
  process.stdout.write(content)
}

function main() {
  const options = parseArgs(process.argv.slice(2))

  switch (options.command) {
    case 'start':
      startServer(options)
      break
    case 'stop':
      stopServer()
      break
    case 'restart':
      stopServer()
      startServer(options)
      break
    case 'status':
      serverStatus()
      break
    case 'logs':
      showLogs()
      break
    case 'help':
    case '--help':
    case '-h':
    default:
      showHelp()
      break
  }
}

main()

#!/usr/bin/env node

const path = require('node:path')
const { spawn, spawnSync } = require('node:child_process')

const APP_ROOT = path.resolve(__dirname, '..')
const TSX_CLI = path.join(APP_ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs')

const nodeCheck = spawnSync(process.execPath, ['--version'], {
  stdio: 'ignore',
})
if (nodeCheck.status !== 0) {
  console.error('Node.js runtime check failed.')
  process.exit(1)
}

if (!require('node:fs').existsSync(TSX_CLI)) {
  console.error(
    'Missing runtime dependency: tsx. Reinstall @antigenic-oss/paint.',
  )
  process.exit(1)
}

const child = spawn(process.execPath, [TSX_CLI, 'src/bridge/server.ts'], {
  cwd: APP_ROOT,
  env: process.env,
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
  } else {
    process.exit(code || 0)
  }
})

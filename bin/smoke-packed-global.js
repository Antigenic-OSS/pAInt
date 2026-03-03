#!/usr/bin/env node

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const APP_ROOT = path.resolve(__dirname, '..')
const PORT = '4210'

function runOrFail(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: opts.cwd || APP_ROOT,
    env: opts.env || process.env,
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
}

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    cwd: opts.cwd || APP_ROOT,
    env: opts.env || process.env,
    stdio: 'inherit',
  })
}

function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'paint-packed-smoke-'))
  const packDir = path.join(tempRoot, 'pack')
  const extractDir = path.join(tempRoot, 'extract')
  const fakeHome = path.join(tempRoot, 'home')
  fs.mkdirSync(packDir, { recursive: true })
  fs.mkdirSync(extractDir, { recursive: true })
  fs.mkdirSync(fakeHome, { recursive: true })

  runOrFail('npm', ['pack', '--silent', '--pack-destination', packDir])

  const tarball = fs
    .readdirSync(packDir)
    .find((name) => name.endsWith('.tgz'))
  if (!tarball) {
    console.error('Smoke test failed: npm pack produced no tarball.')
    process.exit(1)
  }

  runOrFail('tar', ['-xzf', path.join(packDir, tarball), '-C', extractDir])

  const packedRoot = path.join(extractDir, 'package')
  const packedNodeModules = path.join(packedRoot, 'node_modules')
  if (!fs.existsSync(packedNodeModules)) {
    fs.symlinkSync(path.join(APP_ROOT, 'node_modules'), packedNodeModules, 'dir')
  }

  const env = {
    ...process.env,
    HOME: fakeHome,
    USERPROFILE: fakeHome,
    PAINT_SKIP_POSTINSTALL_BUILD: '1',
  }

  let started = false
  try {
    runOrFail('node', [path.join(packedRoot, 'bin', 'paint.js'), 'start', '--rebuild', '--port', PORT], {
      cwd: packedRoot,
      env,
    })
    started = true
  } finally {
    if (started) {
      run('node', [path.join(packedRoot, 'bin', 'paint.js'), 'stop'], {
        cwd: packedRoot,
        env,
      })
    }
  }
}

main()

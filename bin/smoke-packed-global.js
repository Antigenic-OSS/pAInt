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
  const globalRoot = path.join(tempRoot, 'global')
  const globalNodeModules = path.join(globalRoot, 'node_modules')
  const scopedPackageRoot = path.join(
    globalNodeModules,
    '@antigenic-oss',
    'paint',
  )
  const fakeHome = path.join(tempRoot, 'home')
  fs.mkdirSync(packDir, { recursive: true })
  fs.mkdirSync(extractDir, { recursive: true })
  fs.mkdirSync(globalNodeModules, { recursive: true })
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

  // Emulate global install layout:
  // <global>/node_modules/@antigenic-oss/paint (package)
  // <global>/node_modules/<deps> (shared deps), no package-local node_modules.
  fs.mkdirSync(path.dirname(scopedPackageRoot), { recursive: true })
  fs.cpSync(packedRoot, scopedPackageRoot, { recursive: true, force: true })
  fs.rmSync(path.join(scopedPackageRoot, 'node_modules'), {
    recursive: true,
    force: true,
  })

  const sourceNodeModules = path.join(APP_ROOT, 'node_modules')
  const entries = fs.readdirSync(sourceNodeModules, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === '.bin') continue
    if (entry.name === '@antigenic-oss') continue
    const src = path.join(sourceNodeModules, entry.name)
    const dst = path.join(globalNodeModules, entry.name)
    if (fs.existsSync(dst)) continue
    fs.symlinkSync(src, dst, 'dir')
  }

  const env = {
    ...process.env,
    HOME: fakeHome,
    USERPROFILE: fakeHome,
    PAINT_SKIP_POSTINSTALL_BUILD: '1',
  }

  let started = false
  try {
    runOrFail('node', [path.join(scopedPackageRoot, 'bin', 'paint.js'), 'start', '--rebuild', '--port', PORT], {
      cwd: scopedPackageRoot,
      env,
    })
    started = true
  } finally {
    if (started) {
      run('node', [path.join(scopedPackageRoot, 'bin', 'paint.js'), 'stop'], {
        cwd: scopedPackageRoot,
        env,
      })
    }
  }
}

main()

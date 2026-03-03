#!/usr/bin/env node

const path = require('node:path')
const fs = require('node:fs')
const { spawnSync } = require('node:child_process')

function detectRcFile() {
  const shell = process.env.SHELL || ''
  const home = process.env.HOME || '~'
  const base = path.basename(shell)

  if (base === 'zsh') return `${home}/.zshrc`
  if (base === 'bash') return `${home}/.bashrc`
  if (base === 'fish') return `${home}/.config/fish/config.fish`
  return `${home}/.profile`
}

function shouldPrintHint() {
  const isGlobal = process.env.npm_config_global === 'true'
  const ua = process.env.npm_config_user_agent || ''
  const isBun = ua.includes('bun/')
  return isGlobal || isBun
}

function resolveNextBin(appRoot) {
  const directPath = path.join(
    appRoot,
    'node_modules',
    'next',
    'dist',
    'bin',
    'next',
  )
  if (fs.existsSync(directPath)) {
    return directPath
  }

  try {
    return require.resolve('next/dist/bin/next', { paths: [appRoot] })
  } catch {
    return null
  }
}

function tryWarmBuild() {
  if (process.env.PAINT_SKIP_POSTINSTALL_BUILD === '1') {
    return
  }

  const appRoot = path.resolve(__dirname, '..')
  const buildIdPath = path.join(appRoot, '.next', 'BUILD_ID')
  if (fs.existsSync(buildIdPath)) {
    return
  }

  const nextBin = resolveNextBin(appRoot)
  if (!nextBin) {
    return
  }

  console.log('@antigenic-oss/paint: prebuilding runtime (webpack)...')
  const result = spawnSync(
    process.execPath,
    [nextBin, 'build', '--webpack'],
    {
      cwd: appRoot,
      env: process.env,
      stdio: 'inherit',
    },
  )

  // Keep install resilient across package managers/environments where
  // install-time build is unsupported; first-run build remains as fallback.
  if (result.status !== 0) {
    console.warn(
      '@antigenic-oss/paint: postinstall prebuild failed, will build on first `paint start`.',
    )
  }
}

tryWarmBuild()

if (shouldPrintHint()) {
  const rcFile = detectRcFile()
  const exportLine = 'export PATH="$HOME/.bun/bin:$PATH"'
  console.log('\n@antigenic-oss/paint: if `paint` is not found, run:')
  console.log(`echo '${exportLine}' >> ${rcFile} && source ${rcFile}`)
  console.log('Then run: paint help\n')
}

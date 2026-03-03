#!/usr/bin/env node

const path = require('node:path')

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

if (shouldPrintHint()) {
  const rcFile = detectRcFile()
  const exportLine = 'export PATH="$HOME/.bun/bin:$PATH"'
  console.log('\n@antigenic-oss/paint: if `paint` is not found, run:')
  console.log(`echo '${exportLine}' >> ${rcFile} && source ${rcFile}`)
  console.log('Then run: paint help\n')
}

# pAInt

[![License](https://img.shields.io/github/license/Antigenic-OSS/pAInt)](https://github.com/Antigenic-OSS/pAInt/blob/main/LICENSE)
[![Stars](https://img.shields.io/github/stars/Antigenic-OSS/pAInt?style=social)](https://github.com/Antigenic-OSS/pAInt/stargazers)
[![Issues](https://img.shields.io/github/issues/Antigenic-OSS/pAInt)](https://github.com/Antigenic-OSS/pAInt/issues)
[![npm version](https://img.shields.io/npm/v/@antigenic-oss/paint)](https://www.npmjs.com/package/@antigenic-oss/paint)
[![npm downloads](https://img.shields.io/npm/dm/@antigenic-oss/paint)](https://www.npmjs.com/package/@antigenic-oss/paint)
[![Bun](https://img.shields.io/badge/local%20dev-Bun-000000)](https://bun.sh)
[![Node.js](https://img.shields.io/badge/runtime-Node.js-5FA04E)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/framework-Next.js-000000)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-3178C6)](https://www.typescriptlang.org)

pAInt is a visual editor for localhost web projects. It helps you inspect elements, edit styles, manage CSS variables, and export changelogs for [Claude Code](https://claude.ai/claude-code).

## Table of Contents

- [Project Status](#project-status)
- [Global CLI](#global-cli)
- [What You Can Do](#what-you-can-do)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Connection Modes](#connection-modes)
- [Core Workflow](#core-workflow)
- [Interface Layout](#interface-layout)
- [Commands](#commands)
- [Architecture Summary](#architecture-summary)
- [Security Notes](#security-notes)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Release Automation](#release-automation)
- [License](#license)

## Project Status

- Stage: Active development
- Stability: Suitable for local development workflows
- Scope: Visual editing and changelog-driven code updates for localhost apps

## Global CLI

Install globally with your package manager of choice:

```bash
npm install -g @antigenic-oss/paint
pnpm add -g @antigenic-oss/paint
bun add -g @antigenic-oss/paint
```

Requires Node.js `>=20.9.0`.

If `paint` is not found after install, add your global bin directory to `PATH`
once:

```bash
# Bun
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc

# npm (uses npm global prefix)
echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc

# pnpm
pnpm setup
```

After install, run:

```bash
paint help
paint start
```

Then use:

```bash
paint start             # Builds on first run, then starts web server
paint status            # Show web status
paint stop              # Stop web server
paint restart --rebuild # Force a rebuild before start
paint logs              # Print web logs
paint terminal start    # Start terminal websocket server
paint terminal restart
paint terminal status
paint terminal stop
paint bridge start      # Start bridge server
paint bridge restart
paint bridge status
paint bridge stop
```

Default URL: `http://127.0.0.1:4000`
Terminal WS (when started): `ws://localhost:4001/ws`

## What You Can Do

- Inspect and select any element in a live preview
- Edit typography, spacing, layout, colors, borders, shadows, and gradients
- Manage and reuse CSS custom properties
- Work across breakpoints (Mobile 375px, Tablet 768px, Desktop 1280px)
- Navigate and select through a DOM layers tree
- Insert new HTML elements from the Add Element panel
- Track every change and export a structured changelog
- Send changelogs to Claude Code for source-file application

## Prerequisites

- Local repository development: Bun `>=1.3`
- Global CLI runtime: Node.js `>=20.9.0`
- A localhost app running in development mode (Next.js, Vite, Astro, CRA, etc.)

## Quick Start

```bash
bun install
bun dev
```

Open `http://localhost:4000`, then:

1. Start your target app (for example `http://localhost:3000`)
2. Select the target localhost port in pAInt
3. Click **Connect**
4. Start inspecting and editing

## Connection Modes

### Automatic proxy mode (default)

Click **Connect** and pAInt loads your page through its reverse proxy, injecting the inspector automatically.

### Manual script mode

If auto-injection is not detected, add this script tag to your app layout and reload:

```html
<script src="https://dev-editor-flow.vercel.app/dev-editor-inspector.js"></script>
```

### Vercel + local bridge mode

If the UI is hosted on Vercel, run the local bridge server:

```bash
paint bridge start
```

Bridge default: `http://localhost:4002`

## Core Workflow

1. Connect to your localhost app
2. Select elements from preview or Layers
3. Edit styles in Design/Variables panels
4. Review edits in Changes
5. Copy changelog or send it to Claude Code

## Interface Layout

- Left panel: Layers, Pages, Components, Add Element, Terminal
- Center panel: Live iframe preview
- Right panel: Design, Variables, Changes, Claude, Console

## Commands

```bash
bun install                # Install dependencies for local repo development
bun dev                    # Start UI (localhost:4000)
bun run bridge             # Start bridge server (localhost:4002)
bun run dev:terminal       # Start terminal server
bun run dev:all            # Start terminal + bridge + Next.js dev server
bun run build              # Production build
bun run start              # Production server (port 4000)
bun run lint               # Biome check
```

## Architecture Summary

- Next.js App Router frontend (develop locally with Bun, run globally via Node.js CLI)
- Proxy API route at `/api/proxy/*` for target-page loading and injection
- Inspector script communicates with editor via `window.postMessage`
- State managed with Zustand slices
- Changes persisted in localStorage per target URL

## Security Notes

- Localhost targets only
- Proxy rejects non-local addresses
- Target-page scripts are stripped in proxy mode to reduce runtime interference
- CLI execution is spawned without shell-string interpolation

## Documentation

- In-app docs: `/docs`
- Contributor guide: `CONTRIBUTING.md`
- Code of conduct: `CODE_OF_CONDUCT.md`
- Security reporting: `SECURITY.md`
- Support details: `SUPPORT.md`

## Contributing

See `CONTRIBUTING.md` for setup, workflow, and pull request expectations.

## Release Automation

- Versioning is manual (update `package.json` before merging to `main`).
- CI workflow: `.github/workflows/ci.yml`
- Release workflow: `.github/workflows/release.yml`
- Publishing uses npm Trusted Publishing (OIDC) from the `release` GitHub Environment.
- On every push to `main`, the release workflow runs build/lint/smoke checks.
- Publish happens automatically only when `package.json` version differs from the currently published npm version.

## License

Apache License 2.0. See `LICENSE`.

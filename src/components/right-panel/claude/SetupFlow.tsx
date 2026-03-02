'use client'

import { useState, useCallback, useEffect } from 'react'
import { useEditorStore } from '@/store'
import { ProjectRootSelector } from './ProjectRootSelector'
import { isEditorOnLocalhost } from '@/hooks/usePostMessage'
import { getApiBase } from '@/lib/apiBase'
import type { ClaudeStatusResponse } from '@/types/claude'

interface SetupFlowProps {
  targetUrl: string
  onComplete: () => void
}

export function SetupFlow({ targetUrl, onComplete }: SetupFlowProps) {
  const cliAvailable = useEditorStore((s) => s.cliAvailable)
  const setCliAvailable = useEditorStore((s) => s.setCliAvailable)
  const portRoots = useEditorStore((s) => s.portRoots)
  const _projectRoot = portRoots[targetUrl] ?? null

  const bridgeStatus = useEditorStore((s) => s.bridgeStatus)
  const isLocal = typeof window !== 'undefined' && isEditorOnLocalhost()
  const hasBridge = bridgeStatus === 'connected'
  const hasServerAccess = isLocal || hasBridge

  const [checking, setChecking] = useState(false)
  const [cliVersion, setCliVersion] = useState<string | null>(null)
  const [checkError, setCheckError] = useState<string | null>(null)

  const checkCli = useCallback(async () => {
    setChecking(true)
    setCheckError(null)
    try {
      const res = await fetch(`${getApiBase()}/api/claude/status`)
      const data: ClaudeStatusResponse = await res.json()
      setCliAvailable(data.available)
      if (data.available && data.version) {
        setCliVersion(data.version)
      } else {
        setCheckError(data.error || 'Claude CLI not available')
      }
    } catch {
      setCliAvailable(false)
      setCheckError('Failed to check CLI status')
    } finally {
      setChecking(false)
    }
  }, [setCliAvailable])

  // Auto-check CLI on mount (when running locally or bridge is connected)
  useEffect(() => {
    if (hasServerAccess && cliAvailable === null) {
      checkCli()
    }
  }, [hasServerAccess, cliAvailable, checkCli])

  const handleProjectRootSaved = useCallback(() => {
    onComplete()
  }, [onComplete])

  // ─── Remote mode without bridge (Vercel) ───
  // Skip CLI check, show project root selector with File System Access API
  if (!hasServerAccess) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div
          className="text-xs font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          Claude Code
        </div>

        {/* Remote mode notice */}
        <div
          className="flex flex-col gap-1.5 px-3 py-2.5 rounded"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
          }}
        >
          <div
            className="text-[11px] font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            Running remotely
          </div>
          <p
            className="text-[10px] leading-relaxed"
            style={{ color: 'var(--text-muted)' }}
          >
            Start the bridge server locally for full CLI access:{' '}
            <code
              className="font-mono px-1 rounded"
              style={{ background: 'var(--bg-primary)' }}
            >
              bun run bridge
            </code>
          </p>
          <p
            className="text-[10px] leading-relaxed"
            style={{ color: 'var(--text-muted)' }}
          >
            Or select a project folder below to improve changelog accuracy.
          </p>
        </div>

        {/* Project root setup (uses File System Access API on remote) */}
        <div className="flex flex-col gap-2">
          <div
            className="text-[11px] font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            Project folder{' '}
            <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>
              (optional)
            </span>
          </div>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Select your project folder to detect framework, components, and CSS
            strategy for smarter changelog export.
          </p>
          <ProjectRootSelector
            targetUrl={targetUrl}
            onSaved={handleProjectRootSaved}
          />
        </div>
      </div>
    )
  }

  // ─── Local mode ───

  // Still checking CLI on first load
  if (checking && cliAvailable === null) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div
          className="w-5 h-5 border-2 rounded-full animate-spin"
          style={{
            borderColor: 'var(--border)',
            borderTopColor: 'var(--accent)',
          }}
        />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Detecting Claude Code CLI...
        </span>
      </div>
    )
  }

  // CLI not found — show concise troubleshooting (not installation wizard)
  if (cliAvailable === false) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div
          className="text-xs font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          Claude Code
        </div>

        <div
          className="flex flex-col gap-2 px-3 py-2.5 rounded"
          style={{
            background: 'rgba(244, 71, 71, 0.08)',
            border: '1px solid var(--error)',
          }}
        >
          <div
            className="text-[11px] font-medium"
            style={{ color: 'var(--error)' }}
          >
            CLI not detected
          </div>
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            The Claude Code CLI couldn&apos;t be found on this machine. If
            it&apos;s already installed, the server process may not have access
            to your shell PATH.
          </p>
          {checkError && (
            <code
              className="block px-2 py-1 rounded text-[10px] font-mono break-all"
              style={{
                background: 'var(--bg-primary)',
                color: 'var(--text-muted)',
              }}
            >
              {checkError}
            </code>
          )}
        </div>

        <div
          className="flex flex-col gap-2 px-3 py-2.5 rounded"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
          }}
        >
          <div
            className="text-[11px] font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            Troubleshooting
          </div>
          <ul
            className="flex flex-col gap-1.5 text-[10px] list-none m-0 p-0"
            style={{ color: 'var(--text-secondary)' }}
          >
            <li className="flex gap-1.5">
              <span style={{ color: 'var(--text-muted)' }}>&bull;</span>
              <span>
                Run{' '}
                <code
                  className="font-mono px-1 rounded"
                  style={{ background: 'var(--bg-primary)' }}
                >
                  which claude
                </code>{' '}
                in your terminal to verify it&apos;s installed
              </span>
            </li>
            <li className="flex gap-1.5">
              <span style={{ color: 'var(--text-muted)' }}>&bull;</span>
              <span>Restart pAInt after installing the CLI</span>
            </li>
            <li className="flex gap-1.5">
              <span style={{ color: 'var(--text-muted)' }}>&bull;</span>
              <span>
                Install with:{' '}
                <code
                  className="font-mono px-1 rounded"
                  style={{ background: 'var(--bg-primary)' }}
                >
                  npm install -g @anthropic-ai/claude-code
                </code>
              </span>
            </li>
          </ul>
        </div>

        <button
          onClick={checkCli}
          disabled={checking}
          className="w-full py-1.5 px-3 rounded text-xs font-medium transition-colors disabled:opacity-50"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {checking ? 'Checking...' : 'Retry Detection'}
        </button>
      </div>
    )
  }

  // CLI found — just ask for project root
  return (
    <div className="flex flex-col gap-4 p-4">
      <div
        className="text-xs font-medium"
        style={{ color: 'var(--text-primary)' }}
      >
        Claude Code
      </div>

      {/* CLI detected badge */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded"
        style={{
          background: 'rgba(78, 201, 176, 0.08)',
          border: '1px solid var(--success)',
        }}
      >
        <span style={{ color: 'var(--success)' }}>&#10003;</span>
        <span className="text-[11px]" style={{ color: 'var(--success)' }}>
          CLI detected{cliVersion ? ` — ${cliVersion}` : ''}
        </span>
      </div>

      {/* Project root setup */}
      <div className="flex flex-col gap-2">
        <div
          className="text-[11px] font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          Set project root for{' '}
          <span className="font-mono" style={{ color: 'var(--accent)' }}>
            {(() => {
              try {
                return new URL(targetUrl).host
              } catch {
                return targetUrl
              }
            })()}
          </span>
        </div>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          Enter the absolute path to the project Claude will analyze. Run{' '}
          <code
            className="font-mono px-1 rounded"
            style={{ background: 'var(--bg-tertiary)' }}
          >
            pwd
          </code>{' '}
          in your project directory to get it.
        </p>
        <ProjectRootSelector
          targetUrl={targetUrl}
          onSaved={handleProjectRootSaved}
        />
      </div>
    </div>
  )
}

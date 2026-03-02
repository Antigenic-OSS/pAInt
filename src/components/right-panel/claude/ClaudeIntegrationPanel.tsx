'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useEditorStore } from '@/store'
import { formatChangelog } from '@/lib/utils'
import { BREAKPOINTS } from '@/lib/constants'
import { getApiBase } from '@/lib/apiBase'
import { consumeClaudeStream, formatStderrLine } from '@/lib/claude-stream'
import { SetupFlow } from './SetupFlow'
import { ClaudeProgressIndicator } from './ClaudeProgressIndicator'
import { DiffViewer } from './DiffViewer'
import { ResultsSummary } from './ResultsSummary'
import { ClaudeErrorState } from './ClaudeErrorState'
import type {
  ClaudeAnalyzeResponse,
  ClaudeApplyResponse,
  ClaudeErrorCode,
} from '@/types/claude'

export function ClaudeIntegrationPanel() {
  const claudeStatus = useEditorStore((s) => s.claudeStatus)
  const portRoots = useEditorStore((s) => s.portRoots)
  const cliAvailable = useEditorStore((s) => s.cliAvailable)
  const claudeError = useEditorStore((s) => s.claudeError)
  const sessionId = useEditorStore((s) => s.sessionId)
  const parsedDiffs = useEditorStore((s) => s.parsedDiffs)

  const setClaudeStatus = useEditorStore((s) => s.setClaudeStatus)
  const setClaudeError = useEditorStore((s) => s.setClaudeError)
  const setSessionId = useEditorStore((s) => s.setSessionId)
  const setParsedDiffs = useEditorStore((s) => s.setParsedDiffs)
  const resetClaude = useEditorStore((s) => s.resetClaude)
  const loadPersistedClaude = useEditorStore((s) => s.loadPersistedClaude)

  const targetUrl = useEditorStore((s) => s.targetUrl)
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint)
  const currentPagePath = useEditorStore((s) => s.currentPagePath)
  const styleChanges = useEditorStore((s) => s.styleChanges)
  const aiScanResult = useEditorStore((s) => s.aiScanResult)
  const aiScanStatus = useEditorStore((s) => s.aiScanStatus)
  const resetAiScan = useEditorStore((s) => s.resetAiScan)
  const showToast = useEditorStore((s) => s.showToast)
  const setActiveLeftTab = useEditorStore((s) => s.setActiveLeftTab)

  const [analysisSummary, setAnalysisSummary] = useState('')
  const [appliedFiles, setAppliedFiles] = useState<string[]>([])
  const [setupComplete, setSetupComplete] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Derive projectRoot from per-port mapping
  const projectRoot = targetUrl ? (portRoots[targetUrl] ?? null) : null

  const totalChanges = styleChanges.length

  // Load persisted state on mount
  useEffect(() => {
    loadPersistedClaude()
  }, [loadPersistedClaude])

  // Reset setupComplete when targetUrl changes so setup re-shows if needed
  useEffect(() => {
    setSetupComplete(false)
  }, [])

  // Check if setup is needed
  const needsSetup =
    !setupComplete &&
    (cliAvailable === null || cliAvailable === false || !projectRoot)

  const handleSetupComplete = useCallback(() => {
    setSetupComplete(true)
  }, [])

  // Shared analysis logic — sends to /api/claude/analyze with SSE streaming
  const runAnalysis = useCallback(
    (payload: {
      changelog?: string
      smartPrompt?: string
      projectRoot: string
    }) => {
      setClaudeStatus('analyzing')
      setClaudeError(null)
      setAnalysisSummary('')

      // Auto-switch to Terminal tab so user sees progress
      setActiveLeftTab('terminal')

      // Write header to terminal
      const write = useEditorStore.getState().writeToTerminal
      write?.('\r\n\x1b[1;34m  Claude Code: Analyzing...\x1b[0m\r\n')

      // Abort any previous stream
      abortRef.current?.abort()

      const controller = consumeClaudeStream<ClaudeAnalyzeResponse>(
        '/api/claude/analyze',
        payload,
        {
          onStderr: (line) => {
            const w = useEditorStore.getState().writeToTerminal
            const formatted = formatStderrLine(line)
            if (formatted) w?.(`${formatted}\r\n`)
          },
          onResult: (data) => {
            setSessionId(data.sessionId)
            setParsedDiffs(data.diffs)
            setAnalysisSummary(data.summary || '')
            setClaudeStatus('complete')
            const w = useEditorStore.getState().writeToTerminal
            w?.('\x1b[32m  Analysis complete.\x1b[0m\r\n')
          },
          onError: (err) => {
            setClaudeStatus('error')
            setClaudeError({
              code: (err.code as ClaudeErrorCode) || 'UNKNOWN',
              message: err.message,
            })
            const w = useEditorStore.getState().writeToTerminal
            w?.(`\x1b[31m  Error: ${err.message}\x1b[0m\r\n`)
          },
        },
      )

      abortRef.current = controller
    },
    [
      setClaudeStatus,
      setClaudeError,
      setSessionId,
      setParsedDiffs,
      setActiveLeftTab,
    ],
  )

  const handleAnalyze = useCallback(async () => {
    if (!targetUrl || !projectRoot || totalChanges === 0) return

    const changelog = formatChangelog({
      targetUrl,
      pagePath: currentPagePath,
      breakpoint: activeBreakpoint,
      breakpointWidth: BREAKPOINTS[activeBreakpoint].width,
      styleChanges,
    })

    await runAnalysis({ changelog, projectRoot })
  }, [
    targetUrl,
    projectRoot,
    totalChanges,
    currentPagePath,
    activeBreakpoint,
    styleChanges,
    runAnalysis,
  ])

  // Auto-trigger analysis when arriving from "Send to Claude Code" in AI Scan
  const hasTriggeredScanRef = useRef(false)
  useEffect(() => {
    if (
      aiScanStatus === 'complete' &&
      aiScanResult?.smartPrompt &&
      projectRoot &&
      claudeStatus === 'idle' &&
      !hasTriggeredScanRef.current
    ) {
      hasTriggeredScanRef.current = true
      const prompt = aiScanResult.smartPrompt
      // Clear the scan result so it doesn't re-trigger
      resetAiScan()
      runAnalysis({ smartPrompt: prompt, projectRoot })
    }
    // Reset the guard when scan result is cleared
    if (aiScanStatus !== 'complete') {
      hasTriggeredScanRef.current = false
    }
  }, [
    aiScanStatus,
    aiScanResult,
    projectRoot,
    claudeStatus,
    resetAiScan,
    runAnalysis,
  ])

  const handleApplyAll = useCallback(async () => {
    if (!sessionId || !projectRoot) return

    setClaudeStatus('applying')
    setClaudeError(null)

    try {
      const res = await fetch(`${getApiBase()}/api/claude/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, projectRoot }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setClaudeStatus('error')
        setClaudeError({
          code: data.code || 'UNKNOWN',
          message: data.error || `Apply failed with status ${res.status}`,
        })
        showToast('error', data.error || 'Failed to apply changes')
        return
      }

      const data: ClaudeApplyResponse = await res.json()
      if (data.success) {
        setAppliedFiles(data.filesModified || [])
        setClaudeStatus('applied')
        const fileCount = data.filesModified?.length || 0
        showToast(
          'success',
          `Changes applied successfully — ${fileCount} file${fileCount !== 1 ? 's' : ''} modified`,
        )
      } else {
        setClaudeStatus('error')
        setClaudeError({
          code: 'UNKNOWN',
          message: data.summary || 'Apply returned unsuccessful',
        })
        showToast('error', data.summary || 'Apply returned unsuccessful')
      }
    } catch (err) {
      setClaudeStatus('error')
      setClaudeError({
        code: 'UNKNOWN',
        message: err instanceof Error ? err.message : 'Network error',
      })
      showToast('error', err instanceof Error ? err.message : 'Network error')
    }
  }, [sessionId, projectRoot, setClaudeStatus, setClaudeError, showToast])

  const handleRetry = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    resetClaude()
    setAnalysisSummary('')
    setAppliedFiles([])
  }, [resetClaude])

  const handleStartOver = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    resetClaude()
    setAnalysisSummary('')
    setAppliedFiles([])
  }, [resetClaude])

  // No target connected — prompt user to connect first
  if (!targetUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 px-4">
        <div
          className="text-2xl"
          style={{ color: 'var(--text-muted)', opacity: 0.5 }}
        >
          &#8728;
        </div>
        <p
          className="text-xs text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          Connect to a project first using the URL bar above, then configure
          Claude Code here.
        </p>
      </div>
    )
  }

  // Setup flow
  if (needsSetup) {
    return <SetupFlow targetUrl={targetUrl} onComplete={handleSetupComplete} />
  }

  // State machine UI
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background:
                claudeStatus === 'error'
                  ? 'var(--error)'
                  : claudeStatus === 'complete' || claudeStatus === 'applied'
                    ? 'var(--success)'
                    : claudeStatus === 'analyzing' ||
                        claudeStatus === 'applying'
                      ? 'var(--accent)'
                      : 'var(--text-muted)',
            }}
          />
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            Claude Code
          </span>
        </div>

        {claudeStatus !== 'idle' && (
          <button
            onClick={handleStartOver}
            className="text-[11px] px-2 py-0.5 rounded transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-muted)' }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {/* Idle state */}
        {claudeStatus === 'idle' && (
          <div className="flex flex-col gap-3 p-4">
            {totalChanges > 0 ? (
              <>
                <p
                  className="text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Send your {totalChanges} tracked change
                  {totalChanges !== 1 ? 's' : ''} to Claude Code for analysis.
                  Claude will generate diffs that can be applied to your source
                  files.
                </p>

                {projectRoot && (
                  <div
                    className="flex items-center gap-2 text-[11px] px-2 py-1.5 rounded"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>Project:</span>
                    <span className="font-mono truncate" title={projectRoot}>
                      {projectRoot}
                    </span>
                  </div>
                )}

                <button
                  onClick={handleAnalyze}
                  className="w-full py-2 px-3 rounded text-xs font-medium transition-colors"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  Send to Claude Code
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <div
                  className="text-2xl"
                  style={{ color: 'var(--text-muted)', opacity: 0.5 }}
                >
                  &#8728;
                </div>
                <p
                  className="text-xs text-center"
                  style={{ color: 'var(--text-muted)' }}
                >
                  No changes to analyze. Make some visual edits first, then send
                  them to Claude Code.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Analyzing state */}
        {claudeStatus === 'analyzing' && (
          <ClaudeProgressIndicator status="analyzing" />
        )}

        {/* Complete state - show diffs and results */}
        {claudeStatus === 'complete' && (
          <div className="flex flex-col">
            <div className="p-3">
              <DiffViewer />
            </div>
            <ResultsSummary
              summary={analysisSummary}
              onApplyAll={handleApplyAll}
            />
          </div>
        )}

        {/* Applying state */}
        {claudeStatus === 'applying' && (
          <ClaudeProgressIndicator status="applying" />
        )}

        {/* Applied state */}
        {claudeStatus === 'applied' && (
          <div className="flex flex-col gap-3 p-4">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded"
              style={{
                background: 'rgba(78, 201, 176, 0.1)',
                border: '1px solid var(--success)',
              }}
            >
              <span style={{ color: 'var(--success)' }}>&#10003;</span>
              <span
                className="text-xs font-medium"
                style={{ color: 'var(--success)' }}
              >
                Changes applied successfully
              </span>
            </div>

            {appliedFiles.length > 0 && (
              <div className="flex flex-col gap-1">
                <span
                  className="text-[11px] font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Modified files:
                </span>
                {appliedFiles.map((file) => (
                  <div
                    key={file}
                    className="flex items-center gap-2 px-2 py-1 rounded text-[11px] font-mono"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span style={{ color: 'var(--success)' }}>&#9679;</span>
                    <span className="truncate" title={file}>
                      {file}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Still show the diffs for reference */}
            {parsedDiffs.length > 0 && (
              <div className="mt-2">
                <div
                  className="text-[11px] font-medium mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Applied diffs:
                </div>
                <DiffViewer />
              </div>
            )}

            <button
              onClick={handleStartOver}
              className="w-full py-1.5 px-3 rounded text-xs font-medium transition-colors"
              style={{
                background: 'var(--bg-hover)',
                color: 'var(--text-secondary)',
              }}
            >
              Start New Analysis
            </button>
          </div>
        )}

        {/* Error state */}
        {claudeStatus === 'error' && claudeError && (
          <ClaudeErrorState error={claudeError} onRetry={handleRetry} />
        )}
      </div>
    </div>
  )
}

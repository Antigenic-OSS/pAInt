'use client'

import { useState, useEffect, useRef } from 'react'
import { useEditorStore } from '@/store'
import { normalizeTargetUrl } from '@/lib/utils'
import { BREAKPOINTS } from '@/lib/constants'
import { useProjectScan } from '@/hooks/useProjectScan'
import { pickFolder } from '@/lib/folderPicker'
import { isEditorOnLocalhost } from '@/hooks/usePostMessage'
import { ScanAnimation } from './common/ScanAnimation'
import type { Breakpoint } from '@/types/changelog'
import type { ScanResult } from '@/hooks/useProjectScan'

export function ConnectModal() {
  const setTargetUrl = useEditorStore((s) => s.setTargetUrl)
  const setConnectionStatus = useEditorStore((s) => s.setConnectionStatus)
  const addRecentUrl = useEditorStore((s) => s.addRecentUrl)
  const connectionStatus = useEditorStore((s) => s.connectionStatus)
  const recentUrls = useEditorStore((s) => s.recentUrls)
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint)
  const setActiveBreakpoint = useEditorStore((s) => s.setActiveBreakpoint)
  const setPreviewWidth = useEditorStore((s) => s.setPreviewWidth)
  const portRoots = useEditorStore((s) => s.portRoots)
  const setProjectRoot = useEditorStore((s) => s.setProjectRoot)
  const setPendingConnection = useEditorStore((s) => s.setPendingConnection)
  const finalizeConnection = useEditorStore((s) => s.finalizeConnection)
  const cancelPendingConnection = useEditorStore(
    (s) => s.cancelPendingConnection,
  )
  const pendingTargetUrl = useEditorStore((s) => s.pendingTargetUrl)
  const pendingFolderPath = useEditorStore((s) => s.pendingFolderPath)
  const targetUrl = useEditorStore((s) => s.targetUrl)

  const setDirectoryHandle = useEditorStore((s) => s.setDirectoryHandle)
  const directoryHandle = useEditorStore((s) => s.directoryHandle)
  const { triggerScan, triggerClientScan } = useProjectScan()
  const [isLocal, setIsLocal] = useState(false)

  useEffect(() => {
    setIsLocal(isEditorOnLocalhost())
  }, [])

  const portOptions = Array.from({ length: 8 }, (_, i) => 3000 + i)
  const [selectedPort, setSelectedPort] = useState(3000)
  const [urlMode, setUrlMode] = useState(false)
  const [customUrl, setCustomUrl] = useState('http://localhost:3000')
  const [folderPath, setFolderPath] = useState('')
  const [folderError, setFolderError] = useState<string | null>(null)
  const [isBrowsing, setIsBrowsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [howToOpen, setHowToOpen] = useState(false)
  const [showScriptFallback, setShowScriptFallback] = useState(false)
  const [scriptCopied, setScriptCopied] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [scanDone, setScanDone] = useState(false)
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isConnecting = connectionStatus === 'connecting'
  const isConfirming = connectionStatus === 'confirming'
  const isScanning = connectionStatus === 'scanning'

  // Show script tag fallback after 5s of connecting (immediately when deployed)
  useEffect(() => {
    if (isConnecting && targetUrl) {
      if (!isLocal) {
        // On Vercel, show immediately — proxy won't inject the script
        setShowScriptFallback(true)
      } else {
        fallbackTimerRef.current = setTimeout(() => {
          setShowScriptFallback(true)
        }, 5000)
      }
    } else {
      setShowScriptFallback(false)
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current)
        fallbackTimerRef.current = null
      }
    }
    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current)
        fallbackTimerRef.current = null
      }
    }
  }, [isConnecting, targetUrl, isLocal])

  // Cleanup auto-advance timer
  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current)
      }
    }
  }, [])

  // Cancel current connection and reset to editable state
  const cancelConnection = () => {
    if (isConnecting) {
      setConnectionStatus('disconnected')
      setTargetUrl(null)
    }
    if (isConfirming || isScanning) {
      cancelPendingConnection()
    }
    setShowScriptFallback(false)
    setScriptCopied(false)
    setScanResult(null)
    setScanDone(false)
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current)
      fallbackTimerRef.current = null
    }
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current)
      autoAdvanceRef.current = null
    }
  }

  const handleCopyScript = async () => {
    const scriptTag = `<script src="${window.location.origin}/dev-editor-inspector.js"></script>`
    try {
      await navigator.clipboard.writeText(scriptTag)
      setScriptCopied(true)
      setTimeout(() => setScriptCopied(false), 2000)
    } catch {
      /* fallback: user can manually copy */
    }
  }

  // Pre-fill folder path from portRoots when selected URL changes
  const currentUrl = urlMode
    ? customUrl.trim()
    : `http://localhost:${selectedPort}`
  useEffect(() => {
    if (connectionStatus !== 'disconnected') return
    const normalized = normalizeTargetUrl(currentUrl)
    const saved = portRoots[normalized]
    if (saved) {
      setFolderPath(saved)
      setFolderError(null)
    }
  }, [selectedPort, urlMode, currentUrl, portRoots, connectionStatus])

  const handleBrowse = async () => {
    setIsBrowsing(true)
    setFolderError(null)
    try {
      const result = await pickFolder()
      if (result.type === 'path') {
        setFolderPath(result.path)
        setDirectoryHandle(null)
      } else if (result.type === 'handle') {
        setFolderPath(result.name)
        setDirectoryHandle(result.handle)
      } else if (result.type === 'error') {
        setFolderError(result.message)
      }
      // type === 'cancelled' — do nothing
    } catch {
      setFolderError('Failed to open folder picker')
    } finally {
      setIsBrowsing(false)
    }
  }

  const handleConnect = () => {
    setError(null)
    setFolderError(null)
    const raw = urlMode ? customUrl.trim() : `http://localhost:${selectedPort}`
    if (urlMode && !raw) {
      setError('Enter a URL')
      return
    }
    const normalized = normalizeTargetUrl(raw)
    const trimmedFolder = folderPath.trim()

    if (trimmedFolder) {
      // Save folder and go to confirmation step
      // For client-side handles, store the folder name (not a server path)
      if (isLocal || !directoryHandle) {
        setProjectRoot(normalized, trimmedFolder)
      }
      setPendingConnection(normalized, trimmedFolder)
      addRecentUrl(normalized)
    } else {
      // No folder — skip confirmation and scan, connect directly
      setPendingConnection(normalized, '')
      addRecentUrl(normalized)
    }
  }

  const handleConfirm = async () => {
    if (!pendingTargetUrl || !pendingFolderPath) return
    setConnectionStatus('scanning')
    setScanResult(null)
    setScanDone(false)

    // Use client-side scan when we have a directory handle (Vercel / FSAA mode)
    const result = directoryHandle
      ? await triggerClientScan(directoryHandle)
      : await triggerScan(pendingFolderPath)
    setScanResult(result)
    setScanDone(true)

    // Auto-advance to connecting after brief display
    autoAdvanceRef.current = setTimeout(() => {
      finalizeConnection()
    }, 1200)
  }

  const handleContinueAnyway = () => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current)
    }
    finalizeConnection()
  }

  const handleBack = () => {
    cancelPendingConnection()
    setScanResult(null)
    setScanDone(false)
  }

  const handleRecentClick = (url: string) => {
    cancelConnection()
    setError(null)
    // Pre-fill the URL input so the user can review before clicking Connect
    setUrlMode(true)
    setCustomUrl(url)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConnect()
    }
  }

  // Header subtitle changes per step
  const headerSubtitle = isConfirming
    ? 'Confirm connection details'
    : isScanning
      ? 'Scanning project folder'
      : isConnecting
        ? 'Connecting to your project'
        : isLocal
          ? 'Connect to your localhost project'
          : 'Connect to your project'

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.6)' }}
    >
      <div
        className="w-[520px] max-h-[85vh] flex flex-col rounded-lg shadow-2xl overflow-hidden"
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Header */}
        <div
          className="px-6 pt-6 pb-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2.5 mb-1.5">
            {/* Plug icon */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22v-5" />
              <path d="M9 8V2" />
              <path d="M15 8V2" />
              <path d="M18 8v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8z" />
            </svg>
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              pAInt
            </span>
          </div>
          <p
            className="text-xs ml-[30px]"
            style={{ color: 'var(--text-secondary)' }}
          >
            {headerSubtitle}
          </p>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* ─── STEP: SETUP (disconnected) ─── */}
          {connectionStatus === 'disconnected' && (
            <>
              {/* Connection controls */}
              <div className="flex items-center gap-2">
                {/* URL mode toggle */}
                <button
                  onClick={() => {
                    setUrlMode(!urlMode)
                    setError(null)
                  }}
                  className="p-1.5 rounded transition-colors flex-shrink-0"
                  style={{
                    color: urlMode ? 'var(--accent)' : 'var(--text-muted)',
                    background: urlMode ? 'var(--accent-bg)' : 'transparent',
                  }}
                  title={
                    urlMode ? 'Switch to port selector' : 'Switch to URL input'
                  }
                >
                  {urlMode ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" />
                    </svg>
                  ) : (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  )}
                </button>

                {/* Port selector or URL input */}
                {urlMode ? (
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => {
                      setCustomUrl(e.target.value)
                      setError(null)
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="http://localhost:3000/path"
                    className="flex-1 text-xs rounded px-2.5 py-1.5 outline-none"
                    style={{
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                    }}
                    autoFocus
                  />
                ) : (
                  <select
                    value={selectedPort}
                    onChange={(e) => {
                      setSelectedPort(parseInt(e.target.value, 10))
                      setError(null)
                    }}
                    onKeyDown={handleKeyDown}
                    className="flex-1 text-xs rounded px-2.5 py-1.5 outline-none"
                    style={{
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {portOptions.map((port) => (
                      <option key={port} value={port}>
                        http://localhost:{port}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Breakpoint selector */}
              <div className="flex items-center gap-1.5 mt-3">
                <span
                  className="text-[11px] mr-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Viewport
                </span>
                {(
                  Object.entries(BREAKPOINTS) as [
                    Breakpoint,
                    { label: string; width: number },
                  ][]
                )
                  .reverse()
                  .map(([bp, { label, width }]) => (
                    <button
                      key={bp}
                      onClick={() => {
                        setActiveBreakpoint(bp)
                        setPreviewWidth(width)
                      }}
                      className="text-[11px] px-2.5 py-1 rounded transition-colors"
                      style={{
                        background:
                          activeBreakpoint === bp
                            ? 'var(--accent-bg)'
                            : 'var(--bg-tertiary)',
                        color:
                          activeBreakpoint === bp
                            ? 'var(--accent)'
                            : 'var(--text-secondary)',
                        border: `1px solid ${activeBreakpoint === bp ? 'var(--accent)' : 'var(--border)'}`,
                      }}
                    >
                      {label}
                      <span
                        className="ml-1"
                        style={{ color: 'var(--text-muted)', fontSize: '10px' }}
                      >
                        {width}px
                      </span>
                    </button>
                  ))}
              </div>

              {/* Project folder path (optional) */}
              <div className="mt-3">
                <span
                  className="text-[11px] mr-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Project folder
                  <span
                    className="ml-1"
                    style={{ color: 'var(--text-muted)', opacity: 0.6 }}
                  >
                    (optional)
                  </span>
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <div
                    className="flex-1 text-xs rounded px-2.5 py-1.5 font-mono truncate cursor-default select-none"
                    style={{
                      background: 'var(--bg-secondary)',
                      color: folderPath
                        ? 'var(--text-primary)'
                        : 'var(--text-muted)',
                      border: `1px solid ${folderError ? 'var(--error)' : 'var(--border)'}`,
                      minHeight: '28px',
                      lineHeight: '16px',
                    }}
                    title={folderPath || undefined}
                    onClick={handleBrowse}
                  >
                    {folderPath || 'Click Browse to select a folder'}
                  </div>
                  <button
                    onClick={handleBrowse}
                    disabled={isBrowsing}
                    className="px-2.5 py-1.5 text-[11px] rounded transition-colors flex-shrink-0"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                      opacity: isBrowsing ? 0.6 : 1,
                    }}
                    title="Browse for folder"
                  >
                    {isBrowsing ? '...' : 'Browse'}
                  </button>
                </div>
                {folderError && (
                  <p
                    className="text-[11px] mt-1"
                    style={{ color: 'var(--error)' }}
                  >
                    {folderError}
                  </p>
                )}
              </div>

              {/* Recent URLs */}
              {recentUrls.length > 0 && (
                <div className="mt-4">
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Recent
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {recentUrls.map((url) => (
                      <button
                        key={url}
                        onClick={() => handleRecentClick(url)}
                        className="text-[11px] px-2.5 py-1 rounded transition-colors"
                        style={{
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent)'
                          e.currentTarget.style.color = 'var(--text-primary)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border)'
                          e.currentTarget.style.color = 'var(--text-secondary)'
                        }}
                      >
                        {url.replace(/^https?:\/\//, '')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              <div
                className="h-px my-5"
                style={{ background: 'var(--border)' }}
              />

              {/* How to Use — collapsible */}
              <button
                onClick={() => setHowToOpen(!howToOpen)}
                className="flex items-center gap-2 w-full text-left"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-muted)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform flex-shrink-0"
                  style={{
                    transform: howToOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                <span
                  className="text-xs font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  How to Use
                </span>
              </button>

              {howToOpen && (
                <div
                  className="mt-3 rounded-lg px-4 py-4 text-xs leading-relaxed flex flex-col gap-4"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {/* Connection Methods */}
                  <div>
                    <h4
                      className="text-[11px] font-semibold uppercase tracking-wide mb-2"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Connection Methods
                    </h4>
                    <div className="flex flex-col gap-2">
                      <div>
                        <span style={{ color: 'var(--success)' }}>
                          Automatic (Reverse Proxy)
                        </span>{' '}
                        — Default. The editor loads your page through a built-in
                        proxy and injects the inspector script automatically.
                      </div>
                      <div>
                        <span style={{ color: 'var(--warning)' }}>
                          Manual (Script Tag)
                        </span>{' '}
                        — If auto-connect takes longer than 5s, add the provided
                        script tag to your project&apos;s HTML layout.
                      </div>
                      <div>
                        <span style={{ color: 'var(--accent)' }}>
                          React Native / Expo Web
                        </span>{' '}
                        — Add the inspector script dynamically in your root
                        layout:
                        <pre
                          className="mt-1.5 px-3 py-2.5 rounded text-[11px] leading-relaxed overflow-x-auto whitespace-pre"
                          style={{
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border)',
                          }}
                        >{`useEffect(() => {
  if (Platform.OS === 'web') {
    const script1 = document.createElement('script');
    script1.src = 'http://localhost:4000/dev-editor-inspector.js';
    document.body.appendChild(script1);

    const script2 = document.createElement('script');
    script2.src = 'https://dev-editor-flow.vercel.app/dev-editor-inspector.js';
    document.body.appendChild(script2);

    return () => {
      document.body.removeChild(script1);
      document.body.removeChild(script2);
    };
  }
}`}</pre>
                      </div>
                    </div>
                  </div>

                  {/* What You Can Do */}
                  <div>
                    <h4
                      className="text-[11px] font-semibold uppercase tracking-wide mb-2"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      What You Can Do
                    </h4>
                    <ul className="flex flex-col gap-1">
                      <li>
                        <span style={{ color: 'var(--accent)' }}>
                          Style Editing
                        </span>{' '}
                        — Adjust colors, spacing, typography, borders, and
                        layout live
                      </li>
                      <li>
                        <span style={{ color: 'var(--accent)' }}>
                          Responsive Testing
                        </span>{' '}
                        — Switch between Mobile, Tablet, and Desktop breakpoints
                      </li>
                      <li>
                        <span style={{ color: 'var(--accent)' }}>
                          Change Tracking
                        </span>{' '}
                        — Every edit recorded with original and new values
                      </li>
                      <li>
                        <span style={{ color: 'var(--accent)' }}>
                          Changelog Export
                        </span>{' '}
                        — Copy or send changes to Claude Code for source file
                        updates
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─── STEP: CONFIRM ─── */}
          {isConfirming && (
            <div className="flex flex-col gap-4">
              {/* URL summary */}
              <div>
                <span
                  className="text-[11px] font-medium"
                  style={{ color: 'var(--text-muted)' }}
                >
                  URL
                </span>
                <div
                  className="mt-1 text-xs rounded px-3 py-2 font-mono"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {pendingTargetUrl}
                </div>
              </div>

              {/* Folder summary */}
              <div>
                <span
                  className="text-[11px] font-medium"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Project Folder
                </span>
                <div
                  className="mt-1 text-xs rounded px-3 py-2 font-mono truncate"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                  }}
                  title={pendingFolderPath || undefined}
                >
                  {pendingFolderPath}
                </div>
              </div>

              <p
                className="text-[11px]"
                style={{ color: 'var(--text-secondary)' }}
              >
                Clicking Confirm will scan this folder for components and CSS
                files before loading the page.
              </p>
            </div>
          )}

          {/* ─── STEP: SCANNING ─── */}
          {isScanning && (
            <div className="flex flex-col items-center py-6 gap-4">
              <ScanAnimation active={!scanDone} label="SCANNING" />

              {/* Folder being scanned */}
              <p
                className="text-[11px] font-mono text-center truncate max-w-full px-4"
                style={{ color: 'var(--text-secondary)' }}
                title={pendingFolderPath || undefined}
              >
                {pendingFolderPath}
              </p>

              {/* Scan result feedback */}
              {scanDone && scanResult && scanResult.success && (
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className="text-xs font-medium text-center"
                    style={{ color: 'var(--success)' }}
                  >
                    {[
                      scanResult.count > 0
                        ? `${scanResult.count} component${scanResult.count !== 1 ? 's' : ''}`
                        : null,
                      scanResult.pageCount > 0
                        ? `${scanResult.pageCount} page${scanResult.pageCount !== 1 ? 's' : ''}`
                        : null,
                      scanResult.cssFileCount > 0
                        ? `${scanResult.cssFileCount} CSS file${scanResult.cssFileCount !== 1 ? 's' : ''}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'No files found'}
                  </div>
                  {(scanResult.framework ||
                    scanResult.cssStrategy.length > 0) && (
                    <div
                      className="text-[11px] text-center"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {[
                        scanResult.framework,
                        scanResult.cssStrategy.length > 0
                          ? scanResult.cssStrategy.join(', ')
                          : null,
                      ]
                        .filter(Boolean)
                        .join('  \u00b7  ')}
                    </div>
                  )}
                </div>
              )}
              {scanDone && scanResult && !scanResult.success && (
                <div
                  className="text-xs font-medium text-center"
                  style={{ color: 'var(--error)' }}
                >
                  {scanResult.error || 'Scan failed'}
                </div>
              )}

              {/* Error: continue anyway / back */}
              {scanDone && scanResult && !scanResult.success && (
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={handleBack}
                    className="px-4 py-1.5 text-[11px] rounded transition-colors"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleContinueAnyway}
                    className="px-4 py-1.5 text-[11px] rounded font-medium transition-colors"
                    style={{
                      background: 'var(--accent)',
                      color: '#fff',
                    }}
                  >
                    Continue anyway
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─── STEP: CONNECTING ─── */}
          {isConnecting && (
            <div className="flex flex-col items-center py-8 gap-3">
              {/* Spinner */}
              <div
                className="w-8 h-8 rounded-full"
                style={{
                  border: '2px solid var(--border)',
                  borderTopColor: 'var(--accent)',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Connecting to {targetUrl?.replace(/^https?:\/\//, '')}...
              </p>
            </div>
          )}
        </div>

        {/* Script fallback banner — shown after 5s of connecting */}
        {showScriptFallback && (
          <div
            className="px-6 py-3 flex-shrink-0"
            style={{
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
            }}
          >
            <div
              className="text-xs font-medium mb-1"
              style={{ color: 'var(--warning)' }}
            >
              {isLocal
                ? 'Inspector script not detected'
                : 'Script tag required'}
            </div>
            <div
              className="text-[11px] mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              {isLocal
                ? "Add this script tag to your project's HTML layout:"
                : "Since the editor is running remotely, add this script tag to your project's HTML layout to enable inspection:"}
            </div>
            <div className="flex items-center gap-2">
              <code
                className="flex-1 text-[11px] px-2 py-1.5 rounded overflow-x-auto whitespace-nowrap"
                style={{
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              >
                {`<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/dev-editor-inspector.js"></script>`}
              </code>
              <button
                onClick={handleCopyScript}
                className="px-3 py-1.5 text-[11px] font-medium rounded whitespace-nowrap transition-colors flex-shrink-0"
                style={{
                  background: scriptCopied ? 'var(--success)' : 'var(--accent)',
                  color: '#fff',
                }}
              >
                {scriptCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          className="px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {error && (
            <p className="text-xs mb-2" style={{ color: 'var(--error)' }}>
              {error}
            </p>
          )}

          {/* SETUP footer: Connect button */}
          {connectionStatus === 'disconnected' && (
            <>
              <button
                onClick={handleConnect}
                className="w-full py-2 text-xs rounded font-medium transition-colors"
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                }}
              >
                Connect
              </button>
              <div className="mt-3 text-center">
                <a
                  href="/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs no-underline transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = 'var(--accent)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = 'var(--text-muted)')
                  }
                >
                  Setup Guide & Docs
                </a>
              </div>
            </>
          )}

          {/* CONFIRM footer: Back + Confirm buttons */}
          {isConfirming && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="flex-1 py-2 text-xs rounded font-medium transition-colors"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2 text-xs rounded font-medium transition-colors"
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                }}
              >
                Confirm
              </button>
            </div>
          )}

          {/* SCANNING footer: Cancel */}
          {isScanning && !scanDone && (
            <button
              onClick={cancelConnection}
              className="w-full py-2 text-xs rounded font-medium transition-colors"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              Cancel
            </button>
          )}

          {/* CONNECTING footer: Cancel */}
          {isConnecting && (
            <button
              onClick={cancelConnection}
              className="w-full py-2 text-xs rounded font-medium transition-colors"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

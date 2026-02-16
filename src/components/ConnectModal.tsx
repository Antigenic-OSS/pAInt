'use client';

import { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '@/store';
import { normalizeTargetUrl } from '@/lib/utils';
import { BREAKPOINTS } from '@/lib/constants';
import type { Breakpoint } from '@/types/changelog';

export function ConnectModal() {
  const setTargetUrl = useEditorStore((s) => s.setTargetUrl);
  const setConnectionStatus = useEditorStore((s) => s.setConnectionStatus);
  const addRecentUrl = useEditorStore((s) => s.addRecentUrl);
  const connectionStatus = useEditorStore((s) => s.connectionStatus);
  const recentUrls = useEditorStore((s) => s.recentUrls);
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint);
  const setActiveBreakpoint = useEditorStore((s) => s.setActiveBreakpoint);
  const setPreviewWidth = useEditorStore((s) => s.setPreviewWidth);
  const portRoots = useEditorStore((s) => s.portRoots);
  const setProjectRoot = useEditorStore((s) => s.setProjectRoot);
  const setProjectScan = useEditorStore((s) => s.setProjectScan);

  const portOptions = Array.from({ length: 8 }, (_, i) => 3000 + i);
  const [selectedPort, setSelectedPort] = useState(3000);
  const [urlMode, setUrlMode] = useState(false);
  const [customUrl, setCustomUrl] = useState('http://localhost:3000');
  const [folderPath, setFolderPath] = useState('');
  const [folderError, setFolderError] = useState<string | null>(null);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [howToOpen, setHowToOpen] = useState(false);
  const [showScriptFallback, setShowScriptFallback] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isConnecting = connectionStatus === 'connecting';
  const targetUrl = useEditorStore((s) => s.targetUrl);

  // Show script tag fallback after 5s of connecting
  useEffect(() => {
    if (isConnecting && targetUrl) {
      fallbackTimerRef.current = setTimeout(() => {
        setShowScriptFallback(true);
      }, 5000);
    } else {
      setShowScriptFallback(false);
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    }
    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [isConnecting, targetUrl]);

  // Cancel current connection and reset to editable state
  const cancelConnection = () => {
    if (isConnecting) {
      setConnectionStatus('disconnected');
      setTargetUrl(null);
    }
    setShowScriptFallback(false);
    setScriptCopied(false);
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  };

  const handleCopyScript = async () => {
    const scriptTag = `<script src="${window.location.origin}/dev-editor-inspector.js"></script>`;
    try {
      await navigator.clipboard.writeText(scriptTag);
      setScriptCopied(true);
      setTimeout(() => setScriptCopied(false), 2000);
    } catch { /* fallback: user can manually copy */ }
  };

  // Pre-fill folder path from portRoots when selected URL changes
  const currentUrl = urlMode ? customUrl.trim() : `http://localhost:${selectedPort}`;
  useEffect(() => {
    const normalized = normalizeTargetUrl(currentUrl);
    const saved = portRoots[normalized];
    if (saved) {
      setFolderPath(saved);
      setFolderError(null);
    }
  }, [selectedPort, urlMode, currentUrl, portRoots]);

  const handleBrowse = async () => {
    setIsBrowsing(true);
    setFolderError(null);
    try {
      const res = await fetch('/api/claude/pick-folder');
      const data = await res.json();
      if (data.cancelled) {
        // User cancelled — do nothing
      } else if (data.path) {
        setFolderPath(data.path);
      } else if (data.error) {
        setFolderError(data.error);
      }
    } catch {
      setFolderError('Failed to open folder picker');
    } finally {
      setIsBrowsing(false);
    }
  };

  const handleConnect = () => {
    setError(null);
    setFolderError(null);
    const raw = urlMode ? customUrl.trim() : `http://localhost:${selectedPort}`;
    if (urlMode && !raw) {
      setError('Enter a URL');
      return;
    }
    const normalized = normalizeTargetUrl(raw);

    // Save folder path if provided
    const trimmedFolder = folderPath.trim();
    if (trimmedFolder) {
      setProjectRoot(normalized, trimmedFolder);

      // Fire-and-forget scan
      fetch('/api/project/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectRoot: trimmedFolder }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setProjectScan(normalized, data);
          }
        })
        .catch(() => { /* scan is best-effort */ });
    }

    setTargetUrl(normalized);
    setConnectionStatus('connecting');
    addRecentUrl(normalized);
  };

  const handleRecentClick = (url: string) => {
    cancelConnection();
    setError(null);
    // Pre-fill the URL input so the user can review before clicking Connect
    setUrlMode(true);
    setCustomUrl(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConnect();
    }
  };

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
              Dev Editor
            </span>
          </div>
          <p
            className="text-xs ml-[30px]"
            style={{ color: 'var(--text-secondary)' }}
          >
            Connect to your localhost project
          </p>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Connection controls */}
          <div className="flex items-center gap-2">
            {/* URL mode toggle */}
            <button
              onClick={() => {
                setUrlMode(!urlMode);
                setError(null);
                cancelConnection();
              }}
              className="p-1.5 rounded transition-colors flex-shrink-0"
              style={{
                color: urlMode ? 'var(--accent)' : 'var(--text-muted)',
                background: urlMode ? 'var(--accent-bg)' : 'transparent',
              }}
              title={urlMode ? 'Switch to port selector' : 'Switch to URL input'}
            >
              {urlMode ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                onChange={(e) => { setCustomUrl(e.target.value); setError(null); cancelConnection(); }}
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
                onChange={(e) => { setSelectedPort(parseInt(e.target.value, 10)); setError(null); cancelConnection(); }}
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
            {(Object.entries(BREAKPOINTS) as [Breakpoint, { label: string; width: number }][])
              .reverse()
              .map(([bp, { label, width }]) => (
                <button
                  key={bp}
                  onClick={() => {
                    setActiveBreakpoint(bp);
                    setPreviewWidth(width);
                  }}
                  className="text-[11px] px-2.5 py-1 rounded transition-colors"
                  style={{
                    background: activeBreakpoint === bp ? 'var(--accent-bg)' : 'var(--bg-tertiary)',
                    color: activeBreakpoint === bp ? 'var(--accent)' : 'var(--text-secondary)',
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
              <span className="ml-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                (optional)
              </span>
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <div
                className="flex-1 text-xs rounded px-2.5 py-1.5 font-mono truncate cursor-default select-none"
                style={{
                  background: 'var(--bg-secondary)',
                  color: folderPath ? 'var(--text-primary)' : 'var(--text-muted)',
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
              <p className="text-[11px] mt-1" style={{ color: 'var(--error)' }}>
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
                      e.currentTarget.style.borderColor = 'var(--accent)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
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
              {/* Quick Start */}
              <div>
                <h4
                  className="text-[11px] font-semibold uppercase tracking-wide mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Quick Start
                </h4>
                <ol className="list-decimal list-inside flex flex-col gap-1" style={{ color: 'var(--text-secondary)' }}>
                  <li>Start the Dev Editor: <code className="px-1 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--accent)' }}>bun dev</code></li>
                  <li>Start your target project&apos;s dev server</li>
                  <li>Open the Dev Editor in your browser</li>
                  <li>Select a port and click <strong style={{ color: 'var(--text-primary)' }}>Connect</strong></li>
                  <li>Start inspecting and editing elements</li>
                </ol>
              </div>

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
                    <span style={{ color: 'var(--success)' }}>Automatic (Reverse Proxy)</span> — Default. The editor loads your page through a built-in proxy and injects the inspector script automatically.
                  </div>
                  <div>
                    <span style={{ color: 'var(--warning)' }}>Manual (Script Tag)</span> — If auto-connect takes longer than 5s, add the provided script tag to your project&apos;s HTML layout.
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
                  <li><span style={{ color: 'var(--accent)' }}>Style Editing</span> — Adjust colors, spacing, typography, borders, and layout live</li>
                  <li><span style={{ color: 'var(--accent)' }}>Responsive Testing</span> — Switch between Mobile, Tablet, and Desktop breakpoints</li>
                  <li><span style={{ color: 'var(--accent)' }}>Change Tracking</span> — Every edit recorded with original and new values</li>
                  <li><span style={{ color: 'var(--accent)' }}>Changelog Export</span> — Copy or send changes to Claude Code for source file updates</li>
                </ul>
              </div>
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
              Inspector script not detected
            </div>
            <div
              className="text-[11px] mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              Add this script tag to your project&apos;s HTML layout:
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

        {/* Footer — Connect button */}
        <div
          className="px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {error && (
            <p className="text-xs mb-2" style={{ color: 'var(--error)' }}>
              {error}
            </p>
          )}
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full py-2 text-xs rounded font-medium transition-colors"
            style={{
              background: isConnecting ? 'var(--bg-hover)' : 'var(--accent)',
              color: isConnecting ? 'var(--text-secondary)' : '#fff',
              opacity: isConnecting ? 0.7 : 1,
            }}
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  );
}

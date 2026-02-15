'use client';

import { useState } from 'react';
import { useEditorStore } from '@/store';
import { normalizeTargetUrl } from '@/lib/utils';

export function TargetSelector() {
  const targetUrl = useEditorStore((s) => s.targetUrl);
  const connectionStatus = useEditorStore((s) => s.connectionStatus);
  const setTargetUrl = useEditorStore((s) => s.setTargetUrl);
  const setConnectionStatus = useEditorStore((s) => s.setConnectionStatus);
  const addRecentUrl = useEditorStore((s) => s.addRecentUrl);

  const portOptions = Array.from({ length: 8 }, (_, i) => 3000 + i);
  const getPortFromUrl = (url: string | null) => {
    if (!url) return 3000;
    const match = url.match(/:(\d+)/);
    return match ? parseInt(match[1], 10) : 3000;
  };
  const [selectedPort, setSelectedPort] = useState(getPortFromUrl(targetUrl));
  const [urlMode, setUrlMode] = useState(false);
  const [customUrl, setCustomUrl] = useState('http://localhost:3000');
  const [error, setError] = useState<string | null>(null);

  const isConnected = connectionStatus === 'connected';

  const handleConnect = () => {
    setError(null);
    const raw = urlMode ? customUrl.trim() : `http://localhost:${selectedPort}`;
    if (urlMode && !raw) {
      setError('Enter a URL');
      return;
    }
    const normalized = normalizeTargetUrl(raw);
    setTargetUrl(normalized);
    setConnectionStatus('connecting');
    addRecentUrl(normalized);
  };

  const handleDisconnect = () => {
    setTargetUrl(null);
    setConnectionStatus('disconnected');
    setError(null);
  };

  const handlePortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPort(parseInt(e.target.value, 10));
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isConnected) {
      handleConnect();
    }
  };

  const statusColor =
    connectionStatus === 'connected'
      ? 'var(--success)'
      : connectionStatus === 'connecting'
        ? 'var(--warning)'
        : 'var(--error)';

  return (
    <div className="flex items-center gap-2 relative">
      {/* Connection status dot */}
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: statusColor }}
        title={connectionStatus}
      />

      {/* Toggle between dropdown and URL input */}
      <button
        onClick={() => {
          if (!isConnected) {
            setUrlMode(!urlMode);
            setError(null);
          }
        }}
        className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors flex-shrink-0"
        style={{
          color: urlMode ? 'var(--accent)' : 'var(--text-muted)',
          cursor: isConnected ? 'default' : 'pointer',
          opacity: isConnected ? 0.5 : 1,
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

      {urlMode ? (
        <input
          type="text"
          value={customUrl}
          onChange={(e) => { setCustomUrl(e.target.value); setError(null); }}
          onKeyDown={handleKeyDown}
          disabled={isConnected}
          placeholder="http://localhost:3000/path"
          className="w-56 text-xs bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)] rounded px-2 py-1 outline-none focus:border-[var(--accent)]"
          style={{ opacity: isConnected ? 0.7 : 1 }}
        />
      ) : (
        <select
          value={selectedPort}
          onChange={handlePortChange}
          disabled={isConnected}
          className="w-56 text-xs bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)] rounded px-2 py-1 outline-none focus:border-[var(--accent)]"
          style={{ opacity: isConnected ? 0.7 : 1 }}
        >
          {portOptions.map((port) => (
            <option key={port} value={port}>
              http://localhost:{port}
            </option>
          ))}
        </select>
      )}

      {/* Connect / Disconnect button */}
      <button
        onClick={isConnected ? handleDisconnect : handleConnect}
        className="px-3 py-1 text-xs rounded transition-colors font-medium"
        style={{
          background: isConnected ? 'var(--bg-hover)' : 'var(--accent)',
          color: isConnected ? 'var(--text-secondary)' : '#fff',
        }}
      >
        {isConnected
          ? 'Disconnect'
          : connectionStatus === 'connecting'
            ? 'Connecting...'
            : 'Connect'}
      </button>

      {/* Error message */}
      {error && (
        <span className="text-xs absolute -bottom-5 left-6" style={{ color: 'var(--error)' }}>
          {error}
        </span>
      )}

    </div>
  );
}

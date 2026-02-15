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
  const [error, setError] = useState<string | null>(null);

  const handleConnect = () => {
    setError(null);
    const url = `http://localhost:${selectedPort}`;
    const normalized = normalizeTargetUrl(url);
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

      {/* Port dropdown */}
      <select
        value={selectedPort}
        onChange={handlePortChange}
        disabled={connectionStatus === 'connected'}
        className="w-56 text-xs bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)] rounded px-2 py-1 outline-none focus:border-[var(--accent)]"
        style={{
          opacity: connectionStatus === 'connected' ? 0.7 : 1,
        }}
      >
        {portOptions.map((port) => (
          <option key={port} value={port}>
            http://localhost:{port}
          </option>
        ))}
      </select>

      {/* Connect / Disconnect button */}
      <button
        onClick={connectionStatus === 'connected' ? handleDisconnect : handleConnect}
        className="px-3 py-1 text-xs rounded transition-colors font-medium"
        style={{
          background: connectionStatus === 'connected' ? 'var(--bg-hover)' : 'var(--accent)',
          color: connectionStatus === 'connected' ? 'var(--text-secondary)' : '#fff',
        }}
      >
        {connectionStatus === 'connected'
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

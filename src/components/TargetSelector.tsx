'use client';

import { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '@/store';
import { isLocalhostUrl, normalizeTargetUrl } from '@/lib/utils';

export function TargetSelector() {
  const targetUrl = useEditorStore((s) => s.targetUrl);
  const connectionStatus = useEditorStore((s) => s.connectionStatus);
  const recentUrls = useEditorStore((s) => s.recentUrls);
  const setTargetUrl = useEditorStore((s) => s.setTargetUrl);
  const setConnectionStatus = useEditorStore((s) => s.setConnectionStatus);
  const addRecentUrl = useEditorStore((s) => s.addRecentUrl);

  const [inputValue, setInputValue] = useState(targetUrl || '');
  const [showRecent, setShowRecent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!targetUrl) inputRef.current?.focus();
  }, [targetUrl]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowRecent(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConnect = () => {
    setError(null);
    const url = inputValue.trim();
    if (!url) return;

    // Add protocol if missing
    const fullUrl = url.startsWith('http') ? url : `http://${url}`;

    if (!isLocalhostUrl(fullUrl)) {
      setError('Only localhost URLs are allowed');
      return;
    }

    const normalized = normalizeTargetUrl(fullUrl);
    setTargetUrl(normalized);
    setConnectionStatus('connecting');
    addRecentUrl(normalized);
    setInputValue(normalized);
    setShowRecent(false);
  };

  const handleDisconnect = () => {
    setTargetUrl(null);
    setConnectionStatus('disconnected');
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (connectionStatus === 'connected') {
        handleDisconnect();
      } else {
        handleConnect();
      }
    }
  };

  const handleSelectRecent = (url: string) => {
    setInputValue(url);
    setShowRecent(false);
    setTargetUrl(url);
    setConnectionStatus('connecting');
  };

  const statusColor =
    connectionStatus === 'connected'
      ? 'var(--success)'
      : connectionStatus === 'connecting'
        ? 'var(--warning)'
        : 'var(--error)';

  return (
    <div className="flex items-center gap-2 relative" ref={dropdownRef}>
      {/* Connection status dot */}
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: statusColor }}
        title={connectionStatus}
      />

      {/* URL input */}
      <input
        ref={inputRef}
        type="url"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setError(null);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => recentUrls.length > 0 && !targetUrl && setShowRecent(true)}
        placeholder="http://localhost:3000"
        className="w-56 text-xs"
        disabled={connectionStatus === 'connected'}
        style={{
          opacity: connectionStatus === 'connected' ? 0.7 : 1,
        }}
      />

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

      {/* Recent URLs dropdown */}
      {showRecent && recentUrls.length > 0 && (
        <div
          className="absolute top-full left-6 mt-1 py-1 rounded shadow-lg z-50 min-w-56"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
        >
          <div
            className="px-3 py-1 text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            Recent
          </div>
          {recentUrls.map((url) => (
            <button
              key={url}
              onClick={() => handleSelectRecent(url)}
              className="block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-hover)] transition-colors"
              style={{ color: 'var(--text-primary)' }}
            >
              {url}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

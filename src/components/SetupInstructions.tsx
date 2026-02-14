'use client';

import { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '@/store';

export function SetupInstructions() {
  const connectionStatus = useEditorStore((s) => s.connectionStatus);
  const targetUrl = useEditorStore((s) => s.targetUrl);
  const [showInstructions, setShowInstructions] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (connectionStatus === 'connecting' && targetUrl) {
      timerRef.current = setTimeout(() => {
        setShowInstructions(true);
      }, 5000);
    } else {
      setShowInstructions(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [connectionStatus, targetUrl]);

  if (!showInstructions) return null;

  const scriptTag = `<script src="${window.location.origin}/dev-editor-inspector.js"></script>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(scriptTag);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text for manual copy
    }
  };

  return (
    <div
      className="absolute left-0 right-0 z-50 px-4 py-3"
      style={{
        top: '100%',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div
            className="text-xs font-medium mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            Inspector script not detected
          </div>
          <div
            className="text-xs mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            Add this script tag to your project&apos;s HTML layout:
          </div>
          <div className="flex items-center gap-2">
            <code
              className="flex-1 text-xs px-2 py-1.5 rounded overflow-x-auto whitespace-nowrap"
              style={{
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
            >
              {scriptTag}
            </code>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap transition-colors"
              style={{
                background: copied ? 'var(--success)' : 'var(--accent)',
                color: '#fff',
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

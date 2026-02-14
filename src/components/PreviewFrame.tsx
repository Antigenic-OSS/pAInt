'use client';

import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/store';
import { usePostMessage } from '@/hooks/usePostMessage';
import { PROXY_HEADER, BREAKPOINTS } from '@/lib/constants';

export function PreviewFrame() {
  const targetUrl = useEditorStore((s) => s.targetUrl);
  const connectionStatus = useEditorStore((s) => s.connectionStatus);
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint);
  const currentPagePath = useEditorStore((s) => s.currentPagePath);
  const setConnectionStatus = useEditorStore((s) => s.setConnectionStatus);
  const { iframeRef } = usePostMessage();
  const containerRef = useRef<HTMLDivElement>(null);
  // Track last iframe src to prevent double-loads (React Strict Mode runs
  // effects twice — mount, cleanup, remount). The ref persists across the
  // Strict Mode cycle so the second mount skips the redundant src assignment.
  const lastSrcRef = useRef<string | null>(null);

  useEffect(() => {
    if (!targetUrl || connectionStatus !== 'connecting') return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    const pagePath = currentPagePath === '/' ? '/' : currentPagePath;
    const newSrc = `/api/proxy${pagePath}?${PROXY_HEADER}=${encodeURIComponent(targetUrl)}`;

    // Only set src if it actually changed — prevents the iframe from
    // reloading on React Strict Mode remount or redundant effect runs.
    if (lastSrcRef.current !== newSrc) {
      lastSrcRef.current = newSrc;
      iframe.src = newSrc;
    }

    const handleError = () => {
      setConnectionStatus('disconnected');
    };

    iframe.addEventListener('error', handleError);

    return () => {
      iframe.removeEventListener('error', handleError);
    };
  }, [targetUrl, connectionStatus, currentPagePath, iframeRef, setConnectionStatus]);

  const breakpointWidth = BREAKPOINTS[activeBreakpoint].width;

  if (!targetUrl) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ background: 'var(--bg-primary)' }}
      >
        <div className="text-center">
          <div
            className="text-lg font-medium mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            No project connected
          </div>
          <div
            className="text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            Enter a localhost URL above to get started
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex items-start justify-center h-full overflow-auto"
      style={{ background: 'var(--bg-primary)', padding: '0' }}
    >
      <div
        className="h-full mx-auto transition-[width] duration-200"
        style={{
          width: activeBreakpoint === 'desktop' ? '100%' : breakpointWidth,
          maxWidth: '100%',
        }}
      >
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0"
          style={{
            background: '#fff',
            borderLeft: activeBreakpoint !== 'desktop' ? '1px solid var(--border)' : 'none',
            borderRight: activeBreakpoint !== 'desktop' ? '1px solid var(--border)' : 'none',
          }}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          title="Preview"
        />
      </div>
    </div>
  );
}

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
  const { iframeRef, sendToInspector } = usePostMessage();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!targetUrl || connectionStatus !== 'connecting') return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    // Set custom header via a hidden form approach won't work with iframes.
    // Instead, we'll load the proxy URL directly — the proxy reads the target
    // from a query parameter as a fallback.
    const pagePath = currentPagePath === '/' ? '/' : currentPagePath;
    iframe.src = `/api/proxy${pagePath}?${PROXY_HEADER}=${encodeURIComponent(targetUrl)}`;

    const handleLoad = () => {
      // The inspector script will send INSPECTOR_READY via postMessage
    };

    const handleError = () => {
      setConnectionStatus('disconnected');
    };

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    return () => {
      iframe.removeEventListener('load', handleLoad);
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

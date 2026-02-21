'use client';

import { useState } from 'react';
import { useEditorStore } from '@/store';

export function ProjectFolderBanner() {
  const connectionStatus = useEditorStore((s) => s.connectionStatus);
  const targetUrl = useEditorStore((s) => s.targetUrl);
  const portRoots = useEditorStore((s) => s.portRoots);
  const scanStatus = useEditorStore((s) => s.scanStatus);
  const scanError = useEditorStore((s) => s.scanError);
  const scannedProjectName = useEditorStore((s) => s.scannedProjectName);
  const componentFileMap = useEditorStore((s) => s.componentFileMap);

  const [dismissed, setDismissed] = useState(false);

  const hasProjectRoot = targetUrl ? !!portRoots[targetUrl] : false;

  // Don't show if not connected or dismissed
  if (connectionStatus !== 'connected' || dismissed) return null;

  // Show scan results feedback if project root is set
  if (hasProjectRoot && scanStatus === 'complete' && componentFileMap) {
    const count = Object.keys(componentFileMap).length;
    return (
      <div
        className="flex items-center justify-between px-3 py-1.5 text-xs"
        style={{
          background: count > 0 ? 'rgba(74, 222, 128, 0.08)' : 'rgba(251, 191, 36, 0.08)',
          borderBottom: '1px solid var(--border)',
          color: count > 0 ? 'var(--success)' : 'var(--warning)',
        }}
      >
        <span>
          {count > 0
            ? `Found ${count} components in ${scannedProjectName || 'project'}`
            : `No component files found — check project folder`}
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="ml-2 px-1.5 py-0.5 rounded text-[10px] hover:bg-[var(--bg-hover)] transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          Dismiss
        </button>
      </div>
    );
  }

  // Show scan error
  if (hasProjectRoot && scanStatus === 'error') {
    return (
      <div
        className="flex items-center justify-between px-3 py-1.5 text-xs"
        style={{
          background: 'rgba(248, 113, 113, 0.08)',
          borderBottom: '1px solid var(--border)',
          color: 'var(--error)',
        }}
      >
        <span>{scanError || 'Scan failed'}</span>
        <button
          onClick={() => setDismissed(true)}
          className="ml-2 px-1.5 py-0.5 rounded text-[10px] hover:bg-[var(--bg-hover)] transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          Dismiss
        </button>
      </div>
    );
  }

  // Show scanning indicator
  if (hasProjectRoot && scanStatus === 'scanning') {
    return (
      <div
        className="flex items-center px-3 py-1.5 text-xs"
        style={{
          background: 'rgba(74, 158, 255, 0.06)',
          borderBottom: '1px solid var(--border)',
          color: 'var(--text-secondary)',
        }}
      >
        Scanning project for components...
      </div>
    );
  }

  return null;
}

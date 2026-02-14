'use client';

import { useMemo, useState, useCallback } from 'react';
import { useEditorStore } from '@/store';
import { useChangeTracker } from '@/hooks/useChangeTracker';
import { BREAKPOINTS, buildInstructionsFooter } from '@/lib/constants';
import { inferSourcePath } from '@/lib/classifyElement';
import type { StyleChange, ElementSnapshot } from '@/types/changelog';

function CopyIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function buildSingleElementLog(snapshot: ElementSnapshot, changes: StyleChange[]): string {
  const lines: string[] = [];

  const sourcePath = inferSourcePath({
    tagName: snapshot.tagName,
    className: snapshot.className,
    id: snapshot.elementId,
    selectorPath: snapshot.selectorPath,
    pagePath: snapshot.pagePath,
  });

  const attrParts: string[] = [];
  if (snapshot.elementId) attrParts.push(`id="${snapshot.elementId}"`);
  if (snapshot.className) attrParts.push(`class="${snapshot.className}"`);
  const tag = `<${snapshot.tagName}${attrParts.length ? ' ' + attrParts.join(' ') : ''}>`;

  lines.push('SOURCE');
  lines.push(sourcePath);
  lines.push('');
  lines.push('ELEMENT');
  lines.push(tag);
  lines.push('');
  lines.push('APPLIES TO');
  lines.push(snapshot.changeScope === 'all' ? 'All breakpoints' : `${changes[0]?.breakpoint || 'mobile'} only`);
  lines.push('');
  lines.push('PATH');
  lines.push(snapshot.selectorPath);
  lines.push('');

  const attrEntries = Object.entries(snapshot.attributes);
  if (attrEntries.length > 0) {
    lines.push('ATTRIBUTES');
    for (const [key, value] of attrEntries) {
      lines.push(`  ${key}: ${value}`);
    }
    lines.push('');
  }

  const styleKeys = ['color', 'background-color', 'font-size', 'font-family', 'display', 'position'];
  lines.push('COMPUTED STYLES');
  for (const key of styleKeys) {
    if (snapshot.computedStyles[key]) {
      lines.push(`  ${key}: ${snapshot.computedStyles[key]}`);
    }
  }
  lines.push('');

  if (snapshot.innerText) {
    lines.push('INNER TEXT');
    lines.push(snapshot.innerText);
    lines.push('');
  }

  lines.push('CHANGES');
  for (const c of changes) {
    lines.push(`  ${c.property}: "${c.originalValue}" → "${c.newValue}" [${c.breakpoint}]`);
  }
  lines.push('');
  lines.push(buildInstructionsFooter(changes.length, 1));

  return lines.join('\n').trim();
}

function buildGlobalLog(opts: {
  groups: Array<{ snapshot: ElementSnapshot; changes: StyleChange[] }>;
  targetUrl: string | null;
  pagePath: string;
  breakpoint: string;
  breakpointWidth: number;
}): string {
  const lines: string[] = [];
  const totalChanges = opts.groups.reduce((sum, g) => sum + g.changes.length, 0);

  lines.push('=== DEV EDITOR CHANGELOG ===');
  if (opts.targetUrl) {
    lines.push(`Project URL: ${opts.targetUrl}`);
    lines.push(`Page: ${opts.pagePath || '/'}`);
    lines.push(`Breakpoint: ${opts.breakpoint} (${opts.breakpointWidth}px)`);
  }
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  for (const { snapshot, changes } of opts.groups) {
    lines.push(buildSingleElementLog(snapshot, changes));
    lines.push('');
    lines.push('');
  }

  lines.push(buildInstructionsFooter(totalChanges, opts.groups.length));

  return lines.join('\n').trim();
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);
  return { copied, copy };
}

function CopyButton({ text, size = 11 }: { text: string; size?: number }) {
  const { copied, copy } = useCopy();
  return (
    <button
      onClick={(e) => { e.stopPropagation(); copy(text); }}
      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors flex-shrink-0"
      style={{
        color: copied ? 'var(--success)' : 'var(--text-muted)',
        background: 'transparent',
      }}
      title="Copy to clipboard"
    >
      {copied ? <CheckIcon size={size} /> : <CopyIcon size={size} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function GlobalCopyButton({ text }: { text: string }) {
  const { copied, copy } = useCopy();
  return (
    <button
      onClick={() => copy(text)}
      className="w-full py-1.5 px-3 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
      style={{
        background: copied ? 'var(--success)' : 'var(--accent)',
        color: '#fff',
      }}
    >
      {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
      {copied ? 'Copied!' : 'Copy All Changes'}
    </button>
  );
}

function ElementAccordion({
  snapshot,
  changes,
  onRevert,
}: {
  snapshot: ElementSnapshot;
  changes: StyleChange[];
  onRevert: (id: string, selector: string, property: string) => void;
}) {
  const [open, setOpen] = useState(true);

  const logText = useMemo(() => buildSingleElementLog(snapshot, changes), [snapshot, changes]);

  const sourcePath = inferSourcePath({
    tagName: snapshot.tagName,
    className: snapshot.className,
    id: snapshot.elementId,
    selectorPath: snapshot.selectorPath,
    pagePath: snapshot.pagePath,
  });

  const label = snapshot.elementId
    ? `${snapshot.tagName}#${snapshot.elementId}`
    : snapshot.tagName;

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      {/* Accordion header */}
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center w-full px-3 py-2 text-xs hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open); } }}
      >
        <span
          className="mr-2 text-[10px] transition-transform"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        >
          ▼
        </span>
        <span className="flex-1 text-left truncate" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--accent)' }}>{label}</span>
          <span style={{ color: 'var(--text-muted)' }}> · {sourcePath} · {changes.length} change{changes.length !== 1 ? 's' : ''}</span>
        </span>
        <CopyButton text={logText} />
      </div>

      {/* Accordion body */}
      {open && (
        <div className="px-3 pb-3">
          <pre
            className="text-[11px] font-mono whitespace-pre-wrap break-words leading-relaxed mb-2"
            style={{ color: 'var(--text-muted)' }}
          >
            {logText}
          </pre>

          {/* Per-change undo buttons */}
          <div className="space-y-1">
            {changes.map((change) => (
              <div key={change.id} className="flex items-center justify-between text-xs">
                <span className="truncate" style={{ color: 'var(--text-muted)' }}>
                  {change.property}: <span style={{ color: 'var(--success)' }}>{change.newValue}</span>
                </span>
                <button
                  onClick={() => onRevert(change.id, change.elementSelector, change.property)}
                  className="px-1.5 py-0.5 text-[10px] rounded flex-shrink-0 ml-2"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  Undo
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChangeScopeToggle() {
  const changeScope = useEditorStore((s) => s.changeScope);
  const setChangeScope = useEditorStore((s) => s.setChangeScope);
  const updateAllSnapshotsScope = useEditorStore((s) => s.updateAllSnapshotsScope);
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint);

  const handleScopeChange = useCallback((scope: 'all' | 'breakpoint-only') => {
    setChangeScope(scope);
    updateAllSnapshotsScope(scope);
  }, [setChangeScope, updateAllSnapshotsScope]);

  return (
    <div
      className="flex items-center justify-between px-3 py-1.5"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
        Apply to
      </span>
      <div className="flex items-center gap-0.5 rounded p-0.5" style={{ background: 'var(--bg-tertiary)' }}>
        <button
          onClick={() => handleScopeChange('all')}
          className="px-2 py-0.5 text-[11px] rounded transition-colors"
          style={{
            background: changeScope === 'all' ? 'var(--accent-bg, rgba(74,158,255,0.15))' : 'transparent',
            color: changeScope === 'all' ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          All
        </button>
        <button
          onClick={() => handleScopeChange('breakpoint-only')}
          className="px-2 py-0.5 text-[11px] rounded transition-colors capitalize"
          style={{
            background: changeScope === 'breakpoint-only' ? 'var(--accent-bg, rgba(74,158,255,0.15))' : 'transparent',
            color: changeScope === 'breakpoint-only' ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          {activeBreakpoint} only
        </button>
      </div>
    </div>
  );
}

export function ChangesPanel() {
  const [showConfirm, setShowConfirm] = useState(false);

  const styleChanges = useEditorStore((s) => s.styleChanges);
  const elementSnapshots = useEditorStore((s) => s.elementSnapshots);
  const targetUrl = useEditorStore((s) => s.targetUrl);
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint);
  const currentPagePath = useEditorStore((s) => s.currentPagePath);
  const { revertChange, revertAll } = useChangeTracker();

  // Group changes by element selector
  const groups = useMemo(() => {
    const map = new Map<string, StyleChange[]>();
    for (const change of styleChanges) {
      const existing = map.get(change.elementSelector) || [];
      existing.push(change);
      map.set(change.elementSelector, existing);
    }
    const result: Array<{ selector: string; snapshot: ElementSnapshot; changes: StyleChange[] }> = [];
    for (const [selector, changes] of map) {
      const snapshot = elementSnapshots[selector];
      if (snapshot) {
        result.push({ selector, snapshot, changes });
      }
    }
    return result;
  }, [styleChanges, elementSnapshots]);

  const globalLogText = useMemo(() => buildGlobalLog({
    groups,
    targetUrl,
    pagePath: currentPagePath,
    breakpoint: activeBreakpoint,
    breakpointWidth: BREAKPOINTS[activeBreakpoint].width,
  }), [groups, targetUrl, currentPagePath, activeBreakpoint]);

  const handleClearAll = useCallback(() => {
    revertAll();
    setShowConfirm(false);
  }, [revertAll]);

  if (styleChanges.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-full text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        No changes tracked yet
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Scope toggle */}
      <ChangeScopeToggle />

      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {styleChanges.length} change{styleChanges.length !== 1 ? 's' : ''} · {groups.length} element{groups.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Per-element accordions */}
      <div className="flex-1 overflow-y-auto">
        {groups.map(({ selector, snapshot, changes }) => (
          <ElementAccordion
            key={selector}
            snapshot={snapshot}
            changes={changes}
            onRevert={revertChange}
          />
        ))}
      </div>

      {/* Global actions at bottom */}
      <div className="flex-shrink-0 flex flex-col gap-2 p-3" style={{ borderTop: '1px solid var(--border)' }}>
        <GlobalCopyButton text={globalLogText} />

        {showConfirm ? (
          <div className="flex gap-2">
            <button
              onClick={handleClearAll}
              className="flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors"
              style={{ background: 'var(--error)', color: '#fff' }}
            >
              Confirm Clear
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full py-1.5 px-3 rounded text-xs font-medium transition-colors"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
          >
            Clear All Changes
          </button>
        )}
      </div>
    </div>
  );
}

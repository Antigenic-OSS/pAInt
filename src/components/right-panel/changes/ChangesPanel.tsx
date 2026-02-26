'use client';

import { useMemo, useState, useCallback, useRef } from 'react';
import { useEditorStore } from '@/store';
import { useChangeTracker } from '@/hooks/useChangeTracker';
import { buildInstructionsFooter, getBreakpointDeviceInfo } from '@/lib/constants';
import { inferSourcePath } from '@/lib/classifyElement';
import { camelToKebab } from '@/lib/utils';
import { consumeClaudeStream, formatStderrLine } from '@/lib/claude-stream';
import { EditablePre } from '@/components/common/EditablePre';
import { AiScanResultPanel } from './AiScanResultPanel';
import type { StyleChange, ElementSnapshot, Breakpoint } from '@/types/changelog';
import type { FileMap, ClaudeScanResponse } from '@/types/claude';

type BreakpointGroupKey = 'all' | 'desktop-only' | 'tablet-only' | 'mobile-only';

const GROUP_ORDER: BreakpointGroupKey[] = ['all', 'desktop-only', 'tablet-only', 'mobile-only'];

const GROUP_META: Record<BreakpointGroupKey, { label: string }> = {
  'all':           { label: 'All' },
  'desktop-only':  { label: 'Desktop Only' },
  'tablet-only':   { label: 'Tablet Only' },
  'mobile-only':   { label: 'Mobile Only' },
};

function getGroupKey(change: StyleChange): BreakpointGroupKey {
  const scope = change.changeScope ?? 'all';
  if (scope === 'all') return 'all';
  return `${change.breakpoint}-only` as BreakpointGroupKey;
}

function truncateText(text: string, maxLen: number): string {
  if (!text) return '(empty)';
  if (text.length <= maxLen) return `"${text}"`;
  return `"${text.substring(0, maxLen)}..."`;
}

/** Extract component name from c- prefixed class (e.g. "c-header" → "Header", "c-nav-bar" → "Nav Bar") */
function getComponentName(className: string | null | undefined): string | null {
  if (!className) return null;
  const match = className.split(/\s+/).find((cls) => cls.startsWith('c-') && cls.length > 2);
  if (!match) return null;
  return match.substring(2).split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

function buildComponentCreationLog(extraction: StyleChange): string {
  const lines: string[] = [];
  try {
    const data = JSON.parse(extraction.newValue) as {
      name: string;
      variants: Array<{ groupName: string; options: string[] }>;
    };
    const kebabName = data.name
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/\s+/g, '-')
      .toLowerCase();

    lines.push('=== COMPONENT EXTRACTION ===');
    lines.push('');
    lines.push(`### ${data.name} Component`);
    lines.push(`- Selector: \`${extraction.elementSelector}\``);
    lines.push(`- Suggested file: \`src/components/${kebabName}.tsx\``);
    if (data.variants.length > 0) {
      lines.push('- Suggested props:');
      for (const v of data.variants) {
        lines.push(`  - ${v.groupName.toLowerCase()}: ${v.options.join(' | ')}`);
      }
    }
    lines.push('');
    lines.push('## Instructions for Claude Code');
    lines.push(`Extract the element at selector \`${extraction.elementSelector}\` into a`);
    lines.push(`reusable React component named \`${data.name}\`.`);
    if (data.variants.length > 0) {
      lines.push('Accept the following props for variant control:');
      for (const v of data.variants) {
        lines.push(`  - ${v.groupName.toLowerCase()}: ${v.options.join(' | ')}`);
      }
    }
    lines.push('=== END COMPONENT EXTRACTION ===');
  } catch {
    lines.push(`Create component from ${extraction.elementSelector}`);
  }
  return lines.join('\n');
}

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

function buildSingleElementLog(snapshot: ElementSnapshot, changes: StyleChange[], fileMap?: FileMap | null, projectRoot?: string | null, framework?: string | null, cssStrategy?: string[] | null): string {
  const lines: string[] = [];
  const isMobileApp = framework === 'flutter' || framework === 'react-native';

  const attrParts: string[] = [];
  if (snapshot.elementId) attrParts.push(`id="${snapshot.elementId}"`);
  if (snapshot.className) attrParts.push(`class="${snapshot.className}"`);
  const tag = `<${snapshot.tagName}${attrParts.length ? ' ' + attrParts.join(' ') : ''}>`;

  const changeBp = (changes[0]?.breakpoint || 'mobile') as Breakpoint;
  const { deviceName, range } = getBreakpointDeviceInfo(changeBp);

  const compName = getComponentName(snapshot.className);
  if (compName) {
    lines.push('COMPONENT NAME');
    lines.push(compName);
    lines.push('');
  }

  lines.push('CHANGES');
  for (const c of changes) {
    if (c.property === '__element_deleted__') {
      lines.push(`  element deleted (was display: ${c.originalValue})`);
    } else if (c.property === '__text_content__') {
      lines.push(`  text content: "${c.originalValue}" → "${c.newValue}"`);
    } else {
      const cInfo = getBreakpointDeviceInfo(c.breakpoint);
      lines.push(`  ${camelToKebab(c.property)}: "${c.originalValue}" → "${c.newValue}" [${cInfo.deviceName} ${cInfo.range}]`);
    }
  }
  lines.push('');

  lines.push('PAGE NAME');
  lines.push(snapshot.pagePath || '/');
  lines.push('');

  lines.push('ELEMENT');
  lines.push(tag);
  lines.push('');

  if (!isMobileApp) {
    lines.push('DEVICE');
    lines.push(`Device Name: ${deviceName}`);
    lines.push(`Breakpoint: ${range}`);
    lines.push('');
    lines.push('APPLIES TO');
    lines.push(snapshot.changeScope === 'all' ? 'All breakpoints' : `${deviceName} (${range})`);
    lines.push('');
  }

  const attrEntries = Object.entries(snapshot.attributes);
  if (attrEntries.length > 0) {
    lines.push('ATTRIBUTES');
    for (const [key, value] of attrEntries) {
      lines.push(`  ${key}: ${value}`);
    }
    lines.push('');
  }

  if (snapshot.innerText) {
    lines.push('INNER TEXT');
    lines.push(snapshot.innerText);
    lines.push('');
  }

  lines.push(buildInstructionsFooter(changes.length, 1, { framework, cssStrategy }));

  return lines.join('\n').trim();
}

function buildElementSection(snapshot: ElementSnapshot, changes: StyleChange[], fileMap?: FileMap | null, projectRoot?: string | null, framework?: string | null, cssStrategy?: string[] | null): string {
  const lines: string[] = [];
  const isMobileApp = framework === 'flutter' || framework === 'react-native';

  const attrParts: string[] = [];
  if (snapshot.elementId) attrParts.push(`id="${snapshot.elementId}"`);
  if (snapshot.className) attrParts.push(`class="${snapshot.className}"`);
  const tag = `<${snapshot.tagName}${attrParts.length ? ' ' + attrParts.join(' ') : ''}>`;

  const changeBp = (changes[0]?.breakpoint || 'mobile') as Breakpoint;
  const { deviceName: elDevice, range: elRange } = getBreakpointDeviceInfo(changeBp);

  const compName = getComponentName(snapshot.className);
  if (compName) {
    lines.push('COMPONENT NAME');
    lines.push(compName);
    lines.push('');
  }

  lines.push('CHANGES');
  for (const c of changes) {
    if (c.property === '__element_deleted__') {
      lines.push(`  element deleted (was display: ${c.originalValue})`);
    } else if (c.property === '__text_content__') {
      lines.push(`  text content: "${c.originalValue}" → "${c.newValue}"`);
    } else {
      const cInfo = getBreakpointDeviceInfo(c.breakpoint);
      lines.push(`  ${camelToKebab(c.property)}: "${c.originalValue}" → "${c.newValue}" [${cInfo.deviceName} ${cInfo.range}]`);
    }
  }
  lines.push('');

  lines.push('PAGE NAME');
  lines.push(snapshot.pagePath || '/');
  lines.push('');

  lines.push('ELEMENT');
  lines.push(tag);
  lines.push('');

  if (!isMobileApp) {
    lines.push('APPLIES TO');
    lines.push(snapshot.changeScope === 'all' ? 'All breakpoints' : `${elDevice} (${elRange})`);
    lines.push('');
  }

  const attrEntries = Object.entries(snapshot.attributes);
  if (attrEntries.length > 0) {
    lines.push('ATTRIBUTES');
    for (const [key, value] of attrEntries) {
      lines.push(`  ${key}: ${value}`);
    }
    lines.push('');
  }

  if (snapshot.innerText) {
    lines.push('INNER TEXT');
    lines.push(snapshot.innerText);
    lines.push('');
  }

  return lines.join('\n');
}

function buildGroupLog(opts: {
  groupLabel: string;
  elements: Array<{ snapshot: ElementSnapshot; changes: StyleChange[] }>;
  targetUrl: string | null;
  pagePath: string;
  breakpoint: Breakpoint;
  fileMap?: FileMap | null;
  projectRoot?: string | null;
  framework?: string | null;
  cssStrategy?: string[] | null;
}): string {
  const lines: string[] = [];
  const isMobileApp = opts.framework === 'flutter' || opts.framework === 'react-native';
  const totalChanges = opts.elements.reduce((sum, g) => sum + g.changes.length, 0);
  const { deviceName, range } = getBreakpointDeviceInfo(opts.breakpoint);

  lines.push('=== DEV EDITOR CHANGELOG ===');
  lines.push(`Scope: ${opts.groupLabel}`);
  if (opts.targetUrl) {
    lines.push(`Project URL: ${opts.targetUrl}`);
    lines.push(`Page: ${opts.pagePath || '/'}`);
    if (!isMobileApp) {
      lines.push(`Device Name: ${deviceName}`);
      lines.push(`Breakpoint: ${range}`);
    }
  }
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  for (let i = 0; i < opts.elements.length; i++) {
    const { snapshot, changes } = opts.elements[i];
    lines.push(buildElementSection(snapshot, changes, opts.fileMap, opts.projectRoot, opts.framework, opts.cssStrategy));
    if (i < opts.elements.length - 1) {
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  lines.push('');
  lines.push(buildInstructionsFooter(totalChanges, opts.elements.length, { framework: opts.framework, cssStrategy: opts.cssStrategy }));

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

function ClearIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ElementAccordion({
  snapshot,
  changes,
  onRevert,
  liveStyles,
  fileMap,
  projectRoot,
  framework,
  cssStrategy,
}: {
  snapshot: ElementSnapshot;
  changes: StyleChange[];
  onRevert: (id: string, selector: string, property: string) => void;
  /** When provided (current element), use these as display values instead of change.newValue. */
  liveStyles?: Record<string, string>;
  fileMap?: FileMap | null;
  projectRoot?: string | null;
  framework?: string | null;
  cssStrategy?: string[] | null;
}) {
  const [open, setOpen] = useState(false);
  const editedTextRef = useRef<string | null>(null);

  const logText = useMemo(() => buildSingleElementLog(snapshot, changes, fileMap, projectRoot, framework, cssStrategy), [snapshot, changes, fileMap, projectRoot, framework, cssStrategy]);

  const copyText = editedTextRef.current ?? logText;

  const handleTextChange = useCallback((edited: string) => {
    editedTextRef.current = edited === logText ? null : edited;
  }, [logText]);

  const sourcePath = inferSourcePath({
    tagName: snapshot.tagName,
    className: snapshot.className,
    id: snapshot.elementId,
    selectorPath: snapshot.selectorPath,
    pagePath: snapshot.pagePath,
    fileMap,
    sourceInfo: snapshot.sourceInfo,
    projectRoot,
  });

  const compName = getComponentName(snapshot.className);
  const label = compName
    ? compName
    : snapshot.elementId
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
          <span style={{ color: compName ? '#4ade80' : 'var(--accent)' }}>{label}</span>
          {compName && <span style={{ color: 'var(--text-muted)' }}> ({snapshot.tagName})</span>}
          <span style={{ color: 'var(--text-muted)' }}> · {sourcePath} · {changes.length} change{changes.length !== 1 ? 's' : ''}</span>
        </span>
        <CopyButton text={copyText} />
        <button
          onClick={(e) => {
            e.stopPropagation();
            for (const c of changes) {
              onRevert(c.id, c.elementSelector, c.property);
            }
          }}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors flex-shrink-0 hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-muted)' }}
          title="Clear all changes for this element"
        >
          <ClearIcon size={11} />
          Clear
        </button>
      </div>

      {/* Accordion body */}
      {open && (
        <div className="px-3 pb-3">
          <EditablePre
            text={logText}
            onTextChange={handleTextChange}
            className="text-[11px] font-mono whitespace-pre-wrap break-words leading-relaxed mb-2"
            style={{ color: 'var(--text-muted)' }}
          />

          {/* Per-change undo buttons */}
          <div className="space-y-1">
            {changes.map((change) => {
              const displayVal = (liveStyles && change.property !== '__text_content__' && change.property !== '__element_deleted__')
                ? (liveStyles[change.property] ?? change.newValue)
                : change.newValue;
              return (
              <div key={change.id} className="flex items-center justify-between text-xs">
                <span className="truncate" style={{ color: 'var(--text-muted)' }}>
                  {change.property === '__element_deleted__' ? (
                    <span style={{ color: 'var(--error)' }}>element deleted</span>
                  ) : change.property === '__text_content__' ? (
                    <>
                      text: <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>{truncateText(change.originalValue, 20)}</span>
                      {' → '}
                      <span style={{ color: 'var(--success)' }}>{truncateText(change.newValue, 20)}</span>
                    </>
                  ) : (
                    <>
                      {camelToKebab(change.property)}: <span style={{ color: 'var(--success)' }}>{displayVal}</span>
                    </>
                  )}
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
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface BreakpointGroupData {
  key: BreakpointGroupKey;
  label: string;
  elements: Array<{ selector: string; snapshot: ElementSnapshot; changes: StyleChange[] }>;
  allChanges: StyleChange[];
}

function BreakpointGroupAccordion({
  group,
  targetUrl,
  pagePath,
  breakpoint,
  onRevert,
  isActiveBreakpoint,
  selectorPath,
  computedStyles,
  fileMap,
  projectRoot,
  framework,
  cssStrategy,
}: {
  group: BreakpointGroupData;
  targetUrl: string | null;
  pagePath: string;
  breakpoint: Breakpoint;
  onRevert: (id: string, selector: string, property: string) => void;
  isActiveBreakpoint: boolean;
  selectorPath?: string | null;
  computedStyles?: Record<string, string>;
  fileMap?: FileMap | null;
  projectRoot?: string | null;
  framework?: string | null;
  cssStrategy?: string[] | null;
}) {
  const [open, setOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const groupLogText = useMemo(() => buildGroupLog({
    groupLabel: group.label,
    elements: group.elements,
    targetUrl,
    pagePath,
    breakpoint,
    fileMap,
    projectRoot,
    framework,
    cssStrategy,
  }), [group, targetUrl, pagePath, breakpoint, fileMap, projectRoot, framework, cssStrategy]);

  const totalChanges = group.allChanges.length;
  const isEmpty = group.elements.length === 0;

  const handleClearGroup = useCallback(() => {
    for (const c of group.allChanges) {
      onRevert(c.id, c.elementSelector, c.property);
    }
    setShowConfirm(false);
  }, [group.allChanges, onRevert]);

  return (
    <div style={{ borderBottom: '2px solid var(--border)' }}>
      {/* Group header */}
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center w-full px-3 py-2 text-xs hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
        style={{ background: 'rgba(42,42,42,0.5)' }}
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
        <span className="flex-1 text-left font-medium" style={{ color: 'var(--text-primary)' }}>
          {group.label}
          <span className="font-normal ml-2" style={{ color: 'var(--text-muted)' }}>
            {totalChanges} change{totalChanges !== 1 ? 's' : ''}
          </span>
        </span>
        {!isEmpty && (
          <>
            <CopyButton text={groupLogText} size={11} />
            {showConfirm ? (
              <span className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={handleClearGroup}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors"
                  style={{ background: 'var(--error)', color: '#fff' }}
                >
                  Confirm
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-1.5 py-0.5 rounded text-[10px] transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors flex-shrink-0 hover:bg-[var(--bg-hover)]"
                style={{ color: 'var(--text-muted)' }}
                title={`Clear all ${group.label.toLowerCase()} changes`}
              >
                <ClearIcon size={11} />
                Clear
              </button>
            )}
          </>
        )}
      </div>

      {/* Group body: scope toggle + element accordions or empty state */}
      {open && (
        <div>
          {isActiveBreakpoint && <ChangeScopeToggle />}
          {isEmpty ? (
            <div
              className="px-3 py-3 text-[11px]"
              style={{ color: 'var(--text-muted)' }}
            >
              No changes
            </div>
          ) : (
            group.elements.map(({ selector, snapshot, changes }) => (
              <ElementAccordion
                key={selector}
                snapshot={snapshot}
                changes={changes}
                onRevert={onRevert}
                liveStyles={selector === selectorPath ? computedStyles : undefined}
                fileMap={fileMap}
                projectRoot={projectRoot}
                framework={framework}
                cssStrategy={cssStrategy}
              />
            ))
          )}
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

function ScanIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}

function SpinnerIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className="animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function BottomActionBar({
  copyAllText,
  changeCount,
  showClearConfirm,
  onClearAll,
  onShowClearConfirm,
  onCancelClear,
  onAiScan,
  aiScanStatus,
}: {
  copyAllText: string;
  changeCount: number;
  showClearConfirm: boolean;
  onClearAll: () => void;
  onShowClearConfirm: () => void;
  onCancelClear: () => void;
  onAiScan: () => void;
  aiScanStatus: 'idle' | 'scanning' | 'complete' | 'error';
}) {
  const { copied, copy } = useCopy();

  return (
    <div
      className="flex-shrink-0 px-3 py-3 flex flex-col gap-2"
      style={{
        borderTop: '1px solid var(--border)',
        background: 'linear-gradient(to top, rgba(30,30,30,0.95), rgba(30,30,30,0.8))',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Primary: Copy All Changes */}
      <button
        onClick={() => copy(copyAllText)}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-[12px] font-medium transition-all"
        style={{
          background: copied
            ? 'rgba(74, 222, 128, 0.15)'
            : 'rgba(74, 158, 255, 0.12)',
          color: copied ? 'var(--success)' : 'var(--accent)',
          border: `1px solid ${copied ? 'rgba(74, 222, 128, 0.3)' : 'rgba(74, 158, 255, 0.25)'}`,
        }}
      >
        {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
        {copied ? 'Copied to clipboard' : `Copy All Changes (${changeCount})`}
      </button>

      {/* AI Scan */}
      <button
        onClick={onAiScan}
        disabled={aiScanStatus === 'scanning'}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md text-[12px] font-medium transition-all disabled:opacity-60"
        style={{
          background: aiScanStatus === 'scanning'
            ? 'rgba(168, 85, 247, 0.06)'
            : 'rgba(168, 85, 247, 0.12)',
          color: aiScanStatus === 'scanning' ? 'var(--text-muted)' : '#a855f7',
          border: `1px solid ${aiScanStatus === 'scanning' ? 'var(--border)' : 'rgba(168, 85, 247, 0.25)'}`,
        }}
      >
        {aiScanStatus === 'scanning' ? <SpinnerIcon size={14} /> : <ScanIcon size={14} />}
        {aiScanStatus === 'scanning' ? 'Scanning...' : 'AI Scan'}
      </button>

      {/* Secondary: Clear */}
      {showClearConfirm ? (
        <div className="flex items-center gap-2">
          <button
            onClick={onClearAll}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-[12px] font-medium transition-all"
            style={{
              background: 'rgba(248, 113, 113, 0.15)',
              color: 'var(--error)',
              border: '1px solid rgba(248, 113, 113, 0.3)',
            }}
          >
            <ClearIcon size={12} />
            Confirm Clear
          </button>
          <button
            onClick={onCancelClear}
            className="py-2 px-4 rounded-md text-[12px] transition-all"
            style={{
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={onShowClearConfirm}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-md text-[12px] transition-all"
          style={{
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
          }}
          title="Clear all changes"
        >
          <ClearIcon size={12} />
          Clear All Changes
        </button>
      )}
    </div>
  );
}

export function ChangesPanel() {
  const styleChanges = useEditorStore((s) => s.styleChanges);
  const elementSnapshots = useEditorStore((s) => s.elementSnapshots);
  const targetUrl = useEditorStore((s) => s.targetUrl);
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint);
  const currentPagePath = useEditorStore((s) => s.currentPagePath);
  const selectorPath = useEditorStore((s) => s.selectorPath);
  const computedStyles = useEditorStore((s) => s.computedStyles);
  const getProjectScanForUrl = useEditorStore((s) => s.getProjectScanForUrl);
  const getProjectRootForUrl = useEditorStore((s) => s.getProjectRootForUrl);
  const aiScanStatus = useEditorStore((s) => s.aiScanStatus);
  const aiScanResult = useEditorStore((s) => s.aiScanResult);
  const aiScanError = useEditorStore((s) => s.aiScanError);
  const setAiScanStatus = useEditorStore((s) => s.setAiScanStatus);
  const setAiScanResult = useEditorStore((s) => s.setAiScanResult);
  const setAiScanError = useEditorStore((s) => s.setAiScanError);
  const resetAiScan = useEditorStore((s) => s.resetAiScan);
  const showToast = useEditorStore((s) => s.showToast);
  const setActiveRightTab = useEditorStore((s) => s.setActiveRightTab);
  const removeStyleChange = useEditorStore((s) => s.removeStyleChange);
  const removeCreatedComponent = useEditorStore((s) => s.removeCreatedComponent);
  const { revertChange } = useChangeTracker();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const setActiveLeftTab = useEditorStore((s) => s.setActiveLeftTab);
  const scanAbortRef = useRef<AbortController | null>(null);

  const projectScan = useMemo(() => {
    return getProjectScanForUrl(targetUrl);
  }, [targetUrl, getProjectScanForUrl]);

  const fileMap = projectScan?.fileMap ?? null;
  const framework = projectScan?.framework ?? null;
  const cssStrategy = projectScan?.cssStrategy ?? null;

  const projectRoot = useMemo(() => {
    return getProjectRootForUrl(targetUrl);
  }, [targetUrl, getProjectRootForUrl]);

  // Separate component extractions from regular changes
  const { componentExtractions, regularChanges } = useMemo(() => {
    const extractions: StyleChange[] = [];
    const regular: StyleChange[] = [];
    for (const change of styleChanges) {
      if (change.property === '__component_creation__') {
        extractions.push(change);
      } else {
        regular.push(change);
      }
    }
    return { componentExtractions: extractions, regularChanges: regular };
  }, [styleChanges]);

  // Filter regular changes to current breakpoint
  const breakpointChanges = useMemo(() => {
    return regularChanges.filter((c) => c.breakpoint === activeBreakpoint);
  }, [regularChanges, activeBreakpoint]);

  // Group filtered changes by element selector
  const elementGroups = useMemo(() => {
    const elementMap = new Map<string, StyleChange[]>();
    for (const change of breakpointChanges) {
      const existing = elementMap.get(change.elementSelector) || [];
      existing.push(change);
      elementMap.set(change.elementSelector, existing);
    }

    const elements: Array<{ selector: string; snapshot: ElementSnapshot; changes: StyleChange[] }> = [];
    for (const [selector, changes] of elementMap) {
      const snapshot = elementSnapshots[selector];
      if (snapshot) {
        elements.push({ selector, snapshot, changes });
      }
    }
    return elements;
  }, [breakpointChanges, elementSnapshots]);

  // Build "Copy All" log text (includes component extractions)
  const copyAllText = useMemo(() => {
    const hasChanges = elementGroups.length > 0;
    const hasExtractions = componentExtractions.length > 0;
    if (!hasChanges && !hasExtractions) return '';

    const parts: string[] = [];

    // Component extractions section
    if (hasExtractions) {
      for (const extraction of componentExtractions) {
        parts.push(buildComponentCreationLog(extraction));
      }
    }

    // Style changes section
    if (hasChanges) {
      parts.push(buildGroupLog({
        groupLabel: 'All Changes',
        elements: elementGroups,
        targetUrl,
        pagePath: currentPagePath,
        breakpoint: activeBreakpoint,
        fileMap,
        projectRoot,
        framework,
        cssStrategy,
      }));
    }

    return parts.join('\n\n');
  }, [elementGroups, componentExtractions, targetUrl, currentPagePath, activeBreakpoint, fileMap, projectRoot, framework, cssStrategy]);

  const handleRevertExtraction = useCallback((extraction: StyleChange) => {
    removeStyleChange(extraction.id);
    removeCreatedComponent(extraction.elementSelector);
  }, [removeStyleChange, removeCreatedComponent]);

  const handleClearAll = useCallback(() => {
    // Revert component extractions
    for (const extraction of componentExtractions) {
      handleRevertExtraction(extraction);
    }
    // Revert style changes
    for (const { changes } of elementGroups) {
      for (const c of changes) {
        revertChange(c.id, c.elementSelector, c.property);
      }
    }
    resetAiScan();
    setShowClearConfirm(false);
  }, [elementGroups, componentExtractions, revertChange, handleRevertExtraction, resetAiScan]);

  const handleAiScan = useCallback(() => {
    if (!targetUrl || !projectRoot || breakpointChanges.length === 0) return;

    setAiScanStatus('scanning');
    setAiScanError(null);

    // Auto-switch to Terminal tab so user sees progress
    setActiveLeftTab('terminal');

    // Write header to terminal
    const write = useEditorStore.getState().writeToTerminal;
    write?.('\r\n\x1b[1;35m  AI Scan: Analyzing project...\x1b[0m\r\n');

    // Abort any previous scan stream
    scanAbortRef.current?.abort();

    const controller = consumeClaudeStream<ClaudeScanResponse>(
      '/api/claude/scan',
      { changelog: copyAllText, projectRoot, projectScan },
      {
        onStderr: (line: string) => {
          const w = useEditorStore.getState().writeToTerminal;
          const formatted = formatStderrLine(line);
          if (formatted) w?.(formatted + '\r\n');
        },
        onResult: (data: ClaudeScanResponse) => {
          setAiScanResult(data);
          setAiScanStatus('complete');
          showToast('success', 'AI Scan complete');
          const w = useEditorStore.getState().writeToTerminal;
          w?.('\x1b[32m  AI Scan complete.\x1b[0m\r\n');
        },
        onError: (err: { code: string; message: string }) => {
          setAiScanStatus('error');
          setAiScanError(err.message);
          showToast('error', err.message || 'AI Scan failed');
          const w = useEditorStore.getState().writeToTerminal;
          w?.(`\x1b[31m  Error: ${err.message}\x1b[0m\r\n`);
        },
      },
    );

    scanAbortRef.current = controller;
  }, [targetUrl, projectRoot, breakpointChanges.length, copyAllText, projectScan, setAiScanStatus, setAiScanError, setAiScanResult, showToast, setActiveLeftTab]);

  const handleSendToClaudeCode = useCallback((prompt: string) => {
    // Store the edited prompt so ClaudeIntegrationPanel can pick it up
    setAiScanResult({ ...(aiScanResult!), smartPrompt: prompt });
    setActiveRightTab('claude');
  }, [aiScanResult, setAiScanResult, setActiveRightTab]);

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

  if (breakpointChanges.length === 0 && componentExtractions.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <ChangeScopeToggle />
        <div
          className="flex items-center justify-center flex-1 text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          No changes on {activeBreakpoint}
        </div>
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
          {breakpointChanges.length} change{breakpointChanges.length !== 1 ? 's' : ''} · {elementGroups.length} element{elementGroups.length !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1">
          <CopyButton text={copyAllText} size={11} />
          {showClearConfirm ? (
            <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={handleClearAll}
                className="px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors"
                style={{ background: 'var(--error)', color: '#fff' }}
              >
                Confirm
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-1.5 py-0.5 rounded text-[10px] transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors flex-shrink-0 hover:bg-[var(--bg-hover)]"
              style={{ color: 'var(--text-muted)' }}
              title="Clear all changes"
            >
              <ClearIcon size={11} />
              Clear
            </button>
          )}
        </span>
      </div>

      {/* Flat element list */}
      <div className="flex-1 overflow-y-auto">
        {/* Component extraction entries */}
        {componentExtractions.map((extraction) => {
          let name = 'Component';
          try {
            const data = JSON.parse(extraction.newValue);
            name = data.name || 'Component';
          } catch { /* use default */ }
          return (
            <div
              key={extraction.id}
              className="flex items-center gap-2 px-3 py-2 text-xs"
              style={{
                borderBottom: '1px solid var(--border)',
                borderLeft: '2px solid var(--accent)',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="flex-shrink-0"
              >
                <rect x="1" y="4" width="14" height="8" rx="1.5" />
                <path d="M4 4V2.5A1.5 1.5 0 0 1 5.5 1h5A1.5 1.5 0 0 1 12 2.5V4" />
              </svg>
              <div className="truncate flex-1">
                <div className="truncate font-medium" style={{ color: 'var(--accent)' }}>
                  Create {name} component
                </div>
                <div className="truncate" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                  {extraction.elementSelector}
                </div>
              </div>
              <CopyButton text={buildComponentCreationLog(extraction)} size={11} />
              <button
                onClick={() => handleRevertExtraction(extraction)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors flex-shrink-0 hover:bg-[var(--bg-hover)]"
                style={{ color: 'var(--text-muted)' }}
                title="Remove component extraction"
              >
                <ClearIcon size={11} />
                Clear
              </button>
            </div>
          );
        })}

        {elementGroups.map(({ selector, snapshot, changes }) => (
          <ElementAccordion
            key={selector}
            snapshot={snapshot}
            changes={changes}
            onRevert={revertChange}
            liveStyles={selector === selectorPath ? computedStyles : undefined}
            fileMap={fileMap}
            projectRoot={projectRoot}
            framework={framework}
            cssStrategy={cssStrategy}
          />
        ))}
      </div>

      {/* AI Scan result panel */}
      {aiScanStatus === 'complete' && aiScanResult && (
        <AiScanResultPanel
          result={aiScanResult}
          onDismiss={resetAiScan}
          onSendToClaudeCode={handleSendToClaudeCode}
        />
      )}

      {/* AI Scan error */}
      {aiScanStatus === 'error' && (
        <div
          className="mx-3 mt-2 px-2 py-1.5 rounded text-[11px]"
          style={{
            background: 'rgba(248, 113, 113, 0.08)',
            border: '1px solid rgba(248, 113, 113, 0.25)',
            color: 'var(--error)',
          }}
        >
          {aiScanError?.includes('not authenticated') || aiScanError?.includes('claude login') ? (
            <>
              <span className="font-medium">Claude CLI not authenticated.</span>{' '}
              Run{' '}
              <code
                className="px-1 py-0.5 rounded text-[10px]"
                style={{ background: 'rgba(248, 113, 113, 0.15)' }}
              >
                claude login
              </code>{' '}
              in your terminal, then try again.
            </>
          ) : (
            aiScanError || 'AI Scan failed. Try again.'
          )}
        </div>
      )}

      {/* Bottom action bar */}
      {breakpointChanges.length > 0 && (
        <BottomActionBar
          copyAllText={copyAllText}
          changeCount={breakpointChanges.length}
          showClearConfirm={showClearConfirm}
          onClearAll={handleClearAll}
          onShowClearConfirm={() => setShowClearConfirm(true)}
          onCancelClear={() => setShowClearConfirm(false)}
          onAiScan={handleAiScan}
          aiScanStatus={aiScanStatus}
        />
      )}
    </div>
  );
}

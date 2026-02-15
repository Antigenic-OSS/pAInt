'use client';

import { useMemo, useState, useCallback, useRef } from 'react';
import { useEditorStore } from '@/store';
import { inferSourcePath } from '@/lib/classifyElement';
import { buildInstructionsFooter, BREAKPOINTS, getBreakpointDeviceInfo, getBreakpointRange } from '@/lib/constants';
import { EditablePre } from '@/components/common/EditablePre';
import type { Breakpoint } from '@/types/changelog';

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

function buildElementLogText(opts: {
  tagName: string | null;
  className: string | null;
  elementId: string | null;
  selectorPath: string | null;
  attributes: Record<string, string>;
  innerText: string | null;
  computedStyles: Record<string, string>;
  pagePath: string;
  changeScope: 'all' | 'breakpoint-only';
  activeBreakpoint: Breakpoint;
  changeCount: number;
}): string {
  const lines: string[] = [];
  if (!opts.tagName) return '';

  const attrParts: string[] = [];
  if (opts.elementId) attrParts.push(`id="${opts.elementId}"`);
  if (opts.className) attrParts.push(`class="${opts.className}"`);
  const tag = `<${opts.tagName}${attrParts.length ? ' ' + attrParts.join(' ') : ''}>`;

  const sourcePath = inferSourcePath({
    tagName: opts.tagName,
    className: opts.className,
    id: opts.elementId,
    selectorPath: opts.selectorPath,
    pagePath: opts.pagePath,
  });

  const { deviceName, range } = getBreakpointDeviceInfo(opts.activeBreakpoint);

  lines.push('SOURCE');
  lines.push(sourcePath);
  lines.push('');

  lines.push('ELEMENT');
  lines.push(tag);
  lines.push('');

  lines.push('DEVICE');
  lines.push(`Device Name: ${deviceName}`);
  lines.push(`Breakpoint: ${range}`);
  lines.push('');

  lines.push('APPLIES TO');
  lines.push(opts.changeScope === 'all' ? 'All breakpoints' : `${deviceName} (${range})`);
  lines.push('');

  if (opts.selectorPath) {
    lines.push('PATH');
    lines.push(opts.selectorPath);
    lines.push('');
  }

  const attrEntries = Object.entries(opts.attributes);
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
    if (opts.computedStyles[key]) {
      lines.push(`  ${key}: ${opts.computedStyles[key]}`);
    }
  }
  lines.push('');

  if (opts.innerText) {
    lines.push('INNER TEXT');
    lines.push(opts.innerText);
    lines.push('');
  }

  lines.push(buildInstructionsFooter(opts.changeCount, 1));

  return lines.join('\n').trim();
}

export function ElementLogBox() {
  const [copied, setCopied] = useState(false);
  const editedTextRef = useRef<string | null>(null);

  const tagName = useEditorStore((s) => s.tagName);
  const className = useEditorStore((s) => s.className);
  const elementId = useEditorStore((s) => s.elementId);
  const selectorPath = useEditorStore((s) => s.selectorPath);
  const attributes = useEditorStore((s) => s.attributes);
  const innerText = useEditorStore((s) => s.innerText);
  const computedStyles = useEditorStore((s) => s.computedStyles);
  const currentPagePath = useEditorStore((s) => s.currentPagePath);
  const changeScope = useEditorStore((s) => s.changeScope);
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint);
  const styleChanges = useEditorStore((s) => s.styleChanges);

  const changeCount = useMemo(() => {
    if (!selectorPath) return 0;
    return styleChanges.filter((c) => c.elementSelector === selectorPath).length;
  }, [styleChanges, selectorPath]);

  const logText = useMemo(() => buildElementLogText({
    tagName, className, elementId, selectorPath,
    attributes, innerText, computedStyles,
    pagePath: currentPagePath, changeScope, activeBreakpoint, changeCount,
  }), [tagName, className, elementId, selectorPath, attributes, innerText, computedStyles, currentPagePath, changeScope, activeBreakpoint, changeCount]);

  const handleTextChange = useCallback((edited: string) => {
    editedTextRef.current = edited === logText ? null : edited;
  }, [logText]);

  const handleCopy = useCallback(async () => {
    const textToCopy = editedTextRef.current ?? logText;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [logText]);

  if (!tagName) return null;

  return (
    <div>
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          Element Info
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors"
          style={{
            color: copied ? 'var(--success)' : 'var(--text-muted)',
            background: 'transparent',
          }}
          title="Copy to clipboard"
        >
          {copied ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="px-3 pb-3">
        <EditablePre
          text={logText}
          onTextChange={handleTextChange}
          className="text-[11px] font-mono whitespace-pre-wrap break-words leading-relaxed"
          style={{ color: 'var(--text-muted)' }}
        />
      </div>
    </div>
  );
}

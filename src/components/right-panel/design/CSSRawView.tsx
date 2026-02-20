'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useEditorStore } from '@/store';
import { CSS_PROPERTIES } from '@/lib/constants';
import { camelToKebab } from '@/lib/utils';

const GROUP_LABELS: Record<string, string> = {
  size: 'Size',
  spacing: 'Spacing',
  typography: 'Typography',
  border: 'Border',
  background: 'Background',
  layout: 'Layout',
  position: 'Position',
  appearance: 'Appearance',
  shadow: 'Shadow',
  'flex-item': 'Flex Item',
  transform: 'Transform',
  filter: 'Filter',
};

// ─── Changes Summary Modal ────────────────────────────────────────

function ChangesSummaryModal({ onClose }: { onClose: () => void }) {
  const selectorPath = useEditorStore((s) => s.selectorPath);
  const styleChanges = useEditorStore((s) => s.styleChanges);
  const computedStyles = useEditorStore((s) => s.computedStyles);
  const modalRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Derive changed entries from styleChanges but read the current value
  // from computedStyles (the CSS tab source of truth).
  const changes = useMemo(
    () =>
      styleChanges
        .filter((c) => c.elementSelector === selectorPath)
        .map((c) => ({
          ...c,
          displayValue: computedStyles[c.property] ?? c.newValue,
        })),
    [styleChanges, selectorPath, computedStyles]
  );

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const cssText = useMemo(() => {
    return changes
      .map((c) => `${camelToKebab(c.property)}: ${c.displayValue};`)
      .join('\n');
  }, [changes]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(cssText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [cssText]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
    >
      <div
        ref={modalRef}
        className="w-[320px] max-h-[400px] flex flex-col rounded-lg overflow-hidden"
        style={{
          background: 'var(--bg-secondary, #252526)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
            Changed Properties
            <span className="ml-1.5 opacity-50">({changes.length})</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-5 h-5 rounded hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg width={10} height={10} viewBox="0 0 10 10" fill="none">
              <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {changes.length === 0 ? (
            <div className="py-4 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
              No changes on this element
            </div>
          ) : (
            changes.map((c) => (
              <div key={c.id} className="text-[11px] font-mono leading-relaxed">
                <span style={{ color: 'var(--accent)' }}>{camelToKebab(c.property)}</span>
                <span style={{ color: 'var(--text-muted)' }}>: </span>
                <span style={{ color: 'var(--text-primary)' }}>{c.displayValue}</span>
                <span style={{ color: 'var(--text-muted)' }}>;</span>
                {/* Original value hint */}
                <span className="ml-2 text-[10px]" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                  was {c.originalValue}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {changes.length > 0 && (
          <div
            className="flex items-center justify-end px-3 py-2 shrink-0"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <button
              onClick={handleCopy}
              className="h-6 px-3 rounded text-[11px] hover:opacity-80 transition-opacity"
              style={{
                background: copied ? 'rgba(78,201,176,0.15)' : 'rgba(74,158,255,0.12)',
                color: copied ? 'var(--success, #4ec9b0)' : 'var(--accent)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {copied ? 'Copied!' : 'Copy Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CSS Raw View ─────────────────────────────────────────────────

export function CSSRawView() {
  const computedStyles = useEditorStore((state) => state.computedStyles);
  const selectorPath = useEditorStore((s) => s.selectorPath);
  const styleChanges = useEditorStore((s) => s.styleChanges);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showModal, setShowModal] = useState(false);
  const [copyToast, setCopyToast] = useState(false);

  // Set of camelCase property names changed on this element
  const changedProps = useMemo(() => {
    const set = new Set<string>();
    for (const c of styleChanges) {
      if (c.elementSelector === selectorPath) set.add(c.property);
    }
    return set;
  }, [styleChanges, selectorPath]);

  const groups = useMemo(() => {
    const result: { name: string; label: string; properties: { name: string; value: string; changed: boolean }[] }[] = [];

    for (const [groupName, props] of Object.entries(CSS_PROPERTIES)) {
      const properties: { name: string; value: string; changed: boolean }[] = [];
      for (const prop of props) {
        // Convert kebab-case CSS prop to camelCase for lookup
        const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        const value = computedStyles[camelProp];
        if (value !== undefined && value !== '') {
          const kebabName = camelToKebab(camelProp);
          if (!search || kebabName.includes(search.toLowerCase())) {
            properties.push({ name: kebabName, value, changed: changedProps.has(camelProp) });
          }
        }
      }
      if (properties.length > 0) {
        result.push({
          name: groupName,
          label: GROUP_LABELS[groupName] || groupName,
          properties,
        });
      }
    }
    return result;
  }, [computedStyles, search, changedProps]);

  const handleCopyAll = useCallback(() => {
    const lines: string[] = [];
    for (const group of groups) {
      lines.push(`/* ${group.label} */`);
      for (const prop of group.properties) {
        lines.push(`${prop.name}: ${prop.value};`);
      }
      lines.push('');
    }
    navigator.clipboard.writeText(lines.join('\n'));
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 1500);
  }, [groups]);

  const toggleGroup = (name: string) => {
    setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div style={{ background: 'var(--bg-secondary)' }}>
      {/* Search + Copy */}
      <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search properties..."
          className="flex-1 h-6 px-2 rounded text-[11px] outline-none"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />
        {changedProps.size > 0 && (
          <button
            onClick={() => setShowModal(true)}
            className="h-6 px-2 rounded text-[11px] hover:opacity-80 transition-opacity whitespace-nowrap shrink-0"
            style={{
              background: 'rgba(74,158,255,0.12)',
              border: '1px solid rgba(74,158,255,0.25)',
              color: 'var(--accent)',
            }}
          >
            Changes ({changedProps.size})
          </button>
        )}
        <button
          onClick={handleCopyAll}
          className="h-6 px-2 rounded text-[11px] hover:opacity-80 transition-all shrink-0"
          style={{
            background: copyToast ? 'rgba(78,201,176,0.15)' : 'var(--bg-tertiary)',
            border: copyToast ? '1px solid rgba(78,201,176,0.3)' : '1px solid var(--border)',
            color: copyToast ? 'var(--success, #4ec9b0)' : 'var(--text-secondary)',
          }}
        >
          {copyToast ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {showModal && <ChangesSummaryModal onClose={() => setShowModal(false)} />}

      {/* Property groups */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        {groups.map((group) => {
          const groupChangedCount = group.properties.filter((p) => p.changed).length;
          const hasChanges = groupChangedCount > 0;
          return (
          <div key={group.name} style={{ borderBottom: '1px solid var(--border)' }}>
            <button
              onClick={() => toggleGroup(group.name)}
              className="flex items-center w-full px-3 py-1.5 text-[10px] font-medium hover:bg-[var(--bg-hover)] transition-colors"
              style={{ color: hasChanges ? 'var(--warning, #dcdcaa)' : 'var(--text-muted)' }}
            >
              <span
                className="mr-1.5 text-[8px] transition-transform"
                style={{ transform: collapsed[group.name] ? 'rotate(-90deg)' : 'rotate(0deg)' }}
              >
                ▼
              </span>
              {group.label}
              <span className="ml-1 opacity-50">({group.properties.length})</span>
              {hasChanges && (
                <span
                  className="ml-1.5 px-1 rounded text-[9px]"
                  style={{ background: 'rgba(220,220,170,0.12)', color: 'var(--warning, #dcdcaa)' }}
                >
                  {groupChangedCount}
                </span>
              )}
            </button>
            {!collapsed[group.name] && (
              <div className="px-3 pb-2 space-y-0.5">
                {group.properties.map((prop) => (
                  <div
                    key={prop.name}
                    className="flex text-[11px] font-mono leading-tight"
                    style={prop.changed ? { background: 'rgba(74,158,255,0.06)', borderRadius: 2, padding: '1px 3px', margin: '0 -3px' } : undefined}
                  >
                    <span style={{ color: prop.changed ? 'var(--warning, #dcdcaa)' : 'var(--accent)' }}>{prop.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>:&nbsp;</span>
                    <span style={{ color: prop.changed ? 'var(--success, #4ec9b0)' : 'var(--text-primary)' }}>{prop.value}</span>
                    <span style={{ color: 'var(--text-muted)' }}>;</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          );
        })}
        {groups.length === 0 && (
          <div className="px-3 py-4 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            {search ? 'No matching properties' : 'No computed styles available'}
          </div>
        )}
      </div>
    </div>
  );
}

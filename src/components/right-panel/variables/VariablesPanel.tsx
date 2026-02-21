'use client';

import { useState, useMemo, useCallback } from 'react';
import { useEditorStore } from '@/store';
import {
  formatTokenDisplayName,
  isColorValue,
  toDisplayableColor,
} from '@/lib/cssVariableUtils';
import type { CSSVariableFamily, CSSVariableFamilyMember } from '@/types/cssVariables';

// ─── Filter types ────────────────────────────────────────────────

type FilterType = 'all' | 'colors' | 'sizing' | 'other';

function classifyValue(value: string): FilterType {
  if (isColorValue(value)) return 'colors';
  const trimmed = value.trim().toLowerCase();
  if (/^-?[\d.]+\s*(px|rem|em|%|vh|vw|vmin|vmax|ch|ex|svh|dvh|lvh|cqw|cqi)$/.test(trimmed)) return 'sizing';
  return 'other';
}

// ─── Variable Row ────────────────────────────────────────────────

function VariableRow({
  name,
  value,
  resolvedValue,
  onCopy,
}: {
  name: string;
  value: string;
  resolvedValue: string;
  onCopy: (varName: string) => void;
}) {
  const displayName = formatTokenDisplayName(name);
  const isColor = isColorValue(resolvedValue);

  return (
    <button
      onClick={() => onCopy(name)}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:brightness-110 transition-colors"
      style={{ background: 'transparent' }}
      title={`Click to copy var(${name})\nValue: ${value}`}
    >
      {isColor ? (
        <div
          className="w-4 h-4 rounded flex-shrink-0"
          style={{
            background: toDisplayableColor(resolvedValue),
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        />
      ) : (
        <div
          className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-[8px] font-bold"
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
          }}
        >
          V
        </div>
      )}
      <span
        className="flex-1 text-[11px] truncate"
        style={{ color: 'var(--text-primary)' }}
      >
        {displayName}
      </span>
      <span
        className="text-[10px] flex-shrink-0 truncate max-w-[100px] text-right tabular-nums"
        style={{ color: 'var(--text-muted)' }}
      >
        {value}
      </span>
    </button>
  );
}

// ─── Family Section ──────────────────────────────────────────────

function FamilySection({
  family,
  isCollapsed,
  onToggleCollapse,
  onCopy,
}: {
  family: CSSVariableFamily;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onCopy: (varName: string) => void;
}) {
  const displayPrefix = formatTokenDisplayName(family.prefix);

  return (
    <div>
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left"
        style={{ color: 'var(--text-secondary)' }}
      >
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          className={`flex-shrink-0 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
        >
          <path d="M1.5 2L4 5.5L6.5 2" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <span className="text-[10px] font-medium tracking-wide">{displayPrefix}</span>
        <span className="text-[9px] ml-auto" style={{ color: 'var(--text-muted)' }}>
          {family.members.length}
        </span>
      </button>
      {!isCollapsed &&
        family.members.map((member: CSSVariableFamilyMember) => (
          <VariableRow
            key={member.name}
            name={member.name}
            value={member.value}
            resolvedValue={member.resolvedValue}
            onCopy={onCopy}
          />
        ))}
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────

export function VariablesPanel() {
  const definitions = useEditorStore((s) => s.cssVariableDefinitions);
  const families = useEditorStore((s) => s.cssVariableFamilies);
  const showToast = useEditorStore((s) => s.showToast);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [collapsedFamilies, setCollapsedFamilies] = useState<Set<string>>(new Set());

  const totalCount = Object.keys(definitions).length;

  // Filter definitions by type
  const filteredDefinitions = useMemo(() => {
    if (filter === 'all') return definitions;
    const result: typeof definitions = {};
    for (const [name, def] of Object.entries(definitions)) {
      if (classifyValue(def.resolvedValue) === filter) {
        result[name] = def;
      }
    }
    return result;
  }, [definitions, filter]);

  // Filter families to only include members matching filter + search
  const filteredFamilies = useMemo(() => {
    const lower = search.toLowerCase();
    return families
      .map((fam) => ({
        ...fam,
        members: fam.members.filter((m) => {
          if (!(m.name in filteredDefinitions)) return false;
          if (search && !m.name.toLowerCase().includes(lower)) return false;
          return true;
        }),
      }))
      .filter((fam) => fam.members.length > 0);
  }, [families, filteredDefinitions, search]);

  // Track which vars are in families
  const familyMemberNames = useMemo(() => {
    const set = new Set<string>();
    filteredFamilies.forEach((fam) => fam.members.forEach((m) => set.add(m.name)));
    return set;
  }, [filteredFamilies]);

  // Ungrouped = filtered vars not in any family
  const ungroupedVars = useMemo(() => {
    const lower = search.toLowerCase();
    return Object.entries(filteredDefinitions).filter(
      ([name]) => !familyMemberNames.has(name) && (!search || name.toLowerCase().includes(lower))
    );
  }, [filteredDefinitions, familyMemberNames, search]);

  const visibleCount = filteredFamilies.reduce((sum, f) => sum + f.members.length, 0) + ungroupedVars.length;

  const handleCopy = useCallback(
    (varName: string) => {
      navigator.clipboard.writeText(`var(${varName})`);
      showToast('info', `Copied var(${varName})`);
    },
    [showToast]
  );

  const toggleFamily = useCallback((prefix: string) => {
    setCollapsedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(prefix)) next.delete(prefix);
      else next.add(prefix);
      return next;
    });
  }, []);

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'colors', label: 'Colors' },
    { id: 'sizing', label: 'Sizing' },
    { id: 'other', label: 'Other' },
  ];

  return (
    <div className="flex flex-col h-full" style={{ color: 'var(--text-primary)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {visibleCount} variable{visibleCount !== 1 ? 's' : ''}
          {filter !== 'all' && ` of ${totalCount}`}
        </span>
      </div>

      {/* Search */}
      <div
        className="px-3 py-1.5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="relative">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            className="absolute left-2 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }}
          >
            <circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <path d="M7.5 7.5L10 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search variables..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-[11px] py-1.5 pl-7 pr-2 rounded"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Filter chips */}
      <div
        className="flex items-center gap-1 px-3 py-1.5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors"
            style={{
              background: filter === f.id ? 'var(--accent)' : 'var(--bg-input)',
              color: filter === f.id ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Variable list */}
      <div className="flex-1 overflow-y-auto">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-4">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              No CSS variables detected
            </span>
            <span className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
              Connect to a project with CSS custom properties to see them here
            </span>
          </div>
        ) : visibleCount === 0 ? (
          <div className="flex items-center justify-center h-32">
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {search ? `No variables match "${search}"` : 'No variables in this category'}
            </span>
          </div>
        ) : (
          <div className="py-1">
            {filteredFamilies.map((family) => (
              <FamilySection
                key={family.prefix}
                family={family}
                isCollapsed={collapsedFamilies.has(family.prefix)}
                onToggleCollapse={() => toggleFamily(family.prefix)}
                onCopy={handleCopy}
              />
            ))}

            {filteredFamilies.length > 0 && ungroupedVars.length > 0 && (
              <div className="h-px mx-3 my-1" style={{ background: 'var(--border)' }} />
            )}

            {ungroupedVars.length > 0 && (
              <div>
                {!search && (
                  <div
                    className="text-[10px] font-medium px-3 py-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Ungrouped
                  </div>
                )}
                {ungroupedVars.map(([name, def]) => (
                  <VariableRow
                    key={name}
                    name={name}
                    value={def.value}
                    resolvedValue={def.resolvedValue}
                    onCopy={handleCopy}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

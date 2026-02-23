'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useEditorStore } from '@/store';
import { ColorPicker } from './ColorPicker';
import {
  extractVariableName,
  filterColorVariables,
  formatTokenDisplayName,
  toDisplayableColor,
} from '@/lib/cssVariableUtils';
import type { CSSVariableFamily, CSSVariableFamilyMember } from '@/types/cssVariables';

// ─── Inner Sub-Components ────────────────────────────────────────

function TokenRow({
  name,
  resolvedValue,
  isActive,
  tailwindClass,
  onSelect,
}: {
  name: string;
  resolvedValue: string;
  isActive: boolean;
  tailwindClass?: string;
  onSelect: () => void;
}) {
  const displayName = formatTokenDisplayName(name);

  const opacityPercent = useMemo(() => {
    const match = resolvedValue.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/);
    if (match) return Math.round(parseFloat(match[1]) * 100);
    return 100;
  }, [resolvedValue]);

  return (
    <button
      onClick={onSelect}
      className="token-row w-full flex items-center gap-2 px-3 py-1 text-left"
      style={{
        background: isActive ? 'var(--accent-bg)' : 'transparent',
        color: 'var(--text-primary)',
      }}
    >
      <div
        className="w-4 h-4 rounded flex-shrink-0"
        style={{
          background: toDisplayableColor(resolvedValue) || 'transparent',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: isActive ? '0 0 0 1.5px var(--accent)' : 'none',
        }}
      />
      <span className="flex-1 text-[11px] truncate">{displayName}</span>
      {tailwindClass && (
        <span
          className="text-[9px] px-1 py-px rounded flex-shrink-0"
          style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
        >
          {tailwindClass}
        </span>
      )}
      {opacityPercent < 100 && (
        <span className="text-[10px] flex-shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {opacityPercent}%
        </span>
      )}
      {isActive && (
        <svg width="10" height="10" viewBox="0 0 10 10" className="flex-shrink-0" style={{ color: 'var(--accent)' }}>
          <path d="M2 5L4.5 7.5L8 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

function FamilySection({
  family,
  activeVarName,
  isCollapsed,
  tailwindClassForVar,
  onToggleCollapse,
  onSelect,
}: {
  family: CSSVariableFamily;
  activeVarName: string | null;
  isCollapsed: boolean;
  tailwindClassForVar?: Record<string, string>;
  onToggleCollapse: () => void;
  onSelect: (name: string) => void;
}) {
  const displayPrefix = formatTokenDisplayName(family.prefix);

  return (
    <div className="family-section">
      <button
        onClick={onToggleCollapse}
        className="family-header w-full flex items-center gap-1.5 px-3 py-1.5 text-left"
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
          <TokenRow
            key={member.name}
            name={member.name}
            resolvedValue={member.resolvedValue}
            isActive={member.name === activeVarName}
            tailwindClass={tailwindClassForVar?.[member.name]}
            onSelect={() => onSelect(member.name)}
          />
        ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────

interface VariableColorPickerProps {
  label: string;
  property: string;
  value: string;
  varExpression?: string;
  tailwindClassName?: string;
  onChange: (property: string, value: string) => void;
  onDetach: () => void;
  onReattach: (varExpression: string) => void;
}

export function VariableColorPicker({
  label,
  property,
  value,
  varExpression,
  tailwindClassName,
  onChange,
  onDetach,
  onReattach,
}: VariableColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'libraries' | 'custom'>('libraries');
  const [search, setSearch] = useState('');
  const [collapsedFamilies, setCollapsedFamilies] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selectorPath = useEditorStore((s) => s.selectorPath);
  const isDetached = useEditorStore((s) =>
    selectorPath ? s.isPropertyDetached(selectorPath, property) : false
  );
  const definitions = useEditorStore((s) => s.cssVariableDefinitions);
  const families = useEditorStore((s) => s.cssVariableFamilies);

  const tailwindClassMap = useEditorStore((s) => s.tailwindClassMap);

  const varName = varExpression ? extractVariableName(varExpression) : null;
  const displayName = useMemo(
    () => (varName ? formatTokenDisplayName(varName) : null),
    [varName]
  );
  const colorVars = useMemo(() => filterColorVariables(definitions), [definitions]);

  // Build reverse map: variable name → tailwind class name (for token row badges)
  const tailwindClassForVar = useMemo(() => {
    const map: Record<string, string> = {};
    for (const entry of Object.values(tailwindClassMap)) {
      if (entry.variableName) {
        map[entry.variableName] = entry.className;
      }
    }
    return map;
  }, [tailwindClassMap]);

  // Filter families to color-only members
  const colorOnlyFamilies = useMemo(() => {
    return families
      .map((fam) => ({
        ...fam,
        members: fam.members.filter((m) => m.name in colorVars),
      }))
      .filter((fam) => fam.members.length >= 2);
  }, [families, colorVars]);

  // Track which vars are already in a family
  const familyMemberNames = useMemo(() => {
    const set = new Set<string>();
    colorOnlyFamilies.forEach((fam) => fam.members.forEach((m) => set.add(m.name)));
    return set;
  }, [colorOnlyFamilies]);

  // Ungrouped = color vars not in any family
  const ungroupedVars = useMemo(() => {
    return Object.entries(colorVars).filter(([name]) => !familyMemberNames.has(name));
  }, [colorVars, familyMemberNames]);

  // Search filtering
  const filteredFamilies = useMemo(() => {
    if (!search) return colorOnlyFamilies;
    const lower = search.toLowerCase();
    return colorOnlyFamilies
      .map((fam) => ({
        ...fam,
        members: fam.members.filter((m) => m.name.toLowerCase().includes(lower)),
      }))
      .filter((fam) => fam.members.length > 0);
  }, [colorOnlyFamilies, search]);

  const filteredUngrouped = useMemo(() => {
    if (!search) return ungroupedVars;
    const lower = search.toLowerCase();
    return ungroupedVars.filter(([name]) => name.toLowerCase().includes(lower));
  }, [ungroupedVars, search]);

  // Click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  // Viewport flip
  useEffect(() => {
    if (!isOpen || !panelRef.current || !containerRef.current) return;
    const panel = panelRef.current;
    const triggerRect = containerRef.current.getBoundingClientRect();
    const panelHeight = panel.offsetHeight;
    const spaceBelow = window.innerHeight - triggerRect.bottom - 8;

    if (spaceBelow < panelHeight && triggerRect.top > panelHeight) {
      panel.style.top = 'auto';
      panel.style.bottom = '100%';
      panel.style.marginBottom = '4px';
      panel.style.marginTop = '0';
    } else {
      panel.style.top = '100%';
      panel.style.bottom = 'auto';
      panel.style.marginTop = '4px';
      panel.style.marginBottom = '0';
    }
  }, [isOpen]);

  // Reset tab when opening: Libraries if variable assigned, Custom otherwise
  useEffect(() => {
    if (isOpen) {
      setActiveTab(varExpression ? 'libraries' : 'custom');
      setSearch('');
    }
  }, [isOpen, varExpression]);

  // ─── Mode A: Detached — show standard ColorPicker with reattach link ───
  if (isDetached && varExpression) {
    return (
      <div>
        <ColorPicker
          label={label}
          value={value}
          onChange={(val) => onChange(property, val)}
        />
        <button
          onClick={() => onReattach(varExpression)}
          className="text-[10px] ml-[72px] mt-0.5 hover:underline"
          style={{ color: 'var(--accent)' }}
        >
          Reattach to {varName}
        </button>
      </div>
    );
  }

  const handleSelectVariable = (name: string) => {
    onChange(property, `var(${name})`);
    setIsOpen(false);
    setSearch('');
  };

  const handleCustomColorPick = (val: string) => {
    if (varExpression) onDetach();
    onChange(property, val);
  };

  const toggleFamily = (prefix: string) => {
    setCollapsedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(prefix)) next.delete(prefix);
      else next.add(prefix);
      return next;
    });
  };

  return (
    <div className="variable-color-picker relative" ref={containerRef}>
      {/* ─── Trigger Row ─────────────────────────────── */}
      <div className="flex items-center gap-2">
        {label && (
          <label
            className="text-[11px] w-16 flex-shrink-0 truncate"
            style={{ color: 'var(--text-muted)' }}
          >
            {label}
          </label>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex items-center gap-1.5 px-1.5 py-1 rounded min-w-0"
          style={{
            background: 'var(--bg-tertiary)',
            border: `1px solid ${isOpen ? 'var(--accent)' : 'var(--border)'}`,
            color: 'var(--text-primary)',
          }}
        >
          <div
            className="w-4 h-4 rounded flex-shrink-0"
            style={{
              background: value || 'transparent',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          />
          <span className="flex-1 text-[11px] truncate text-left flex items-center gap-1">
            <span className="truncate">{displayName || varName || varExpression || value || 'Select variable'}</span>
            {tailwindClassName && (
              <span
                className="text-[9px] px-1 py-px rounded flex-shrink-0"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
              >
                {tailwindClassName}
              </span>
            )}
          </span>
          <svg
            width="9"
            height="9"
            viewBox="0 0 10 10"
            className={`flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-muted)' }}
          >
            <path d="M2 3.5L5 6.5L8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>

      {/* ─── Library Panel ───────────────────────────── */}
      {isOpen && (
        <div
          ref={panelRef}
          className="absolute left-0 right-0 rounded-lg shadow-xl z-[9999] flex flex-col"
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            maxHeight: '380px',
          }}
        >
          {/* Tab Header */}
          <div
            className="flex items-center justify-between px-2 pt-2 pb-1.5 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setActiveTab('libraries')}
                className="text-[11px] px-2.5 py-1 rounded transition-colors"
                style={{
                  background: activeTab === 'libraries' ? 'var(--bg-hover)' : 'transparent',
                  color: activeTab === 'libraries' ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                Libraries
              </button>
              <button
                onClick={() => setActiveTab('custom')}
                className="text-[11px] px-2.5 py-1 rounded transition-colors"
                style={{
                  background: activeTab === 'custom' ? 'var(--bg-hover)' : 'transparent',
                  color: activeTab === 'custom' ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                Custom
              </button>
            </div>
            <button
              onClick={() => { setIsOpen(false); setSearch(''); }}
              className="p-0.5 rounded"
              style={{ color: 'var(--text-muted)' }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10">
                <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* ─── Libraries Tab ───────────────────────── */}
          {activeTab === 'libraries' && (
            <>
              {/* Search */}
              <div className="px-2 py-1.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
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
                    autoFocus
                    type="text"
                    placeholder="Search tokens..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full text-[11px] py-1.5 pl-7 pr-2 rounded"
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Scrollable token list */}
              <div className="overflow-y-auto flex-1 py-1" style={{ maxHeight: '300px' }}>
                {filteredFamilies.map((family) => (
                  <FamilySection
                    key={family.prefix}
                    family={family}
                    activeVarName={varName}
                    isCollapsed={collapsedFamilies.has(family.prefix)}
                    tailwindClassForVar={tailwindClassForVar}
                    onToggleCollapse={() => toggleFamily(family.prefix)}
                    onSelect={handleSelectVariable}
                  />
                ))}

                {/* Divider between families and ungrouped */}
                {filteredFamilies.length > 0 && filteredUngrouped.length > 0 && (
                  <div className="h-px mx-3 my-1" style={{ background: 'var(--border)' }} />
                )}

                {/* Ungrouped tokens */}
                {filteredUngrouped.length > 0 && (
                  <div>
                    {!search && (
                      <div
                        className="text-[10px] font-medium px-3 py-1"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Other
                      </div>
                    )}
                    {filteredUngrouped.map(([name, def]) => (
                      <TokenRow
                        key={name}
                        name={name}
                        resolvedValue={def.resolvedValue}
                        isActive={name === varName}
                        tailwindClass={tailwindClassForVar[name]}
                        onSelect={() => handleSelectVariable(name)}
                      />
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {filteredFamilies.length === 0 && filteredUngrouped.length === 0 && (
                  <div className="text-center py-6 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {search ? `No tokens match "${search}"` : 'No color tokens detected'}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ─── Custom Tab ──────────────────────────── */}
          {activeTab === 'custom' && (
            <div className="p-2">
              <ColorPicker
                value={value}
                onChange={handleCustomColorPick}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

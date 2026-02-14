'use client';

import { useState, useMemo, useCallback } from 'react';
import { useEditorStore } from '@/store';
import { CSS_PROPERTIES } from '@/lib/constants';

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

// Map camelCase computed style keys to CSS property names
function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

export function CSSRawView() {
  const computedStyles = useEditorStore((state) => state.computedStyles);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const result: { name: string; label: string; properties: { name: string; value: string }[] }[] = [];

    for (const [groupName, props] of Object.entries(CSS_PROPERTIES)) {
      const properties: { name: string; value: string }[] = [];
      for (const prop of props) {
        // Convert kebab-case CSS prop to camelCase for lookup
        const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        const value = computedStyles[camelProp];
        if (value !== undefined && value !== '') {
          const kebabName = camelToKebab(camelProp);
          if (!search || kebabName.includes(search.toLowerCase())) {
            properties.push({ name: kebabName, value });
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
  }, [computedStyles, search]);

  const handleCopy = useCallback(() => {
    const lines: string[] = [];
    for (const group of groups) {
      lines.push(`/* ${group.label} */`);
      for (const prop of group.properties) {
        lines.push(`${prop.name}: ${prop.value};`);
      }
      lines.push('');
    }
    navigator.clipboard.writeText(lines.join('\n'));
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
        <button
          onClick={handleCopy}
          className="h-6 px-2 rounded text-[11px] hover:opacity-80 transition-opacity"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          Copy
        </button>
      </div>

      {/* Property groups */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        {groups.map((group) => (
          <div key={group.name} style={{ borderBottom: '1px solid var(--border)' }}>
            <button
              onClick={() => toggleGroup(group.name)}
              className="flex items-center w-full px-3 py-1.5 text-[10px] font-medium hover:bg-[var(--bg-hover)] transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <span
                className="mr-1.5 text-[8px] transition-transform"
                style={{ transform: collapsed[group.name] ? 'rotate(-90deg)' : 'rotate(0deg)' }}
              >
                ▼
              </span>
              {group.label}
              <span className="ml-1 opacity-50">({group.properties.length})</span>
            </button>
            {!collapsed[group.name] && (
              <div className="px-3 pb-2 space-y-0.5">
                {group.properties.map((prop) => (
                  <div key={prop.name} className="flex text-[11px] font-mono leading-tight">
                    <span style={{ color: 'var(--accent)' }}>{prop.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>:&nbsp;</span>
                    <span style={{ color: 'var(--text-primary)' }}>{prop.value}</span>
                    <span style={{ color: 'var(--text-muted)' }}>;</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {groups.length === 0 && (
          <div className="px-3 py-4 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            {search ? 'No matching properties' : 'No computed styles available'}
          </div>
        )}
      </div>
    </div>
  );
}

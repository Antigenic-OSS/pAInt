'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useEditorStore } from '@/store';
import { ColorPicker } from './ColorPicker';
import {
  extractVariableName,
  findFamilyForVariable,
  filterColorVariables,
} from '@/lib/cssVariableUtils';

interface VariableColorPickerProps {
  label: string;
  property: string;
  value: string;              // resolved value from computedStyles
  varExpression: string;      // e.g. 'var(--primary-500)'
  onChange: (property: string, value: string) => void;
  onDetach: () => void;
  onReattach: (varExpression: string) => void;
}

export function VariableColorPicker({
  label,
  property,
  value,
  varExpression,
  onChange,
  onDetach,
  onReattach,
}: VariableColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectorPath = useEditorStore((s) => s.selectorPath);
  const isDetached = useEditorStore((s) =>
    selectorPath ? s.isPropertyDetached(selectorPath, property) : false
  );
  const definitions = useEditorStore((s) => s.cssVariableDefinitions);
  const families = useEditorStore((s) => s.cssVariableFamilies);

  const varName = extractVariableName(varExpression);
  const family = useMemo(
    () => (varName ? findFamilyForVariable(varName, families) : null),
    [varName, families]
  );
  const colorVars = useMemo(() => filterColorVariables(definitions), [definitions]);

  // Filter color variables by search
  const filteredColorVars = useMemo(() => {
    if (!search) return colorVars;
    const lower = search.toLowerCase();
    const result: typeof colorVars = {};
    for (const [name, def] of Object.entries(colorVars)) {
      if (name.toLowerCase().includes(lower)) {
        result[name] = def;
      }
    }
    return result;
  }, [colorVars, search]);

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

  // Detached state — show standard ColorPicker with reattach link
  if (isDetached) {
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

  return (
    <div className="relative" ref={containerRef}>
      {/* Attached state — variable name row */}
      <div className="flex items-center gap-2">
        {label && (
          <label
            className="text-[11px] w-16 flex-shrink-0 truncate"
            style={{ color: 'var(--text-muted)' }}
          >
            {label}
          </label>
        )}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {/* Color swatch */}
          <div
            className="w-6 h-6 rounded border flex-shrink-0"
            style={{
              background: value || 'transparent',
              borderColor: 'var(--border)',
            }}
          />
          {/* Variable name + chevron */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex-1 flex items-center justify-between text-xs py-1 px-2 rounded min-w-0"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            <span className="truncate">{varName || varExpression}</span>
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              className={`flex-shrink-0 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              style={{ fill: 'var(--text-muted)' }}
            >
              <path d="M2 3.5L5 6.5L8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          {/* Detach button */}
          <button
            onClick={onDetach}
            className="text-[10px] px-1.5 py-1 rounded flex-shrink-0"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            Detach
          </button>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute left-16 right-0 top-full mt-1 rounded shadow-lg z-50 max-h-[280px] overflow-y-auto"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Search input */}
          <div className="p-1.5 sticky top-0" style={{ background: 'var(--bg-tertiary)' }}>
            <input
              type="text"
              placeholder="Filter variables..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs py-1 px-2 rounded"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              autoFocus
            />
          </div>

          {/* Family section */}
          {family && !search && (
            <div className="px-1.5 pb-1.5">
              <div
                className="text-[10px] font-medium px-1 py-0.5 mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                {family.prefix}
              </div>
              {family.members.map((member) => (
                <button
                  key={member.name}
                  onClick={() => handleSelectVariable(member.name)}
                  className="w-full flex items-center gap-2 px-1 py-1 rounded text-xs hover:opacity-80"
                  style={{
                    background: member.name === varName ? 'var(--bg-hover)' : 'transparent',
                    color: 'var(--text-primary)',
                  }}
                >
                  <div
                    className="w-4 h-4 rounded border flex-shrink-0"
                    style={{
                      background: member.resolvedValue,
                      borderColor: 'var(--border)',
                    }}
                  />
                  <span className="truncate">{member.name}</span>
                </button>
              ))}
              <div
                className="my-1"
                style={{ borderTop: '1px solid var(--border)' }}
              />
            </div>
          )}

          {/* All color variables section */}
          <div className="px-1.5 pb-1.5">
            {!search && (
              <div
                className="text-[10px] font-medium px-1 py-0.5 mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                All Color Variables
              </div>
            )}
            {Object.entries(filteredColorVars).length === 0 && (
              <div
                className="text-xs px-1 py-2 text-center"
                style={{ color: 'var(--text-muted)' }}
              >
                No matching variables
              </div>
            )}
            {Object.entries(filteredColorVars).map(([name, def]) => (
              <button
                key={name}
                onClick={() => handleSelectVariable(name)}
                className="w-full flex items-center gap-2 px-1 py-1 rounded text-xs hover:opacity-80"
                style={{
                  background: name === varName ? 'var(--bg-hover)' : 'transparent',
                  color: 'var(--text-primary)',
                }}
              >
                <div
                  className="w-4 h-4 rounded border flex-shrink-0"
                  style={{
                    background: def.resolvedValue,
                    borderColor: 'var(--border)',
                  }}
                />
                <span className="truncate">{name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

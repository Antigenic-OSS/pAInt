'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { parseCSSValue, formatCSSValue } from '@/lib/utils';

interface PropertyInputProps {
  label: string;
  value: string;
  property: string;
  onChange: (property: string, value: string) => void;
  showUnit?: boolean;
  units?: string[];
  type?: 'text' | 'number' | 'select';
  options?: string[];
}

export function PropertyInput({
  label,
  value,
  property,
  onChange,
  showUnit = true,
  units = ['px', '%', 'em', 'rem', 'auto'],
  type = 'number',
  options,
}: PropertyInputProps) {
  const parsed = parseCSSValue(value);
  const [localValue, setLocalValue] = useState(String(parsed.number));
  const [unit, setUnit] = useState(parsed.unit || 'px');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const p = parseCSSValue(value);
    setLocalValue(String(p.number));
    setUnit(p.unit || 'px');
  }, [value]);

  const commit = useCallback(
    (num: string, u: string) => {
      if (u === 'auto') {
        onChange(property, 'auto');
      } else {
        const n = parseFloat(num);
        if (!isNaN(n)) {
          onChange(property, formatCSSValue(n, u));
        }
      }
    },
    [onChange, property]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        commit(localValue, unit);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const next = String(parseFloat(localValue || '0') + step);
        setLocalValue(next);
        commit(next, unit);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const next = String(parseFloat(localValue || '0') - step);
        setLocalValue(next);
        commit(next, unit);
      }
    },
    [localValue, unit, commit]
  );

  if (type === 'select' && options) {
    return (
      <div className="flex items-center gap-2">
        <label className="text-[11px] w-16 flex-shrink-0 truncate" style={{ color: 'var(--text-muted)' }}>
          {label}
        </label>
        <select
          value={value}
          onChange={(e) => onChange(property, e.target.value)}
          className="flex-1 text-xs py-1 px-2 rounded"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (type === 'text') {
    return (
      <div className="flex items-center gap-2">
        <label className="text-[11px] w-16 flex-shrink-0 truncate" style={{ color: 'var(--text-muted)' }}>
          {label}
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(property, e.target.value)}
          className="flex-1 text-xs py-1 px-2"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-[11px] w-16 flex-shrink-0 truncate" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      <div className="flex flex-1 gap-1">
        <input
          ref={inputRef}
          type="number"
          value={unit === 'auto' ? '' : localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={() => commit(localValue, unit)}
          onKeyDown={handleKeyDown}
          disabled={unit === 'auto'}
          className="flex-1 min-w-0 text-xs py-1 px-2"
          style={{ opacity: unit === 'auto' ? 0.5 : 1 }}
        />
        {showUnit && (
          <select
            value={unit}
            onChange={(e) => {
              setUnit(e.target.value);
              commit(localValue, e.target.value);
            }}
            className="w-14 text-[11px] py-1 px-1 rounded"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            {units.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { parseCSSValue, formatCSSValue } from '@/lib/utils';

interface CompactInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  property: string;
  onChange: (property: string, value: string) => void;
  units?: string[];
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export function CompactInput({
  label,
  placeholder,
  value,
  property,
  onChange,
  units = ['px', '%', 'em', 'rem', 'auto'],
  min,
  max,
  step = 1,
  className,
}: CompactInputProps) {
  const parsed = parseCSSValue(value);
  const [localValue, setLocalValue] = useState(
    value === 'auto' ? '' : String(parsed.number)
  );
  const [unit, setUnit] = useState(value === 'auto' ? 'auto' : parsed.unit || 'px');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value === 'auto') {
      setLocalValue('');
      setUnit('auto');
    } else {
      const p = parseCSSValue(value);
      setLocalValue(String(p.number));
      setUnit(p.unit || 'px');
    }
  }, [value]);

  const clampValue = useCallback(
    (num: number): number => {
      let clamped = num;
      if (min !== undefined) clamped = Math.max(clamped, min);
      if (max !== undefined) clamped = Math.min(clamped, max);
      return clamped;
    },
    [min, max]
  );

  const commit = useCallback(
    (num: string, u: string) => {
      if (u === 'auto') {
        onChange(property, 'auto');
      } else {
        const n = parseFloat(num);
        if (!isNaN(n)) {
          const clamped = clampValue(n);
          onChange(property, formatCSSValue(clamped, u));
        }
      }
    },
    [onChange, property, clampValue]
  );

  const cycleUnit = useCallback(() => {
    const currentIndex = units.indexOf(unit);
    const nextIndex = (currentIndex + 1) % units.length;
    const nextUnit = units[nextIndex];
    setUnit(nextUnit);

    if (nextUnit === 'auto') {
      setLocalValue('');
      onChange(property, 'auto');
    } else {
      const num = parseFloat(localValue || '0');
      if (!isNaN(num)) {
        const clamped = clampValue(num);
        setLocalValue(String(clamped));
        onChange(property, formatCSSValue(clamped, nextUnit));
      }
    }
  }, [units, unit, localValue, onChange, property, clampValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        commit(localValue, unit);
        inputRef.current?.blur();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const increment = e.shiftKey ? step * 10 : step;
        const next = clampValue(parseFloat(localValue || '0') + increment);
        const nextStr = String(next);
        setLocalValue(nextStr);
        commit(nextStr, unit);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const decrement = e.shiftKey ? step * 10 : step;
        const next = clampValue(parseFloat(localValue || '0') - decrement);
        const nextStr = String(next);
        setLocalValue(nextStr);
        commit(nextStr, unit);
      }
    },
    [localValue, unit, step, commit, clampValue]
  );

  const isAuto = unit === 'auto';

  return (
    <div
      className={`flex items-center h-6 rounded overflow-hidden ${className ?? ''}`}
      style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
      }}
    >
      {label && (
        <span
          className="flex-shrink-0 flex items-center justify-center w-6 h-full text-[11px] select-none"
          style={{
            color: 'var(--text-secondary)',
            borderRight: '1px solid var(--border)',
          }}
        >
          {label}
        </span>
      )}

      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={isAuto ? 'auto' : localValue}
        placeholder={placeholder}
        onChange={(e) => {
          if (!isAuto) {
            setLocalValue(e.target.value);
          }
        }}
        onBlur={() => commit(localValue, unit)}
        onKeyDown={handleKeyDown}
        disabled={isAuto}
        className="flex-1 min-w-0 h-full px-1.5 text-[11px] bg-transparent border-none outline-none"
        style={{
          color: 'var(--text-primary)',
          opacity: isAuto ? 0.5 : 1,
        }}
      />

      <button
        type="button"
        onClick={cycleUnit}
        className="flex-shrink-0 flex items-center justify-center h-full px-1.5 text-[11px] cursor-pointer select-none hover:opacity-80 bg-transparent border-none outline-none"
        style={{
          color: 'var(--text-secondary)',
          borderLeft: '1px solid var(--border)',
        }}
      >
        {unit}
      </button>
    </div>
  );
}

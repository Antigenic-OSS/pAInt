'use client';

import { useState, useRef, useEffect } from 'react';

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return rgb;
  const r = parseInt(match[1]).toString(16).padStart(2, '0');
  const g = parseInt(match[2]).toString(16).padStart(2, '0');
  const b = parseInt(match[3]).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const displayValue = value.startsWith('rgb') ? rgbToHex(value) : value;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-2" ref={containerRef}>
      {label && (
        <label className="text-[11px] w-16 flex-shrink-0 truncate" style={{ color: 'var(--text-muted)' }}>
          {label}
        </label>
      )}
      <div className="flex items-center gap-1 flex-1 relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-6 h-6 rounded border flex-shrink-0"
          style={{
            background: value || 'transparent',
            borderColor: 'var(--border)',
          }}
        />
        <input
          type="text"
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 text-xs py-1 px-2"
        />
        {isOpen && (
          <div
            className="absolute top-full left-0 mt-1 p-2 rounded shadow-lg z-50"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
          >
            <input
              type="color"
              value={displayValue.startsWith('#') ? displayValue : '#000000'}
              onChange={(e) => {
                onChange(e.target.value);
              }}
              className="w-32 h-32 cursor-pointer"
              style={{ background: 'transparent', border: 'none' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

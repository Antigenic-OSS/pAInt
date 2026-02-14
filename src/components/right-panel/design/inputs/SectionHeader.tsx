'use client';

import React, { useState } from 'react';

interface SectionHeaderProps {
  title: string;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function SectionHeader({ title, defaultOpen = true, actions, children }: SectionHeaderProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium hover:bg-[var(--bg-hover)] transition-colors"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span className="flex items-center">
          <span
            className="mr-2 text-[10px] transition-transform"
            style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          >
            ▼
          </span>
          {title}
        </span>
        {actions && (
          <span
            onClick={(e) => e.stopPropagation()}
            className="flex items-center"
          >
            {actions}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="px-3 pb-3 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

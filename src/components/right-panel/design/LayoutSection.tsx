'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '@/store';
import { SectionHeader } from '@/components/right-panel/design/inputs/SectionHeader';
import { LinkedInputPair } from '@/components/right-panel/design/inputs/LinkedInputPair';
import { BoxModelPreview } from '@/components/right-panel/design/inputs/BoxModelPreview';
import { useChangeTracker } from '@/hooks/useChangeTracker';
import { parseCSSValue, formatCSSValue } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────

type DisplayMode = 'block' | 'flex' | 'grid' | 'none' | 'inline-block' | 'inline-flex' | 'inline-grid' | 'inline';

interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  desc?: string;
}

// ─── Constants ─────────────────────────────────────────────────────

const DISPLAY_LABELS: Record<DisplayMode, string> = {
  block: 'Block', flex: 'Flex', grid: 'Grid', none: 'None',
  'inline-block': 'In-blk', 'inline-flex': 'In-flex', 'inline-grid': 'In-grid', inline: 'Inline',
};

const DROPDOWN_DISPLAYS: { value: DisplayMode; label: string; icon: React.ReactNode }[] = [
  { value: 'inline-block', label: 'Inline-block', icon: <InlineBlockIcon /> },
  { value: 'inline-flex', label: 'Inline-flex', icon: <InlineFlexIcon /> },
  { value: 'inline-grid', label: 'Inline-grid', icon: <InlineGridIcon /> },
  { value: 'inline', label: 'Inline', icon: <InlineTextIcon /> },
  { value: 'none', label: 'None', icon: <NoneDisplayIcon /> },
];

const FLEX_JUSTIFY: DropdownOption[] = [
  { value: 'flex-start', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'flex-end', label: 'Right' },
  { value: 'space-between', label: 'Space Between' },
  { value: 'space-around', label: 'Space Around' },
  { value: 'space-evenly', label: 'Space Evenly' },
];

const FLEX_ALIGN: DropdownOption[] = [
  { value: 'stretch', label: 'Stretch' },
  { value: 'flex-start', label: 'Start' },
  { value: 'center', label: 'Center' },
  { value: 'flex-end', label: 'End' },
  { value: 'baseline', label: 'Baseline' },
];

const GRID_ALIGN: DropdownOption[] = [
  { value: 'stretch', label: 'Stretch' },
  { value: 'start', label: 'Start' },
  { value: 'center', label: 'Center' },
  { value: 'end', label: 'End' },
];

const VERTICAL_ALIGN_OPTIONS: DropdownOption[] = [
  { value: 'baseline', label: 'Baseline', desc: 'Aligns the baseline with the parent\'s baseline' },
  { value: 'sub', label: 'Sub', desc: 'Aligns as subscript' },
  { value: 'super', label: 'Super', desc: 'Aligns as superscript' },
  { value: 'top', label: 'Top', desc: 'Aligns with the tallest element on the line' },
  { value: 'text-top', label: 'Text-top', desc: 'Aligns with the parent\'s font top' },
  { value: 'middle', label: 'Middle', desc: 'Centers vertically in the parent' },
  { value: 'bottom', label: 'Bottom', desc: 'Aligns with the lowest element on the line' },
  { value: 'text-bottom', label: 'Text-bottom', desc: 'Aligns with the parent\'s font bottom' },
];

const DIRECTION_BUTTONS = [
  { value: 'row', icon: <ArrowRightIcon /> },
  { value: 'column', icon: <ArrowDownIcon /> },
  { value: 'row-reverse', icon: <ArrowLeftIcon /> },
  { value: 'column-reverse', icon: <ArrowUpIcon /> },
];

// ─── Utilities ─────────────────────────────────────────────────────

function parseGridCount(template: string): number {
  if (!template || template === 'none' || template === 'auto') return 1;
  const repeatMatch = template.match(/repeat\((\d+)/);
  if (repeatMatch) return parseInt(repeatMatch[1], 10);
  return template.split(/\s+/).filter(Boolean).length || 1;
}

function toGridTemplate(count: number): string {
  if (count <= 0) return 'none';
  return `repeat(${count}, 1fr)`;
}

function parseGapValues(gap: string): { row: string; col: string } {
  if (!gap || gap === 'normal') return { row: '0px', col: '0px' };
  const parts = gap.trim().split(/\s+/);
  if (parts.length >= 2) return { row: parts[0], col: parts[1] };
  return { row: parts[0], col: parts[0] };
}

function resolveDisplay(display: string): DisplayMode {
  const valid: DisplayMode[] = ['block', 'flex', 'grid', 'none', 'inline-block', 'inline-flex', 'inline-grid', 'inline'];
  return valid.includes(display as DisplayMode) ? (display as DisplayMode) : 'block';
}

// ─── Icons ─────────────────────────────────────────────────────────

function ChevronIcon() {
  return (
    <svg width={8} height={8} viewBox="0 0 8 8" fill="currentColor" style={{ opacity: 0.7 }}>
      <path d="M2 3l2 2.5L6 3" />
    </svg>
  );
}

function CheckMarkIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2.5 6 5 8.5 9.5 3.5" />
    </svg>
  );
}

function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg width={12} height={12} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
      <rect x={3} y={7} width={8} height={5.5} rx={1} />
      {locked
        ? <path d="M5 7V5a2 2 0 0 1 4 0v2" />
        : <path d="M9 7V5a2 2 0 0 0-4 0" />
      }
    </svg>
  );
}

function ArrowRightIcon() {
  return <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 7h9M8.5 4l3 3-3 3" /></svg>;
}
function ArrowDownIcon() {
  return <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M7 2.5v9M4 8.5l3 3 3-3" /></svg>;
}
function ArrowLeftIcon() {
  return <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 7h-9M5.5 4l-3 3 3 3" /></svg>;
}
function ArrowUpIcon() {
  return <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M7 11.5v-9M4 5.5l3-3 3 3" /></svg>;
}

function InlineBlockIcon() {
  return <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.2}><rect x={2} y={3} width={10} height={8} rx={1} /><line x1={7} y1={3} x2={7} y2={11} /></svg>;
}
function InlineFlexIcon() {
  return <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.2}><rect x={2} y={3} width={10} height={8} rx={1} /><path d="M5 7h4M7.5 5.5l1.5 1.5-1.5 1.5" /></svg>;
}
function InlineGridIcon() {
  return <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.1}><rect x={2.5} y={3} width={4} height={3.5} rx={0.5} /><rect x={7.5} y={3} width={4} height={3.5} rx={0.5} /><rect x={2.5} y={7.5} width={4} height={3.5} rx={0.5} /><rect x={7.5} y={7.5} width={4} height={3.5} rx={0.5} /></svg>;
}
function InlineTextIcon() {
  return <svg width={14} height={14} viewBox="0 0 14 14" fill="none"><text x={1} y={11} fontSize={9.5} fontWeight="bold" fontFamily="system-ui" fill="currentColor">AA</text></svg>;
}
function NoneDisplayIcon() {
  return <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round"><circle cx={7} cy={7} r={4.5} /><line x1={3.8} y1={10.2} x2={10.2} y2={3.8} /></svg>;
}

function GridRowFlowIcon() {
  return <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round"><path d="M2 4h10M2 7h7M2 10h10" /></svg>;
}
function GridColFlowIcon() {
  return <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round"><path d="M4 2v10M7 2v7M10 2v10" /></svg>;
}
function GridDenseRowIcon() {
  return <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round"><rect x={2} y={2} width={4.5} height={4.5} rx={0.5} /><rect x={7.5} y={2} width={4.5} height={4.5} rx={0.5} /><rect x={2} y={7.5} width={10} height={4.5} rx={0.5} /></svg>;
}
function GridDenseColIcon() {
  return <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round"><rect x={2} y={2} width={4.5} height={10} rx={0.5} /><rect x={7.5} y={2} width={4.5} height={4.5} rx={0.5} /><rect x={7.5} y={7.5} width={4.5} height={4.5} rx={0.5} /></svg>;
}

// Grid alignment icons
function ColAlignStartIcon() {
  return <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round"><line x1={2} y1={2} x2={2} y2={12} /><rect x={4} y={3} width={3} height={3} rx={0.5} fill="currentColor" stroke="none" /><rect x={4} y={8} width={3} height={3} rx={0.5} fill="currentColor" stroke="none" /></svg>;
}
function ColAlignCenterIcon() {
  return <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round"><line x1={7} y1={2} x2={7} y2={12} strokeDasharray="1.5 1.5" /><rect x={5} y={3} width={4} height={3} rx={0.5} fill="currentColor" stroke="none" /><rect x={5} y={8} width={4} height={3} rx={0.5} fill="currentColor" stroke="none" /></svg>;
}
function ColAlignEndIcon() {
  return <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round"><line x1={12} y1={2} x2={12} y2={12} /><rect x={7} y={3} width={3} height={3} rx={0.5} fill="currentColor" stroke="none" /><rect x={7} y={8} width={3} height={3} rx={0.5} fill="currentColor" stroke="none" /></svg>;
}
function ColAlignStretchIcon() {
  return <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round"><line x1={2} y1={2} x2={2} y2={12} /><line x1={12} y1={2} x2={12} y2={12} /><rect x={4} y={3} width={6} height={3} rx={0.5} fill="currentColor" stroke="none" /><rect x={4} y={8} width={6} height={3} rx={0.5} fill="currentColor" stroke="none" /></svg>;
}
function RowAlignStartIcon() {
  return <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round"><line x1={2} y1={2} x2={12} y2={2} /><rect x={3} y={4} width={3} height={3} rx={0.5} fill="currentColor" stroke="none" /><rect x={8} y={4} width={3} height={3} rx={0.5} fill="currentColor" stroke="none" /></svg>;
}
function RowAlignCenterIcon() {
  return <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round"><line x1={2} y1={7} x2={12} y2={7} strokeDasharray="1.5 1.5" /><rect x={3} y={5} width={3} height={4} rx={0.5} fill="currentColor" stroke="none" /><rect x={8} y={5} width={3} height={4} rx={0.5} fill="currentColor" stroke="none" /></svg>;
}
function RowAlignEndIcon() {
  return <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round"><line x1={2} y1={12} x2={12} y2={12} /><rect x={3} y={7} width={3} height={3} rx={0.5} fill="currentColor" stroke="none" /><rect x={8} y={7} width={3} height={3} rx={0.5} fill="currentColor" stroke="none" /></svg>;
}
function RowAlignStretchIcon() {
  return <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round"><line x1={2} y1={2} x2={12} y2={2} /><line x1={2} y1={12} x2={12} y2={12} /><rect x={3} y={4} width={3} height={6} rx={0.5} fill="currentColor" stroke="none" /><rect x={8} y={4} width={3} height={6} rx={0.5} fill="currentColor" stroke="none" /></svg>;
}

// ─── Dropdown Component ────────────────────────────────────────────

function LayoutDropdown({
  value,
  options,
  onChange,
  showDescription = false,
  width = 150,
}: {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  showDescription?: boolean;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [hoveredDesc, setHoveredDesc] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full h-6 px-2 rounded text-[11px] transition-colors"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
        }}
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <ChevronIcon />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 rounded shadow-lg z-50 py-1 overflow-auto"
          style={{
            width,
            maxHeight: 280,
            background: '#252526',
            border: '1px solid var(--border)',
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              onMouseEnter={() => opt.desc && setHoveredDesc(opt.desc)}
              onMouseLeave={() => setHoveredDesc(null)}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 text-[11px] transition-colors"
              style={{
                color: opt.value === value ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: opt.value === value ? 'rgba(74, 158, 255, 0.08)' : 'transparent',
              }}
              onMouseOver={(e) => {
                if (opt.value !== value) e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = opt.value === value ? 'rgba(74, 158, 255, 0.08)' : 'transparent';
              }}
            >
              <span className="w-3 flex-shrink-0">
                {opt.value === value && <CheckMarkIcon />}
              </span>
              <span className="flex-1 text-left">{opt.label}</span>
            </button>
          ))}
          {showDescription && hoveredDesc && (
            <div
              className="px-3 py-2 text-[10px] leading-relaxed"
              style={{
                color: 'var(--text-muted)',
                borderTop: '1px solid var(--border)',
              }}
            >
              {hoveredDesc}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Display Toggle ────────────────────────────────────────────────

function DisplayToggle({
  display,
  onChange,
}: {
  display: DisplayMode;
  onChange: (mode: DisplayMode) => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  const isMainDisplay = ['block', 'flex', 'grid'].includes(display);
  const fourthLabel = isMainDisplay ? 'None' : DISPLAY_LABELS[display] || 'None';
  const fourthActive = !isMainDisplay;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--accent)' }}>
        Display
      </span>
      <div
        className="flex rounded overflow-hidden flex-1"
        style={{ border: '1px solid var(--border)' }}
      >
        {/* Block, Flex, Grid buttons */}
        {(['block', 'flex', 'grid'] as DisplayMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className="flex-1 h-[26px] text-[11px] transition-colors"
            style={{
              background: display === mode ? '#3a3a3a' : 'var(--bg-tertiary)',
              color: display === mode ? 'var(--text-primary)' : 'var(--text-muted)',
              borderRight: '1px solid var(--border)',
            }}
          >
            {DISPLAY_LABELS[mode]}
          </button>
        ))}

        {/* 4th position — dropdown trigger */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-0.5 h-[26px] px-2 text-[11px] transition-colors"
            style={{
              background: fourthActive ? '#3a3a3a' : 'var(--bg-tertiary)',
              color: fourthActive ? 'var(--text-primary)' : 'var(--text-muted)',
              whiteSpace: 'nowrap',
            }}
          >
            {fourthLabel}
            <ChevronIcon />
          </button>

          {dropdownOpen && (
            <div
              className="absolute top-full right-0 mt-1 rounded shadow-lg z-50 py-1"
              style={{
                width: 160,
                background: '#252526',
                border: '1px solid var(--border)',
              }}
            >
              {DROPDOWN_DISPLAYS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setDropdownOpen(false); }}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 text-[11px] transition-colors"
                  style={{
                    color: display === opt.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                    background: display === opt.value ? 'rgba(74, 158, 255, 0.08)' : 'transparent',
                  }}
                  onMouseOver={(e) => {
                    if (display !== opt.value) e.currentTarget.style.background = 'var(--bg-hover)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = display === opt.value ? 'rgba(74, 158, 255, 0.08)' : 'transparent';
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>{opt.icon}</span>
                  <span className="flex-1 text-left">{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Alignment Visual Box ──────────────────────────────────────────

function FlexAlignVisual({
  direction,
  justify,
  align,
}: {
  direction: string;
  justify: string;
  align: string;
}) {
  const isRow = direction === 'row' || direction === 'row-reverse';
  const size = 44;
  const barThick = 3;
  const barCount = 3;
  const barLengths = [14, 20, 17]; // varied for visual interest
  const gap = 3;
  const totalSpan = barCount * barThick + (barCount - 1) * gap;

  // Compute main-axis offset (justify)
  let mainOffset: number;
  switch (justify) {
    case 'center': mainOffset = (size - totalSpan) / 2; break;
    case 'flex-end': case 'end': mainOffset = size - totalSpan - 3; break;
    case 'space-between': mainOffset = 3; break;
    default: mainOffset = 3; // flex-start
  }

  const spaceBetween = justify === 'space-between';
  const spaceAround = justify === 'space-around';
  const spaceEvenly = justify === 'space-evenly';

  function getBarPositions(): Array<{ x: number; y: number; w: number; h: number }> {
    const bars: Array<{ x: number; y: number; w: number; h: number }> = [];

    for (let i = 0; i < barCount; i++) {
      const len = barLengths[i];

      // Cross-axis position and size
      let crossPos: number;
      let crossSize: number;
      const isStretch = align === 'stretch';
      const actualLen = isStretch ? size - 6 : len;

      switch (align) {
        case 'center': crossPos = (size - actualLen) / 2; break;
        case 'flex-end': case 'end': crossPos = size - actualLen - 3; break;
        default: crossPos = 3; // flex-start, stretch, baseline
      }
      crossSize = actualLen;

      // Main-axis position
      let mainPos: number;
      if (spaceBetween) {
        mainPos = i === 0 ? 3 : i === barCount - 1 ? size - barThick - 3 : size / 2 - barThick / 2;
      } else if (spaceAround) {
        const totalSpace = size - barCount * barThick;
        const spacing = totalSpace / barCount;
        mainPos = spacing / 2 + i * (barThick + spacing);
      } else if (spaceEvenly) {
        const spacing = (size - barCount * barThick) / (barCount + 1);
        mainPos = spacing + i * (barThick + spacing);
      } else {
        mainPos = mainOffset + i * (barThick + gap);
      }

      if (isRow) {
        bars.push({ x: mainPos, y: crossPos, w: barThick, h: crossSize });
      } else {
        bars.push({ x: crossPos, y: mainPos, w: crossSize, h: barThick });
      }
    }
    return bars;
  }

  const bars = getBarPositions();

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="flex-shrink-0 rounded"
      style={{ background: '#1a1a1a', border: '1px solid var(--border)' }}
    >
      {bars.map((bar, i) => (
        <rect
          key={i}
          x={bar.x}
          y={bar.y}
          width={bar.w}
          height={bar.h}
          rx={1}
          fill="#e0e0e0"
          opacity={0.8}
        />
      ))}
    </svg>
  );
}

function GridAlignVisual() {
  return (
    <svg
      width={44}
      height={44}
      viewBox="0 0 44 44"
      className="flex-shrink-0 rounded"
      style={{ background: '#1a1a1a', border: '1px solid var(--border)' }}
    >
      {/* Cross arrows */}
      <line x1={22} y1={8} x2={22} y2={36} stroke="#e0e0e0" strokeWidth={1.2} opacity={0.6} />
      <line x1={8} y1={22} x2={36} y2={22} stroke="#e0e0e0" strokeWidth={1.2} opacity={0.6} />
      {/* Arrow tips */}
      <polyline points="19,11 22,8 25,11" fill="none" stroke="#e0e0e0" strokeWidth={1.2} opacity={0.6} />
      <polyline points="19,33 22,36 25,33" fill="none" stroke="#e0e0e0" strokeWidth={1.2} opacity={0.6} />
      <polyline points="11,19 8,22 11,25" fill="none" stroke="#e0e0e0" strokeWidth={1.2} opacity={0.6} />
      <polyline points="33,19 36,22 33,25" fill="none" stroke="#e0e0e0" strokeWidth={1.2} opacity={0.6} />
    </svg>
  );
}

// ─── Number Stepper ────────────────────────────────────────────────

function NumberStepper({
  value,
  onChange,
  min = 1,
  max = 12,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div
      className="flex items-center h-6 rounded overflow-hidden"
      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
    >
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!isNaN(n) && n >= min && n <= max) onChange(n);
        }}
        className="w-8 h-full text-center text-[11px] bg-transparent border-none outline-none"
        style={{ color: 'var(--text-primary)' }}
      />
      <div className="flex flex-col h-full" style={{ borderLeft: '1px solid var(--border)' }}>
        <button
          type="button"
          onClick={() => value < max && onChange(value + 1)}
          className="flex items-center justify-center flex-1 px-1 transition-colors hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-muted)', fontSize: 7 }}
        >
          ▲
        </button>
        <button
          type="button"
          onClick={() => value > min && onChange(value - 1)}
          className="flex items-center justify-center flex-1 px-1 transition-colors hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-muted)', fontSize: 7, borderTop: '1px solid var(--border)' }}
        >
          ▼
        </button>
      </div>
    </div>
  );
}

// ─── Gap Input ─────────────────────────────────────────────────────

function GapInput({
  value,
  property,
  onChange,
}: {
  value: string;
  property: string;
  onChange: (prop: string, val: string) => void;
}) {
  const parsed = parseCSSValue(value);
  const [localVal, setLocalVal] = useState(String(parsed.number));
  const [unit, setUnit] = useState(parsed.unit || 'px');
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartValue = useRef(0);

  useEffect(() => {
    const p = parseCSSValue(value);
    setLocalVal(String(p.number));
    setUnit(p.unit || 'px');
  }, [value]);

  const commit = useCallback((num: string, u: string) => {
    const n = parseFloat(num);
    if (!isNaN(n)) onChange(property, formatCSSValue(Math.max(0, n), u));
  }, [onChange, property]);

  // --- Drag-to-scrub (2px per pixel of movement) ---
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Don't hijack if user clicked on the unit button
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    e.preventDefault();
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartValue.current = parseFloat(localVal || '0');
    containerRef.current?.setPointerCapture(e.pointerId);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, [localVal]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const delta = e.clientX - dragStartX.current;
    const next = Math.max(0, Math.round(dragStartValue.current + delta * 2));
    const nextStr = String(next);
    setLocalVal(nextStr);
    onChange(property, formatCSSValue(next, unit));
  }, [onChange, property, unit]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    containerRef.current?.releasePointerCapture(e.pointerId);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const units = ['px', 'rem', 'em', '%'];
  const cycleUnit = useCallback(() => {
    const idx = units.indexOf(unit);
    const next = units[(idx + 1) % units.length];
    setUnit(next);
    const n = parseFloat(localVal || '0');
    if (!isNaN(n)) onChange(property, formatCSSValue(Math.max(0, n), next));
  }, [units, unit, localVal, onChange, property]);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="flex items-center h-6 rounded overflow-hidden"
      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', cursor: 'ew-resize' }}
    >
      <input
        type="text"
        inputMode="numeric"
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        onBlur={() => commit(localVal, unit)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { commit(localVal, unit); (e.target as HTMLInputElement).blur(); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); const n = Math.max(0, parseFloat(localVal || '0') + (e.shiftKey ? 10 : 1)); setLocalVal(String(n)); commit(String(n), unit); }
          else if (e.key === 'ArrowDown') { e.preventDefault(); const n = Math.max(0, parseFloat(localVal || '0') - (e.shiftKey ? 10 : 1)); setLocalVal(String(n)); commit(String(n), unit); }
        }}
        className="flex-1 min-w-0 h-full px-1.5 text-[11px] bg-transparent border-none outline-none"
        style={{ color: 'var(--text-primary)', cursor: 'ew-resize' }}
      />
      <button
        type="button"
        onClick={cycleUnit}
        className="flex-shrink-0 h-full px-1.5 text-[10px] uppercase cursor-pointer hover:opacity-80 bg-transparent border-none outline-none"
        style={{ color: 'var(--text-muted)', borderLeft: '1px solid var(--border)' }}
      >
        {unit}
      </button>
    </div>
  );
}

// ─── Icon Toggle Bar ───────────────────────────────────────────────

function IconBar({
  options,
  value,
  onChange,
}: {
  options: { value: string; icon: React.ReactNode }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="inline-flex rounded overflow-hidden"
      style={{ border: '1px solid var(--border)' }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className="flex items-center justify-center w-[26px] h-[26px] transition-colors"
          style={{
            background: opt.value === value ? '#3a3a3a' : 'var(--bg-tertiary)',
            color: opt.value === value ? 'var(--text-primary)' : 'var(--text-muted)',
          }}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}

// ─── Flex Controls ─────────────────────────────────────────────────

function FlexControls({
  direction,
  justifyContent,
  alignItems,
  gap,
  onChange,
}: {
  direction: string;
  justifyContent: string;
  alignItems: string;
  gap: string;
  onChange: (prop: string, val: string) => void;
}) {
  return (
    <div className="space-y-2.5 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
      {/* Direction */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] w-[58px] flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
          Direction
        </span>
        <IconBar
          options={DIRECTION_BUTTONS}
          value={direction}
          onChange={(v) => onChange('flexDirection', v)}
        />
      </div>

      {/* Align */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] w-[58px] flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
          Align
        </span>
        <FlexAlignVisual direction={direction} justify={justifyContent} align={alignItems} />
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] w-3" style={{ color: 'var(--text-muted)' }}>X</span>
            <LayoutDropdown value={justifyContent} options={FLEX_JUSTIFY} onChange={(v) => onChange('justifyContent', v)} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] w-3" style={{ color: 'var(--text-muted)' }}>Y</span>
            <LayoutDropdown value={alignItems} options={FLEX_ALIGN} onChange={(v) => onChange('alignItems', v)} />
          </div>
        </div>
      </div>

      {/* Gap */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] w-[58px] flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
          Gap
        </span>
        <div className="flex-1">
          <GapInput value={gap} property="gap" onChange={onChange} />
        </div>
      </div>
    </div>
  );
}

// ─── Grid Controls ─────────────────────────────────────────────────

function GridControls({
  columns,
  rows,
  justifyItems,
  alignItems,
  columnGap,
  rowGap,
  autoFlow,
  onChange,
}: {
  columns: string;
  rows: string;
  justifyItems: string;
  alignItems: string;
  columnGap: string;
  rowGap: string;
  autoFlow: string;
  onChange: (prop: string, val: string) => void;
}) {
  const [gapLinked, setGapLinked] = useState(columnGap === rowGap);
  const [moreAlign, setMoreAlign] = useState(false);

  const colCount = parseGridCount(columns);
  const rowCount = parseGridCount(rows);

  const handleGapChange = useCallback((prop: string, val: string) => {
    if (gapLinked) {
      onChange('columnGap', val);
      onChange('rowGap', val);
    } else {
      onChange(prop, val);
    }
  }, [gapLinked, onChange]);

  const GRID_FLOW = [
    { value: 'row', icon: <GridRowFlowIcon /> },
    { value: 'column', icon: <GridColFlowIcon /> },
    { value: 'row dense', icon: <GridDenseRowIcon /> },
    { value: 'column dense', icon: <GridDenseColIcon /> },
  ];

  const COL_ALIGN = [
    { value: 'start', icon: <ColAlignStartIcon /> },
    { value: 'center', icon: <ColAlignCenterIcon /> },
    { value: 'end', icon: <ColAlignEndIcon /> },
    { value: 'stretch', icon: <ColAlignStretchIcon /> },
  ];

  const ROW_ALIGN = [
    { value: 'start', icon: <RowAlignStartIcon /> },
    { value: 'center', icon: <RowAlignCenterIcon /> },
    { value: 'end', icon: <RowAlignEndIcon /> },
    { value: 'stretch', icon: <RowAlignStretchIcon /> },
  ];

  return (
    <div className="space-y-2.5 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
      {/* Grid dimensions */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] w-[58px] flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
          Grid
        </span>
        <div className="flex-1 flex gap-2">
          <div className="flex-1">
            <NumberStepper value={colCount} onChange={(n) => onChange('gridTemplateColumns', toGridTemplate(n))} />
            <div className="text-[9px] text-center mt-0.5" style={{ color: 'var(--text-muted)' }}>Columns</div>
          </div>
          <div className="flex-1">
            <NumberStepper value={rowCount} onChange={(n) => onChange('gridTemplateRows', toGridTemplate(n))} />
            <div className="text-[9px] text-center mt-0.5" style={{ color: 'var(--text-muted)' }}>Rows</div>
          </div>
        </div>
      </div>

      {/* Direction */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] w-[58px] flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
          Direction
        </span>
        <IconBar
          options={GRID_FLOW}
          value={autoFlow}
          onChange={(v) => onChange('gridAutoFlow', v)}
        />
      </div>

      {/* Align */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] w-[58px] flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
          Align
        </span>
        <GridAlignVisual />
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] w-3" style={{ color: 'var(--text-muted)' }}>X</span>
            <LayoutDropdown value={justifyItems} options={GRID_ALIGN} onChange={(v) => onChange('justifyItems', v)} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] w-3" style={{ color: 'var(--text-muted)' }}>Y</span>
            <LayoutDropdown value={alignItems} options={GRID_ALIGN} onChange={(v) => onChange('alignItems', v)} />
          </div>
        </div>
      </div>

      {/* Gap */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] w-[58px] flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
          Gap
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <div className="flex-1">
              <GapInput value={columnGap} property="columnGap" onChange={handleGapChange} />
            </div>
            <div className="flex-1">
              <GapInput value={rowGap} property="rowGap" onChange={handleGapChange} />
            </div>
            <button
              type="button"
              onClick={() => setGapLinked(!gapLinked)}
              className="flex items-center justify-center w-5 h-5 rounded transition-colors"
              style={{ color: gapLinked ? 'var(--accent)' : 'var(--text-muted)' }}
              title={gapLinked ? 'Unlink column/row gap' : 'Link column/row gap'}
            >
              <LockIcon locked={gapLinked} />
            </button>
          </div>
          <div className="flex gap-1.5 mt-0.5">
            <div className="flex-1 text-[9px] text-center" style={{ color: 'var(--text-muted)' }}>Columns</div>
            <div className="flex-1 text-[9px] text-center" style={{ color: 'var(--text-muted)' }}>Rows</div>
            <div className="w-5" />
          </div>
        </div>
      </div>

      {/* More alignment options */}
      <button
        type="button"
        onClick={() => setMoreAlign(!moreAlign)}
        className="flex items-center gap-1 text-[10px] transition-colors w-full justify-center py-1"
        style={{ color: 'var(--text-muted)' }}
      >
        <span style={{ transform: moreAlign ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', display: 'inline-block', fontSize: 8 }}>▸</span>
        More alignment options
      </button>

      {moreAlign && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] w-[58px] flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>Columns</span>
            <IconBar options={COL_ALIGN} value={justifyItems} onChange={(v) => onChange('justifyItems', v)} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] w-[58px] flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>Rows</span>
            <IconBar options={ROW_ALIGN} value={alignItems} onChange={(v) => onChange('alignItems', v)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inline Controls ───────────────────────────────────────────────

function InlineControls({
  verticalAlign,
  onChange,
}: {
  verticalAlign: string;
  onChange: (prop: string, val: string) => void;
}) {
  return (
    <div className="space-y-2.5 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2">
        <span className="text-[11px] w-[58px] flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
          Align
        </span>
        <LayoutDropdown
          value={verticalAlign}
          options={VERTICAL_ALIGN_OPTIONS}
          onChange={(v) => onChange('verticalAlign', v)}
          showDescription
          width={200}
        />
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────

const LAYOUT_PROPERTIES = [
  'display', 'flexDirection', 'justifyContent', 'alignItems', 'gap', 'columnGap', 'rowGap',
  'gridTemplateColumns', 'gridTemplateRows', 'gridAutoFlow', 'justifyItems', 'verticalAlign',
  'width', 'height',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
];

export function LayoutSection() {
  const computedStyles = useEditorStore((state) => state.computedStyles);
  const { applyChange, resetProperty } = useChangeTracker();

  const hasChanges = useEditorStore((s) => {
    const sp = s.selectorPath;
    if (!sp) return false;
    return s.styleChanges.some((c) => c.elementSelector === sp && LAYOUT_PROPERTIES.includes(c.property));
  });

  const handleResetAll = useCallback(() => {
    const { selectorPath, styleChanges } = useEditorStore.getState();
    if (!selectorPath) return;
    const matching = styleChanges.filter((c) => c.elementSelector === selectorPath && LAYOUT_PROPERTIES.includes(c.property));
    for (const c of matching) resetProperty(c.property);
  }, [resetProperty]);

  const handleChange = useCallback((property: string, value: string) => {
    applyChange(property, value);
  }, [applyChange]);

  const handleReset = useCallback((property: string) => {
    resetProperty(property);
  }, [resetProperty]);

  const rawDisplay = computedStyles.display || 'block';
  const display = resolveDisplay(rawDisplay);
  const flexDirection = computedStyles.flexDirection || 'row';
  const justifyContent = computedStyles.justifyContent || 'flex-start';
  const alignItems = computedStyles.alignItems || 'stretch';
  const gap = computedStyles.gap || '0px';
  const columnGap = computedStyles.columnGap || gap;
  const rowGap = computedStyles.rowGap || gap;
  const gridTemplateColumns = computedStyles.gridTemplateColumns || 'none';
  const gridTemplateRows = computedStyles.gridTemplateRows || 'none';
  const gridAutoFlow = computedStyles.gridAutoFlow || 'row';
  const justifyItems = computedStyles.justifyItems || 'stretch';
  const verticalAlign = computedStyles.verticalAlign || 'baseline';

  const isFlex = display === 'flex' || display === 'inline-flex';
  const isGrid = display === 'grid' || display === 'inline-grid';
  const isInline = display === 'inline' || display === 'inline-block';
  const isNone = display === 'none';


  const handleDisplayChange = useCallback((mode: DisplayMode) => {
    handleChange('display', mode);
    // Set sensible defaults when switching modes
    if (mode === 'flex' || mode === 'inline-flex') {
      if (flexDirection !== 'row' && flexDirection !== 'column' && flexDirection !== 'row-reverse' && flexDirection !== 'column-reverse') {
        handleChange('flexDirection', 'row');
      }
    }
  }, [handleChange, flexDirection]);

  return (
    <SectionHeader title="Layout" defaultOpen={true} hasChanges={hasChanges} onReset={handleResetAll}>
      {/* Display toggle */}
      <DisplayToggle display={display} onChange={handleDisplayChange} />

      {/* Flex controls */}
      {isFlex && (
        <FlexControls
          direction={flexDirection}
          justifyContent={justifyContent}
          alignItems={alignItems}
          gap={gap}
          onChange={handleChange}
        />
      )}

      {/* Grid controls */}
      {isGrid && (
        <GridControls
          columns={gridTemplateColumns}
          rows={gridTemplateRows}
          justifyItems={justifyItems}
          alignItems={alignItems}
          columnGap={columnGap}
          rowGap={rowGap}
          autoFlow={gridAutoFlow}
          onChange={handleChange}
        />
      )}

      {/* Inline controls */}
      {isInline && (
        <InlineControls verticalAlign={verticalAlign} onChange={handleChange} />
      )}

      {/* Padding */}
      {!isNone && (
        <div className="pt-1.5" style={{ borderTop: '1px solid var(--border)' }}>
          <LinkedInputPair
            label="Padding"
            values={{
              top: computedStyles.paddingTop || '0px',
              right: computedStyles.paddingRight || '0px',
              bottom: computedStyles.paddingBottom || '0px',
              left: computedStyles.paddingLeft || '0px',
            }}
            properties={{
              top: 'paddingTop',
              right: 'paddingRight',
              bottom: 'paddingBottom',
              left: 'paddingLeft',
            }}
            onChange={handleChange}
            onReset={handleReset}
          />
        </div>
      )}

      {/* Margin */}
      {!isNone && (
        <LinkedInputPair
          label="Margin"
          values={{
            top: computedStyles.marginTop || '0px',
            right: computedStyles.marginRight || '0px',
            bottom: computedStyles.marginBottom || '0px',
            left: computedStyles.marginLeft || '0px',
          }}
          properties={{
            top: 'marginTop',
            right: 'marginRight',
            bottom: 'marginBottom',
            left: 'marginLeft',
          }}
          onChange={handleChange}
          onReset={handleReset}
        />
      )}

      {/* Box Model Preview */}
      {!isNone && (
        <BoxModelPreview
          margin={{
            top: computedStyles.marginTop || '0px',
            right: computedStyles.marginRight || '0px',
            bottom: computedStyles.marginBottom || '0px',
            left: computedStyles.marginLeft || '0px',
          }}
          border={{
            top: computedStyles.borderTopWidth || '0px',
            right: computedStyles.borderRightWidth || '0px',
            bottom: computedStyles.borderBottomWidth || '0px',
            left: computedStyles.borderLeftWidth || '0px',
          }}
          padding={{
            top: computedStyles.paddingTop || '0px',
            right: computedStyles.paddingRight || '0px',
            bottom: computedStyles.paddingBottom || '0px',
            left: computedStyles.paddingLeft || '0px',
          }}
          width={computedStyles.width || 'auto'}
          height={computedStyles.height || 'auto'}
          onChange={handleChange}
          onReset={handleReset}
        />
      )}

    </SectionHeader>
  );
}

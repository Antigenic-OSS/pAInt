'use client';

import { useState, useRef, useCallback } from 'react';
import { parseCSSValue, formatCSSValue } from '@/lib/utils';
import { useEditorStore } from '@/store';

interface BoxModelPreviewProps {
  margin: { top: string; right: string; bottom: string; left: string };
  border: { top: string; right: string; bottom: string; left: string };
  padding: { top: string; right: string; bottom: string; left: string };
  width: string;
  height: string;
  onChange: (property: string, value: string) => void;
  onReset?: (property: string) => void;
}

// All box-model properties for "Reset All"
const BOX_MODEL_PROPERTIES = [
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
];

// Editable value label with drag-to-scrub + double-click to edit
function ScrubValue({
  value,
  property,
  color,
  onChange,
}: {
  value: string;
  property: string;
  color: string;
  onChange: (property: string, value: string) => void;
  onReset?: (property: string) => void;
}) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const dragStartX = useRef(0);
  const dragStartVal = useRef(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const parsed = parseCSSValue(value);
  const num = parsed.number;
  const unit = parsed.unit || 'px';

  const hasChange = useEditorStore((s) => {
    const sp = s.selectorPath;
    return sp ? s.styleChanges.some((c) => c.elementSelector === sp && c.property === property) : false;
  });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isEditing) return;
      e.preventDefault();
      isDragging.current = true;
      hasDragged.current = false;
      dragStartX.current = e.clientX;
      dragStartVal.current = num;
      spanRef.current?.setPointerCapture(e.pointerId);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    },
    [num, isEditing]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      hasDragged.current = true;
      const delta = e.clientX - dragStartX.current;
      // Base: 2 per pixel. Shift = 10x, Alt/Option = 0.1x
      const multiplier = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
      const next = Math.max(0, Math.round((dragStartVal.current + delta * 2 * multiplier) * 100) / 100);
      onChange(property, formatCSSValue(next, unit));
    },
    [onChange, property, unit]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      spanRef.current?.releasePointerCapture(e.pointerId);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    },
    []
  );

  // Double-click enters inline edit mode
  const handleDoubleClick = useCallback(() => {
    setEditValue(String(num));
    setIsEditing(true);
    // Focus the input after React renders it
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [num]);

  const commitEdit = useCallback(() => {
    setIsEditing(false);
    const n = parseFloat(editValue);
    if (!isNaN(n)) {
      onChange(property, formatCSSValue(Math.max(0, n), unit));
    }
  }, [editValue, onChange, property, unit]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        commitEdit();
      } else if (e.key === 'Escape') {
        setIsEditing(false);
      }
    },
    [commitEdit]
  );

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={commitEdit}
        onKeyDown={handleEditKeyDown}
        className="text-[10px] leading-none tabular-nums bg-transparent border-none outline-none text-center"
        style={{
          color,
          width: '30px',
          padding: '1px 2px',
          borderRadius: '2px',
          background: 'rgba(255,255,255,0.08)',
        }}
      />
    );
  }

  return (
    <span
      ref={spanRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      className="text-[10px] leading-none select-none tabular-nums"
      style={{
        color: hasChange ? color : `${color}99`,
        cursor: 'ew-resize',
        minWidth: '14px',
        textAlign: 'center',
        fontWeight: hasChange ? 600 : 400,
      }}
      title="Drag to scrub, double-click to edit"
    >
      {num}
    </span>
  );
}

export function BoxModelPreview({
  margin,
  border,
  padding,
  width,
  height,
  onChange,
  onReset,
}: BoxModelPreviewProps) {
  const contentW = parseCSSValue(width).number;
  const contentH = parseCSSValue(height).number;

  // Check if any box-model property has a tracked change
  const hasAnyChange = useEditorStore((s) => {
    const sp = s.selectorPath;
    if (!sp) return false;
    return s.styleChanges.some(
      (c) => c.elementSelector === sp && BOX_MODEL_PROPERTIES.includes(c.property)
    );
  });

  const handleResetAll = useCallback(() => {
    if (!onReset) return;
    for (const prop of BOX_MODEL_PROPERTIES) {
      onReset(prop);
    }
  }, [onReset]);

  // Dim-display helper for the content dimension text
  const dimText =
    (contentW ? `${contentW}` : '–') + ' × ' + (contentH ? `${contentH}` : '–');

  return (
    <div className="pt-1.5" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
          Box Model
        </span>
        {hasAnyChange && (
          <button
            type="button"
            onClick={handleResetAll}
            className="text-[9px] px-1.5 py-0.5 rounded hover:opacity-80"
            style={{
              color: 'var(--accent)',
              background: 'rgba(74, 158, 255, 0.10)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Margin layer */}
      <div
        className="relative flex flex-col items-center"
        style={{
          background: 'rgba(251, 191, 36, 0.06)',
          border: '1px solid rgba(251, 191, 36, 0.20)',
          borderRadius: '4px',
          padding: '6px 8px',
        }}
      >
        {/* Margin label */}
        <span
          className="absolute top-0.5 left-1.5 text-[8px] uppercase tracking-wider"
          style={{ color: 'rgba(251, 191, 36, 0.50)' }}
        >
          margin
        </span>

        {/* Margin top */}
        <div className="flex justify-center py-0.5">
          <ScrubValue value={margin.top} property="marginTop" color="#fbbf24" onChange={onChange} onReset={onReset} />
        </div>

        {/* Margin left + border layer + margin right */}
        <div className="flex items-center w-full">
          <div className="flex justify-center px-1" style={{ minWidth: '20px' }}>
            <ScrubValue value={margin.left} property="marginLeft" color="#fbbf24" onChange={onChange} onReset={onReset} />
          </div>

          {/* Border layer */}
          <div
            className="relative flex-1 flex flex-col items-center"
            style={{
              background: 'rgba(163, 163, 163, 0.08)',
              border: '1px solid rgba(163, 163, 163, 0.25)',
              borderRadius: '3px',
              padding: '5px 6px',
            }}
          >
            <span
              className="absolute top-0.5 left-1 text-[8px] uppercase tracking-wider"
              style={{ color: 'rgba(163, 163, 163, 0.50)' }}
            >
              border
            </span>

            {/* Border top */}
            <div className="flex justify-center py-0.5">
              <ScrubValue
                value={border.top}
                property="borderTopWidth"
                color="#a3a3a3"
                onChange={onChange}
                onReset={onReset}
              />
            </div>

            {/* Border left + padding layer + border right */}
            <div className="flex items-center w-full">
              <div className="flex justify-center px-1" style={{ minWidth: '16px' }}>
                <ScrubValue
                  value={border.left}
                  property="borderLeftWidth"
                  color="#a3a3a3"
                  onChange={onChange}
                  onReset={onReset}
                />
              </div>

              {/* Padding layer */}
              <div
                className="relative flex-1 flex flex-col items-center"
                style={{
                  background: 'rgba(74, 222, 128, 0.06)',
                  border: '1px solid rgba(74, 222, 128, 0.20)',
                  borderRadius: '2px',
                  padding: '4px 4px',
                }}
              >
                <span
                  className="absolute top-0 left-1 text-[8px] uppercase tracking-wider"
                  style={{ color: 'rgba(74, 222, 128, 0.50)' }}
                >
                  padding
                </span>

                {/* Padding top */}
                <div className="flex justify-center py-0.5">
                  <ScrubValue
                    value={padding.top}
                    property="paddingTop"
                    color="#4ade80"
                    onChange={onChange}
                    onReset={onReset}
                  />
                </div>

                {/* Padding left + content + padding right */}
                <div className="flex items-center w-full">
                  <div className="flex justify-center px-0.5" style={{ minWidth: '14px' }}>
                    <ScrubValue
                      value={padding.left}
                      property="paddingLeft"
                      color="#4ade80"
                      onChange={onChange}
                      onReset={onReset}
                    />
                  </div>

                  {/* Content box */}
                  <div
                    className="flex-1 flex items-center justify-center py-2"
                    style={{
                      background: 'rgba(74, 158, 255, 0.08)',
                      border: '1px solid rgba(74, 158, 255, 0.25)',
                      borderRadius: '2px',
                      minHeight: '24px',
                    }}
                  >
                    <span
                      className="text-[9px] tabular-nums whitespace-nowrap"
                      style={{ color: 'rgba(74, 158, 255, 0.7)' }}
                    >
                      {dimText}
                    </span>
                  </div>

                  <div className="flex justify-center px-0.5" style={{ minWidth: '14px' }}>
                    <ScrubValue
                      value={padding.right}
                      property="paddingRight"
                      color="#4ade80"
                      onChange={onChange}
                      onReset={onReset}
                    />
                  </div>
                </div>

                {/* Padding bottom */}
                <div className="flex justify-center py-0.5">
                  <ScrubValue
                    value={padding.bottom}
                    property="paddingBottom"
                    color="#4ade80"
                    onChange={onChange}
                    onReset={onReset}
                  />
                </div>
              </div>

              <div className="flex justify-center px-1" style={{ minWidth: '16px' }}>
                <ScrubValue
                  value={border.right}
                  property="borderRightWidth"
                  color="#a3a3a3"
                  onChange={onChange}
                  onReset={onReset}
                />
              </div>
            </div>

            {/* Border bottom */}
            <div className="flex justify-center py-0.5">
              <ScrubValue
                value={border.bottom}
                property="borderBottomWidth"
                color="#a3a3a3"
                onChange={onChange}
                onReset={onReset}
              />
            </div>
          </div>

          <div className="flex justify-center px-1" style={{ minWidth: '20px' }}>
            <ScrubValue value={margin.right} property="marginRight" color="#fbbf24" onChange={onChange} onReset={onReset} />
          </div>
        </div>

        {/* Margin bottom */}
        <div className="flex justify-center py-0.5">
          <ScrubValue value={margin.bottom} property="marginBottom" color="#fbbf24" onChange={onChange} onReset={onReset} />
        </div>
      </div>
    </div>
  );
}

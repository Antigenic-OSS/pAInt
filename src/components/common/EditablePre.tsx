'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * A <pre> block that becomes an editable <textarea> on double-click.
 * Returns the current (possibly edited) text via `onTextChange` so
 * parent components can use the edited version for copy operations.
 */
export function EditablePre({
  text,
  onTextChange,
  className = '',
  style,
}: {
  text: string;
  onTextChange?: (edited: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [localText, setLocalText] = useState(text);
  const [modified, setModified] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // When the source text changes and user hasn't edited, sync
  useEffect(() => {
    if (!modified) {
      setLocalText(text);
    }
  }, [text, modified]);

  // Auto-focus and select when entering edit mode
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editing]);

  const handleDoubleClick = useCallback(() => {
    if (!editing) {
      // If not yet modified, reset to latest computed text
      if (!modified) setLocalText(text);
      setEditing(true);
    }
  }, [editing, modified, text]);

  const handleBlur = useCallback(() => {
    setEditing(false);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalText(val);
    setModified(true);
    onTextChange?.(val);
  }, [onTextChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditing(false);
    }
  }, []);

  const handleReset = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalText(text);
    setModified(false);
    onTextChange?.(text);
  }, [text, onTextChange]);

  if (editing) {
    return (
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={localText}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={className}
          style={{
            ...style,
            width: '100%',
            minHeight: '120px',
            resize: 'vertical',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--accent)',
            borderRadius: '4px',
            padding: '8px',
            outline: 'none',
          }}
          spellCheck={false}
        />
      </div>
    );
  }

  return (
    <div className="relative group/editable">
      <pre
        onDoubleClick={handleDoubleClick}
        className={className}
        style={{
          ...style,
          cursor: 'text',
          borderRadius: '4px',
          transition: 'background 0.15s',
        }}
        title="Double-click to edit"
      >
        {localText}
      </pre>
      {modified && (
        <button
          onClick={handleReset}
          className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[10px] transition-opacity opacity-0 group-hover/editable:opacity-100"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
          }}
          title="Reset to original"
        >
          Reset
        </button>
      )}
    </div>
  );
}

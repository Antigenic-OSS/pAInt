'use client';

import { useCallback, useState } from 'react';
import { useEditorStore } from '@/store';
import { SectionHeader } from '@/components/right-panel/design/inputs/SectionHeader';
import { ColorInput } from '@/components/right-panel/design/inputs/ColorInput';
import { useChangeTracker } from '@/hooks/useChangeTracker';
import { sendViaIframe } from '@/hooks/usePostMessage';
import { generateId } from '@/lib/utils';

const SVG_PROPERTIES = ['fill', 'stroke'];

// ─── Save as Variable Row ──────────────────────────────────────

function SaveAsVariableRow({
  property,
  onSave,
  existingVarName,
  onRemove,
}: {
  property: string;
  onSave: (varName: string) => void;
  existingVarName: string | null;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [varName, setVarName] = useState(`--svg-${property}`);

  const handleSave = () => {
    const name = varName.trim();
    if (!name) return;
    // Ensure it starts with --
    const finalName = name.startsWith('--') ? name : `--${name}`;
    onSave(finalName);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setEditing(false);
  };

  if (existingVarName) {
    return (
      <div className="flex items-center gap-1.5 pl-1">
        <span className="text-[10px] truncate flex-1" style={{ color: 'var(--accent)' }}>
          {existingVarName}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)' }}
          title="Remove variable"
        >
          Remove
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 pl-1">
        <input
          autoFocus
          value={varName}
          onChange={(e) => setVarName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 h-6 rounded text-[11px] px-1.5 outline-none min-w-0"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--accent)',
            color: 'var(--text-primary)',
          }}
          placeholder="--variable-name"
        />
        <button
          type="button"
          onClick={handleSave}
          className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
          style={{ color: '#fff', background: 'var(--accent)' }}
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)' }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex items-center gap-1 pl-1 text-[10px] transition-colors hover:opacity-80"
      style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
    >
      <svg width={10} height={10} viewBox="0 0 12 12" fill="none">
        <path d="M2 2h3v8H2zM7 2h3v8H7z" stroke="currentColor" strokeWidth={1} strokeLinecap="round" />
        <path d="M5 6h2" stroke="currentColor" strokeWidth={1} strokeLinecap="round" />
      </svg>
      Save as variable
    </button>
  );
}

// ─── Helpers ────────────────────────────────────────────────────

/** Extract variable name from a var() expression */
function extractVarName(value: string): string | null {
  const match = value.match(/^var\((--[^,)]+)\)/);
  return match ? match[1] : null;
}

/** Resolve a var() value by looking up the :root change in the store */
function resolveVarValue(value: string): string | null {
  const varName = extractVarName(value);
  if (!varName) return null;
  const { styleChanges } = useEditorStore.getState();
  const rootChange = styleChanges.find(
    (c) => c.elementSelector === ':root' && c.property === varName
  );
  return rootChange ? rootChange.newValue : null;
}

// ─── Main Component ─────────────────────────────────────────────

export function SVGSection() {
  const computedStyles = useEditorStore((state) => state.computedStyles);
  const cssVariableUsages = useEditorStore((state) => state.cssVariableUsages);
  const addStyleChange = useEditorStore((s) => s.addStyleChange);
  const removeStyleChange = useEditorStore((s) => s.removeStyleChange);
  const { applyChange, resetProperty } = useChangeTracker();

  // Track which properties have been saved as variables
  const fillVarName = useEditorStore((s) => {
    const sp = s.selectorPath;
    if (!sp) return null;
    const fillChange = s.styleChanges.find(
      (c) => c.elementSelector === sp && c.property === 'fill'
    );
    if (fillChange) return extractVarName(fillChange.newValue);
    return null;
  });

  const strokeVarName = useEditorStore((s) => {
    const sp = s.selectorPath;
    if (!sp) return null;
    const strokeChange = s.styleChanges.find(
      (c) => c.elementSelector === sp && c.property === 'stroke'
    );
    if (strokeChange) return extractVarName(strokeChange.newValue);
    return null;
  });

  const hasChanges = useEditorStore((s) => {
    const sp = s.selectorPath;
    if (!sp) return false;
    return s.styleChanges.some((c) => c.elementSelector === sp && SVG_PROPERTIES.includes(c.property));
  });

  const handleResetAll = () => {
    const { selectorPath, styleChanges } = useEditorStore.getState();
    if (!selectorPath) return;
    const matching = styleChanges.filter((c) => c.elementSelector === selectorPath && SVG_PROPERTIES.includes(c.property));
    for (const c of matching) {
      // Also remove associated :root variable definitions
      const varName = extractVarName(c.newValue);
      if (varName) {
        const rootChange = styleChanges.find(
          (rc) => rc.elementSelector === ':root' && rc.property === varName
        );
        if (rootChange) removeStyleChange(rootChange.id);
        // Revert the :root inline style in the iframe
        sendViaIframe({
          type: 'REVERT_CHANGE',
          payload: { selectorPath: ':root', property: varName },
        });
      }
      resetProperty(c.property);
    }
  };

  const handleColorChange = useCallback(
    (property: string, value: string) => applyChange(property, value),
    [applyChange]
  );

  const handleSaveAsVariable = useCallback(
    (property: 'fill' | 'stroke', varName: string) => {
      const { selectorPath, styleChanges, activeBreakpoint, changeScope } = useEditorStore.getState();
      if (!selectorPath) return;

      // Get the current color value (from existing change or computed styles)
      const existingChange = styleChanges.find(
        (c) => c.elementSelector === selectorPath && c.property === property
      );
      const colorValue = existingChange
        ? existingChange.newValue
        : (useEditorStore.getState().computedStyles[property] || '');

      if (!colorValue) return;

      // 1. Add :root variable definition change
      addStyleChange({
        id: generateId(),
        elementSelector: ':root',
        property: varName,
        originalValue: '',
        newValue: colorValue,
        breakpoint: activeBreakpoint,
        timestamp: Date.now(),
        changeScope,
      });

      // 2. Apply the variable on :root in the iframe
      sendViaIframe({
        type: 'PREVIEW_CHANGE',
        payload: { selectorPath: ':root', property: varName, value: colorValue },
      });

      // 3. Update the fill/stroke to use var() reference
      applyChange(property, `var(${varName})`);
    },
    [applyChange, addStyleChange]
  );

  const handleRemoveVariable = useCallback(
    (property: 'fill' | 'stroke') => {
      const { selectorPath, styleChanges } = useEditorStore.getState();
      if (!selectorPath) return;

      // Find the fill/stroke change with var() reference
      const propChange = styleChanges.find(
        (c) => c.elementSelector === selectorPath && c.property === property
      );
      if (!propChange) return;

      const varName = extractVarName(propChange.newValue);
      if (!varName) return;

      // Resolve the color value from the :root change
      const resolved = resolveVarValue(propChange.newValue);

      // Remove the :root variable definition
      const rootChange = styleChanges.find(
        (c) => c.elementSelector === ':root' && c.property === varName
      );
      if (rootChange) removeStyleChange(rootChange.id);

      // Revert :root inline style in iframe
      sendViaIframe({
        type: 'REVERT_CHANGE',
        payload: { selectorPath: ':root', property: varName },
      });

      // Restore fill/stroke to the resolved color value
      if (resolved) {
        applyChange(property, resolved);
      }
    },
    [applyChange, removeStyleChange]
  );

  // Resolve display values: if the value is var(), show the resolved color
  const rawFill = computedStyles.fill || '';
  const rawStroke = computedStyles.stroke || '';
  const fillDisplay = extractVarName(rawFill) ? (resolveVarValue(rawFill) || rawFill) : rawFill;
  const strokeDisplay = extractVarName(rawStroke) ? (resolveVarValue(rawStroke) || rawStroke) : rawStroke;

  return (
    <SectionHeader title="SVG" defaultOpen={true} hasChanges={hasChanges} onReset={handleResetAll}>
      <div className="space-y-2.5">
        {/* Fill */}
        <div className="space-y-1">
          <ColorInput
            label="Fill"
            value={fillDisplay}
            property="fill"
            onChange={handleColorChange}
            varExpression={cssVariableUsages['fill']}
          />
          <SaveAsVariableRow
            property="fill"
            existingVarName={fillVarName}
            onSave={(name) => handleSaveAsVariable('fill', name)}
            onRemove={() => handleRemoveVariable('fill')}
          />
        </div>

        {/* Stroke */}
        <div className="space-y-1">
          <ColorInput
            label="Stroke"
            value={strokeDisplay}
            property="stroke"
            onChange={handleColorChange}
            varExpression={cssVariableUsages['stroke']}
          />
          <SaveAsVariableRow
            property="stroke"
            existingVarName={strokeVarName}
            onSave={(name) => handleSaveAsVariable('stroke', name)}
            onRemove={() => handleRemoveVariable('stroke')}
          />
        </div>
      </div>
    </SectionHeader>
  );
}

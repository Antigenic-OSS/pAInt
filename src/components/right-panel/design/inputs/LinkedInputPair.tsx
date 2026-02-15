'use client';

import { useState, useEffect, useCallback } from 'react';
import { parseCSSValue } from '@/lib/utils';
import { CompactInput } from './CompactInput';
import { LinkIcon, UnlinkIcon } from '@/components/right-panel/design/icons';

interface LinkedInputPairProps {
  label: string;
  values: { top: string; right: string; bottom: string; left: string };
  properties: { top: string; right: string; bottom: string; left: string };
  onChange: (property: string, value: string) => void;
  onReset?: (property: string) => void;
  units?: string[];
}

function areAllEqual(values: { top: string; right: string; bottom: string; left: string }): boolean {
  const t = parseCSSValue(values.top);
  const r = parseCSSValue(values.right);
  const b = parseCSSValue(values.bottom);
  const l = parseCSSValue(values.left);
  return (
    t.number === r.number &&
    t.number === b.number &&
    t.number === l.number &&
    (t.unit || 'px') === (r.unit || 'px') &&
    (t.unit || 'px') === (b.unit || 'px') &&
    (t.unit || 'px') === (l.unit || 'px')
  );
}

function areHVEqual(values: { top: string; right: string; bottom: string; left: string }): boolean {
  const t = parseCSSValue(values.top);
  const r = parseCSSValue(values.right);
  const b = parseCSSValue(values.bottom);
  const l = parseCSSValue(values.left);
  return (
    t.number === b.number &&
    (t.unit || 'px') === (b.unit || 'px') &&
    r.number === l.number &&
    (r.unit || 'px') === (l.unit || 'px')
  );
}

export function LinkedInputPair({
  label,
  values,
  properties,
  onChange,
  onReset,
  units = ['px', '%', 'em', 'rem'],
}: LinkedInputPairProps) {
  const [isLinked, setIsLinked] = useState(() => areHVEqual(values));

  useEffect(() => {
    if (areHVEqual(values)) {
      setIsLinked(true);
    }
  }, [values]);

  const handleLinkedHChange = (property: string, value: string) => {
    onChange(properties.left, value);
    onChange(properties.right, value);
  };

  const handleLinkedVChange = (property: string, value: string) => {
    onChange(properties.top, value);
    onChange(properties.bottom, value);
  };

  // When linked, reset both sides together
  const handleLinkedHReset = useCallback(
    () => {
      if (!onReset) return;
      onReset(properties.left);
      onReset(properties.right);
    },
    [onReset, properties.left, properties.right]
  );

  const handleLinkedVReset = useCallback(
    () => {
      if (!onReset) return;
      onReset(properties.top);
      onReset(properties.bottom);
    },
    [onReset, properties.top, properties.bottom]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        <button
          type="button"
          onClick={() => setIsLinked(!isLinked)}
          className="flex items-center justify-center w-5 h-5 rounded hover:opacity-80"
          style={{
            color: isLinked ? 'var(--accent)' : 'var(--text-muted)',
            background: 'transparent',
          }}
          title={isLinked ? 'Unlink sides' : 'Link sides'}
        >
          {isLinked ? <LinkIcon /> : <UnlinkIcon />}
        </button>
      </div>

      {isLinked ? (
        <div className="grid grid-cols-2 gap-1.5">
          <CompactInput
            label="H"
            value={values.left}
            property={properties.left}
            onChange={handleLinkedHChange}
            onReset={handleLinkedHReset}
            units={units}
          />
          <CompactInput
            label="V"
            value={values.top}
            property={properties.top}
            onChange={handleLinkedVChange}
            onReset={handleLinkedVReset}
            units={units}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          <CompactInput
            label="T"
            value={values.top}
            property={properties.top}
            onChange={onChange}
            onReset={onReset}
            units={units}
          />
          <CompactInput
            label="R"
            value={values.right}
            property={properties.right}
            onChange={onChange}
            onReset={onReset}
            units={units}
          />
          <CompactInput
            label="B"
            value={values.bottom}
            property={properties.bottom}
            onChange={onChange}
            onReset={onReset}
            units={units}
          />
          <CompactInput
            label="L"
            value={values.left}
            property={properties.left}
            onChange={onChange}
            onReset={onReset}
            units={units}
          />
        </div>
      )}
    </div>
  );
}

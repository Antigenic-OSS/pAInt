'use client';

import { useCallback } from 'react';
import { useEditorStore } from '@/store';
import { sendViaIframe } from '@/hooks/usePostMessage';

interface ElementType {
  tag: string;
  label: string;
  description: string;
  placeholderText: string;
  defaultStyles?: Record<string, string>;
}

interface ElementCategory {
  name: string;
  elements: ElementType[];
}

const ELEMENT_CATEGORIES: ElementCategory[] = [
  {
    name: 'Structure',
    elements: [
      { tag: 'div', label: 'Div', description: 'Generic container', placeholderText: 'Div', defaultStyles: { width: '100%', height: '100px', 'background-color': 'green', display: 'flex', 'justify-content': 'center', 'align-items': 'center' } },
      { tag: 'section', label: 'Section', description: 'Semantic section', placeholderText: 'Section', defaultStyles: { width: '100%', height: '100px', 'background-color': 'green', display: 'flex', 'justify-content': 'center', 'align-items': 'center' } },
    ],
  },
  {
    name: 'Text',
    elements: [
      { tag: 'h1', label: 'H1', description: 'Main heading', placeholderText: 'Heading 1' },
      { tag: 'h2', label: 'H2', description: 'Sub heading', placeholderText: 'Heading 2' },
      { tag: 'h3', label: 'H3', description: 'Section heading', placeholderText: 'Heading 3' },
      { tag: 'h4', label: 'H4', description: 'Sub-section heading', placeholderText: 'Heading 4' },
      { tag: 'h5', label: 'H5', description: 'Minor heading', placeholderText: 'Heading 5' },
      { tag: 'h6', label: 'H6', description: 'Smallest heading', placeholderText: 'Heading 6' },
      { tag: 'p', label: 'Paragraph', description: 'Text paragraph', placeholderText: 'Paragraph text' },
    ],
  },
];

function ElementItem({ element, onInsert }: { element: ElementType; onInsert: (el: ElementType) => void }) {
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('application/x-dev-editor-element', JSON.stringify({
      tag: element.tag,
      placeholderText: element.placeholderText,
      defaultStyles: element.defaultStyles,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  }, [element]);

  return (
    <button
      draggable
      onDragStart={handleDragStart}
      onClick={() => onInsert(element)}
      className="flex items-center gap-2 w-full text-left"
      style={{
        padding: '6px 8px',
        borderRadius: 4,
        border: 'none',
        background: 'transparent',
        color: 'var(--text-primary)',
        cursor: 'grab',
        fontSize: 11,
        transition: 'background-color 0.1s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
      title={`Drag to add or click to insert <${element.tag}>`}
    >
      <span
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          width: 28,
          height: 22,
          borderRadius: 3,
          background: 'var(--bg-tertiary)',
          color: 'var(--accent)',
          fontSize: 10,
          fontWeight: 600,
          fontFamily: 'monospace',
        }}
      >
        {element.tag}
      </span>
      <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
        {element.description}
      </span>
    </button>
  );
}

export function AddElementPanel() {
  const selectorPath = useEditorStore((s) => s.selectorPath);

  const handleInsert = useCallback((element: ElementType) => {
    if (!selectorPath) return;
    sendViaIframe({
      type: 'INSERT_ELEMENT',
      payload: {
        tagName: element.tag,
        parentSelectorPath: selectorPath,
        placeholderText: element.placeholderText,
        defaultStyles: element.defaultStyles,
      },
    });
  }, [selectorPath]);

  return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{ padding: '8px' }}>
      {!selectorPath && (
        <div
          className="text-xs"
          style={{
            color: 'var(--text-muted)',
            padding: '8px',
            marginBottom: 8,
            borderRadius: 4,
            background: 'var(--bg-tertiary)',
          }}
        >
          Select a parent element first, then click an element to insert it. Or drag an element onto the preview.
        </div>
      )}
      {ELEMENT_CATEGORIES.map((category) => (
        <div key={category.name} style={{ marginBottom: 12 }}>
          <div
            className="text-xs font-medium"
            style={{
              color: 'var(--text-muted)',
              padding: '4px 8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: 10,
            }}
          >
            {category.name}
          </div>
          <div className="flex flex-col">
            {category.elements.map((element) => (
              <ElementItem
                key={element.tag}
                element={element}
                onInsert={handleInsert}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

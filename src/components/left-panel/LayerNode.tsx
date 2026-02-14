'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useEditorStore } from '@/store';
import { usePostMessage } from '@/hooks/usePostMessage';
import type { TreeNode } from '@/types/tree';

interface LayerNodeProps {
  node: TreeNode;
  depth: number;
  searchQuery: string;
}

function matchesSearch(node: TreeNode, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    node.tagName.toLowerCase().includes(q) ||
    (node.className?.toLowerCase().includes(q) ?? false) ||
    (node.elementId?.toLowerCase().includes(q) ?? false)
  );
}

export function LayerNode({ node, depth, searchQuery }: LayerNodeProps) {
  const selectorPath = useEditorStore((s) => s.selectorPath);
  const highlightedNodeId = useEditorStore((s) => s.highlightedNodeId);
  const toggleNodeExpanded = useEditorStore((s) => s.toggleNodeExpanded);
  const { sendToInspector } = usePostMessage();

  const rowRef = useRef<HTMLDivElement>(null);

  const isSelected = selectorPath === node.id;
  const isHighlighted = highlightedNodeId === node.id;
  const isExpanded = node.isExpanded !== false;
  const hasChildren = node.children.length > 0;

  // Scroll selected layer into center view
  useEffect(() => {
    if (isSelected && rowRef.current) {
      rowRef.current.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  }, [isSelected]);

  const handleClick = useCallback(() => {
    sendToInspector({ type: 'SELECT_ELEMENT', payload: { selectorPath: node.id } });
  }, [node.id, sendToInspector]);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleNodeExpanded(node.id);
    },
    [node.id, toggleNodeExpanded]
  );

  if (searchQuery && !matchesSearch(node, searchQuery)) {
    // Still render children that might match
    const matchingChildren = node.children.filter((c) => matchesSearch(c, searchQuery));
    if (matchingChildren.length === 0) return null;
    return (
      <>
        {matchingChildren.map((child) => (
          <LayerNode key={child.id} node={child} depth={depth} searchQuery={searchQuery} />
        ))}
      </>
    );
  }

  return (
    <div>
      <div
        ref={rowRef}
        className="flex items-center cursor-pointer group"
        style={{
          paddingLeft: depth * 16 + 4,
          height: 24,
          background: isSelected
            ? 'var(--accent-bg)'
            : isHighlighted
              ? 'var(--highlight-hover)'
              : 'transparent',
          color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
        }}
        onClick={handleClick}
      >
        {/* Expand arrow */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="w-4 h-4 flex items-center justify-center text-[10px] flex-shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* Tag name */}
        <span className="text-xs truncate">
          <span style={{ color: isSelected ? 'var(--accent)' : 'var(--text-secondary)' }}>
            {node.tagName}
          </span>
          {node.elementId && (
            <span style={{ color: 'var(--warning)' }}>#{node.elementId}</span>
          )}
          {node.className && (
            <span style={{ color: 'var(--text-muted)' }}>
              .{node.className.split(' ')[0]}
            </span>
          )}
        </span>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <LayerNode
              key={child.id}
              node={child}
              depth={depth + 1}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

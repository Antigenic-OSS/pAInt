'use client';

import { useCallback, useEffect, useRef, type ReactElement } from 'react';
import { useEditorStore } from '@/store';
import { usePostMessage } from '@/hooks/usePostMessage';
import type { TreeNode } from '@/types/tree';

interface LayerNodeProps {
  node: TreeNode;
  depth: number;
  searchQuery: string;
  changedSelectors?: Set<string>;
}

// --- Element categorization ---

const COMPONENT_TAGS = new Set([
  'nav', 'header', 'footer', 'main', 'aside', 'article',
]);

const SECTION_TAGS = new Set(['section']);

const IMAGE_TAGS = new Set(['img', 'picture', 'svg', 'video', 'canvas']);

const TEXT_TAGS = new Set([
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'label', 'blockquote', 'pre', 'code',
]);

const FORM_TAGS = new Set(['input', 'textarea', 'select', 'form', 'button']);

const LIST_TAGS = new Set(['ul', 'ol', 'li']);

const LINK_TAGS = new Set(['a']);

type NodeCategory = 'body' | 'component' | 'section' | 'image' | 'text' | 'form' | 'list' | 'link' | 'div';

function hasCPrefix(className: string | null | undefined): boolean {
  if (!className) return false;
  return className.split(/\s+/).some((cls) => cls.startsWith('c-') && cls.length > 2);
}

function categorize(tag: string, className?: string | null): NodeCategory {
  if (tag === 'body') return 'body';
  if (hasCPrefix(className)) return 'component';
  if (COMPONENT_TAGS.has(tag)) return 'component';
  if (SECTION_TAGS.has(tag)) return 'section';
  if (IMAGE_TAGS.has(tag)) return 'image';
  if (TEXT_TAGS.has(tag)) return 'text';
  if (FORM_TAGS.has(tag)) return 'form';
  if (LIST_TAGS.has(tag)) return 'list';
  if (LINK_TAGS.has(tag)) return 'link';
  return 'div';
}

// --- SVG Icons (14×14) ---

function BodyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <line x1="1.5" y1="4.5" x2="12.5" y2="4.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function DivIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="2" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function SectionIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="3" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="5" y1="3" x2="5" y2="11" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      <line x1="9" y1="3" x2="9" y2="11" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
}

function ComponentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M7 1.5L12.5 4.5V9.5L7 12.5L1.5 9.5V4.5L7 1.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="2.5" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="4.5" cy="5.5" r="1.2" stroke="currentColor" strokeWidth="1" />
      <path d="M1.5 9.5L4.5 7L7 9L9.5 6.5L12.5 9.5" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 3.5H11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M7 3.5V11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M5 11H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function FormIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="4" width="11" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="3.5" y1="7" x2="7" y2="7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="3" cy="4" r="1" fill="currentColor" />
      <circle cx="3" cy="7" r="1" fill="currentColor" />
      <circle cx="3" cy="10" r="1" fill="currentColor" />
      <line x1="5.5" y1="4" x2="11.5" y2="4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5.5" y1="7" x2="11.5" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5.5" y1="10" x2="11.5" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M6 8L8 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M8.5 5.5L9.5 4.5C10.3 3.7 11.5 3.7 12.3 4.5C13.1 5.3 13.1 6.5 12.3 7.3L11 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M5.5 8.5L4.5 9.5C3.7 10.3 2.5 10.3 1.7 9.5C0.9 8.7 0.9 7.5 1.7 6.7L3 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

const ICON_MAP: Record<NodeCategory, () => ReactElement> = {
  body: BodyIcon,
  div: DivIcon,
  section: SectionIcon,
  component: ComponentIcon,
  image: ImageIcon,
  text: TextIcon,
  form: FormIcon,
  list: ListIcon,
  link: LinkIcon,
};

// Green categories — semantic/component elements get green tint
const GREEN_CATEGORIES = new Set<NodeCategory>(['component', 'section']);

// --- Display label ---

function getCPrefixClass(className: string | null | undefined): string | null {
  if (!className) return null;
  const match = className.split(/\s+/).find((cls) => cls.startsWith('c-') && cls.length > 2);
  return match || null;
}

function getDisplayLabel(node: TreeNode): string {
  if (node.tagName === 'body') return 'Body';
  // Prefer c- prefixed class (component identifier)
  const cClass = getCPrefixClass(node.className);
  if (cClass) return cClass;
  // Then id
  if (node.elementId) return node.elementId;
  // Then first meaningful class
  if (node.className) {
    const first = node.className.split(' ')[0];
    if (first) return first;
  }
  return node.tagName;
}

// --- Search matching ---

function matchesSearch(node: TreeNode, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    node.tagName.toLowerCase().includes(q) ||
    (node.className?.toLowerCase().includes(q) ?? false) ||
    (node.elementId?.toLowerCase().includes(q) ?? false)
  );
}

// --- Component ---

export function LayerNode({ node, depth, searchQuery, changedSelectors }: LayerNodeProps) {
  const selectorPath = useEditorStore((s) => s.selectorPath);
  const highlightedNodeId = useEditorStore((s) => s.highlightedNodeId);
  const toggleNodeExpanded = useEditorStore((s) => s.toggleNodeExpanded);
  const expandToNode = useEditorStore((s) => s.expandToNode);
  const { sendToInspector } = usePostMessage();

  const rowRef = useRef<HTMLDivElement>(null);

  const isSelected = selectorPath === node.id;
  const isHighlighted = highlightedNodeId === node.id;
  const isExpanded = node.isExpanded !== false;
  const hasChildren = node.children.length > 0;

  const category = categorize(node.tagName, node.className);
  const isGreen = GREEN_CATEGORIES.has(category);
  const IconComponent = ICON_MAP[category];
  const label = getDisplayLabel(node);

  // Auto-expand ancestors and scroll selected layer into view
  useEffect(() => {
    if (isSelected) {
      expandToNode(node.id);
      if (rowRef.current) {
        rowRef.current.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    }
  }, [isSelected, node.id, expandToNode]);

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
    const matchingChildren = node.children.filter((c) => matchesSearch(c, searchQuery));
    if (matchingChildren.length === 0) return null;
    return (
      <>
        {matchingChildren.map((child) => (
          <LayerNode key={child.id} node={child} depth={depth} searchQuery={searchQuery} changedSelectors={changedSelectors} />
        ))}
      </>
    );
  }

  // Resolve colors
  const iconColor = isSelected
    ? 'var(--accent)'
    : isGreen
      ? '#4ade80'
      : 'var(--text-muted)';

  const labelColor = isSelected
    ? 'var(--accent)'
    : isGreen
      ? '#4ade80'
      : 'var(--text-primary)';

  return (
    <div className="relative">
      {/* Indent guide lines */}
      {depth > 0 && (
        <div
          className="absolute top-0 bottom-0"
          style={{
            left: depth * 16 + 2,
            width: 1,
            background: 'var(--border)',
            opacity: 0.5,
          }}
        />
      )}

      <div
        ref={rowRef}
        className="flex items-center cursor-pointer group"
        style={{
          paddingLeft: depth * 16 + 4,
          height: 28,
          background: isSelected
            ? 'rgba(74, 158, 255, 0.12)'
            : isHighlighted
              ? 'rgba(255, 255, 255, 0.04)'
              : 'transparent',
        }}
        onClick={handleClick}
      >
        {/* Expand arrow */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="w-5 h-5 flex items-center justify-center flex-shrink-0 rounded hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="currentColor"
              style={{
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s ease',
              }}
            >
              <path d="M2 1L6 4L2 7Z" />
            </svg>
          </button>
        ) : (
          <span className="w-5 flex-shrink-0" />
        )}

        {/* Type icon */}
        <span
          className="flex-shrink-0 flex items-center justify-center w-5 h-5"
          style={{ color: iconColor }}
        >
          <IconComponent />
        </span>

        {/* Label */}
        <span
          className="text-[11px] ml-1 leading-none whitespace-nowrap"
          style={{ color: labelColor }}
        >
          {label}
        </span>

        {/* Tag badge for non-div elements when showing class name */}
        {node.className && node.tagName !== 'div' && node.tagName !== 'body' && label !== node.tagName && (
          <span
            className="text-[9px] ml-1.5 flex-shrink-0 opacity-50"
            style={{ color: 'var(--text-muted)' }}
          >
            {node.tagName}
          </span>
        )}
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
              changedSelectors={changedSelectors}
            />
          ))}
        </div>
      )}
    </div>
  );
}

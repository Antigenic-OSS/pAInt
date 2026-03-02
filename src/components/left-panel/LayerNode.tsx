'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react'
import { useEditorStore } from '@/store'
import { usePostMessage } from '@/hooks/usePostMessage'
import { useChangeTracker } from '@/hooks/useChangeTracker'
import type { TreeNode } from '@/types/tree'

interface LayerNodeProps {
  node: TreeNode
  depth: number
  searchQuery: string
  changedSelectors?: Set<string>
  deletedSelectors?: Set<string>
}

// --- Element categorization ---

const COMPONENT_TAGS = new Set([
  'nav',
  'header',
  'footer',
  'main',
  'aside',
  'article',
])

const SECTION_TAGS = new Set(['section'])

const IMAGE_TAGS = new Set(['img', 'picture', 'svg', 'video', 'canvas'])

const TEXT_TAGS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'span',
  'label',
  'blockquote',
  'pre',
  'code',
])

const FORM_TAGS = new Set(['input', 'textarea', 'select', 'form', 'button'])

const LIST_TAGS = new Set(['ul', 'ol', 'li'])

const LINK_TAGS = new Set(['a'])

type NodeCategory =
  | 'body'
  | 'component'
  | 'section'
  | 'image'
  | 'text'
  | 'form'
  | 'list'
  | 'link'
  | 'div'

function hasCPrefix(className: string | null | undefined): boolean {
  if (!className) return false
  return className
    .split(/\s+/)
    .some((cls) => cls.startsWith('c-') && cls.length > 2)
}

function categorize(tag: string, className?: string | null): NodeCategory {
  if (tag === 'body') return 'body'
  if (hasCPrefix(className)) return 'component'
  if (COMPONENT_TAGS.has(tag)) return 'component'
  if (SECTION_TAGS.has(tag)) return 'section'
  if (IMAGE_TAGS.has(tag)) return 'image'
  if (TEXT_TAGS.has(tag)) return 'text'
  if (FORM_TAGS.has(tag)) return 'form'
  if (LIST_TAGS.has(tag)) return 'list'
  if (LINK_TAGS.has(tag)) return 'link'
  return 'div'
}

// --- Container tags that accept child elements ---

const CONTAINER_TAGS = new Set([
  'div',
  'section',
  'main',
  'header',
  'footer',
  'nav',
  'aside',
  'article',
  'ul',
  'ol',
  'li',
  'form',
  'fieldset',
  'details',
  'summary',
  'figure',
  'figcaption',
  'blockquote',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'td',
  'th',
  'body',
])

function isContainerNode(node: TreeNode): boolean {
  return CONTAINER_TAGS.has(node.tagName) || node.children.length > 0
}

// --- SVG Icons (14×14) ---

function BodyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect
        x="1.5"
        y="1.5"
        width="11"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <line
        x1="1.5"
        y1="4.5"
        x2="12.5"
        y2="4.5"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  )
}

function DivIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect
        x="2"
        y="2"
        width="10"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  )
}

function SectionIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect
        x="1.5"
        y="3"
        width="11"
        height="8"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <line
        x1="5"
        y1="3"
        x2="5"
        y2="11"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.5"
      />
      <line
        x1="9"
        y1="3"
        x2="9"
        y2="11"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.5"
      />
    </svg>
  )
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
  )
}

function ImageIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect
        x="1.5"
        y="2.5"
        width="11"
        height="9"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <circle cx="4.5" cy="5.5" r="1.2" stroke="currentColor" strokeWidth="1" />
      <path
        d="M1.5 9.5L4.5 7L7 9L9.5 6.5L12.5 9.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TextIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M3 3.5H11"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M7 3.5V11"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M5 11H9"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function FormIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect
        x="1.5"
        y="4"
        width="11"
        height="6"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <line
        x1="3.5"
        y1="7"
        x2="7"
        y2="7"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="3" cy="4" r="1" fill="currentColor" />
      <circle cx="3" cy="7" r="1" fill="currentColor" />
      <circle cx="3" cy="10" r="1" fill="currentColor" />
      <line
        x1="5.5"
        y1="4"
        x2="11.5"
        y2="4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <line
        x1="5.5"
        y1="7"
        x2="11.5"
        y2="7"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <line
        x1="5.5"
        y1="10"
        x2="11.5"
        y2="10"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M6 8L8 6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M8.5 5.5L9.5 4.5C10.3 3.7 11.5 3.7 12.3 4.5C13.1 5.3 13.1 6.5 12.3 7.3L11 8.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M5.5 8.5L4.5 9.5C3.7 10.3 2.5 10.3 1.7 9.5C0.9 8.7 0.9 7.5 1.7 6.7L3 5.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
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
}

// Green categories — semantic/component elements get green tint
const GREEN_CATEGORIES = new Set<NodeCategory>(['component', 'section'])

// --- Display label ---

function getCPrefixClass(className: string | null | undefined): string | null {
  if (!className) return null
  const match = className
    .split(/\s+/)
    .find((cls) => cls.startsWith('c-') && cls.length > 2)
  return match || null
}

function getDisplayLabel(node: TreeNode): string {
  if (node.tagName === 'body') return 'Body'
  // Prefer c- prefixed class (component identifier)
  const cClass = getCPrefixClass(node.className)
  if (cClass) return cClass
  // Then id
  if (node.elementId) return node.elementId
  // Then first meaningful class
  if (node.className) {
    const first = node.className.split(' ')[0]
    if (first) return first
  }
  return node.tagName
}

// --- Search matching ---

function matchesSearch(node: TreeNode, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    node.tagName.toLowerCase().includes(q) ||
    (node.className?.toLowerCase().includes(q) ?? false) ||
    (node.elementId?.toLowerCase().includes(q) ?? false)
  )
}

// --- Drag-and-drop helpers ---

const DRAG_DATA_TYPE = 'application/x-dev-editor-layer-move'

type DropPosition = 'before' | 'inside' | 'after'

function isDescendant(parentId: string, childId: string): boolean {
  return childId.startsWith(parentId + ' > ')
}

function getDropPosition(
  e: React.DragEvent,
  rowElement: HTMLElement,
): DropPosition {
  const rect = rowElement.getBoundingClientRect()
  const y = e.clientY - rect.top
  const third = rect.height / 3
  if (y < third) return 'before'
  if (y > third * 2) return 'after'
  return 'inside'
}

// --- Component ---

export function LayerNode({
  node,
  depth,
  searchQuery,
  changedSelectors,
  deletedSelectors,
}: LayerNodeProps) {
  const selectorPath = useEditorStore((s) => s.selectorPath)
  const highlightedNodeId = useEditorStore((s) => s.highlightedNodeId)
  const toggleNodeExpanded = useEditorStore((s) => s.toggleNodeExpanded)
  const styleChanges = useEditorStore((s) => s.styleChanges)
  const { sendToInspector } = usePostMessage()
  const { revertChange } = useChangeTracker()

  const isDeleted = deletedSelectors?.has(node.id) ?? false

  const rowRef = useRef<HTMLDivElement>(null)
  const [dropIndicator, setDropIndicator] = useState<DropPosition | null>(null)
  const [isDragSource, setIsDragSource] = useState(false)

  const expandedNodeIds = useEditorStore((s) => s.expandedNodeIds)

  const isSelected = selectorPath === node.id
  const isHighlighted = highlightedNodeId === node.id
  const isExpanded = expandedNodeIds.has(node.id)
  const hasChildren = node.children.length > 0
  const isBody = node.tagName === 'body'

  const category = categorize(node.tagName, node.className)
  const isGreen = GREEN_CATEGORIES.has(category)
  const IconComponent = ICON_MAP[category]
  const label = getDisplayLabel(node)

  // Scroll selected layer into view (expansion is handled by usePostMessage)
  useEffect(() => {
    if (isSelected && rowRef.current) {
      rowRef.current.scrollIntoView({ block: 'center', behavior: 'instant' })
    }
  }, [isSelected])

  const handleClick = useCallback(() => {
    sendToInspector({
      type: 'SELECT_ELEMENT',
      payload: { selectorPath: node.id },
    })
  }, [node.id, sendToInspector])

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      toggleNodeExpanded(node.id)
    },
    [node.id, toggleNodeExpanded],
  )

  const handleRevertDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      const deleteChange = styleChanges.find(
        (c) =>
          c.elementSelector === node.id && c.property === '__element_deleted__',
      )
      if (deleteChange) {
        revertChange(
          deleteChange.id,
          deleteChange.elementSelector,
          deleteChange.property,
        )
      }
    },
    [node.id, styleChanges, revertChange],
  )

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      sendToInspector({
        type: 'DELETE_ELEMENT',
        payload: { selectorPath: node.id },
      })
    },
    [node.id, sendToInspector],
  )

  // --- Drag handlers ---

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (isBody) {
        e.preventDefault()
        return
      }
      e.dataTransfer.setData(
        DRAG_DATA_TYPE,
        JSON.stringify({
          selectorPath: node.id,
          tagName: node.tagName,
        }),
      )
      e.dataTransfer.effectAllowed = 'move'
      setIsDragSource(true)

      // Use a minimal drag image
      if (rowRef.current) {
        e.dataTransfer.setDragImage(rowRef.current, 10, 14)
      }
    },
    [node.id, node.tagName, isBody],
  )

  const handleDragEnd = useCallback(() => {
    setIsDragSource(false)
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(DRAG_DATA_TYPE)) return
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'move'

      if (!rowRef.current) return
      const pos = getDropPosition(e, rowRef.current)

      // If this node is a container, show 'inside' for the middle zone
      // Otherwise, only show before/after
      if (pos === 'inside' && !isContainerNode(node)) {
        setDropIndicator(null)
        return
      }
      setDropIndicator(pos)
    },
    [node],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the actual row (not entering a child)
    if (rowRef.current && !rowRef.current.contains(e.relatedTarget as Node)) {
      setDropIndicator(null)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDropIndicator(null)

      const raw = e.dataTransfer.getData(DRAG_DATA_TYPE)
      if (!raw) return

      let dragData: { selectorPath: string; tagName: string }
      try {
        dragData = JSON.parse(raw)
      } catch {
        return
      }

      // Can't drop on itself
      if (dragData.selectorPath === node.id) return
      // Can't drop inside own descendant
      if (isDescendant(dragData.selectorPath, node.id)) return

      if (!rowRef.current) return
      const pos = getDropPosition(e, rowRef.current)

      // Determine the target parent and insertion index
      // The node.id is a CSS selector path like "body > div > section"
      // The parent path is everything before the last " > " segment
      const parentParts = node.id.split(' > ')

      if (pos === 'inside' && isContainerNode(node)) {
        // Drop inside this node as last child
        sendToInspector({
          type: 'MOVE_ELEMENT',
          payload: {
            selectorPath: dragData.selectorPath,
            newParentSelectorPath: node.id,
            newIndex: node.children.length,
          },
        })
      } else if (pos === 'before') {
        // Drop before this node — same parent, at this node's index
        if (parentParts.length < 2) return // Can't drop before body
        const parentId = parentParts.slice(0, -1).join(' > ')
        // Find sibling index of this node in its parent
        const parentNode = findNodeInTree(
          useEditorStore.getState().rootNode,
          parentId,
        )
        if (!parentNode) return
        const siblingIndex = parentNode.children.findIndex(
          (c) => c.id === node.id,
        )
        sendToInspector({
          type: 'MOVE_ELEMENT',
          payload: {
            selectorPath: dragData.selectorPath,
            newParentSelectorPath: parentId,
            newIndex: Math.max(0, siblingIndex),
          },
        })
      } else if (pos === 'after') {
        if (parentParts.length < 2) return
        const parentId = parentParts.slice(0, -1).join(' > ')
        const parentNode = findNodeInTree(
          useEditorStore.getState().rootNode,
          parentId,
        )
        if (!parentNode) return
        const siblingIndex = parentNode.children.findIndex(
          (c) => c.id === node.id,
        )
        sendToInspector({
          type: 'MOVE_ELEMENT',
          payload: {
            selectorPath: dragData.selectorPath,
            newParentSelectorPath: parentId,
            newIndex: siblingIndex + 1,
          },
        })
      }
    },
    [node, sendToInspector],
  )

  if (searchQuery && !matchesSearch(node, searchQuery)) {
    const matchingChildren = node.children.filter((c) =>
      matchesSearch(c, searchQuery),
    )
    if (matchingChildren.length === 0) return null
    return (
      <>
        {matchingChildren.map((child) => (
          <LayerNode
            key={child.id}
            node={child}
            depth={depth}
            searchQuery={searchQuery}
            changedSelectors={changedSelectors}
            deletedSelectors={deletedSelectors}
          />
        ))}
      </>
    )
  }

  // Resolve colors
  const iconColor = isDeleted
    ? 'var(--error)'
    : isSelected
      ? 'var(--accent)'
      : isGreen
        ? '#4ade80'
        : 'var(--text-muted)'

  const labelColor = isDeleted
    ? 'var(--error)'
    : isSelected
      ? 'var(--accent)'
      : isGreen
        ? '#4ade80'
        : 'var(--text-primary)'

  // Drop indicator styles
  const dropBorderStyle: React.CSSProperties = {}
  if (dropIndicator === 'before') {
    dropBorderStyle.borderTop = '2px solid #4a9eff'
  } else if (dropIndicator === 'after') {
    dropBorderStyle.borderBottom = '2px solid #4a9eff'
  } else if (dropIndicator === 'inside') {
    dropBorderStyle.background = 'rgba(74, 158, 255, 0.15)'
    dropBorderStyle.outline = '1px dashed #4a9eff'
    dropBorderStyle.outlineOffset = '-1px'
  }

  return (
    <div className="relative" style={{ opacity: isDragSource ? 0.4 : 1 }}>
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
        draggable={!isBody}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          paddingLeft: depth * 16 + 4,
          height: 28,
          background: isSelected
            ? 'rgba(74, 158, 255, 0.12)'
            : isHighlighted
              ? 'rgba(255, 255, 255, 0.04)'
              : 'transparent',
          ...dropBorderStyle,
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
          style={{
            color: labelColor,
            textDecoration: isDeleted ? 'line-through' : 'none',
            opacity: isDeleted ? 0.7 : 1,
          }}
        >
          {label}
        </span>

        {/* Tag badge for non-div elements when showing class name */}
        {node.className &&
          node.tagName !== 'div' &&
          node.tagName !== 'body' &&
          label !== node.tagName && (
            <span
              className="text-[9px] ml-1.5 flex-shrink-0 opacity-50"
              style={{
                color: isDeleted ? 'var(--error)' : 'var(--text-muted)',
              }}
            >
              {node.tagName}
            </span>
          )}

        {/* Revert button for deleted elements */}
        {isDeleted && (
          <button
            onClick={handleRevertDelete}
            className="ml-auto mr-1 flex items-center justify-center w-5 h-5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
            style={{ color: 'var(--text-muted)' }}
            title="Restore element"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
        )}

        {/* Delete button on hover (non-body, non-deleted) */}
        {!isBody && !isDeleted && (
          <button
            onClick={handleDelete}
            className="delete-layer-btn ml-auto mr-1 flex items-center justify-center w-5 h-5 rounded opacity-0 group-hover:opacity-100 transition-all hover:!opacity-100"
            style={{ color: '#f87171' }}
            title="Delete element"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
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
              deletedSelectors={deletedSelectors}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// --- Tree lookup utility ---

function findNodeInTree(root: TreeNode | null, id: string): TreeNode | null {
  if (!root) return null
  if (root.id === id) return root
  for (const child of root.children) {
    const found = findNodeInTree(child, id)
    if (found) return found
  }
  return null
}

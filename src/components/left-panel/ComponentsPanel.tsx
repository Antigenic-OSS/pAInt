'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useEditorStore } from '@/store'
import { usePostMessage } from '@/hooks/usePostMessage'
import { MESSAGE_TYPES } from '@/lib/constants'
import type { DetectedComponent, VariantGroup } from '@/types/component'

interface ComponentTreeNode {
  component: DetectedComponent
  children: ComponentTreeNode[]
  depth: number
  instanceCount: number
}

function buildComponentTree(
  components: DetectedComponent[],
): ComponentTreeNode[] {
  const sorted = [...components].sort(
    (a, b) => a.selectorPath.length - b.selectorPath.length,
  )
  const roots: ComponentTreeNode[] = []
  const nodeMap = new Map<string, ComponentTreeNode>()

  for (const component of sorted) {
    const node: ComponentTreeNode = {
      component,
      children: [],
      depth: 0,
      instanceCount: 1,
    }
    let parentNode: ComponentTreeNode | null = null

    for (const [path, candidate] of nodeMap) {
      if (
        component.selectorPath.startsWith(`${path} `) ||
        component.selectorPath.startsWith(`${path} > `)
      ) {
        if (
          !parentNode ||
          path.length > parentNode.component.selectorPath.length
        ) {
          parentNode = candidate
        }
      }
    }

    if (parentNode) {
      node.depth = parentNode.depth + 1
      parentNode.children.push(node)
    } else {
      roots.push(node)
    }
    nodeMap.set(component.selectorPath, node)
  }
  return roots
}

function flattenVisible(
  nodes: ComponentTreeNode[],
  collapsed: Set<string>,
  searchActive: boolean,
): ComponentTreeNode[] {
  const result: ComponentTreeNode[] = []
  for (const node of nodes) {
    result.push(node)
    if (
      node.children.length > 0 &&
      (searchActive || !collapsed.has(node.component.selectorPath))
    ) {
      result.push(...flattenVisible(node.children, collapsed, searchActive))
    }
  }
  return result
}

/** Structural fingerprint: name + tagName + recursive child shape. */
function structuralKey(node: ComponentTreeNode): string {
  if (node.children.length === 0)
    return `${node.component.name}:${node.component.tagName}`
  const childKeys = node.children.map(structuralKey).sort().join(',')
  return `${node.component.name}:${node.component.tagName}[${childKeys}]`
}

/** Merge sibling nodes with the same structural shape into one entry with a count. */
function deduplicateSiblings(nodes: ComponentTreeNode[]): ComponentTreeNode[] {
  const result: ComponentTreeNode[] = []
  const seen = new Map<string, ComponentTreeNode>()

  for (const node of nodes) {
    const dedupedChildren = deduplicateSiblings(node.children)
    const processed = { ...node, children: dedupedChildren, instanceCount: 1 }
    const key = structuralKey(processed)
    const existing = seen.get(key)
    if (existing) {
      existing.instanceCount++
    } else {
      seen.set(key, processed)
      result.push(processed)
    }
  }

  return result
}

export default function ComponentsPanel() {
  const detectedComponents = useEditorStore((s) => s.detectedComponents)
  const componentSearchQuery = useEditorStore((s) => s.componentSearchQuery)
  const setComponentSearchQuery = useEditorStore(
    (s) => s.setComponentSearchQuery,
  )
  const selectedComponentPath = useEditorStore((s) => s.selectedComponentPath)
  const setSelectedComponentPath = useEditorStore(
    (s) => s.setSelectedComponentPath,
  )
  const updateComponentVariantActiveIndex = useEditorStore(
    (s) => s.updateComponentVariantActiveIndex,
  )
  const selectorPath = useEditorStore((s) => s.selectorPath)
  const connectionStatus = useEditorStore((s) => s.connectionStatus)
  const createdComponents = useEditorStore((s) => s.createdComponents)
  const addCreatedComponent = useEditorStore((s) => s.addCreatedComponent)
  const addStyleChange = useEditorStore((s) => s.addStyleChange)
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint)
  const setActiveLeftTab = useEditorStore((s) => s.setActiveLeftTab)

  const { sendToInspector } = usePostMessage()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  // Track active variants for revert-on-deselect
  const activeVariantsRef = useRef<{
    selectorPath: string
    variants: Array<{ groupIndex: number; group: VariantGroup }>
  } | null>(null)

  // Revert variants when selection changes away from a component
  useEffect(() => {
    const prev = activeVariantsRef.current
    if (prev && prev.selectorPath !== selectorPath) {
      for (const { group } of prev.variants) {
        if (group.activeIndex === 0) continue // default, nothing to revert
        const activeOption = group.options[group.activeIndex]
        if (group.type === 'class' && activeOption?.className) {
          sendToInspector({
            type: MESSAGE_TYPES.REVERT_VARIANT as 'REVERT_VARIANT',
            payload: {
              selectorPath: prev.selectorPath,
              removeClassName: activeOption.className,
              restoreClassName: group.options[0]?.className || undefined,
            },
          })
        } else if (group.type === 'pseudo' && activeOption?.pseudoStyles) {
          sendToInspector({
            type: MESSAGE_TYPES.REVERT_VARIANT as 'REVERT_VARIANT',
            payload: {
              selectorPath: prev.selectorPath,
              revertPseudo: true,
              pseudoProperties: Object.keys(activeOption.pseudoStyles),
            },
          })
        }
      }
      activeVariantsRef.current = null
    }
  }, [selectorPath, sendToInspector])

  // Filter by search query only (no selectorPath scoping — tree handles hierarchy)
  const filteredComponents = useMemo(() => {
    if (!componentSearchQuery) return detectedComponents
    const query = componentSearchQuery.toLowerCase()
    return detectedComponents.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.tagName.toLowerCase().includes(query) ||
        (c.className?.toLowerCase().includes(query)),
    )
  }, [detectedComponents, componentSearchQuery])

  const tree = useMemo(
    () => deduplicateSiblings(buildComponentTree(filteredComponents)),
    [filteredComponents],
  )

  const visibleNodes = useMemo(
    () => flattenVisible(tree, collapsed, !!componentSearchQuery),
    [tree, collapsed, componentSearchQuery],
  )

  const toggleCollapse = useCallback((path: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const handleComponentClick = useCallback(
    (component: DetectedComponent) => {
      setSelectedComponentPath(component.selectorPath)
      sendToInspector({
        type: MESSAGE_TYPES.SELECT_ELEMENT as 'SELECT_ELEMENT',
        payload: { selectorPath: component.selectorPath },
      })
      // Switch to Layers tab so the user sees the selected node in the tree
      setActiveLeftTab('layers')
    },
    [sendToInspector, setSelectedComponentPath, setActiveLeftTab],
  )

  const handleVariantChange = useCallback(
    (component: DetectedComponent, groupIndex: number, optionIndex: number) => {
      const group = component.variants[groupIndex]
      if (!group) return

      const option = group.options[optionIndex]
      if (!option) return

      // Track active variant for revert-on-deselect
      const existing = activeVariantsRef.current
      if (!existing || existing.selectorPath !== component.selectorPath) {
        activeVariantsRef.current = {
          selectorPath: component.selectorPath,
          variants: [],
        }
      }
      const tracked = activeVariantsRef.current!
      const existingEntry = tracked.variants.find(
        (v) => v.groupIndex === groupIndex,
      )
      if (existingEntry) {
        existingEntry.group = { ...group, activeIndex: optionIndex }
      } else {
        tracked.variants.push({
          groupIndex,
          group: { ...group, activeIndex: optionIndex },
        })
      }

      if (group.type === 'class') {
        sendToInspector({
          type: MESSAGE_TYPES.APPLY_VARIANT as 'APPLY_VARIANT',
          payload: {
            selectorPath: component.selectorPath,
            type: 'class',
            addClassName: option.className || undefined,
            removeClassNames: option.removeClassNames || undefined,
          },
        })
      } else if (group.type === 'pseudo') {
        if (optionIndex === 0) {
          // Revert to default
          const currentActive = group.options[group.activeIndex]
          if (currentActive?.pseudoStyles) {
            sendToInspector({
              type: MESSAGE_TYPES.REVERT_VARIANT as 'REVERT_VARIANT',
              payload: {
                selectorPath: component.selectorPath,
                revertPseudo: true,
                pseudoProperties: Object.keys(currentActive.pseudoStyles),
              },
            })
          }
        } else if (option.pseudoStyles) {
          // First revert current if not default
          if (group.activeIndex !== 0) {
            const currentActive = group.options[group.activeIndex]
            if (currentActive?.pseudoStyles) {
              sendToInspector({
                type: MESSAGE_TYPES.APPLY_VARIANT as 'APPLY_VARIANT',
                payload: {
                  selectorPath: component.selectorPath,
                  type: 'pseudo',
                  revertPseudo: true,
                  pseudoStyles: currentActive.pseudoStyles,
                },
              })
            }
          }
          sendToInspector({
            type: MESSAGE_TYPES.APPLY_VARIANT as 'APPLY_VARIANT',
            payload: {
              selectorPath: component.selectorPath,
              type: 'pseudo',
              pseudoStyles: option.pseudoStyles,
            },
          })
        }
      }

      updateComponentVariantActiveIndex(
        component.selectorPath,
        groupIndex,
        optionIndex,
      )
    },
    [sendToInspector, updateComponentVariantActiveIndex],
  )

  const handleCreateComponent = useCallback(
    (component: DetectedComponent) => {
      const change = {
        id: crypto.randomUUID(),
        elementSelector: component.selectorPath,
        property: '__component_creation__',
        originalValue: '',
        newValue: JSON.stringify({
          name: component.name,
          variants: component.variants.map((g) => ({
            groupName: g.groupName,
            options: g.options.map((o) => o.label),
          })),
          timestamp: Date.now(),
        }),
        breakpoint: activeBreakpoint,
        timestamp: Date.now(),
      }
      addStyleChange(change)
      addCreatedComponent({
        name: component.name,
        selectorPath: component.selectorPath,
        timestamp: Date.now(),
      })
    },
    [addStyleChange, addCreatedComponent, activeBreakpoint],
  )

  if (connectionStatus !== 'connected') {
    return (
      <div
        className="flex items-center justify-center flex-1 text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        Connect to inspect
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Search */}
      <div
        className="px-2 py-1.5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <input
          type="text"
          value={componentSearchQuery}
          onChange={(e) => setComponentSearchQuery(e.target.value)}
          placeholder="Filter components..."
          className="w-full text-xs py-1 px-2"
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: '3px',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        />
      </div>

      {/* Count header */}
      <div
        className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider flex-shrink-0"
        style={{
          color: 'var(--text-muted)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {visibleNodes.length} component{visibleNodes.length !== 1 ? 's' : ''}{' '}
        found
        {filteredComponents.length > visibleNodes.length && (
          <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>
            {' '}
            · {filteredComponents.length} instances
          </span>
        )}
      </div>

      {/* Component tree */}
      <div className="flex-1 overflow-y-auto">
        {visibleNodes.length > 0 ? (
          visibleNodes.map(({ component, children, depth, instanceCount }) => {
            const isSelected = selectedComponentPath === component.selectorPath
            const isCreated = !!createdComponents[component.selectorPath]
            const isActualComponent =
              component.detectionMethod === 'semantic-html' ||
              component.detectionMethod === 'custom-element' ||
              component.detectionMethod === 'data-attribute'
            const hasChildren = children.length > 0
            const isCollapsed = collapsed.has(component.selectorPath)
            const nameColor = isSelected
              ? 'var(--accent)'
              : isActualComponent
                ? '#c084fc'
                : 'var(--text-primary)'
            const iconColor = isSelected
              ? 'var(--accent)'
              : isActualComponent
                ? '#c084fc'
                : 'var(--text-muted)'
            return (
              <div key={component.selectorPath}>
                <div
                  onClick={() => handleComponentClick(component)}
                  className="w-full text-left py-1.5 text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  style={{
                    paddingLeft: `${8 + depth * 16}px`,
                    paddingRight: '12px',
                    color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                    background: isSelected
                      ? 'rgba(74, 158, 255, 0.08)'
                      : 'transparent',
                  }}
                  title={component.selectorPath}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleComponentClick(component)
                    }
                  }}
                >
                  {/* Collapse/expand toggle */}
                  {hasChildren ? (
                    <button
                      onClick={(e) => toggleCollapse(component.selectorPath, e)}
                      className="flex-shrink-0 flex items-center justify-center"
                      style={{ width: '14px', height: '14px' }}
                    >
                      <svg
                        width="8"
                        height="8"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke={
                          isSelected ? 'var(--accent)' : 'var(--text-muted)'
                        }
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-transform"
                        style={{
                          transform: isCollapsed
                            ? 'rotate(0deg)'
                            : 'rotate(90deg)',
                        }}
                      >
                        <path d="M6 4l4 4-4 4" />
                      </svg>
                    </button>
                  ) : (
                    <span style={{ width: '14px' }} className="flex-shrink-0" />
                  )}
                  {/* Component icon */}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke={iconColor}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0"
                  >
                    <rect x="1" y="4" width="14" height="8" rx="1.5" />
                    <path d="M4 4V2.5A1.5 1.5 0 0 1 5.5 1h5A1.5 1.5 0 0 1 12 2.5V4" />
                  </svg>
                  <span
                    className="truncate flex-1 font-medium"
                    style={{ color: nameColor }}
                  >
                    {component.name}
                    {instanceCount > 1 && (
                      <span
                        style={{
                          color: 'var(--text-muted)',
                          fontWeight: 'normal',
                          fontSize: '10px',
                        }}
                      >
                        {' '}
                        ×{instanceCount}
                      </span>
                    )}
                    <span
                      style={{
                        color: 'var(--text-muted)',
                        fontWeight: 'normal',
                      }}
                    >
                      {' '}
                      ({component.tagName})
                    </span>
                  </span>
                  {/* Create as Component button */}
                  {isCreated ? (
                    <span
                      className="flex items-center gap-1 flex-shrink-0"
                      style={{ color: '#4ade80', fontSize: '10px' }}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M2 8l4 4 8-8" />
                      </svg>
                      Created
                    </span>
                  ) : !isActualComponent ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCreateComponent(component)
                      }}
                      className="flex-shrink-0 text-[10px] px-1.5 py-0.5 transition-colors"
                      style={{
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '3px',
                        background: 'transparent',
                      }}
                      title="Create as Component"
                    >
                      + Create
                    </button>
                  ) : null}
                  {isSelected && !hasChildren && (
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: 'var(--accent)' }}
                    />
                  )}
                </div>

                {/* Variant dropdowns — only visible when selected */}
                {isSelected && component.variants.length > 0 && (
                  <div
                    className="pb-2 pt-1 flex flex-col gap-2"
                    style={{
                      paddingLeft: `${24 + depth * 16}px`,
                      paddingRight: '12px',
                      background: 'rgba(74, 158, 255, 0.04)',
                    }}
                  >
                    {component.variants.map((group, gi) => (
                      <div key={group.groupName}>
                        <div
                          className="text-[10px] font-medium uppercase tracking-wider mb-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {group.groupName}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {group.options.map((option, oi) => {
                            const isActive = group.activeIndex === oi
                            return (
                              <button
                                key={option.label}
                                onClick={() =>
                                  handleVariantChange(component, gi, oi)
                                }
                                className="px-2 py-0.5 text-[11px] rounded transition-colors"
                                style={{
                                  background: isActive
                                    ? 'var(--accent)'
                                    : 'var(--bg-input)',
                                  color: isActive
                                    ? '#fff'
                                    : 'var(--text-secondary)',
                                  border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                                }}
                              >
                                {option.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div
            className="px-3 py-6 text-center"
            style={{ color: 'var(--text-muted)' }}
          >
            <div className="text-xs font-medium mb-1">
              No components detected
            </div>
            <div style={{ fontSize: '10px' }}>
              Select an element with recognizable components
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

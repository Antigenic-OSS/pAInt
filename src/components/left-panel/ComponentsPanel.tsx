'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useEditorStore } from '@/store';
import { usePostMessage } from '@/hooks/usePostMessage';
import { MESSAGE_TYPES } from '@/lib/constants';
import type { DetectedComponent, VariantGroup } from '@/types/component';

export default function ComponentsPanel() {
  const detectedComponents = useEditorStore((s) => s.detectedComponents);
  const componentSearchQuery = useEditorStore((s) => s.componentSearchQuery);
  const setComponentSearchQuery = useEditorStore((s) => s.setComponentSearchQuery);
  const selectedComponentPath = useEditorStore((s) => s.selectedComponentPath);
  const setSelectedComponentPath = useEditorStore((s) => s.setSelectedComponentPath);
  const updateComponentVariantActiveIndex = useEditorStore((s) => s.updateComponentVariantActiveIndex);
  const selectorPath = useEditorStore((s) => s.selectorPath);
  const connectionStatus = useEditorStore((s) => s.connectionStatus);
  const createdComponents = useEditorStore((s) => s.createdComponents);
  const addCreatedComponent = useEditorStore((s) => s.addCreatedComponent);
  const addStyleChange = useEditorStore((s) => s.addStyleChange);
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint);

  const { sendToInspector } = usePostMessage();

  // Track active variants for revert-on-deselect
  const activeVariantsRef = useRef<{
    selectorPath: string;
    variants: Array<{ groupIndex: number; group: VariantGroup }>;
  } | null>(null);

  // Revert variants when selection changes away from a component
  useEffect(() => {
    const prev = activeVariantsRef.current;
    if (prev && prev.selectorPath !== selectorPath) {
      for (const { group } of prev.variants) {
        if (group.activeIndex === 0) continue; // default, nothing to revert
        const activeOption = group.options[group.activeIndex];
        if (group.type === 'class' && activeOption?.className) {
          sendToInspector({
            type: MESSAGE_TYPES.REVERT_VARIANT as 'REVERT_VARIANT',
            payload: {
              selectorPath: prev.selectorPath,
              removeClassName: activeOption.className,
              restoreClassName: group.options[0]?.className || undefined,
            },
          });
        } else if (group.type === 'pseudo' && activeOption?.pseudoStyles) {
          sendToInspector({
            type: MESSAGE_TYPES.REVERT_VARIANT as 'REVERT_VARIANT',
            payload: {
              selectorPath: prev.selectorPath,
              revertPseudo: true,
              pseudoProperties: Object.keys(activeOption.pseudoStyles),
            },
          });
        }
      }
      activeVariantsRef.current = null;
    }
  }, [selectorPath, sendToInspector]);

  // Filter components based on selection scope and search query
  const filteredComponents = useMemo(() => {
    let components = detectedComponents;

    // Scope to selected element + children when an element is selected
    if (selectorPath) {
      components = components.filter(
        (c) => c.selectorPath === selectorPath || c.selectorPath.startsWith(selectorPath + ' ')
      );
    }

    // Apply search filter
    if (componentSearchQuery) {
      const query = componentSearchQuery.toLowerCase();
      components = components.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.tagName.toLowerCase().includes(query) ||
          (c.className && c.className.toLowerCase().includes(query))
      );
    }

    return components;
  }, [detectedComponents, selectorPath, componentSearchQuery]);

  const handleComponentClick = useCallback(
    (component: DetectedComponent) => {
      setSelectedComponentPath(component.selectorPath);
      sendToInspector({
        type: MESSAGE_TYPES.SELECT_ELEMENT as 'SELECT_ELEMENT',
        payload: { selectorPath: component.selectorPath },
      });
    },
    [sendToInspector, setSelectedComponentPath]
  );

  const handleVariantChange = useCallback(
    (component: DetectedComponent, groupIndex: number, optionIndex: number) => {
      const group = component.variants[groupIndex];
      if (!group) return;

      const option = group.options[optionIndex];
      if (!option) return;

      // Track active variant for revert-on-deselect
      const existing = activeVariantsRef.current;
      if (!existing || existing.selectorPath !== component.selectorPath) {
        activeVariantsRef.current = { selectorPath: component.selectorPath, variants: [] };
      }
      const tracked = activeVariantsRef.current!;
      const existingEntry = tracked.variants.find((v) => v.groupIndex === groupIndex);
      if (existingEntry) {
        existingEntry.group = { ...group, activeIndex: optionIndex };
      } else {
        tracked.variants.push({ groupIndex, group: { ...group, activeIndex: optionIndex } });
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
        });
      } else if (group.type === 'pseudo') {
        if (optionIndex === 0) {
          // Revert to default
          const currentActive = group.options[group.activeIndex];
          if (currentActive?.pseudoStyles) {
            sendToInspector({
              type: MESSAGE_TYPES.REVERT_VARIANT as 'REVERT_VARIANT',
              payload: {
                selectorPath: component.selectorPath,
                revertPseudo: true,
                pseudoProperties: Object.keys(currentActive.pseudoStyles),
              },
            });
          }
        } else if (option.pseudoStyles) {
          // First revert current if not default
          if (group.activeIndex !== 0) {
            const currentActive = group.options[group.activeIndex];
            if (currentActive?.pseudoStyles) {
              sendToInspector({
                type: MESSAGE_TYPES.APPLY_VARIANT as 'APPLY_VARIANT',
                payload: {
                  selectorPath: component.selectorPath,
                  type: 'pseudo',
                  revertPseudo: true,
                  pseudoStyles: currentActive.pseudoStyles,
                },
              });
            }
          }
          sendToInspector({
            type: MESSAGE_TYPES.APPLY_VARIANT as 'APPLY_VARIANT',
            payload: {
              selectorPath: component.selectorPath,
              type: 'pseudo',
              pseudoStyles: option.pseudoStyles,
            },
          });
        }
      }

      updateComponentVariantActiveIndex(component.selectorPath, groupIndex, optionIndex);
    },
    [sendToInspector, updateComponentVariantActiveIndex]
  );

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
      };
      addStyleChange(change);
      addCreatedComponent({
        name: component.name,
        selectorPath: component.selectorPath,
        timestamp: Date.now(),
      });
    },
    [addStyleChange, addCreatedComponent, activeBreakpoint]
  );

  if (connectionStatus !== 'connected') {
    return (
      <div
        className="flex items-center justify-center flex-1 text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        Connect to inspect
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Search */}
      <div className="px-2 py-1.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
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
        {filteredComponents.length} component{filteredComponents.length !== 1 ? 's' : ''} found
      </div>

      {/* Component list */}
      <div className="flex-1 overflow-y-auto">
        {filteredComponents.length > 0 ? (
          filteredComponents.map((component) => {
            const isSelected = selectedComponentPath === component.selectorPath;
            const isCreated = !!createdComponents[component.selectorPath];
            const isAlreadyComponent =
              component.detectionMethod === 'semantic-html' ||
              component.detectionMethod === 'custom-element' ||
              component.detectionMethod === 'data-attribute';
            return (
              <div
                key={component.selectorPath}
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div
                  onClick={() => handleComponentClick(component)}
                  className="w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 cursor-pointer"
                  style={{
                    color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                    background: isSelected ? 'rgba(74, 158, 255, 0.08)' : 'transparent',
                  }}
                  title={component.selectorPath}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleComponentClick(component); } }}
                >
                  {/* Component icon */}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke={isSelected ? 'var(--accent)' : 'var(--text-muted)'}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0"
                  >
                    <rect x="1" y="4" width="14" height="8" rx="1.5" />
                    <path d="M4 4V2.5A1.5 1.5 0 0 1 5.5 1h5A1.5 1.5 0 0 1 12 2.5V4" />
                  </svg>
                  <div className="truncate flex-1">
                    <div className="truncate font-medium">
                      {component.name}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>
                        {' '}({component.tagName})
                      </span>
                    </div>
                    {component.childComponentCount > 0 && (
                      <div className="truncate" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                        {component.childComponentCount} child component{component.childComponentCount !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  {/* Create as Component button — hidden for inherently detected components */}
                  {isCreated ? (
                    <span
                      className="flex items-center gap-1 flex-shrink-0"
                      style={{ color: '#4ade80', fontSize: '10px' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 8l4 4 8-8" />
                      </svg>
                      Created
                    </span>
                  ) : !isAlreadyComponent ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateComponent(component);
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
                  {isSelected && (
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: 'var(--accent)' }}
                    />
                  )}
                </div>

                {/* Variant dropdowns */}
                {component.variants.length > 0 && (
                  <div className="px-3 pb-2 flex flex-wrap gap-2">
                    {component.variants.map((group, gi) => (
                      <div key={group.groupName} className="flex items-center gap-1">
                        <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                          {group.groupName}:
                        </span>
                        <select
                          value={group.activeIndex}
                          onChange={(e) =>
                            handleVariantChange(component, gi, parseInt(e.target.value, 10))
                          }
                          className="text-xs"
                          style={{
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                            padding: '2px 4px',
                            borderRadius: '3px',
                            outline: 'none',
                          }}
                        >
                          {group.options.map((option, oi) => (
                            <option key={option.label} value={oi}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div
            className="px-3 py-6 text-center"
            style={{ color: 'var(--text-muted)' }}
          >
            <div className="text-xs font-medium mb-1">No components detected</div>
            <div style={{ fontSize: '10px' }}>
              Select an element with recognizable components
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

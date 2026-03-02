'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import { useEditorStore } from '@/store'
import { sendViaIframe } from '@/hooks/usePostMessage'
import { ElementBreadcrumb } from './ElementBreadcrumb'
import { ElementLogBox } from '../ElementLogBox'
import { BorderSection } from './BorderSection'
import { LayoutSection } from './LayoutSection'
import { SizeSection } from './SizeSection'
import { PositionSection } from './PositionSection'
import { AppearanceSection } from './AppearanceSection'
import { TextSection } from './TextSection'
import { BackgroundSection } from './BackgroundSection'
import { ShadowBlurSection } from './ShadowBlurSection'
import { PropertiesSection } from './PropertiesSection'
import { SVGSection } from './SVGSection'
import { DesignCSSTabToggle } from './DesignCSSTabToggle'
import { CSSRawView } from './CSSRawView'

const SVG_TAG_NAMES = new Set([
  'svg',
  'path',
  'circle',
  'rect',
  'line',
  'polyline',
  'polygon',
  'ellipse',
  'g',
  'use',
  'text',
  'tspan',
  'image',
  'clippath',
  'mask',
  'defs',
])

function ChangeScopeToggle() {
  const changeScope = useEditorStore((s) => s.changeScope)
  const setChangeScope = useEditorStore((s) => s.setChangeScope)
  const updateAllSnapshotsScope = useEditorStore(
    (s) => s.updateAllSnapshotsScope,
  )
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint)

  const handleScopeChange = useCallback(
    (scope: 'all' | 'breakpoint-only') => {
      setChangeScope(scope)
      updateAllSnapshotsScope(scope)
    },
    [setChangeScope, updateAllSnapshotsScope],
  )

  return (
    <div
      className="flex items-center justify-between px-3 py-1.5"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
        Apply to
      </span>
      <div
        className="flex items-center gap-0.5 rounded p-0.5"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        <button
          onClick={() => handleScopeChange('all')}
          className="px-2 py-0.5 text-[11px] rounded transition-colors"
          style={{
            background:
              changeScope === 'all'
                ? 'var(--accent-bg, rgba(74,158,255,0.15))'
                : 'transparent',
            color:
              changeScope === 'all' ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          All
        </button>
        <button
          onClick={() => handleScopeChange('breakpoint-only')}
          className="px-2 py-0.5 text-[11px] rounded transition-colors capitalize"
          style={{
            background:
              changeScope === 'breakpoint-only'
                ? 'var(--accent-bg, rgba(74,158,255,0.15))'
                : 'transparent',
            color:
              changeScope === 'breakpoint-only'
                ? 'var(--accent)'
                : 'var(--text-muted)',
          }}
        >
          {activeBreakpoint} only
        </button>
      </div>
    </div>
  )
}

const MIN_TOP_HEIGHT = 80
const DEFAULT_TOP_HEIGHT = 240
const MAX_TOP_HEIGHT = 500

export function DesignPanel() {
  const selectorPath = useEditorStore((s) => s.selectorPath)
  const tagName = useEditorStore((s) => s.tagName)
  const isSVGElement = !!tagName && SVG_TAG_NAMES.has(tagName.toLowerCase())
  const [activeTab, setActiveTab] = useState<'design' | 'css'>('design')
  const [topHeight, setTopHeight] = useState(DEFAULT_TOP_HEIGHT)
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startHeight = useRef(0)

  // Hide selection overlay while user interacts with design panel controls
  const designRef = useRef<HTMLDivElement>(null)
  const overlayHidden = useRef(false)

  useEffect(() => {
    const el = designRef.current
    if (!el) return

    const hideOverlay = () => {
      if (!overlayHidden.current) {
        overlayHidden.current = true
        sendViaIframe({ type: 'HIDE_SELECTION_OVERLAY' })
      }
    }

    const showOverlay = () => {
      if (overlayHidden.current) {
        overlayHidden.current = false
        sendViaIframe({ type: 'SHOW_SELECTION_OVERLAY' })
      }
    }

    // Any pointer interaction inside the design panel hides the overlay
    el.addEventListener('pointerdown', hideOverlay)

    // Clicks outside the design panel restore the overlay
    const onDocumentClick = (e: MouseEvent) => {
      if (overlayHidden.current && !el.contains(e.target as Node)) {
        showOverlay()
      }
    }
    document.addEventListener('pointerdown', onDocumentClick)

    // Also restore when an input blurs and focus leaves the panel entirely
    const onFocusOut = (e: FocusEvent) => {
      if (!overlayHidden.current) return
      const related = e.relatedTarget as Node | null
      if (!related || !el.contains(related)) {
        // Small delay so clicking another control within the panel doesn't flash
        setTimeout(() => {
          if (
            overlayHidden.current &&
            document.activeElement &&
            !el.contains(document.activeElement)
          ) {
            showOverlay()
          }
        }, 150)
      }
    }
    el.addEventListener('focusout', onFocusOut)

    return () => {
      el.removeEventListener('pointerdown', hideOverlay)
      document.removeEventListener('pointerdown', onDocumentClick)
      el.removeEventListener('focusout', onFocusOut)
    }
  }, [])

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isDragging.current = true
      startY.current = e.clientY
      startHeight.current = topHeight

      const handleDragMove = (ev: MouseEvent) => {
        if (!isDragging.current) return
        const delta = ev.clientY - startY.current
        const next = Math.min(
          MAX_TOP_HEIGHT,
          Math.max(MIN_TOP_HEIGHT, startHeight.current + delta),
        )
        setTopHeight(next)
      }

      const handleDragEnd = () => {
        isDragging.current = false
        document.removeEventListener('mousemove', handleDragMove)
        document.removeEventListener('mouseup', handleDragEnd)
      }

      document.addEventListener('mousemove', handleDragMove)
      document.addEventListener('mouseup', handleDragEnd)
    },
    [topHeight],
  )

  if (!selectorPath) {
    return (
      <div
        className="flex items-center justify-center h-full text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        Select an element to edit
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top section: element info (resizable) */}
      <div
        className="flex-shrink-0 flex flex-col"
        style={{ height: topHeight }}
      >
        <ElementBreadcrumb />
        <ChangeScopeToggle />
        <div className="flex-1 overflow-y-auto min-h-0">
          <ElementLogBox />
        </div>
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={handleDragStart}
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          height: 6,
          cursor: 'row-resize',
          background: 'var(--bg-primary)',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            width: 32,
            height: 2,
            borderRadius: 1,
            background: 'var(--text-muted)',
            opacity: 0.4,
          }}
        />
      </div>

      {/* Bottom section: design properties (fills remaining) */}
      <div ref={designRef} className="flex-1 overflow-y-auto min-h-0">
        <DesignCSSTabToggle activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === 'design' ? (
          <>
            <PositionSection />
            <LayoutSection />
            <SizeSection />
            <AppearanceSection />
            {isSVGElement && <SVGSection />}
            <TextSection />
            <BackgroundSection />
            <BorderSection />
            <ShadowBlurSection />
            <PropertiesSection />
          </>
        ) : (
          <CSSRawView />
        )}
      </div>
    </div>
  )
}

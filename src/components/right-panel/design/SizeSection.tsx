'use client'

import { useCallback } from 'react'
import { useEditorStore } from '@/store'
import { SectionHeader } from '@/components/right-panel/design/inputs/SectionHeader'
import { CompactInput } from '@/components/right-panel/design/inputs/CompactInput'
import { DraggableLabel } from '@/components/right-panel/design/inputs/DraggableLabel'
import { useChangeTracker } from '@/hooks/useChangeTracker'

// ─── Properties tracked ─────────────────────────────────────────

const SIZE_PROPERTIES = [
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
  'boxSizing',
]

// ─── Main Component ─────────────────────────────────────────────

export function SizeSection() {
  const computedStyles = useEditorStore((state) => state.computedStyles)
  const { applyChange, resetProperty } = useChangeTracker()

  const hasChanges = useEditorStore((s) => {
    const sp = s.selectorPath
    if (!sp) return false
    return s.styleChanges.some(
      (c) => c.elementSelector === sp && SIZE_PROPERTIES.includes(c.property),
    )
  })

  const handleResetAll = useCallback(() => {
    const { selectorPath, styleChanges } = useEditorStore.getState()
    if (!selectorPath) return
    const matching = styleChanges.filter(
      (c) =>
        c.elementSelector === selectorPath &&
        SIZE_PROPERTIES.includes(c.property),
    )
    for (const c of matching) resetProperty(c.property)
  }, [resetProperty])

  const handleChange = useCallback(
    (property: string, value: string) => {
      applyChange(property, value)
    },
    [applyChange],
  )

  const handleReset = useCallback(
    (property: string) => {
      resetProperty(property)
    },
    [resetProperty],
  )

  return (
    <SectionHeader
      title="Size"
      defaultOpen={true}
      hasChanges={hasChanges}
      onReset={handleResetAll}
    >
      {/* Width & Height */}
      <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-x-2 gap-y-2">
        <DraggableLabel
          value={computedStyles.width || 'auto'}
          property="width"
          onChange={handleChange}
          className="text-[11px] whitespace-nowrap"
          style={{ color: 'var(--text-muted)' }}
        >
          Width
        </DraggableLabel>
        <CompactInput
          value={computedStyles.width || 'auto'}
          property="width"
          onChange={handleChange}
          onReset={handleReset}
          units={['px', '%', 'em', 'rem', 'vw', 'auto']}
          className="min-w-0"
        />
        <DraggableLabel
          value={computedStyles.height || 'auto'}
          property="height"
          onChange={handleChange}
          className="text-[11px] whitespace-nowrap"
          style={{ color: 'var(--text-muted)' }}
        >
          Height
        </DraggableLabel>
        <CompactInput
          value={computedStyles.height || 'auto'}
          property="height"
          onChange={handleChange}
          onReset={handleReset}
          units={['px', '%', 'em', 'rem', 'vh', 'auto']}
          className="min-w-0"
        />

        {/* Min Width & Min Height */}
        <DraggableLabel
          value={computedStyles.minWidth || '0px'}
          property="minWidth"
          onChange={handleChange}
          min={0}
          className="text-[11px] whitespace-nowrap"
          style={{ color: 'var(--text-muted)' }}
        >
          Min W
        </DraggableLabel>
        <CompactInput
          value={computedStyles.minWidth || '0px'}
          property="minWidth"
          onChange={handleChange}
          onReset={handleReset}
          units={['px', '%', 'em', 'rem', 'vw']}
          min={0}
          className="min-w-0"
        />
        <DraggableLabel
          value={computedStyles.minHeight || '0px'}
          property="minHeight"
          onChange={handleChange}
          min={0}
          className="text-[11px] whitespace-nowrap"
          style={{ color: 'var(--text-muted)' }}
        >
          Min H
        </DraggableLabel>
        <CompactInput
          value={computedStyles.minHeight || '0px'}
          property="minHeight"
          onChange={handleChange}
          onReset={handleReset}
          units={['px', '%', 'em', 'rem', 'vh']}
          min={0}
          className="min-w-0"
        />

        {/* Max Width & Max Height */}
        <DraggableLabel
          value={computedStyles.maxWidth || 'none'}
          property="maxWidth"
          onChange={handleChange}
          className="text-[11px] whitespace-nowrap"
          style={{ color: 'var(--text-muted)' }}
        >
          Max W
        </DraggableLabel>
        <CompactInput
          value={computedStyles.maxWidth || 'none'}
          property="maxWidth"
          onChange={handleChange}
          onReset={handleReset}
          units={['px', '%', 'em', 'rem', 'vw', 'none']}
          className="min-w-0"
        />
        <DraggableLabel
          value={computedStyles.maxHeight || 'none'}
          property="maxHeight"
          onChange={handleChange}
          className="text-[11px] whitespace-nowrap"
          style={{ color: 'var(--text-muted)' }}
        >
          Max H
        </DraggableLabel>
        <CompactInput
          value={computedStyles.maxHeight || 'none'}
          property="maxHeight"
          onChange={handleChange}
          onReset={handleReset}
          units={['px', '%', 'em', 'rem', 'vh', 'none']}
          className="min-w-0"
        />
      </div>
    </SectionHeader>
  )
}

'use client'

import { useCallback } from 'react'
import { useEditorStore } from '@/store'
import { usePostMessage } from '@/hooks/usePostMessage'
import {
  BREAKPOINTS,
  DEVICE_PRESETS,
  BREAKPOINT_CATEGORY_MAP,
} from '@/lib/constants'
import type { Breakpoint } from '@/types/changelog'

export function BreakpointTabs() {
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint)
  const previewWidth = useEditorStore((s) => s.previewWidth)
  const setActiveBreakpoint = useEditorStore((s) => s.setActiveBreakpoint)
  const setPreviewWidth = useEditorStore((s) => s.setPreviewWidth)
  const { sendToInspector } = usePostMessage()

  const breakpoints = Object.entries(BREAKPOINTS) as [
    Breakpoint,
    { label: string; width: number },
  ][]

  // Find matched device for the active breakpoint category
  const activeCategory = BREAKPOINT_CATEGORY_MAP[activeBreakpoint]
  const matchedDevice = DEVICE_PRESETS.find(
    (d) => d.category === activeCategory && d.width === previewWidth,
  )

  const handleBreakpointChange = useCallback(
    (bp: Breakpoint) => {
      setActiveBreakpoint(bp)
      setPreviewWidth(BREAKPOINTS[bp].width)
      sendToInspector({
        type: 'SET_BREAKPOINT',
        payload: { width: BREAKPOINTS[bp].width },
      })
    },
    [setActiveBreakpoint, setPreviewWidth, sendToInspector],
  )

  return (
    <div className="flex items-center gap-1">
      {breakpoints.map(([key, { label, width }]) => (
        <button
          key={key}
          onClick={() => handleBreakpointChange(key)}
          className="px-2 py-0.5 text-[11px] rounded transition-colors"
          style={{
            background:
              activeBreakpoint === key ? 'var(--accent-bg)' : 'transparent',
            color:
              activeBreakpoint === key ? 'var(--accent)' : 'var(--text-muted)',
          }}
          title={`${label} (${width}px)`}
        >
          {label}
        </button>
      ))}
      {/* Show matched device name + width for the active breakpoint */}
      <span
        className="ml-1 text-[10px] truncate max-w-[160px]"
        style={{ color: 'var(--text-muted)' }}
      >
        {matchedDevice
          ? `${matchedDevice.name} · ${matchedDevice.width}px`
          : `${previewWidth}px`}
      </span>
    </div>
  )
}

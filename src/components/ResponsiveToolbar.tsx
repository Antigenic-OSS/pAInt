'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useEditorStore } from '@/store'
import { usePostMessage } from '@/hooks/usePostMessage'
import {
  DEVICE_PRESETS,
  PREVIEW_WIDTH_MIN,
  PREVIEW_WIDTH_MAX,
  BREAKPOINT_CATEGORY_MAP,
} from '@/lib/constants'

export function ResponsiveToolbar() {
  const previewWidth = useEditorStore((s) => s.previewWidth)
  const setPreviewWidth = useEditorStore((s) => s.setPreviewWidth)
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint)
  const { sendToInspector } = usePostMessage()

  // Filter devices by active breakpoint category
  const activeCategory = BREAKPOINT_CATEGORY_MAP[activeBreakpoint]
  const filteredDevices = DEVICE_PRESETS.filter(
    (d) => d.category === activeCategory,
  )

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [inputValue, setInputValue] = useState(String(previewWidth))
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sync input when previewWidth changes externally (drag, slider, preset)
  useEffect(() => {
    setInputValue(String(previewWidth))
  }, [previewWidth])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  const applyWidth = useCallback(
    (width: number) => {
      setPreviewWidth(width)
      sendToInspector({ type: 'SET_BREAKPOINT', payload: { width } })
    },
    [setPreviewWidth, sendToInspector],
  )

  const handleInputCommit = useCallback(() => {
    const parsed = parseInt(inputValue, 10)
    if (!Number.isNaN(parsed)) {
      applyWidth(parsed)
    } else {
      setInputValue(String(previewWidth))
    }
  }, [inputValue, applyWidth, previewWidth])

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleInputCommit()
        ;(e.target as HTMLInputElement).blur()
      } else if (e.key === 'Escape') {
        setInputValue(String(previewWidth))
        ;(e.target as HTMLInputElement).blur()
      }
    },
    [handleInputCommit, previewWidth],
  )

  // Find matching device name
  const matchedDevice = DEVICE_PRESETS.find((d) => d.width === previewWidth)

  return (
    <div
      className="flex items-center gap-3 px-3 py-1.5 border-b select-none"
      style={{
        background: '#252526',
        borderColor: 'var(--border)',
      }}
    >
      {/* Device dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] transition-colors"
          style={{
            background: dropdownOpen ? 'var(--bg-hover)' : 'transparent',
            color: matchedDevice
              ? 'var(--text-primary)'
              : 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3zm1 0v7h10V3H3zm-1 9.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z" />
          </svg>
          <span className="max-w-[100px] truncate">
            {matchedDevice ? matchedDevice.name : 'Custom'}
          </span>
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            fill="currentColor"
            className="opacity-60"
          >
            <path d="M1 3l3 3 3-3z" />
          </svg>
        </button>

        {dropdownOpen && (
          <div
            className="absolute top-full left-0 mt-1 w-52 rounded shadow-lg z-50 py-1 overflow-auto max-h-64"
            style={{
              background: '#2a2a2a',
              border: '1px solid var(--border)',
            }}
          >
            <div
              className="px-3 py-1 text-[10px] uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              {activeCategory === 'phone'
                ? 'Phones'
                : activeCategory === 'tablet'
                  ? 'Tablets'
                  : 'Desktops'}
            </div>
            {filteredDevices.map((device) => (
              <button
                key={device.name}
                onClick={() => {
                  applyWidth(device.width)
                  setDropdownOpen(false)
                }}
                className="w-full text-left px-3 py-1.5 text-[11px] flex justify-between items-center transition-colors"
                style={{
                  color:
                    previewWidth === device.width
                      ? 'var(--accent)'
                      : 'var(--text-primary)',
                  background:
                    previewWidth === device.width
                      ? 'rgba(74, 158, 255, 0.1)'
                      : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (previewWidth !== device.width) {
                    e.currentTarget.style.background = 'var(--bg-hover)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    previewWidth === device.width
                      ? 'rgba(74, 158, 255, 0.1)'
                      : 'transparent'
                }}
              >
                <span>{device.name}</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {device.width}px
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Width input */}
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleInputCommit}
          onKeyDown={handleInputKeyDown}
          className="w-14 text-center text-[11px] px-1.5 py-0.5 rounded outline-none"
          style={{
            background: '#1e1e1e',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)'
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
        />
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          px
        </span>
      </div>

      {/* Width slider */}
      <input
        type="range"
        min={PREVIEW_WIDTH_MIN}
        max={PREVIEW_WIDTH_MAX}
        value={previewWidth}
        onChange={(e) => applyWidth(parseInt(e.target.value, 10))}
        className="flex-1 h-1 appearance-none rounded cursor-pointer"
        style={{
          accentColor: '#4a9eff',
          background: '#3a3a3a',
          minWidth: 80,
          maxWidth: 200,
        }}
      />
    </div>
  )
}

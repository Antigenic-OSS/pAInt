'use client'

import { useCallback, useRef } from 'react'

interface ResizablePanelProps {
  width: number
  minWidth: number
  maxWidth: number
  onResize: (width: number) => void
  side: 'left' | 'right'
  children: React.ReactNode
}

export function ResizablePanel({
  width,
  minWidth,
  maxWidth,
  onResize,
  side,
  children,
}: ResizablePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isDragging.current = true
      const startX = e.clientX
      const startWidth = width

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging.current) return
        const delta =
          side === 'left'
            ? moveEvent.clientX - startX
            : startX - moveEvent.clientX
        const newWidth = Math.min(
          Math.max(startWidth + delta, minWidth),
          maxWidth,
        )
        onResize(newWidth)
      }

      const handleMouseUp = () => {
        isDragging.current = false
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [width, minWidth, maxWidth, onResize, side],
  )

  return (
    <div
      ref={panelRef}
      className="relative flex-shrink-0 overflow-hidden"
      style={{
        width,
        background: 'var(--bg-secondary)',
        borderLeft: side === 'right' ? '1px solid var(--border)' : 'none',
        borderRight: side === 'left' ? '1px solid var(--border)' : 'none',
      }}
    >
      {children}
      <div
        className="absolute top-0 bottom-0 w-1 cursor-col-resize z-10 hover:bg-[var(--accent)]"
        style={{
          [side === 'left' ? 'right' : 'left']: 0,
          transition: 'background-color 0.15s',
        }}
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}

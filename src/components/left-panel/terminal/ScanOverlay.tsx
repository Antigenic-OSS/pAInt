'use client'

import { useEffect, useState } from 'react'
import { useEditorStore } from '@/store'
import { ScanAnimation } from '@/components/common/ScanAnimation'

export function ScanOverlay() {
  const aiScanStatus = useEditorStore((s) => s.aiScanStatus)
  const [visible, setVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    if (aiScanStatus === 'scanning') {
      setFadeOut(false)
      setVisible(true)
    } else if (visible) {
      // Fade out when scan finishes
      setFadeOut(true)
      const timer = setTimeout(() => setVisible(false), 600)
      return () => clearTimeout(timer)
    }
  }, [aiScanStatus, visible])

  if (!visible) return null

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-hidden pointer-events-none"
      style={{
        background: 'rgba(30, 30, 30, 0.75)',
        transition: 'opacity 0.4s ease',
        opacity: fadeOut ? 0 : 1,
      }}
    >
      {/* Sweep line */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '2px',
          background:
            'linear-gradient(90deg, transparent 0%, var(--accent) 30%, var(--accent) 70%, transparent 100%)',
          boxShadow: '0 0 12px 3px rgba(74, 158, 255, 0.4)',
          animation: 'scan-sweep 2.4s ease-in-out infinite',
        }}
      />

      {/* Second sweep line (offset) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '1px',
          background:
            'linear-gradient(90deg, transparent 0%, rgba(74, 158, 255, 0.4) 40%, rgba(74, 158, 255, 0.4) 60%, transparent 100%)',
          animation: 'scan-sweep 2.4s ease-in-out infinite',
          animationDelay: '1.2s',
        }}
      />

      <ScanAnimation active={!fadeOut} label="SCANNING" />
    </div>
  )
}

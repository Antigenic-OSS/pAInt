'use client'

import { useEditorStore } from '@/store'

const ICON_MAP = {
  success: '\u2713',
  error: '!',
  info: 'i',
} as const

const COLOR_MAP = {
  success: {
    bg: 'rgba(74, 222, 128, 0.12)',
    border: 'var(--success)',
    text: 'var(--success)',
  },
  error: {
    bg: 'rgba(248, 113, 113, 0.12)',
    border: 'var(--error)',
    text: 'var(--error)',
  },
  info: {
    bg: 'rgba(74, 158, 255, 0.12)',
    border: 'var(--accent)',
    text: 'var(--accent)',
  },
} as const

export function ToastContainer() {
  const toasts = useEditorStore((s) => s.toasts)
  const dismissToast = useEditorStore((s) => s.dismissToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const colors = COLOR_MAP[toast.type]
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg min-w-[280px] max-w-[400px] animate-[toast-in_0.25s_ease-out]"
            style={{
              background: 'var(--bg-primary)',
              border: `1px solid ${colors.border}`,
              boxShadow: `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px ${colors.border}`,
            }}
          >
            {/* Icon */}
            <div
              className="flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 text-[11px] font-bold"
              style={{ background: colors.bg, color: colors.text }}
            >
              {ICON_MAP[toast.type]}
            </div>

            {/* Message */}
            <span
              className="flex-1 text-xs leading-relaxed"
              style={{ color: 'var(--text-primary)' }}
            >
              {toast.message}
            </span>

            {/* Dismiss */}
            <button
              onClick={() => dismissToast(toast.id)}
              className="flex-shrink-0 p-0.5 rounded hover:bg-[var(--bg-hover)] transition-colors"
              style={{ color: 'var(--text-muted)' }}
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
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )
      })}

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}

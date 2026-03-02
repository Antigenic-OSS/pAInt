'use client'

import { useCallback } from 'react'
import { useEditorStore } from '@/store'

export function PagesPanel() {
  const pageLinks = useEditorStore((s) => s.pageLinks)
  const currentPagePath = useEditorStore((s) => s.currentPagePath)
  const setCurrentPagePath = useEditorStore((s) => s.setCurrentPagePath)
  const targetUrl = useEditorStore((s) => s.targetUrl)

  const handleNavigate = useCallback(
    (path: string) => {
      if (!targetUrl) return
      setCurrentPagePath(path)
    },
    [targetUrl, setCurrentPagePath],
  )

  // Build page list: always include "/" plus discovered links
  const seen = new Set<string>()
  const pages: Array<{ href: string; text: string }> = []

  pages.push({ href: '/', text: 'Home' })
  seen.add('/')

  for (const link of pageLinks) {
    if (!seen.has(link.href)) {
      seen.add(link.href)
      pages.push(link)
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header count */}
      <div
        className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider flex-shrink-0"
        style={{
          color: 'var(--text-muted)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {pages.length} page{pages.length !== 1 ? 's' : ''} found
      </div>

      {/* Page list */}
      <div className="flex-1 overflow-y-auto">
        {pages.map((page) => {
          const isActive = page.href === currentPagePath
          return (
            <button
              key={page.href}
              onClick={() => handleNavigate(page.href)}
              className="w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2"
              style={{
                color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                background: isActive
                  ? 'rgba(74, 158, 255, 0.08)'
                  : 'transparent',
                borderBottom: '1px solid var(--border)',
              }}
              title={page.href}
            >
              {/* Page icon */}
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke={isActive ? 'var(--accent)' : 'var(--text-muted)'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="flex-shrink-0"
              >
                <rect x="2" y="2" width="12" height="12" rx="1.5" />
                <path d="M2 5.5h12" />
              </svg>
              <div className="truncate flex-1">
                <div className="truncate font-medium">
                  {page.text || page.href}
                </div>
                {page.text && page.href !== page.text && (
                  <div
                    className="truncate"
                    style={{ color: 'var(--text-muted)', fontSize: '10px' }}
                  >
                    {page.href}
                  </div>
                )}
              </div>
              {isActive && (
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: 'var(--accent)' }}
                />
              )}
            </button>
          )
        })}

        {pages.length <= 1 && (
          <div
            className="px-3 py-4 text-[10px] text-center"
            style={{ color: 'var(--text-muted)' }}
          >
            No additional pages found
          </div>
        )}
      </div>
    </div>
  )
}

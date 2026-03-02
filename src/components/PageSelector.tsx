'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useEditorStore } from '@/store'
import { sendViaIframe } from '@/hooks/usePostMessage'

export function PageSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pageLinks = useEditorStore((s) => s.pageLinks)
  const currentPagePath = useEditorStore((s) => s.currentPagePath)
  const setCurrentPagePath = useEditorStore((s) => s.setCurrentPagePath)
  const targetUrl = useEditorStore((s) => s.targetUrl)
  const setConnectionStatus = useEditorStore((s) => s.setConnectionStatus)

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const handleNavigate = useCallback(
    (path: string) => {
      if (!targetUrl) return
      setCurrentPagePath(path)
      sendViaIframe({ type: 'NAVIGATE_TO', payload: { path } })
      setIsOpen(false)
    },
    [targetUrl, setCurrentPagePath],
  )

  const handleRefresh = useCallback(() => {
    setConnectionStatus('connecting')
  }, [setConnectionStatus])

  // Build page list: always include "/" plus discovered links
  const allPages = useRef<Array<{ href: string; text: string }>>([])
  const seen = new Set<string>()
  const pages: Array<{ href: string; text: string }> = []

  // Always add root
  pages.push({ href: '/', text: 'Home' })
  seen.add('/')

  // Add discovered links (deduplicated)
  for (const link of pageLinks) {
    if (!seen.has(link.href)) {
      seen.add(link.href)
      pages.push(link)
    }
  }
  allPages.current = pages

  return (
    <div ref={dropdownRef} className="relative flex items-center gap-1">
      {/* Page dropdown */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 text-[11px] rounded transition-colors"
        style={{
          color: 'var(--text-secondary)',
          background: isOpen ? 'var(--bg-hover)' : 'transparent',
        }}
        title="Navigate to another page"
      >
        <span className="truncate max-w-[140px] font-medium">
          {currentPagePath}
        </span>
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          fill="currentColor"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s',
          }}
        >
          <path
            d="M1 2.5L4 5.5L7 2.5"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Refresh button */}
      <button
        onClick={handleRefresh}
        className="flex items-center justify-center w-6 h-6 rounded transition-colors hover:bg-[var(--bg-hover)]"
        style={{ color: 'var(--text-muted)' }}
        title="Refresh page"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 1v5h5" />
          <path d="M3.51 10a6 6 0 1 0 .49-5.5L1 6" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-60 max-h-72 overflow-y-auto rounded shadow-lg z-50"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Header */}
          <div
            className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider"
            style={{
              color: 'var(--text-muted)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            Pages ({pages.length})
          </div>

          {pages.map((page, i) => {
            const isActive = page.href === currentPagePath
            return (
              <button
                key={page.href}
                onClick={() => handleNavigate(page.href)}
                className="w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2"
                style={{
                  color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                  background: isActive
                    ? 'rgba(74, 158, 255, 0.08)'
                    : 'transparent',
                  borderBottom:
                    i < pages.length - 1 ? '1px solid var(--border)' : 'none',
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
              className="px-3 py-2 text-[10px] text-center"
              style={{ color: 'var(--text-muted)' }}
            >
              No additional pages found
            </div>
          )}
        </div>
      )}
    </div>
  )
}

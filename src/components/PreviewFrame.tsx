'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useEditorStore } from '@/store'
import { usePostMessage, isEditorOnLocalhost } from '@/hooks/usePostMessage'
import {
  PREVIEW_WIDTH_MIN,
  PREVIEW_WIDTH_MAX,
  PROXY_HEADER,
} from '@/lib/constants'
import { isSwProxyReady } from '@/lib/serviceWorkerRegistration'
import { ResponsiveToolbar } from './ResponsiveToolbar'

/**
 * Build the proxy URL for the iframe. Routes through /api/proxy/
 * so the proxy can inject the inspector script and strip security
 * headers (COEP, CSP, X-Frame-Options) that would block the editor.
 * Used only when the editor runs on localhost.
 */
function buildProxyUrl(targetUrl: string, pagePath: string): string {
  const path = pagePath === '/' ? '' : pagePath
  const encoded = encodeURIComponent(targetUrl)
  return `/api/proxy${path}?${PROXY_HEADER}=${encoded}`
}

/**
 * Build the bridge proxy URL for the iframe. Routes through the bridge server
 * running on the user's machine. The bridge injects the inspector script
 * and strips security headers, just like the local proxy.
 * Used when the editor is deployed remotely and a bridge is connected.
 */
function buildBridgeUrl(
  bridgeUrl: string,
  targetUrl: string,
  pagePath: string,
): string {
  const path = pagePath === '/' ? '' : pagePath
  const encoded = encodeURIComponent(targetUrl)
  return `${bridgeUrl}${path}?${PROXY_HEADER}=${encoded}`
}

/**
 * Build the direct URL for the iframe. Loads the target page directly
 * without the proxy. Used when the editor is deployed remotely (e.g. Vercel)
 * and can't proxy to the user's localhost.
 * Requires the user to manually add the inspector script tag to their project.
 */
function buildDirectUrl(targetUrl: string, pagePath: string): string {
  const path = pagePath === '/' ? '' : pagePath
  return `${targetUrl}${path}`
}

/**
 * Build the SW proxy URL for the iframe. Routes through the Service Worker
 * at /sw-proxy/ which intercepts all requests and proxies them to the target,
 * preserving all scripts for full client-rendered content.
 */
function buildSwProxyUrl(targetUrl: string, pagePath: string): string {
  const path = pagePath === '/' ? '/' : pagePath
  const encoded = encodeURIComponent(targetUrl)
  return `/sw-proxy${path}?__sw_target=${encoded}`
}

/**
 * Build the appropriate iframe URL based on whether the editor is local,
 * has a bridge connection, or is remote without bridge.
 * Prefers SW proxy when available for full client-rendered content.
 */
function buildIframeUrl(targetUrl: string, pagePath: string): string {
  if (isEditorOnLocalhost()) {
    if (isSwProxyReady()) {
      return buildSwProxyUrl(targetUrl, pagePath)
    }
    return buildProxyUrl(targetUrl, pagePath)
  }
  // Check for bridge connection
  const bridgeUrl = useEditorStore.getState().bridgeUrl
  if (bridgeUrl) {
    return buildBridgeUrl(bridgeUrl, targetUrl, pagePath)
  }
  return buildDirectUrl(targetUrl, pagePath)
}

export function PreviewFrame() {
  const targetUrl = useEditorStore((s) => s.targetUrl)
  const connectionStatus = useEditorStore((s) => s.connectionStatus)
  const previewWidth = useEditorStore((s) => s.previewWidth)
  const setPreviewWidth = useEditorStore((s) => s.setPreviewWidth)
  const currentPagePath = useEditorStore((s) => s.currentPagePath)
  const setConnectionStatus = useEditorStore((s) => s.setConnectionStatus)
  const _viewMode = useEditorStore((s) => s.viewMode)
  const { iframeRef, sendToInspector } = usePostMessage()
  const containerRef = useRef<HTMLDivElement>(null)
  const lastSrcRef = useRef<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Handle initial connection — load through proxy
  useEffect(() => {
    if (!targetUrl || connectionStatus !== 'connecting') return

    const iframe = iframeRef.current
    if (!iframe) return

    const newSrc = buildIframeUrl(targetUrl, currentPagePath)
    const usingSw = newSrc.startsWith('/sw-proxy/')
    console.debug('[PreviewFrame] iframe src:', newSrc, '| SW ready:', isSwProxyReady())

    if (lastSrcRef.current !== newSrc) {
      lastSrcRef.current = newSrc
      iframe.src = newSrc
    }

    const handleError = () => {
      setConnectionStatus('disconnected')
    }

    iframe.addEventListener('error', handleError)

    // Fallback: if SW proxy doesn't connect within 8s, retry with old proxy.
    // This handles stale SWs, extension interference, or other SW issues.
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null
    if (usingSw) {
      fallbackTimer = setTimeout(() => {
        // Only fall back if still connecting (not yet connected)
        if (useEditorStore.getState().connectionStatus !== 'connecting') return
        console.debug('[PreviewFrame] SW proxy timeout — falling back to reverse proxy')
        const fallbackSrc = buildProxyUrl(targetUrl, currentPagePath)
        lastSrcRef.current = fallbackSrc
        iframe.src = fallbackSrc
      }, 8000)
    }

    return () => {
      iframe.removeEventListener('error', handleError)
      if (fallbackTimer) clearTimeout(fallbackTimer)
    }
  }, [
    targetUrl,
    connectionStatus,
    currentPagePath,
    iframeRef,
    setConnectionStatus,
  ])

  // Handle page navigation when already connected
  useEffect(() => {
    if (!targetUrl || connectionStatus !== 'connected') return

    const iframe = iframeRef.current
    if (!iframe) return

    const newSrc = buildIframeUrl(targetUrl, currentPagePath)

    if (lastSrcRef.current !== newSrc) {
      lastSrcRef.current = newSrc
      iframe.src = newSrc
    }
  }, [targetUrl, connectionStatus, currentPagePath, iframeRef])

  // Preview mode — stay on proxy URL but disable inspector overlays.
  // Previously this switched to the direct URL for full JS interactivity,
  // but that breaks when the target page embeds the external inspector script
  // (e.g. from Vercel): the external inspector starts with selection ON and
  // can't receive SET_SELECTION_MODE:false due to cross-origin postMessage
  // restrictions. Keeping the proxy URL ensures the only inspector running
  // is the proxy-injected one (same-origin, fully controllable).
  // The proxy already preserves enough scripts for most apps (Expo/RN Web
  // bundles load fine through the proxy).
  useEffect(() => {
    if (!targetUrl || connectionStatus !== 'connected') return

    // Selection mode is managed by TopBar via sendToInspector.
    // When exiting preview, TopBar re-enables selection and the proxy
    // iframe is still loaded — no reload needed.
  }, [targetUrl, connectionStatus])

  // Drag resize logic — symmetric from center
  const dragStateRef = useRef<{
    startX: number
    startWidth: number
    side: 'left' | 'right'
  } | null>(null)

  const handleDragStart = useCallback(
    (e: React.MouseEvent, side: 'left' | 'right') => {
      e.preventDefault()
      dragStateRef.current = {
        startX: e.clientX,
        startWidth: previewWidth,
        side,
      }
      setIsDragging(true)
    },
    [previewWidth],
  )

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const state = dragStateRef.current
      if (!state) return
      const delta = e.clientX - state.startX
      // Symmetric: dragging right handle right = wider, left handle left = wider
      const direction = state.side === 'right' ? 1 : -1
      const newWidth = Math.round(state.startWidth + delta * direction * 2)
      const clamped = Math.min(
        Math.max(newWidth, PREVIEW_WIDTH_MIN),
        PREVIEW_WIDTH_MAX,
      )
      setPreviewWidth(clamped)
      sendToInspector({ type: 'SET_BREAKPOINT', payload: { width: clamped } })
    }

    const handleMouseUp = () => {
      dragStateRef.current = null
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, setPreviewWidth, sendToInspector])

  // Check if preview fills container (no handles needed)
  const containerWidth = containerRef.current?.clientWidth ?? 0
  const isFullWidth = previewWidth >= containerWidth && containerWidth > 0

  if (!targetUrl) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ background: 'var(--bg-primary)' }}
      >
        <div className="text-center">
          <div
            className="text-lg font-medium mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            No project connected
          </div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Enter a localhost URL above to get started
          </div>
        </div>
      </div>
    )
  }

  const showHandles = !isFullWidth && connectionStatus === 'connected'

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--bg-primary)' }}
    >
      {connectionStatus === 'connected' && <ResponsiveToolbar />}

      <div
        ref={containerRef}
        className="flex items-start justify-center flex-1 overflow-auto relative"
        style={{ padding: '0' }}
      >
        {/* Left drag handle */}
        {showHandles && (
          <div
            onMouseDown={(e) => handleDragStart(e, 'left')}
            className="absolute top-0 bottom-0 z-10 flex items-center justify-center"
            style={{
              width: 6,
              left: `calc(50% - ${previewWidth / 2}px - 6px)`,
              cursor: 'col-resize',
            }}
          >
            <div
              className="w-1 rounded-full transition-colors"
              style={{
                height: 40,
                background: isDragging ? 'var(--accent)' : 'var(--border)',
              }}
            />
          </div>
        )}

        <div
          className="h-full mx-auto"
          style={{
            width: isFullWidth ? '100%' : previewWidth,
            maxWidth: '100%',
            transition: isDragging ? 'none' : 'width 0.2s ease',
          }}
        >
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            style={{
              background: '#fff',
              pointerEvents: isDragging ? 'none' : 'auto',
              borderLeft: !isFullWidth ? '1px solid var(--border)' : 'none',
              borderRight: !isFullWidth ? '1px solid var(--border)' : 'none',
            }}
            title="Preview"
          />
        </div>

        {/* Right drag handle */}
        {showHandles && (
          <div
            onMouseDown={(e) => handleDragStart(e, 'right')}
            className="absolute top-0 bottom-0 z-10 flex items-center justify-center"
            style={{
              width: 6,
              right: `calc(50% - ${previewWidth / 2}px - 6px)`,
              cursor: 'col-resize',
            }}
          >
            <div
              className="w-1 rounded-full transition-colors"
              style={{
                height: 40,
                background: isDragging ? 'var(--accent)' : 'var(--border)',
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

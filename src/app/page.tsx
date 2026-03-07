'use client'

import { useEffect, useState } from 'react'
import { Editor } from '@/components/Editor'
import { useEditorStore } from '@/store'
import { registerSwProxy } from '@/lib/serviceWorkerRegistration'

export default function Home() {
  const loadPersistedUI = useEditorStore((s) => s.loadPersistedUI)
  const loadPersistedClaude = useEditorStore((s) => s.loadPersistedClaude)

  // Safety net: if pAInt's own page loads inside an iframe,
  // it means the proxy's navigation blocker failed and the iframe
  // escaped to localhost:4000. Notify the parent editor so it can recover.
  const [isRecursiveEmbed, setIsRecursiveEmbed] = useState(false)

  useEffect(() => {
    if (window.self !== window.top) {
      setIsRecursiveEmbed(true)
      try {
        window.parent.postMessage({ type: 'RECURSIVE_EMBED_DETECTED' }, '*')
      } catch (_e) {
        /* cross-origin */
      }
      return
    }

    loadPersistedUI()
    loadPersistedClaude()
    registerSwProxy()

    // Suppress HMR errors caused by proxied routes leaking into the
    // editor's route tree (e.g. "unrecognized HMR message").
    const suppressHmrErrors = (e: PromiseRejectionEvent) => {
      const msg = e.reason?.message || String(e.reason || '')
      if (msg.includes('unrecognized HMR message') || msg.includes('HMR')) {
        e.preventDefault()
      }
    }
    window.addEventListener('unhandledrejection', suppressHmrErrors)
    return () =>
      window.removeEventListener('unhandledrejection', suppressHmrErrors)
  }, [loadPersistedUI, loadPersistedClaude])

  if (isRecursiveEmbed) return null

  return <Editor />
}

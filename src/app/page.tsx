'use client';

import { useEffect } from 'react';
import { Editor } from '@/components/Editor';
import { useEditorStore } from '@/store';

export default function Home() {
  const loadPersistedUI = useEditorStore((s) => s.loadPersistedUI);
  const loadPersistedClaude = useEditorStore((s) => s.loadPersistedClaude);

  useEffect(() => {
    loadPersistedUI();
    loadPersistedClaude();

    // Suppress HMR errors caused by proxied routes leaking into the
    // editor's route tree (e.g. "unrecognized HMR message").
    const suppressHmrErrors = (e: PromiseRejectionEvent) => {
      const msg = e.reason?.message || String(e.reason || '');
      if (msg.includes('unrecognized HMR message') || msg.includes('HMR')) {
        e.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', suppressHmrErrors);
    return () => window.removeEventListener('unhandledrejection', suppressHmrErrors);
  }, [loadPersistedUI, loadPersistedClaude]);

  return <Editor />;
}

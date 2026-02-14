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
  }, [loadPersistedUI, loadPersistedClaude]);

  return <Editor />;
}

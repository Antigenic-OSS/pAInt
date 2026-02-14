/**
 * Inspector messaging bridge.
 * Handles postMessage send/receive with origin checking.
 * Runtime code is inlined in the proxy; this is the source reference.
 */

import type { InspectorToEditorMessage, EditorToInspectorMessage } from '@/types/messages';

const parentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

export function sendToEditor(message: InspectorToEditorMessage): void {
  window.parent.postMessage(message, parentOrigin);
}

export type MessageHandler = (message: EditorToInspectorMessage) => void;

export function listenForEditorMessages(handler: MessageHandler): () => void {
  const listener = (event: MessageEvent) => {
    if (event.origin !== parentOrigin) return;
    const data = event.data;
    if (!data || !data.type) return;
    handler(data as EditorToInspectorMessage);
  };

  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}

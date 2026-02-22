import { useEditorStore } from '@/store';

/**
 * Returns the base URL for API calls.
 *
 * - When running locally: returns '' (same-origin).
 * - When running remotely with bridge: returns the bridge URL (e.g. 'http://localhost:4002').
 * - When running remotely without bridge: returns '' (calls go to Vercel routes).
 */
export function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  const h = window.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') return '';
  return useEditorStore.getState().bridgeUrl || '';
}

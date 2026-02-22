/**
 * Client-side folder picker utility.
 *
 * On deployed (non-localhost): uses the File System Access API (showDirectoryPicker).
 * On localhost: falls back to the server-side /api/claude/pick-folder endpoint.
 */

export type FolderPickResult =
  | { type: 'handle'; handle: FileSystemDirectoryHandle; name: string }
  | { type: 'path'; path: string }
  | { type: 'cancelled' }
  | { type: 'error'; message: string };

/** Whether the browser supports the File System Access API (Chrome/Edge). */
export function isFolderPickerSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/** Whether the editor is running on localhost (can use server-side picker). */
function isLocal(): boolean {
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

/**
 * Pick a folder.
 * - Deployed + Chrome/Edge: File System Access API (client-side, no server needed)
 * - Deployed + unsupported browser: returns error with guidance
 * - Localhost: server-side /api/claude/pick-folder (osascript / zenity)
 */
export async function pickFolder(): Promise<FolderPickResult> {
  // On localhost, prefer the server-side native picker (works in every browser)
  if (isLocal()) {
    return pickFolderServer();
  }

  // On deployed, use File System Access API
  if (!isFolderPickerSupported()) {
    return {
      type: 'error',
      message: 'Folder picker requires Chrome or Edge. Use a Chromium-based browser, or run Dev Editor locally.',
    };
  }

  return pickFolderClient();
}

async function pickFolderClient(): Promise<FolderPickResult> {
  try {
    const handle = await window.showDirectoryPicker!({ mode: 'read' });
    return { type: 'handle', handle, name: handle.name };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { type: 'cancelled' };
    }
    return { type: 'error', message: 'Failed to open folder picker' };
  }
}

async function pickFolderServer(): Promise<FolderPickResult> {
  try {
    const res = await fetch('/api/claude/pick-folder');
    const data = await res.json();
    if (data.cancelled) {
      return { type: 'cancelled' };
    }
    if (data.path) {
      return { type: 'path', path: data.path };
    }
    return { type: 'error', message: data.error || 'Unknown error' };
  } catch {
    return { type: 'error', message: 'Failed to open folder picker' };
  }
}

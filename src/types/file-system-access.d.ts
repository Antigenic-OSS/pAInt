/**
 * Type augmentations for the File System Access API.
 * These APIs are available in Chromium-based browsers (Chrome, Edge)
 * but not yet in TypeScript's standard lib definitions.
 */

interface FileSystemDirectoryHandle {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>
  getDirectoryHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<FileSystemDirectoryHandle>
  getFileHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<FileSystemFileHandle>
}

interface FileSystemFileHandle {
  getFile(): Promise<File>
}

interface Window {
  showDirectoryPicker?(options?: {
    mode?: 'read' | 'readwrite'
  }): Promise<FileSystemDirectoryHandle>
}

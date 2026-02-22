import { useCallback } from 'react';
import { useEditorStore } from '@/store';
import { scanProjectClient } from '@/lib/clientProjectScanner';
import type { RouteEntry } from '@/types/claude';

export interface ScanCallbacks {
  onSuccess?: (count: number, projectName: string) => void;
  onError?: (message: string) => void;
}

export interface ScanResult {
  success: boolean;
  count: number;
  projectName: string;
  pageCount: number;
  cssFileCount: number;
  assetDirCount: number;
  framework: string | null;
  cssStrategy: string[];
  error?: string;
}

const EMPTY_RESULT: ScanResult = {
  success: false, count: 0, projectName: '', pageCount: 0,
  cssFileCount: 0, assetDirCount: 0, framework: null, cssStrategy: [],
};

/**
 * Shared hook that triggers a project scan and updates the store.
 * Captures components, pages/routes, CSS files, assets, and framework info.
 *
 * - `triggerScan(rootPath)` — server-side scan via /api/project-scan (localhost only)
 * - `triggerClientScan(handle)` — client-side scan via File System Access API (works on Vercel)
 */
export function useProjectScan() {
  const setScanStatus = useEditorStore((s) => s.setScanStatus);
  const setScanError = useEditorStore((s) => s.setScanError);
  const setComponentFileMap = useEditorStore((s) => s.setComponentFileMap);
  const setScannedProjectName = useEditorStore((s) => s.setScannedProjectName);
  const setProjectScan = useEditorStore((s) => s.setProjectScan);
  const pendingTargetUrl = useEditorStore((s) => s.pendingTargetUrl);
  const targetUrl = useEditorStore((s) => s.targetUrl);

  /** Populate store from scan data and return a ScanResult. */
  const finalizeScan = useCallback(
    (data: {
      componentFileMap: Record<string, string>;
      projectName: string;
      routes: RouteEntry[];
      cssFiles: string[];
      assetDirs: string[];
      framework: string | null;
      cssStrategy: string[];
      srcDirs: string[];
    }, callbacks?: ScanCallbacks): ScanResult => {
      setComponentFileMap(data.componentFileMap);
      setScannedProjectName(data.projectName);
      setScanStatus('complete');

      const count = Object.keys(data.componentFileMap || {}).length;
      const pageCount = data.routes.filter((r) => r.type === 'page').length;

      const url = pendingTargetUrl || targetUrl;
      if (url) {
        setProjectScan(url, {
          framework: data.framework,
          cssStrategy: data.cssStrategy,
          cssFiles: data.cssFiles,
          srcDirs: data.srcDirs,
          packageName: data.projectName || null,
          assetDirs: data.assetDirs,
          fileMap: {
            routes: data.routes,
            components: Object.entries(data.componentFileMap || {}).map(
              ([name, filePath]) => ({
                name,
                filePath: filePath as string,
                nameLower: name.toLowerCase(),
                category: 'component' as const,
              }),
            ),
          },
        });
      }

      callbacks?.onSuccess?.(count, data.projectName);
      return {
        success: true,
        count,
        projectName: data.projectName,
        pageCount,
        cssFileCount: data.cssFiles.length,
        assetDirCount: data.assetDirs.length,
        framework: data.framework,
        cssStrategy: data.cssStrategy,
      };
    },
    [setComponentFileMap, setScannedProjectName, setScanStatus, setProjectScan, pendingTargetUrl, targetUrl],
  );

  /** Server-side scan (localhost only). */
  const triggerScan = useCallback(
    async (rootPath: string, callbacks?: ScanCallbacks): Promise<ScanResult> => {
      setScanStatus('scanning');
      setScanError(null);
      try {
        const res = await fetch('/api/project-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectRoot: rootPath }),
        });
        if (res.ok) {
          const data = await res.json();
          return finalizeScan({
            componentFileMap: data.componentFileMap || {},
            projectName: data.projectName || 'unknown',
            routes: data.routes || [],
            cssFiles: data.cssFiles || [],
            assetDirs: data.assetDirs || [],
            framework: data.framework || null,
            cssStrategy: data.cssStrategy || [],
            srcDirs: data.srcDirs || [],
          }, callbacks);
        } else {
          const errData = await res.json().catch(() => ({ error: 'Scan failed' }));
          const message = errData.error || 'Scan failed';
          setScanStatus('error');
          setScanError(message);
          callbacks?.onError?.(message);
          return { ...EMPTY_RESULT, error: message };
        }
      } catch {
        const message = 'Network error during scan';
        setScanStatus('error');
        setScanError(message);
        callbacks?.onError?.(message);
        return { ...EMPTY_RESULT, error: message };
      }
    },
    [setScanStatus, setScanError, finalizeScan],
  );

  /** Client-side scan using File System Access API (works on Vercel). */
  const triggerClientScan = useCallback(
    async (handle: FileSystemDirectoryHandle, callbacks?: ScanCallbacks): Promise<ScanResult> => {
      setScanStatus('scanning');
      setScanError(null);
      try {
        const data = await scanProjectClient(handle);
        return finalizeScan({
          componentFileMap: data.componentFileMap,
          projectName: data.projectName,
          routes: data.routes,
          cssFiles: data.cssFiles,
          assetDirs: data.assetDirs,
          framework: data.framework,
          cssStrategy: data.cssStrategy,
          srcDirs: data.srcDirs,
        }, callbacks);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Client scan failed';
        setScanStatus('error');
        setScanError(message);
        callbacks?.onError?.(message);
        return { ...EMPTY_RESULT, error: message };
      }
    },
    [setScanStatus, setScanError, finalizeScan],
  );

  return { triggerScan, triggerClientScan };
}

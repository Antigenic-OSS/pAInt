import { useCallback } from 'react';
import { useEditorStore } from '@/store';
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

/**
 * Shared hook that triggers a project scan and updates the store.
 * Captures components, pages/routes, CSS files, assets, and framework info.
 */
export function useProjectScan() {
  const setScanStatus = useEditorStore((s) => s.setScanStatus);
  const setScanError = useEditorStore((s) => s.setScanError);
  const setComponentFileMap = useEditorStore((s) => s.setComponentFileMap);
  const setScannedProjectName = useEditorStore((s) => s.setScannedProjectName);
  const setProjectScan = useEditorStore((s) => s.setProjectScan);
  const pendingTargetUrl = useEditorStore((s) => s.pendingTargetUrl);
  const targetUrl = useEditorStore((s) => s.targetUrl);

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
          setComponentFileMap(data.componentFileMap);
          setScannedProjectName(data.projectName);
          setScanStatus('complete');

          const count = Object.keys(data.componentFileMap || {}).length;
          const routes: RouteEntry[] = data.routes || [];
          const cssFiles: string[] = data.cssFiles || [];
          const assetDirs: string[] = data.assetDirs || [];
          const pageCount = routes.filter((r: RouteEntry) => r.type === 'page').length;

          // Persist full ProjectScanResult for Claude integration
          const url = pendingTargetUrl || targetUrl;
          if (url) {
            setProjectScan(url, {
              framework: data.framework || null,
              cssStrategy: data.cssStrategy || [],
              cssFiles,
              srcDirs: data.srcDirs || [],
              packageName: data.projectName || null,
              assetDirs,
              fileMap: {
                routes,
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
            cssFileCount: cssFiles.length,
            assetDirCount: assetDirs.length,
            framework: data.framework || null,
            cssStrategy: data.cssStrategy || [],
          };
        } else {
          const errData = await res.json().catch(() => ({ error: 'Scan failed' }));
          const message = errData.error || 'Scan failed';
          setScanStatus('error');
          setScanError(message);
          callbacks?.onError?.(message);
          return { success: false, count: 0, projectName: '', pageCount: 0, cssFileCount: 0, assetDirCount: 0, framework: null, cssStrategy: [], error: message };
        }
      } catch {
        const message = 'Network error during scan';
        setScanStatus('error');
        setScanError(message);
        callbacks?.onError?.(message);
        return { success: false, count: 0, projectName: '', pageCount: 0, cssFileCount: 0, assetDirCount: 0, framework: null, cssStrategy: [], error: message };
      }
    },
    [setScanStatus, setScanError, setComponentFileMap, setScannedProjectName, setProjectScan, pendingTargetUrl, targetUrl],
  );

  return { triggerScan };
}

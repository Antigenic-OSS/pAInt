'use client';

import { useEffect, useCallback } from 'react';
import { useEditorStore } from '@/store';
import { isEditorOnLocalhost } from '@/hooks/usePostMessage';

const DEFAULT_BRIDGE_PORT = 4002;

/**
 * Auto-discovers and manages the local companion bridge server.
 *
 * When the editor is deployed remotely (e.g., Vercel), this hook probes
 * http://localhost:4002/health on mount to detect a running bridge.
 * Also checks for ?bridge=host:port URL parameter.
 */
export function useBridge() {
  const bridgeUrl = useEditorStore((s) => s.bridgeUrl);
  const bridgeStatus = useEditorStore((s) => s.bridgeStatus);
  const setBridgeUrl = useEditorStore((s) => s.setBridgeUrl);
  const setBridgeStatus = useEditorStore((s) => s.setBridgeStatus);

  const probe = useCallback(async (url: string) => {
    setBridgeStatus('checking');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${url}/health`, {
        mode: 'cors',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data.bridge) {
          setBridgeUrl(url);
          setBridgeStatus('connected');
          return true;
        }
      }
    } catch {
      // Bridge not available
    }
    setBridgeStatus('unavailable');
    return false;
  }, [setBridgeUrl, setBridgeStatus]);

  // Auto-discover on mount when running remotely
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isEditorOnLocalhost()) return;

    // Check URL params first: ?bridge=localhost:4002
    const params = new URLSearchParams(window.location.search);
    const bridgeParam = params.get('bridge');
    if (bridgeParam) {
      const url = bridgeParam.startsWith('http') ? bridgeParam : `http://${bridgeParam}`;
      probe(url);
      return;
    }

    // Check saved bridge URL
    const saved = useEditorStore.getState().bridgeUrl;
    if (saved) {
      probe(saved);
      return;
    }

    // Probe default port
    probe(`http://localhost:${DEFAULT_BRIDGE_PORT}`);
  }, [probe]);

  const reconnect = useCallback(() => {
    const url = bridgeUrl || `http://localhost:${DEFAULT_BRIDGE_PORT}`;
    probe(url);
  }, [bridgeUrl, probe]);

  const disconnect = useCallback(() => {
    setBridgeUrl(null);
    setBridgeStatus('disconnected');
  }, [setBridgeUrl, setBridgeStatus]);

  return {
    bridgeUrl,
    bridgeStatus,
    isBridgeConnected: bridgeStatus === 'connected',
    reconnect,
    disconnect,
  };
}

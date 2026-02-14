'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '@/store';
import { usePostMessage } from './usePostMessage';
import {
  HEARTBEAT_INTERVAL_MS,
  RECONNECT_MAX_RETRIES,
  RECONNECT_BASE_DELAY_MS,
} from '@/lib/constants';

export function useTargetUrl() {
  const connectionStatus = useEditorStore((s) => s.connectionStatus);
  const targetUrl = useEditorStore((s) => s.targetUrl);
  const setConnectionStatus = useEditorStore((s) => s.setConnectionStatus);
  const { sendHeartbeat } = usePostMessage();

  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);

    heartbeatIntervalRef.current = setInterval(async () => {
      const alive = await sendHeartbeat();
      if (!alive) {
        setConnectionStatus('disconnected');
      }
    }, HEARTBEAT_INTERVAL_MS);
  }, [sendHeartbeat, setConnectionStatus]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Start heartbeat when connected
  useEffect(() => {
    if (connectionStatus === 'connected') {
      retryCountRef.current = 0;
      startHeartbeat();
    } else {
      stopHeartbeat();
    }
    return stopHeartbeat;
  }, [connectionStatus, startHeartbeat, stopHeartbeat]);

  // Auto-reconnect on disconnect
  useEffect(() => {
    if (connectionStatus === 'disconnected' && targetUrl && retryCountRef.current < RECONNECT_MAX_RETRIES) {
      const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, retryCountRef.current);
      retryTimeoutRef.current = setTimeout(() => {
        retryCountRef.current++;
        setConnectionStatus('connecting');
      }, delay);
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [connectionStatus, targetUrl, setConnectionStatus]);

  return {
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    isDisconnected: connectionStatus === 'disconnected',
  };
}

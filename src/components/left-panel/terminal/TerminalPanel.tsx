'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '@/store';
import '@xterm/xterm/css/xterm.css';

export function TerminalPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<import('@xterm/xterm').Terminal | null>(null);
  const fitRef = useRef<import('@xterm/addon-fit').FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const initRef = useRef(false);
  const terminalStatus = useEditorStore((s) => s.terminalStatus);
  const setTerminalStatus = useEditorStore((s) => s.setTerminalStatus);
  const port = useEditorStore((s) => s.terminalServerPort);

  const connectWebSocket = useCallback(
    (term: import('@xterm/xterm').Terminal, fitAddon: import('@xterm/addon-fit').FitAddon) => {
      setTerminalStatus('connecting');
      const ws = new WebSocket(`ws://localhost:${port}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setTerminalStatus('connected');
        fitAddon.fit();
        const dims = fitAddon.proposeDimensions();
        if (dims) {
          ws.send('\x01' + JSON.stringify({ cols: dims.cols, rows: dims.rows }));
        }
      };

      ws.onmessage = (event) => {
        term.write(event.data);
      };

      ws.onclose = () => {
        setTerminalStatus('disconnected');
      };

      ws.onerror = () => {
        setTerminalStatus('error');
      };

      term.onData((data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      term.onResize((size: { cols: number; rows: number }) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('\x01' + JSON.stringify({ cols: size.cols, rows: size.rows }));
        }
      });
    },
    [port, setTerminalStatus],
  );

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    let mounted = true;

    async function init() {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
      ]);

      if (!mounted || !containerRef.current) return;

      const fitAddon = new FitAddon();
      fitRef.current = fitAddon;

      const term = new Terminal({
        theme: {
          background: '#1e1e1e',
          foreground: '#e0e0e0',
          cursor: '#4a9eff',
          selectionBackground: '#4a9eff44',
          black: '#1e1e1e',
          red: '#f87171',
          green: '#4ade80',
          yellow: '#fbbf24',
          blue: '#4a9eff',
          magenta: '#c084fc',
          cyan: '#22d3ee',
          white: '#e0e0e0',
          brightBlack: '#666666',
          brightRed: '#f87171',
          brightGreen: '#4ade80',
          brightYellow: '#fbbf24',
          brightBlue: '#4a9eff',
          brightMagenta: '#c084fc',
          brightCyan: '#22d3ee',
          brightWhite: '#ffffff',
        },
        fontSize: 12,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        cursorBlink: true,
        scrollback: 1000,
      });

      term.loadAddon(fitAddon);
      term.open(containerRef.current);
      fitAddon.fit();

      termRef.current = term;
      connectWebSocket(term, fitAddon);
    }

    init();

    return () => {
      mounted = false;
      wsRef.current?.close();
      termRef.current?.dispose();
    };
  }, [connectWebSocket]);

  // Refit terminal when container resizes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      if (fitRef.current && termRef.current) {
        fitRef.current.fit();
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const reconnect = useCallback(() => {
    if (termRef.current && fitRef.current) {
      wsRef.current?.close();
      termRef.current.clear();
      connectWebSocket(termRef.current, fitRef.current);
    }
  }, [connectWebSocket]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background:
                terminalStatus === 'connected'
                  ? 'var(--success)'
                  : terminalStatus === 'error'
                    ? 'var(--error)'
                    : 'var(--text-muted)',
            }}
          />
          <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            Terminal
          </span>
        </div>
        {(terminalStatus === 'disconnected' || terminalStatus === 'error') && (
          <button
            onClick={reconnect}
            className="px-2 py-0.5 rounded text-[10px] font-medium"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
          >
            Reconnect
          </button>
        )}
      </div>

      {/* Terminal container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        style={{ padding: '4px 0 0 4px' }}
      />

      {/* Error state overlay */}
      {terminalStatus === 'error' && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none"
          style={{ background: 'rgba(30,30,30,0.85)' }}
        >
          <span className="text-xs" style={{ color: 'var(--error)' }}>
            Cannot connect to terminal server
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Run: bun run terminal
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Browser-side SSE consumer for streaming Claude CLI activity.
 * Uses fetch + ReadableStream (not EventSource, which only supports GET).
 */

// ANSI escape codes
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
} as const;

/**
 * Classify a stderr line and wrap it in ANSI colors for xterm.js display.
 */
export function formatStderrLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return '';

  // File reads
  if (/^(Reading|Read)\s/i.test(trimmed) || /\.tsx?|\.jsx?|\.css|\.html/i.test(trimmed)) {
    return `${ANSI.magenta}  ${trimmed}${ANSI.reset}`;
  }
  // Tool usage
  if (/^Tool:\s/i.test(trimmed) || /^Using\s/i.test(trimmed)) {
    return `${ANSI.cyan}  ${trimmed}${ANSI.reset}`;
  }
  // Success
  if (/success|complete|done|finished/i.test(trimmed)) {
    return `${ANSI.green}  ${trimmed}${ANSI.reset}`;
  }
  // Errors
  if (/error|fail|exception/i.test(trimmed)) {
    return `${ANSI.red}  ${trimmed}${ANSI.reset}`;
  }
  // Warnings
  if (/warn|warning|caution/i.test(trimmed)) {
    return `${ANSI.yellow}  ${trimmed}${ANSI.reset}`;
  }
  // Unclassified
  return `${ANSI.gray}  ${trimmed}${ANSI.reset}`;
}

export interface StreamCallbacks<T> {
  onStderr?: (line: string) => void;
  onResult?: (data: T) => void;
  onError?: (error: { code: string; message: string }) => void;
  onDone?: () => void;
}

/**
 * Send a POST with `Accept: text/event-stream` and consume the SSE response.
 * Returns an AbortController for cancellation.
 */
export function consumeClaudeStream<T>(
  url: string,
  body: Record<string, unknown>,
  callbacks: StreamCallbacks<T>,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        callbacks.onError?.({
          code: data.code || 'HTTP_ERROR',
          message: data.error || `Request failed with status ${res.status}`,
        });
        callbacks.onDone?.();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const parts = buffer.split('\n\n');
        // Keep the last part — it may be incomplete
        buffer = parts.pop() || '';

        for (const part of parts) {
          const lines = part.split('\n');
          let eventType = '';
          let dataStr = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7);
            } else if (line.startsWith('data: ')) {
              dataStr = line.slice(6);
            }
          }

          if (!eventType || !dataStr) continue;

          try {
            const payload = JSON.parse(dataStr);

            switch (eventType) {
              case 'stderr':
                callbacks.onStderr?.(payload.line);
                break;
              case 'result':
                callbacks.onResult?.(payload as T);
                break;
              case 'error':
                callbacks.onError?.(payload);
                break;
              case 'done':
                // Stream ended
                break;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        callbacks.onError?.({
          code: 'NETWORK_ERROR',
          message: err instanceof Error ? err.message : 'Network error',
        });
      }
    } finally {
      callbacks.onDone?.();
    }
  })();

  return controller;
}

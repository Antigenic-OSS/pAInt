# Stream Claude CLI Activity to Terminal Panel

## Context

When the user triggers "AI Scan" or "Send to Claude Code", the Claude CLI runs headlessly for 1-5 minutes with zero visual feedback — just a spinner. The Terminal panel in the left sidebar already has a fully functional xterm.js display connected to a PTY shell. This plan streams Claude CLI stderr (file reads, tool usage, progress) to the terminal in real-time via SSE, so the user sees exactly what Claude is doing.

## Data Flow

```
Claude CLI (child process stderr)
  → spawnClaudeStreaming() fires onStderr callback per line
  → API route sends SSE event: { type: 'stderr', line: '...' }
  → Browser reads SSE stream, formats with ANSI colors
  → Writes to xterm.js via store.writeToTerminal()
  → User sees "Reading src/components/Header.tsx..." in terminal
```

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/store/terminalSlice.ts` | Edit | Add `writeToTerminal` callback + `registerTerminalWriter` |
| `src/components/left-panel/terminal/TerminalPanel.tsx` | Edit | Register writer callback on mount |
| `src/lib/claude-bin.ts` | Edit | Add `spawnClaudeStreaming()` with `onStderr` callback |
| `src/lib/claude-stream.ts` | **Create** | Shared browser-side SSE consumer + ANSI formatting |
| `src/app/api/claude/analyze/route.ts` | Edit | Add SSE streaming path (keep JSON fallback) |
| `src/app/api/claude/scan/route.ts` | Edit | Add SSE streaming path (keep JSON fallback) |
| `src/components/right-panel/claude/ClaudeIntegrationPanel.tsx` | Edit | Use streaming fetch, pipe stderr to terminal |
| `src/components/right-panel/changes/ChangesPanel.tsx` | Edit | Use streaming fetch for AI Scan, pipe to terminal |

## Implementation Steps

### 1. Terminal Store (`src/store/terminalSlice.ts`)

Add to `TerminalSlice`:
- `writeToTerminal: ((data: string) => void) | null` — callback registered by TerminalPanel
- `registerTerminalWriter: (writer) => void` — sets the callback

This lets any component write to xterm.js without direct component coupling.

### 2. Terminal Writer Registration (`TerminalPanel.tsx`)

After `term.open()`, call `registerTerminalWriter((data) => term.write(data))`.
On unmount, call `registerTerminalWriter(null)`.

Claude's stderr lines coexist with the PTY shell output in the same xterm.js display — both write to `term.write()`. ANSI color formatting makes Claude lines visually distinct.

### 3. Streaming Claude Spawn (`src/lib/claude-bin.ts`)

Add `spawnClaudeStreaming(args, options)` alongside existing `spawnClaude()`:
- Accepts `onStderr?: (line: string) => void` in options
- stderr chunks are line-buffered (split on `\n`, hold partial lines for next chunk)
- stdout remains fully buffered (contains diffs/JSON that need complete parsing)
- Returns `{ exitCode, stdout }` on process exit (no stderr — it was streamed)

### 4. SSE Consumer Utility (`src/lib/claude-stream.ts` — new file)

Browser-side utility with:

**`consumeClaudeStream<T>(url, body, callbacks)`** — Sends POST with `Accept: text/event-stream`, reads the SSE stream, dispatches callbacks:
- `onStderr(line)` — each stderr line from CLI
- `onResult(data: T)` — final parsed result
- `onError({ code, message })` — error event
- `onDone()` — stream ended
- Returns `AbortController` for cancellation

Uses `fetch` + `ReadableStream.getReader()` (not `EventSource`, which only supports GET).

**`formatStderrLine(line)`** — Classifies stderr lines and wraps in ANSI colors:
- Magenta: File reads (`Reading src/...`)
- Cyan: Tool usage (`Tool: Read`)
- Green: Success
- Red: Errors
- Yellow: Warnings
- Gray: Unclassified

### 5. API Routes — SSE Streaming

Both `analyze/route.ts` and `scan/route.ts` get the same pattern:

- Check `Accept: text/event-stream` header
- If present: return `new Response(readableStream)` with SSE events
- If absent: fall back to existing JSON response (backward compatible)

SSE event protocol:
```
event: stderr\ndata: {"line":"Reading src/..."}\n\n
event: result\ndata: {"sessionId":"...","diffs":[...]}\n\n
event: error\ndata: {"code":"TIMEOUT","message":"..."}\n\n
event: done\ndata: {}\n\n
```

Uses `spawnClaudeStreaming()` with `onStderr` piped to SSE events. `done` event always sent last.

### 6. ClaudeIntegrationPanel — Streaming Consumption

Replace `runAnalysis` to use `consumeClaudeStream()`:
- Auto-switch left panel to Terminal tab: `setActiveLeftTab('terminal')`
- Write header line: `"Claude Code: Analyzing..."` in bold blue
- On each stderr line: format and write to terminal
- On result: populate diffs, update status to `complete`, write green success line
- On error: set error state, write red error line
- Store `AbortController` in ref, abort on unmount or "Reset"

Uses `useEditorStore.getState().writeToTerminal` inside callbacks to avoid stale closures.

### 7. ChangesPanel — Streaming AI Scan

Same pattern for `handleAiScan`:
- Auto-switch to Terminal tab
- Write header: `"AI Scan: Analyzing project..."` in bold magenta
- Stream stderr to terminal
- On result: set scan result, show toast
- On error: set error, show toast

### Edge Cases

- **Terminal not mounted**: `writeToTerminal` is `null` — stderr lines are no-ops. The `setActiveLeftTab('terminal')` triggers lazy-load; subsequent lines flow after mount.
- **Stream interrupted**: `AbortController.abort()` on unmount; `onDone` always fires for cleanup.
- **Backward compatibility**: API routes detect `Accept` header — callers without it get existing JSON behavior.
- **PTY coexistence**: Claude lines write alongside shell output. 2-space indent + ANSI colors distinguish them.

## Verification

1. `bun dev` — no build errors
2. Connect to target project, make style changes
3. Click "AI Scan" — verify left panel auto-switches to Terminal tab
4. Verify terminal shows colored progress lines ("Reading src/...", etc.)
5. Verify scan result panel still appears correctly when done
6. Click "Send to Claude Code" — verify terminal shows analysis progress
7. Verify DiffViewer populates with results
8. Test with Terminal tab already open (lines appear alongside shell)
9. Test "Reset" during streaming — verify clean abort
10. Test without terminal server running (lines are silently dropped)

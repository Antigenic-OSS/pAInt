# Auto Background AI Scan

## Context
The AI Scan currently requires a manual button click and blocks the user from seeing results until the scan completes (spawns Claude CLI, which can take minutes). The user wants the scan to run automatically in the background as changes are made, with the prompt auto-updating when the changelog changes.

## Approach
Add a `useAutoAiScan` hook that watches `copyAllText` (the formatted changelog), debounces by 2 seconds, and auto-triggers the scan API. Uses `AbortController` to cancel in-flight requests when the changelog changes. A simple djb2 hash detects changelog changes without storing the full text.

## Files to Change

### 1. `src/lib/utils.ts` — Add `hashString()` utility
- Simple djb2 hash function for detecting changelog changes

### 2. `src/store/claudeSlice.ts` — Add staleness tracking
- Add `aiScanChangelogHash: string | null` and `aiScanIsStale: boolean` to state
- Add `setAiScanChangelogHash` and `setAiScanIsStale` actions
- Update `resetAiScan` and `resetClaude` to clear new fields

### 3. `src/hooks/useAutoAiScan.ts` — NEW: Core auto-scan hook
- Watches `copyAllText`, `projectRoot`, `projectScan` via `useEffect`
- Computes hash of `copyAllText`, compares to last-scanned hash
- On change: marks result stale immediately, aborts in-flight request, starts 2s debounce
- After debounce: fires `POST /api/claude/scan` with AbortController
- On success: updates store, clears stale flag
- On AbortError: silently ignores (changelog changed mid-scan)
- Exposes `forceRescan()` for manual button use (bypasses debounce + hash check)

### 4. `src/components/right-panel/changes/ChangesPanel.tsx` — Wire up hook
- Import and call `useAutoAiScan(copyAllText, projectRoot, projectScan)`
- Replace manual `handleAiScan` callback with `forceRescan` from hook
- Remove `setAiScanStatus`, `setAiScanResult`, `setAiScanError` subscriptions (hook handles those)
- Read `aiScanIsStale` from store
- Pass `isStale` to `AiScanResultPanel` and `BottomActionBar`

### 5. `src/components/right-panel/changes/AiScanResultPanel.tsx` — Show stale state
- Add `isStale` and `onRescan` props
- Show "Outdated" badge next to "AI Scan" badge when stale
- Add refresh button in header when stale
- Show "Changes detected — updating scan..." banner when stale + scanning

### 6. `BottomActionBar` (in ChangesPanel.tsx) — Update button states
- Add `aiScanIsStale` prop
- Show "Re-scan (outdated)" with warning color when stale
- Show "AI Scan (up to date)" when complete and not stale

## Key Design Decisions
- **2s debounce**: Long enough to batch rapid edits (color slider, etc.) but short enough to feel responsive
- **AbortController**: Prevents stale results from overwriting fresh state
- **Hash-based staleness**: Cheap O(n) check, avoids storing 50KB text in state
- **Stale flag set immediately**: User gets instant visual feedback that results are outdated, even before the new scan fires

## Verification
1. Make a style change, wait 2s — scan should auto-trigger
2. Make 5 rapid changes in 1s — only one scan fires after 2s pause
3. While scan runs, make another change — first scan aborts, new one debounces
4. Click manual "AI Scan" button — forces immediate scan
5. View results, make new change — "Outdated" badge appears immediately
6. Clear all changes — scan results cleared via existing `resetAiScan`
7. No `projectRoot` set — no scans fire

# Tasks: Direct Iframe Loading

**Input**: Design documents from `/specs/004-direct-iframe/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/postmessage-api.md

**Tests**: Not requested — manual verification per acceptance scenarios.

**Organization**: Tasks grouped by user story. US4 (cross-origin security) is foundational since US1 and US2 both depend on it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create directory structure for new static assets

- [x] T001 Create `public/` directory at repository root for Next.js static file serving

---

## Phase 2: Foundational — Cross-Origin Messaging (US4)

**Purpose**: Update the postMessage infrastructure to support cross-origin communication between editor and inspector running on different localhost ports. This MUST be complete before US1 or US2 can function.

**⚠️ CRITICAL**: No user story work can be tested until this phase is complete

- [x] T002 [US4] Add `isLocalhostOrigin(origin: string): boolean` helper function in `src/hooks/usePostMessage.ts` — accepts origins where hostname is `localhost` or `127.0.0.1`, rejects all others. Replace the same-origin check `if (event.origin !== window.location.origin) return;` in `handleMessage()` with `if (!isLocalhostOrigin(event.origin)) return;`
- [x] T003 [US4] Update `sendViaIframe()` in `src/hooks/usePostMessage.ts` to derive target origin from the store's `targetUrl` — replace `iframe.contentWindow.postMessage(message, '*')` with `iframe.contentWindow.postMessage(message, origin)` where `origin = new URL(useEditorStore.getState().targetUrl).origin` (fallback to `'*'` if targetUrl is empty)

**Checkpoint**: postMessage handler accepts cross-origin localhost messages; outbound messages target specific origin

---

## Phase 3: User Story 2 — Standalone Inspector Script (Priority: P1) 🎯 MVP

**Goal**: Create the standalone inspector JavaScript file that developers add to their target project. When loaded inside pAInt iframe, it initializes inspection capabilities and communicates with the editor. When loaded directly in a browser, it does nothing.

**Independent Test**: Add script tag to any localhost project, load in pAInt iframe, verify `INSPECTOR_READY` is sent and element selection works.

### Implementation for User Story 2

- [x] T004 [P] [US2] Create `public/dev-editor-inspector.js` — extract the inspector IIFE from `src/app/api/proxy/[[...path]]/route.ts` (the `getInspectorCode()` function, lines 12–652) into a standalone JS file wrapped in an IIFE. Key modifications from the inlined version:
  - Add iframe guard at top: `if (window.parent === window) return;` (research R3)
  - Replace `var parentOrigin = window.location.origin` with `var parentOrigin = new URL(document.currentScript.src).origin` (research R2, contract change)
  - Remove the `/api/proxy` prefix stripping from the `REQUEST_PAGE_LINKS` handler (lines ~543-546 in proxy route) — links in the target page now have real paths (contract: PAGE_LINKS change)
  - Add SPA navigation detection (research R4): `popstate` listener and Navigation API `navigatesuccess` listener that send `{ type: 'PAGE_NAVIGATE', payload: { path: window.location.pathname } }` to the editor
  - Keep ALL existing message handlers intact: `SELECT_ELEMENT`, `PREVIEW_CHANGE`, `REVERT_CHANGE`, `REVERT_ALL`, `SET_SELECTION_MODE`, `SET_BREAKPOINT`, `REQUEST_DOM_TREE`, `REQUEST_PAGE_LINKS`, `REQUEST_CSS_VARIABLES`, `REQUEST_COMPONENTS`, `APPLY_VARIANT`, `REVERT_VARIANT`, `HEARTBEAT`
  - Keep ALL existing functionality: selector path generation, DOM tree serialization, computed style extraction, CSS variable detection, component detection, variant detection, MutationObserver, selection overlay, scroll/resize tracking

**Checkpoint**: Inspector script served at `http://localhost:4000/dev-editor-inspector.js`, inert when not in iframe, sends `INSPECTOR_READY` when loaded in iframe

---

## Phase 4: User Story 1 — Direct Iframe Loading (Priority: P1)

**Goal**: Load the target page directly in the iframe using its actual URL instead of routing through the proxy. All existing editor features (element selection, style editing, DOM tree, change tracking, component detection) work identically.

**Independent Test**: Start editor on port 4000, target app on port 3001 with inspector script installed, enter URL, verify connection and element selection.

### Implementation for User Story 1

- [x] T005 [US1] Update `src/components/PreviewFrame.tsx` — three changes in this file:
  1. Change iframe `src` from proxy URL to direct target URL: replace `const newSrc = \`/api/proxy\${pagePath}?\${PROXY_HEADER}=\${encodeURIComponent(targetUrl)}\`;` with `const newSrc = \`\${targetUrl}\${pagePath === '/' ? '' : pagePath}\`;`
  2. Remove the `sandbox="allow-same-origin allow-scripts allow-forms allow-popups"` attribute from the `<iframe>` element (research R5: cross-origin isolation already provides sandboxing)
  3. Remove the `PROXY_HEADER` import from `@/lib/constants` (no longer needed in this file)

**Checkpoint**: Iframe loads target page directly, connection establishes via inspector, all editing features work end-to-end

---

## Phase 5: User Story 3 — Setup Guidance for Missing Inspector (Priority: P2)

**Goal**: When a developer connects to a target page that doesn't have the inspector script installed, the editor shows clear setup instructions after 5 seconds with a copyable script tag. Instructions auto-dismiss when connection succeeds.

**Independent Test**: Connect to a target page without the inspector script, verify instructions appear after 5s, add the script, verify auto-dismissal.

### Implementation for User Story 3

- [x] T006 [P] [US3] Create `src/components/SetupInstructions.tsx` — a `'use client'` component that:
  - Reads `connectionStatus` and `targetUrl` from `useEditorStore`
  - Uses component-local state: `showInstructions` (boolean) and `copied` (boolean)
  - Starts a 5-second timer when `connectionStatus === 'connecting'`; sets `showInstructions = true` on timeout
  - Resets timer and hides instructions when `connectionStatus` changes to anything other than `'connecting'`
  - Renders (when visible): a compact dark-themed banner with the script tag `<script src="http://localhost:4000/dev-editor-inspector.js"></script>`, a "Copy" button that uses `navigator.clipboard.writeText()` and shows brief "Copied!" feedback, and a brief explanation
  - Uses existing dark mode palette: `var(--bg-secondary)` background, `var(--border)` border, `var(--text-primary)` / `var(--text-secondary)` text, `var(--accent)` for copy button
  - Returns `null` when `showInstructions` is false (renders nothing)
- [x] T007 [US3] Integrate `SetupInstructions` in `src/components/TopBar.tsx` — import and render `<SetupInstructions />` below the existing TopBar content. The component self-manages visibility so TopBar just renders it unconditionally.

**Checkpoint**: Setup instructions appear after 5s timeout, copy button works, instructions auto-dismiss on connection

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verification and cleanup

- [x] T008 Run quickstart.md validation — start editor (`bun dev`), start a target Next.js app, add inspector script tag, connect, verify: connection green, DOM tree, element selection, style editing, change tracking, component detection, SPA page navigation
- [x] T009 Verify inspector script is inert when target page is loaded directly in browser (not in iframe) — no console output, no event listeners, no DOM mutations
- [x] T010 Verify proxy route (`src/app/api/proxy/[[...path]]/route.ts`) is unchanged and still present in codebase (FR-013)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US2 (Phase 3)**: Depends on Phase 1 (public/ directory) — can start after Setup; does NOT need Phase 2 at code level but needs it for testing
- **US1 (Phase 4)**: Depends on Phase 2 (cross-origin messaging) and Phase 3 (inspector script exists)
- **US3 (Phase 5)**: No code dependencies on other stories — can start after Phase 2; independently testable
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **US4 (Foundational)**: Standalone — modifies `usePostMessage.ts` only
- **US2 (Inspector Script)**: Needs `public/` directory; independent of US4 at code level
- **US1 (Direct Iframe)**: Needs US4 (cross-origin messaging) + US2 (inspector script) for end-to-end testing
- **US3 (Setup Instructions)**: Fully independent — different files, reads `connectionStatus` from store

### Within Each User Story

- US4: T002 before T003 (same file, sequential edits)
- US2: Single task (T004)
- US1: Single task (T005)
- US3: T006 before T007 (component must exist before integration)

### Parallel Opportunities

- T002 and T004 can run in parallel (different files: `usePostMessage.ts` vs `public/dev-editor-inspector.js`)
- T004 and T006 can run in parallel (different files: `public/dev-editor-inspector.js` vs `SetupInstructions.tsx`)
- T005 and T006 can run in parallel (different files: `PreviewFrame.tsx` vs `SetupInstructions.tsx`)
- After Phase 2, US2 and US3 can proceed in parallel

---

## Parallel Example: After Foundational Phase

```
# These can all run in parallel (different files):
Task T004: Create inspector script in public/dev-editor-inspector.js
Task T005: Update PreviewFrame.tsx for direct loading
Task T006: Create SetupInstructions.tsx component
```

---

## Implementation Strategy

### MVP First (US2 + US4 + US1)

1. Complete Phase 1: Setup (create public/)
2. Complete Phase 2: Foundational (cross-origin messaging)
3. Complete Phase 3: US2 (inspector script)
4. Complete Phase 4: US1 (direct iframe loading)
5. **STOP and VALIDATE**: Test end-to-end connection, element selection, style editing
6. If working → MVP delivered

### Incremental Delivery

1. Setup + Foundational → Cross-origin messaging ready
2. Add US2 (Inspector Script) → Script servable and functional
3. Add US1 (Direct Iframe) → End-to-end flow works (MVP!)
4. Add US3 (Setup Instructions) → Better onboarding UX
5. Polish → Full verification

### Single Developer (Recommended)

Since this is a focused 10-task feature touching 5 files:

1. T001 → T002 → T003 (setup + foundational, 3 tasks)
2. T004 (inspector script — largest task, ~650 lines)
3. T005 (PreviewFrame — small, focused change)
4. T006 → T007 (setup instructions, 2 tasks)
5. T008 → T009 → T010 (verification)

Estimated: 7 sequential steps, 10 total tasks.

---

## Notes

- T004 is the largest task (~650 lines of JavaScript) — it's an extraction and adaptation of existing code, not net-new logic
- The proxy route is intentionally left unchanged (FR-013) — no deletions
- No new Zustand slices or localStorage keys needed
- All message types in `src/types/messages.ts` remain unchanged
- Constitution violation (Principle II) is justified and documented in plan.md Complexity Tracking

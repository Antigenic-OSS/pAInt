# Tasks: Service Worker Proxy

**Input**: Design documents from `/specs/008-sw-proxy/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not requested in feature specification. No test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add SW readiness state to the Zustand store and create the SW directory structure

- [x] T001 Add `swProxyReady: boolean` and `setSwProxyReady` to UISlice interface and implementation in `src/store/uiSlice.ts`
- [x] T002 Create directory `public/sw-proxy/` and scaffold empty `public/sw-proxy/sw.js` with install, activate, and fetch event listeners (skeleton only — no logic yet)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: SW lifecycle infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Implement SW install event in `public/sw-proxy/sw.js`: fetch `/dev-editor-inspector.js`, cache the text in a module-level variable, call `self.skipWaiting()`
- [x] T004 Implement SW activate event in `public/sw-proxy/sw.js`: call `self.clients.claim()` for immediate scope control
- [x] T005 Implement SW fetch event skeleton in `public/sw-proxy/sw.js`: intercept requests under `/sw-proxy/` scope, extract `__sw_target` query param from navigation requests, store target URL in per-clientId `Map`, pass through non-scoped requests
- [x] T006 Create `src/lib/serviceWorkerRegistration.ts` with `registerSwProxy()` (register SW at `/sw-proxy/sw.js` with scope `/sw-proxy/`, await `navigator.serviceWorker.ready`, set `swProxyReady` in store), `isSwProxyReady()` (synchronous check), and `unregisterSwProxy()` (cleanup)

**Checkpoint**: SW registers, activates, and intercepts fetch events. No HTML transformation yet.

---

## Phase 3: User Story 1 — Full Client-Rendered Preview (Priority: P1) 🎯 MVP

**Goal**: Target pages with client-rendered components (React, Vue, CSS-in-JS) display all visible content in the preview iframe — not just SSR HTML.

**Independent Test**: Connect pAInt to a Next.js app with client components on localhost:3000. Verify all client-rendered components appear and are styled correctly.

### Implementation for User Story 1

- [x] T007 [US1] Implement HTML navigation response handler in `public/sw-proxy/sw.js`: for requests with `mode: 'navigate'`, fetch from target origin using the stored target URL, read response as text for HTML transformation
- [x] T008 [US1] Implement security header stripping in `public/sw-proxy/sw.js`: strip `content-encoding`, `transfer-encoding`, `cross-origin-embedder-policy`, `cross-origin-opener-policy`, `cross-origin-resource-policy`, `content-security-policy`, `content-security-policy-report-only`, `x-frame-options` from HTML responses
- [x] T009 [US1] Implement CSP meta tag stripping in `public/sw-proxy/sw.js`: remove `<meta http-equiv="Content-Security-Policy" ...>` tags from HTML body
- [x] T010 [US1] Implement duplicate inspector script removal in `public/sw-proxy/sw.js`: strip any `<script src="...dev-editor-inspector.js">` tags from HTML to prevent duplicates with the injected inspector
- [x] T011 [US1] Implement navigation blocker injection in `public/sw-proxy/sw.js`: inject script after `<head>` that does `history.replaceState` to strip `/sw-proxy/` prefix from URL path, adapting the existing blocker from `src/app/api/proxy/[[...path]]/route.ts` (lines 1807-2221) with `/sw-proxy/` prefix instead of `/api/proxy/`
- [x] T012 [US1] Implement HMR isolation in the navigation blocker within `public/sw-proxy/sw.js`: WebSocket mock (readyState=1, fire open event), EventSource mock, error/unhandledrejection suppression for HMR noise, Next.js dev overlay hiding
- [x] T013 [US1] Implement Navigation API intercept in the navigation blocker within `public/sw-proxy/sw.js`: intercept `window.navigation.navigate` events to prevent iframe escape, redirect user-initiated navigations through `/sw-proxy/` scope, allow programmatic SPA navigations to resolve
- [x] T014 [US1] Implement fetch/XHR patches in the navigation blocker within `public/sw-proxy/sw.js`: patch `window.fetch` and `XMLHttpRequest.prototype.open` to rewrite relative URLs and target-origin URLs to go through `/sw-proxy/` scope
- [x] T015 [US1] Implement resource URL rewriting in the navigation blocker within `public/sw-proxy/sw.js`: patch `Element.prototype.setAttribute`, `HTMLImageElement.prototype.src`, `HTMLSourceElement.prototype.src`, `HTMLScriptElement.prototype.src` setters, and `FontFace` constructor to rewrite resource URLs through `/sw-proxy/` scope; implement `proxyResUrl()` helper adapted from existing proxy
- [x] T016 [US1] Implement MutationObserver in the navigation blocker within `public/sw-proxy/sw.js`: observe `document.documentElement` for added nodes with src/href/srcset attributes and dynamically-added `<style>` elements, rewrite URLs through `/sw-proxy/` scope
- [x] T017 [US1] Implement inspector script injection in `public/sw-proxy/sw.js`: inject the cached inspector code (fetched at install time) wrapped in `<script>...</script>` before `</body>` in HTML responses
- [x] T018 [US1] Implement subresource request handler in `public/sw-proxy/sw.js`: for non-navigate requests under `/sw-proxy/` scope, look up target origin from clientId mapping, rewrite URL by stripping `/sw-proxy/` prefix and prepending target origin, forward request to target, strip CORS-blocking headers from response
- [x] T019 [US1] Implement CSS url() rewriting in `public/sw-proxy/sw.js`: for `text/css` responses, rewrite `url()` references to go through `/sw-proxy/` scope (same pattern as existing proxy CSS handler)
- [x] T020 [US1] Implement HMR request short-circuiting in `public/sw-proxy/sw.js`: match `.hot-update.*`, `webpack-hmr`, `turbopack-hmr`, `__turbopack_hmr` patterns in the fetch handler and return empty 200/204 responses
- [x] T021 [US1] Implement reload loop detection in the navigation blocker within `public/sw-proxy/sw.js`: use sessionStorage counter to detect and break infinite reload loops (same pattern as existing proxy, max 4 reloads in 3 seconds)

**Checkpoint**: Connecting to a Next.js target via SW proxy shows fully client-rendered content with styles. Inspector not yet integrated in the editor.

---

## Phase 4: User Story 3 — Inspector Compatibility with Live Scripts (Priority: P1)

**Goal**: Element selection, style editing, change tracking, and changelog export work identically whether using SW proxy or fallback proxy.

**Independent Test**: Connect via SW proxy, select an element, change its font size, verify the change appears in the Changes panel, export the changelog.

### Implementation for User Story 3

- [x] T022 [US3] Add `buildSwProxyUrl()` function in `src/components/PreviewFrame.tsx`: build URL format `/sw-proxy/{path}?__sw_target={encoded-target-url}`
- [x] T023 [US3] Update `buildIframeUrl()` in `src/components/PreviewFrame.tsx`: check `isSwProxyReady()` from `src/lib/serviceWorkerRegistration.ts`, prefer SW proxy URL when ready, fall back to `buildProxyUrl()` when not ready
- [x] T024 [US3] Add `registerSwProxy()` call in `src/app/page.tsx`: import from `src/lib/serviceWorkerRegistration.ts`, call in existing `useEffect` after `loadPersistedUI()` and `loadPersistedClaude()`, fire-and-forget (don't await)
- [x] T025 [US3] Verify postMessage communication works with SW proxy: confirm that `usePostMessage.ts` origin validation accepts messages from SW-proxied iframe (same-origin, so `isAllowedOrigin` should pass without changes)

**Checkpoint**: Full editor workflow works — connect, inspect, edit styles, track changes, export changelog — all through the SW proxy.

---

## Phase 5: User Story 2 — Interactive Element Inspection (Priority: P1)

**Goal**: Interactive elements (buttons, dropdowns, modals) work in the preview, enabling inspection of dynamic visual states.

**Independent Test**: Connect to a target with a dropdown menu, click trigger to open, select the dropdown panel, edit its styles.

### Implementation for User Story 2

- [x] T026 [US2] Verify that the inspector's click handler coexists with target page click handlers in `public/sw-proxy/sw.js` navigation blocker: ensure the inspector uses capture phase and `stopPropagation` correctly so element selection and target interactions both work
- [x] T027 [US2] Verify that the inspector's hover overlay does not interfere with target page hover effects: confirm `pointer-events: none` on overlays and that `document.elementFromPoint` returns the correct target element beneath overlays

**Checkpoint**: Interactive target elements (buttons, dropdowns, forms) function in the preview while inspector selection/editing remains fully operational.

---

## Phase 6: User Story 4 — Seamless Fallback to Current Proxy (Priority: P2)

**Goal**: When Service Workers are unavailable, pAInt falls back to the existing reverse proxy without user-visible errors.

**Independent Test**: Open pAInt in incognito (or disable SW in DevTools), connect to target. Verify SSR-only preview loads and inspector works.

### Implementation for User Story 4

- [x] T028 [US4] Add error handling in `registerSwProxy()` in `src/lib/serviceWorkerRegistration.ts`: catch registration failures, log warning to console, ensure `swProxyReady` stays false, never show errors to the user
- [x] T029 [US4] Add SW availability check in `registerSwProxy()` in `src/lib/serviceWorkerRegistration.ts`: guard with `'serviceWorker' in navigator` before attempting registration, return false immediately if not supported
- [x] T030 [US4] Verify fallback path in `buildIframeUrl()` in `src/components/PreviewFrame.tsx`: when `isSwProxyReady()` returns false, confirm `buildProxyUrl()` is called and the existing `/api/proxy/` flow works unchanged

**Checkpoint**: pAInt works identically to before in browsers without SW support.

---

## Phase 7: User Story 5 — Multi-Target Tab Support (Priority: P3)

**Goal**: Multiple pAInt tabs targeting different localhost projects operate independently.

**Independent Test**: Open two pAInt tabs, connect to localhost:3000 and localhost:3001. Verify each loads correct content.

### Implementation for User Story 5

- [x] T031 [US5] Verify per-clientId target URL mapping in `public/sw-proxy/sw.js`: confirm that each iframe gets a unique `event.clientId` and the `Map` correctly associates different targets with different clients
- [x] T032 [US5] Add client cleanup in `public/sw-proxy/sw.js`: listen for client disconnection (or implement TTL-based cleanup) to prevent memory leaks in the target URL map when tabs are closed

**Checkpoint**: Two pAInt tabs with different targets show correct content independently.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T033 Add `next.config.mjs` header for `/sw-proxy/sw.js` to set `Service-Worker-Allowed: /sw-proxy/` if needed for scope registration
- [x] T034 Add console log output during SW registration lifecycle in `src/lib/serviceWorkerRegistration.ts`: log registration, installation, activation, and readiness events at `debug` level for troubleshooting
- [x] T035 Update `quickstart.md` in `specs/008-sw-proxy/quickstart.md` with any implementation details that changed during development

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — core SW proxy logic
- **US3 (Phase 4)**: Depends on US1 — editor integration requires working SW proxy
- **US2 (Phase 5)**: Depends on US3 — interactive inspection requires working editor integration
- **US4 (Phase 6)**: Can start after Foundational — independent of US1/US2/US3
- **US5 (Phase 7)**: Can start after US1 — tests multi-client mapping
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only — core SW proxy implementation
- **US3 (P1)**: Depends on US1 — needs working SW proxy to integrate with editor
- **US2 (P1)**: Depends on US3 — needs editor integration to verify interaction + inspection coexistence
- **US4 (P2)**: Depends on Foundational only — tests fallback path, independent of SW implementation
- **US5 (P3)**: Depends on US1 — tests multi-client mapping in SW

### Within Each User Story

- SW fetch handler logic before navigation blocker injection
- Navigation blocker before subresource proxying
- Core implementation before editor integration
- Story complete before moving to next priority

### Parallel Opportunities

- T001 and T002 can run in parallel (different files)
- T003, T004, T005 are sequential (same file, build on each other)
- T028, T029 can run in parallel with US1 work (different files)
- T031, T032 can start after T005 (extend SW map logic)

---

## Parallel Example: Phase 3 (User Story 1)

```bash
# These can run in parallel (different logical sections of sw.js, but same file):
# In practice, execute sequentially since all modify public/sw-proxy/sw.js

# First batch: HTML transformation
Task T007: "Navigation response handler in public/sw-proxy/sw.js"
Task T008: "Security header stripping in public/sw-proxy/sw.js"
Task T009: "CSP meta tag stripping in public/sw-proxy/sw.js"
Task T010: "Duplicate inspector removal in public/sw-proxy/sw.js"

# Second batch: Navigation blocker (depends on T007)
Task T011: "Navigation blocker injection in public/sw-proxy/sw.js"
Task T012: "HMR isolation mocks in public/sw-proxy/sw.js"
Task T013: "Navigation API intercept in public/sw-proxy/sw.js"
Task T014: "fetch/XHR patches in public/sw-proxy/sw.js"
Task T015: "Resource URL rewriting in public/sw-proxy/sw.js"
Task T016: "MutationObserver in public/sw-proxy/sw.js"

# Third batch: Inspector + subresources (depends on T011)
Task T017: "Inspector injection in public/sw-proxy/sw.js"
Task T018: "Subresource handler in public/sw-proxy/sw.js"
Task T019: "CSS url() rewriting in public/sw-proxy/sw.js"
Task T020: "HMR short-circuiting in public/sw-proxy/sw.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T006)
3. Complete Phase 3: User Story 1 (T007-T021)
4. **STOP and VALIDATE**: Load a Next.js target through SW proxy — verify client components render
5. If working, proceed to Phase 4 (editor integration)

### Incremental Delivery

1. Setup + Foundational → SW infrastructure ready
2. US1 (Phase 3) → Client-rendered pages visible in iframe (MVP!)
3. US3 (Phase 4) → Full editor workflow works through SW proxy
4. US2 (Phase 5) → Interactive elements verified with inspector
5. US4 (Phase 6) → Fallback path verified
6. US5 (Phase 7) → Multi-tab verified
7. Polish (Phase 8) → Documentation and logging

---

## Notes

- All SW logic lives in a single file (`public/sw-proxy/sw.js`) — tasks are sequential within phases
- The navigation blocker is the most complex piece — adapted from ~400 lines of existing code in `src/app/api/proxy/[[...path]]/route.ts` (lines 1807-2221)
- Inspector code is NOT duplicated — fetched from `/dev-editor-inspector.js` at SW install time
- Existing proxy route is UNCHANGED — serves as automatic fallback
- Commit after each task or logical group per constitution

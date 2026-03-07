# Feature Specification: Service Worker Proxy

**Feature Branch**: `008-sw-proxy`
**Created**: 2026-03-07
**Status**: Draft
**Input**: User description: "Replace script-stripping iframe proxy with a Service Worker-based proxy that preserves target page scripts, enabling full client-rendered content, CSS-in-JS styles, and interactive elements in the visual editor preview."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Full Client-Rendered Preview (Priority: P1)

As a developer using pAInt to edit a React/Next.js project, I want to see all client-rendered components in the preview iframe — not just the server-rendered HTML shell — so I can inspect and edit the actual visual output users will see.

**Why this priority**: This is the core problem. Without client-side JavaScript running, most modern web apps show incomplete or empty content. This story delivers the fundamental value of the Service Worker approach.

**Independent Test**: Connect pAInt to a Next.js app with client components (e.g., a counter button, a dynamically-rendered list). Verify all components render visually and are selectable in the editor.

**Acceptance Scenarios**:

1. **Given** a Next.js target app with React client components on localhost:3000, **When** the user connects pAInt and the Service Worker is active, **Then** all client-rendered components appear in the preview iframe (not just SSR HTML).
2. **Given** a target app using CSS-in-JS (styled-components, Tailwind runtime, etc.), **When** the page loads through the SW proxy, **Then** all JS-injected styles are applied and elements appear correctly styled.
3. **Given** a target app with lazy-loaded content or dynamic class additions, **When** the page loads through the SW proxy, **Then** lazy content loads and dynamic classes are applied as they would in a normal browser.

---

### User Story 2 - Interactive Element Inspection (Priority: P1)

As a developer, I want interactive elements (buttons, dropdowns, modals, tabs) to be functional in the preview so that I can inspect their various visual states and edit styles for each state.

**Why this priority**: Interactivity is the second half of the core problem. Without event handlers, developers cannot see hover states, open states, or click-triggered UI — making style editing incomplete.

**Independent Test**: Connect to a target app with a dropdown menu. Click the dropdown trigger and verify it opens. Select the dropdown panel while open and edit its styles.

**Acceptance Scenarios**:

1. **Given** a target page with click handlers (buttons, toggles), **When** the user clicks these elements in the preview, **Then** the handlers fire and the UI updates accordingly.
2. **Given** a target page with hover-triggered elements (tooltips, dropdown menus), **When** the user hovers over trigger elements, **Then** the hover effects and revealed content appear.
3. **Given** a target page with form validation, **When** the user interacts with form fields, **Then** validation feedback appears as expected.

---

### User Story 3 - Inspector Compatibility with Live Scripts (Priority: P1)

As a developer, I want element selection, style editing, change tracking, and changelog export to work the same way whether the page is loaded via the SW proxy or the old proxy, so my editing workflow is unaffected.

**Why this priority**: The inspector is the core editing tool. If it breaks when scripts are running, the SW proxy defeats its own purpose.

**Independent Test**: Connect to a target app via SW proxy. Select an element, change its font size, verify the change appears in the Changes panel, and export the changelog.

**Acceptance Scenarios**:

1. **Given** a page loaded via SW proxy with scripts running, **When** the user hovers over elements, **Then** the green hover highlight appears and the element label is shown.
2. **Given** a page loaded via SW proxy, **When** the user clicks an element, **Then** it is selected with the blue outline and its computed styles appear in the Design panel.
3. **Given** a style change made via the Design panel, **When** the change is applied, **Then** the preview updates live and the change is recorded in the Changes panel with correct original and new values.
4. **Given** multiple style changes tracked, **When** the user exports the changelog, **Then** the exported changelog contains all changes with correct selectors and values.

---

### User Story 4 - Seamless Fallback to Current Proxy (Priority: P2)

As a developer using a browser that does not support Service Workers (or when the SW fails to activate), I want pAInt to automatically fall back to the existing reverse proxy so my workflow is not broken.

**Why this priority**: Ensures backward compatibility. The SW is an enhancement, not a requirement. No existing user should lose functionality.

**Independent Test**: Open pAInt in an incognito window with SW disabled. Connect to a target app. Verify the existing proxy behavior works (SSR HTML visible, inspector functional).

**Acceptance Scenarios**:

1. **Given** a browser without Service Worker support, **When** the user connects to a target, **Then** pAInt uses the existing reverse proxy and the preview loads as before.
2. **Given** the Service Worker fails to register or activate, **When** the user connects to a target, **Then** pAInt silently falls back to the reverse proxy without errors shown to the user.
3. **Given** the SW was previously active but becomes unavailable, **When** the user reconnects, **Then** pAInt detects the absence and falls back gracefully.

---

### User Story 5 - Multi-Target Tab Support (Priority: P3)

As a developer with multiple pAInt tabs open targeting different localhost projects, I want each tab to independently proxy to its own target without interference.

**Why this priority**: Power user scenario. Important for correctness but not blocking for initial release.

**Independent Test**: Open two pAInt tabs, connect one to localhost:3000 and another to localhost:3001. Verify each loads the correct target content.

**Acceptance Scenarios**:

1. **Given** two pAInt tabs connected to different targets, **When** both are active simultaneously, **Then** each iframe loads content from its respective target without cross-contamination.

---

### Edge Cases

- What happens when the target server is down? The SW should return an error response, and pAInt should show disconnected status.
- What happens when the target page tries to navigate away (e.g., `window.location.href = '/login'`)? The navigation blocker intercepts and keeps the page within the SW scope.
- What happens when the target page uses WebSocket connections for app-level features (not HMR)? These pass through directly to the target since Service Workers cannot intercept WebSocket connections.
- What happens when the user switches targets in the same tab? The SW receives a new target URL via the next iframe load's query parameter and updates its per-client mapping.
- What happens on the very first page load before the SW is activated? pAInt waits for SW activation before loading the iframe. If activation fails within a reasonable timeout, it falls back to the existing proxy.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST register a Service Worker on the editor origin that intercepts all network requests from the preview iframe.
- **FR-002**: System MUST proxy intercepted requests to the target localhost server transparently, preserving request headers, methods, and bodies.
- **FR-003**: System MUST inject the inspector script and navigation blocker into HTML responses without removing existing `<script>` tags.
- **FR-004**: System MUST strip security headers (Content-Security-Policy, X-Frame-Options, Cross-Origin-Embedder-Policy, Cross-Origin-Resource-Policy) from proxied responses to allow iframe embedding.
- **FR-005**: System MUST intercept and neutralize HMR-related requests (hot-update, webpack-hmr, turbopack-hmr) to prevent reload loops.
- **FR-006**: System MUST track the target URL per iframe client to support multiple simultaneous targets.
- **FR-007**: System MUST fall back to the existing reverse proxy when Service Workers are unavailable or fail to activate.
- **FR-008**: System MUST ensure the navigation blocker corrects the URL path via history state manipulation so client-side routers see the expected path structure.
- **FR-009**: System MUST strip Content-Security-Policy meta tags from proxied HTML to prevent blocking of injected scripts.
- **FR-010**: System MUST rewrite resource URLs (images, fonts, CSS, JS) in the navigation blocker to route through the SW scope.

### Key Entities

- **Service Worker**: A browser-level network interceptor registered on the editor origin, scoped to the SW proxy path, that transparently proxies requests to the target server.
- **Target URL Mapping**: A per-client association between an iframe instance and its target localhost URL, stored in the SW's runtime memory.
- **Navigation Blocker**: An injected script that patches browser navigation APIs, mocks HMR connections, and rewrites resource URLs to maintain iframe containment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Target pages with client-rendered components display all visible content within 5 seconds of connection — matching what a user sees loading the same page directly in a browser tab.
- **SC-002**: All existing inspector features (element selection, style editing, change tracking, changelog export) work identically with the SW proxy as with the current proxy, with zero regressions.
- **SC-003**: Users connecting from browsers without Service Worker support experience no disruption — the existing proxy behavior continues to work as before.
- **SC-004**: Pages with interactive elements (buttons, dropdowns, forms) respond to user interaction in the preview iframe, enabling inspection of dynamic visual states.
- **SC-005**: Multiple pAInt tabs targeting different localhost projects operate independently without cross-contamination of content or styles.

## Assumptions

- Target projects run on localhost and are reachable from the editor's browser context (same machine).
- The navigation blocker's URL correction executes before client-side framework hydration begins (since it is injected at the top of the document head).
- WebSocket and EventSource connections from the target page's application logic (not HMR) are acceptable to pass through directly without interception, as Service Workers cannot intercept these protocols.
- The existing inspector and navigation blocker logic are stable and can be reused in the SW context with minimal adaptation.

## Dependencies

- Browser Service Worker support (available in all modern browsers).
- Existing reverse proxy route for fallback behavior.
- Existing inspector and navigation blocker code from the proxy route.

## Out of Scope

- Cookie relay for authentication-dependent target pages (may be addressed in a follow-up).
- Intercepting target-page WebSocket connections (Service Worker limitation; only HMR WebSockets are mocked).
- Supporting non-localhost targets (existing security constraint).
- Replacing the bridge server for remote deployment scenarios (bridge continues to work independently).

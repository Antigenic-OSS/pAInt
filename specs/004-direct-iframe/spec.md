# Feature Specification: Direct Iframe Loading

**Feature Branch**: `004-direct-iframe`
**Created**: 2026-02-15
**Status**: Draft
**Input**: User description: "Direct iframe loading — eliminate proxy, load target page directly in iframe with standalone inspector script"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect to Target Page via Direct Iframe (Priority: P1)

A developer opens the Dev Editor, enters their localhost URL (e.g., `http://localhost:3001`), and clicks Connect. The target page loads directly in the iframe without any proxy intermediary. The inspector script (already added to the target project) establishes communication with the editor. The developer sees the connection status turn green, the DOM tree populates in the left panel, and they can select elements, edit styles, and track changes — all working identically to the previous proxy-based approach.

**Why this priority**: This is the core functionality. Without direct iframe loading working end-to-end, no other stories deliver value.

**Independent Test**: Can be fully tested by starting the editor, adding the inspector script to a target project, entering the target URL, and verifying element selection and style editing work.

**Acceptance Scenarios**:

1. **Given** the editor is running on port 4000 and a target app on port 3001 has the inspector script installed, **When** the user enters `http://localhost:3001` and clicks Connect, **Then** the iframe loads the target page directly (not via `/api/proxy/`), the connection status turns green, and the DOM tree appears in the left panel.
2. **Given** a connected session via direct iframe, **When** the user selects an element and modifies a CSS property, **Then** the change previews live in the iframe and is recorded in the changelog — identical behavior to the proxy-based flow.
3. **Given** a connected session via direct iframe, **When** the user navigates to a different page within the target app (via SPA navigation or link click), **Then** the editor detects the navigation and updates the page context accordingly.

---

### User Story 2 - Standalone Inspector Script Installation (Priority: P1)

A developer wants to use the Dev Editor with their project. They add a single `<script>` tag to their project's HTML layout pointing to the editor's hosted inspector file. The script automatically detects it's running inside an iframe, establishes cross-origin communication with the editor, and enables all inspection features. If the page is not loaded in an iframe, the script does nothing (no performance impact in production).

**Why this priority**: The inspector script is the prerequisite for direct iframe communication — without it, the editor cannot interact with the target page.

**Independent Test**: Can be tested by adding the script tag to any localhost project, loading it in the Dev Editor iframe, and verifying inspector messages are sent.

**Acceptance Scenarios**:

1. **Given** a target project with `<script src="http://localhost:4000/dev-editor-inspector.js"></script>` in its HTML, **When** the page is loaded inside the Dev Editor iframe, **Then** the inspector initializes, sends `INSPECTOR_READY` to the editor, and responds to all editor messages (element selection, style changes, DOM traversal).
2. **Given** a target project with the inspector script installed, **When** the page is loaded directly in a browser (not in an iframe), **Then** the script does nothing — no event listeners registered, no console output, no performance impact.
3. **Given** the editor is running on port 4000, **When** a developer visits `http://localhost:4000/dev-editor-inspector.js` in their browser, **Then** the file is served correctly with appropriate JavaScript content type.

---

### User Story 3 - Setup Guidance for Missing Inspector (Priority: P2)

A developer enters a target URL and clicks Connect, but the target project does not have the inspector script installed. After a brief waiting period, the editor displays clear setup instructions showing exactly what script tag to add and where. Once the developer adds the script and reloads their target page, the instructions automatically dismiss and the connection establishes.

**Why this priority**: Without guided setup, developers would see a perpetual "connecting" state with no way to troubleshoot. This is essential for usability but secondary to core functionality.

**Independent Test**: Can be tested by connecting to a target page without the inspector script and verifying instructions appear, then adding the script and verifying auto-dismissal.

**Acceptance Scenarios**:

1. **Given** the editor is connecting to a target page that does not have the inspector script, **When** the connection remains in "connecting" state for 5 seconds, **Then** setup instructions appear showing the exact `<script>` tag to add with a copy button.
2. **Given** setup instructions are visible, **When** the user clicks the copy button, **Then** the complete script tag is copied to the clipboard.
3. **Given** setup instructions are visible, **When** the target page is reloaded with the inspector script now installed, **Then** the instructions automatically dismiss and the connection status turns green.

---

### User Story 4 - Cross-Origin Communication Security (Priority: P2)

The editor and inspector communicate via `postMessage` across different localhost origins (e.g., editor on port 4000, target on port 3001). The system validates that messages only come from and go to localhost origins, preventing potential message injection from non-local sources.

**Why this priority**: Security is important but the attack surface is limited to localhost-only environments. Needed for robustness but not for basic functionality.

**Independent Test**: Can be tested by verifying that messages from non-localhost origins are rejected and that outbound messages target the correct origin.

**Acceptance Scenarios**:

1. **Given** a connected session, **When** a `postMessage` is received from a localhost origin (any port), **Then** the editor processes the message normally.
2. **Given** a connected session, **When** a `postMessage` is received from a non-localhost origin, **Then** the editor ignores the message.
3. **Given** a connected session, **When** the editor sends a message to the inspector, **Then** the message targets the specific origin of the target URL (not wildcard `*`).

---

### Edge Cases

- What happens when the user enters a URL that is not running (server not started)? The iframe shows a browser error page; editor stays in "connecting" state and shows setup instructions after timeout.
- What happens when the inspector script is loaded but the editor is not running? The script detects `window.parent === window` (not in iframe) and does nothing.
- What happens when the target page navigates to an external URL? The inspector detects non-localhost navigation and notifies the editor, which can warn the user.
- What happens when the target app's port changes? The user updates the URL in the editor and reconnects; the inspector script URL remains the same (always points to the editor's port).
- What happens when multiple Dev Editor instances try to inspect the same target? Each editor instance gets its own iframe with its own inspector context; messages are scoped to each iframe's parent window.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST load target pages directly in the iframe using the target's actual URL (no proxy rewriting).
- **FR-002**: System MUST serve a standalone inspector JavaScript file from the editor's public directory, accessible at the editor's origin.
- **FR-003**: The inspector script MUST auto-detect the editor's origin from its own script source URL (e.g., `document.currentScript.src`).
- **FR-004**: The inspector script MUST be inert when not loaded inside an iframe (iframe guard: `window.parent === window`).
- **FR-005**: System MUST accept cross-origin `postMessage` from any localhost/127.0.0.1 origin.
- **FR-006**: System MUST send `postMessage` to the inspector using the target URL's specific origin (not wildcard).
- **FR-007**: System MUST reject `postMessage` from non-localhost origins.
- **FR-008**: System MUST display setup instructions when the inspector does not respond within 5 seconds of connecting.
- **FR-009**: Setup instructions MUST include a copyable script tag with the correct editor origin URL.
- **FR-010**: Setup instructions MUST auto-dismiss when the inspector establishes connection (`INSPECTOR_READY` received).
- **FR-011**: The inspector script MUST detect SPA navigation (popstate, navigatesuccess) and notify the editor via `PAGE_NAVIGATE` message.
- **FR-012**: All existing editor features (element selection, style editing, DOM tree, change tracking) MUST work identically through the direct iframe as they did through the proxy.
- **FR-013**: The existing proxy route MUST remain in the codebase as an unused fallback (no deletions).

### Key Entities

- **Inspector Script**: A standalone JavaScript file served by the editor that, when added to a target project, enables cross-origin inspection communication. Key attributes: editor origin (auto-detected), iframe guard, message handlers for all editor commands.
- **Connection Status**: Represents the state of communication between editor and inspector. States: disconnected, connecting, connected. Transitions based on `INSPECTOR_READY` message receipt.
- **Setup Instructions**: A transient UI element that guides developers through inspector installation. Appears on connection timeout, dismisses on successful connection.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can connect the editor to a target page and begin editing within 10 seconds of clicking Connect (assuming inspector is installed).
- **SC-002**: All existing visual editing features (element selection, style modification, change tracking, DOM tree navigation) work without regression through the direct iframe approach.
- **SC-003**: The inspector script adds zero overhead to target pages when not loaded in an iframe (no event listeners, no DOM mutations, no network requests).
- **SC-004**: Developers who encounter the setup instructions can successfully install the inspector script and establish a connection within 2 minutes on first use.
- **SC-005**: Cross-origin message validation rejects 100% of messages from non-localhost origins.
- **SC-006**: SPA navigation within the target page is detected and reflected in the editor within 1 second.

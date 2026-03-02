# pAInt - User Flows & Scenarios

## Flow 1: First-Time Setup & Connect to Target

**Actor:** Developer with a running localhost project

1. Developer runs `bun dev` to start the pAInt app (e.g., on `http://localhost:4000`)
2. Developer opens the pAInt in their browser
3. The editor loads in **dark mode** with a three-column layout: left panel (empty), center (empty placeholder: "Enter a localhost URL to get started"), right panel (empty)
4. The **target URL input** in the top bar is focused and ready for input
5. Developer types their project URL: `http://localhost:3000`
6. Developer presses Enter or clicks the **Connect** button
7. The connection status dot turns **orange** (connecting...)
8. The reverse proxy loads the target page inside the center iframe preview
9. The proxy injects the inspector script into the page
10. The inspector sends `INSPECTOR_READY` via postMessage to the editor
11. The connection status dot turns **green** (connected)
12. The **left panel** populates with the full DOM tree (Webflow Navigator style)
13. The **right panel** shows the Design tab in an empty state: "Select an element to inspect"
14. The URL is saved to **recent URLs** in `localStorage`

**Success:** Editor is open in dark mode, connected to the target via the URL input, left panel shows the DOM tree, center shows the live preview, right panel is ready for property editing.

**Error Scenario:**
- If the target URL is unreachable, the connection dot turns **red** and a message appears below the input: "Cannot connect — check that your dev server is running on port 3000."
- If the user enters a non-localhost URL (e.g., `https://google.com`), validation prevents connection: "Only localhost URLs are supported."
- If the inspector script fails to inject, the dot stays orange and a "Retry" button appears.

---

## Flow 1b: Switch Target Project (URL Change)

**Actor:** Developer wants to switch to a different localhost project

1. Developer clicks the target URL input in the top bar (or the dropdown arrow)
2. A **recent URLs dropdown** appears showing previously connected URLs:
   ```
   http://localhost:3000  (last used)
   http://localhost:5173
   http://localhost:8080
   ```
3. Developer selects `http://localhost:5173` from the dropdown (or types a new URL)
4. The editor disconnects from the current target (dot turns orange)
5. All pending changes from the previous project remain in `localStorage` (keyed by URL)
6. The center iframe reloads with the new proxied target
7. The left panel refreshes with the new page's DOM tree
8. The right panel resets to the empty state
9. The dot turns green when the new target is connected

**Success:** Developer can seamlessly switch between multiple localhost projects using the URL input.

---

## Flow 2: Inspect & Select an Element

**Actor:** Developer wants to examine a specific element on the page

### 2a: Select via Preview (hover + click)

1. Developer hovers over elements in the center iframe preview
2. A blue overlay highlight follows the cursor, outlining the hovered element
3. Developer clicks on the desired element (e.g., a hero heading)
4. The overlay changes to a persistent selection highlight (different color/style)
5. The **left panel** scrolls to and highlights the corresponding tree node
6. The **right panel** Design tab populates with all computed styles for the selected element
7. A breadcrumb trail appears at the top of the right panel Design tab (e.g., `body > main > section.hero > h1`)

### 2b: Select via Left Panel (tree click)

1. Developer expands tree nodes in the **left panel** to find the target element
2. Developer clicks a node in the tree (e.g., `<p class="subtitle">`)
3. The corresponding element in the center iframe receives a selection highlight
4. The iframe scrolls to bring the element into view if needed
5. The **right panel** Design tab populates with the element's properties

### 2c: Deselect

1. Developer presses `Escape`
2. The selection highlight is removed from the iframe preview
3. The left panel clears its active highlight
4. The right panel Design tab shows an empty state: "Select an element to inspect"

**Success:** Element is selected, highlighted in center preview, highlighted in left panel tree, and properties are visible in right panel.

---

## Flow 3: Edit a Style Property

**Actor:** Developer wants to visually tweak a style

### 3a: Edit a numeric value (e.g., font-size)

1. Developer selects an element (Flow 2)
2. In the **right panel** Design tab, developer opens the Typography section
3. The font-size field shows the current computed value (e.g., `24px`)
4. Developer clicks the input and types `32`
5. A `PREVIEW_CHANGE` message is sent to the inspector via postMessage
6. The inspector applies `element.style.setProperty('font-size', '32px', 'important')`
7. The page updates instantly in the center iframe — the text grows larger
8. The right panel Changes tab badge increments (e.g., shows `(1)`)

### 3b: Edit a color value

1. Developer selects an element
2. In the **right panel** Design tab, developer opens the Color section
3. Developer clicks the background color swatch
4. An inline color picker opens (dark-themed to match the panel)
5. Developer picks a new color (e.g., `#1a1a2e`)
6. The center iframe preview background updates in real time as the developer drags the picker
7. On releasing/confirming, the change is recorded

### 3c: Edit spacing (box model)

1. Developer selects an element
2. In the **right panel** Design tab, developer opens the Spacing section
3. A visual box model diagram (dark-themed) displays current margin and padding values
4. Developer clicks on the top padding value and changes it from `16` to `24`
5. The element's padding updates instantly in the center iframe
6. Developer clicks the left padding and changes it to `32`
7. Both changes are tracked separately in the right panel Changes tab

### 3d: Edit layout (display/flex)

1. Developer selects a container element
2. In the **right panel** Design tab, developer opens the Layout section
3. Developer changes display from `block` to `flex`
4. Flex-specific controls appear (direction, justify, align, gap)
5. Developer sets `justify-content: center` and `gap: 16px`
6. Children of the container reflow immediately in the center iframe
7. All three changes are tracked

**Success:** Style changes are previewed live in the center iframe and tracked in the right panel Changes tab.

---

## Flow 4: Undo a Change

**Actor:** Developer made a change they want to revert

### 4a: Undo a single property

1. Developer switches to the **right panel** Changes tab
2. Changes are grouped by element (e.g., `section.hero > h1` with 3 changes)
3. Developer clicks the undo icon next to `font-size: 24px -> 32px`
4. A `REVERT_CHANGE` message is sent to the inspector via postMessage
5. The inspector removes the inline style override for `font-size`
6. The element returns to its original font-size in the center iframe
7. The change is removed from the list; badge count decrements

### 4b: Clear all changes

1. Developer clicks "Clear All" in the right panel Changes tab
2. A confirmation dialog appears (dark-themed): "Revert all changes? This cannot be undone."
3. Developer confirms
4. All inline style overrides are removed from the iframe page
5. The Changes tab shows an empty state
6. The badge count resets to 0

**Success:** Changes are reverted in the center iframe and removed from the right panel tracking.

---

## Flow 5: Export Changelog for Claude Code

**Actor:** Developer is satisfied with visual changes and wants to apply them to source code

1. Developer clicks the "APPLY" button in the top bar
2. The **right panel** switches to the Changes tab
3. Developer reviews the list of all changes grouped by element:
   ```
   section.hero > h1
     font-size: 24px -> 32px
     font-weight: 400 -> 700

   section.hero > p.subtitle
     color: rgb(102,102,102) -> rgb(51,51,51)
   ```
4. Developer clicks "Copy Changelog"
5. The formatted changelog is copied to the clipboard:
   ```
   === DEV EDITOR CHANGELOG ===
   Project: http://localhost:3000
   Page: /homepage
   Generated: 2026-02-14T10:30:00Z
   Breakpoint: Desktop (1280px)

   --- Changes ---
   Element: section.hero > h1
     font-size: 24px -> 32px
     font-weight: 400 -> 700

   Element: section.hero > p.subtitle
     color: rgb(102, 102, 102) -> rgb(51, 51, 51)

   --- Summary ---
   2 elements modified, 3 properties changed

   --- Instructions ---
   Please apply the above CSS changes to the corresponding
   elements in the project source files. Convert values to
   Tailwind classes where appropriate.
   ```
6. Developer opens their terminal and pastes the changelog into Claude Code
7. Claude Code reads the changelog and applies changes to the actual source files
8. Developer refreshes the iframe preview to verify the source changes match

**Success:** Visual tweaks are translated into source code changes via Claude Code.

---

## Flow 6: Responsive Design Testing

**Actor:** Developer wants to test and tweak styles across breakpoints

1. Developer clicks the **Mobile (375px)** tab in the top bar breakpoint tabs
2. The center iframe container resizes to `max-width: 375px` (centered in the preview area)
3. The page reflows to a mobile layout inside the iframe
4. Developer inspects elements — left panel tree and right panel Design tab update accordingly
5. Developer edits spacing and font sizes in the right panel
6. Changes are tracked with the breakpoint context (Mobile 375px)
7. Developer clicks **Tablet (768px)** in the top bar
8. The iframe resizes to tablet width
9. Developer makes additional tweaks
10. Developer clicks **Desktop (1280px)** to return to full width
11. Developer exports the changelog — each change includes its breakpoint

**Success:** Developer has made and tracked responsive adjustments across multiple breakpoints using the top bar tabs.

---

## Flow 7: Multi-Page Editing Session

**Actor:** Developer wants to edit styles across multiple pages

1. Developer is viewing the homepage (`/`) in the center iframe
2. The PageSelector dropdown in the top bar scans the iframe page and lists available links
3. Developer selects `/about` from the dropdown
4. The center iframe navigates to the proxied `/about` page
5. The inspector re-injects and sends `INSPECTOR_READY`
6. The **left panel** refreshes with the new page's DOM tree
7. Developer makes style changes using the right panel
8. Developer switches back to `/` via the dropdown
9. Previous changes from the homepage are still persisted in `localStorage`
10. Developer exports the full changelog — changes from both pages are included

**Success:** Changes across multiple pages are tracked and exported in a single changelog.

---

## Flow 8: Live DOM Mutation Handling

**Actor:** Developer's app updates the DOM dynamically (e.g., React state change)

1. Developer has the editor open and an element selected in the center iframe
2. The app performs a client-side navigation or state update
3. New elements are added to the DOM / existing elements are removed
4. The MutationObserver in the inspector detects the changes
5. A `DOM_UPDATED` message is sent to the editor via postMessage
6. The **left panel** updates its tree to reflect the new DOM structure
7. If the previously selected element still exists, it remains selected (highlighted in both left panel and right panel)
8. If the selected element was removed, the selection clears and the right panel shows: "Selected element was removed from the page"

**Success:** The editor stays in sync with dynamic DOM changes across all three panels.

---

## Flow 9: Disconnection & Recovery

**Actor:** Developer's target dev server restarts or the iframe loses connection

### 9a: Target server restart

1. Developer's Next.js/Vite dev server restarts (e.g., after config change)
2. The center iframe shows a connection error briefly
3. The editor detects the inspector disconnect (no heartbeat response)
4. The connection status dot next to the **target URL input** turns **red**
5. Top bar shows "Disconnected — retrying..." next to the URL
6. Left and right panels show empty states
7. Previously tracked changes remain in localStorage
8. The dev server comes back up
9. The editor auto-retries the connection (or developer clicks "Reconnect" next to the URL input)
10. Dot turns green, inspector re-injects, left panel tree refreshes

### 9b: Page refresh in iframe

1. Developer triggers a page refresh (via the app's HMR or manual reload)
2. The inspector is destroyed and re-injected when the proxy serves the page again
3. The editor receives a new `INSPECTOR_READY` message
4. The left panel DOM tree refreshes
5. Persisted changes from `localStorage` are still available in the right panel Changes tab
6. Live preview overrides are lost (page is fresh) but can be re-applied from tracked changes

**Success:** The editor recovers gracefully and persisted data is not lost.

---

## Flow 10: Drag & Drop Repositioning

**Actor:** Developer wants to reposition elements visually on the page

### 10a: Free Position Mode (drag to move)

1. Developer clicks the Drag toggle in the top bar and selects "Free Position"
2. The top bar shows the active drag mode indicator
3. Developer hovers over an element in the center iframe — the normal blue highlight appears
4. Developer clicks an element to select it (same as before)
5. Developer presses and holds the mouse button on the selected element
6. A semi-transparent ghost of the element appears under the cursor
7. Guide lines appear showing alignment with parent edges and sibling centers
8. Developer drags the element to a new position
9. The inspector applies `position: relative`, `top`, and `left` via inline styles
10. The element snaps to guide lines when within 5px of an alignment point
11. Developer releases the mouse button — the element stays at the new position
12. The **right panel** Design tab's Position section updates to show the new X/Y coordinates
13. The right panel Changes tab records this as a grouped position change:
    ```
    section.hero > h1
      position: static -> relative
      top: 0px -> 24px
      left: 0px -> -12px
    ```
14. The badge count on the Changes tab increments

### 10b: Sibling Reorder Mode (drag to reorder)

1. Developer clicks the Drag toggle in the top bar and selects "Reorder"
2. Developer clicks a child element within a flex/grid container (e.g., a card in a card grid)
3. Developer presses and holds the mouse button on the selected element
4. The element becomes semi-transparent in its original position
5. A horizontal or vertical drop indicator line appears between siblings
6. As the developer drags, the indicator moves to show the insertion point
7. Developer releases the mouse button at the desired position
8. The inspector moves the DOM node via `parent.insertBefore(targetNode, referenceNode)`
9. The layout reflows — the element is now in its new position among siblings
10. The right panel Changes tab records this as a structural reorder change:
    ```
    Reorder: section.hero > .card-grid
      Moved child .card:nth-child(3) from index 2 to index 0
    ```
11. The **left panel** tree updates to reflect the new DOM order

### 10c: Turn off drag mode

1. Developer clicks the Drag toggle in the top bar and selects "Off"
2. Normal click-to-select behavior resumes
3. All position/reorder changes remain tracked in the right panel Changes tab
4. The changelog export includes position and reorder entries in their respective sections

**Success:** Elements are repositioned visually and changes are tracked for export.

**Edge Cases:**
- `<body>`, `<html>`, and fixed/sticky elements cannot be dragged — a tooltip explains why
- If the selected element is removed from the DOM during drag, the drag cancels gracefully
- Hover highlighting is suppressed during active drag to reduce visual noise
- `requestAnimationFrame` throttling ensures smooth 60fps drag performance

---

## Flow 11: Claude Code API Analysis

**Actor:** Developer wants Claude Code to analyze their visual changes and generate ready-to-apply code

### 11a: First-time setup

1. Developer clicks "Send to Claude Code" in the right panel Changes tab for the first time
2. A setup flow appears in the right panel with two steps:
   a. **Verify CLI** - The app checks if `claude` CLI is available on the server via `/api/claude/status`. If not, shows installation link.
   b. **Set project root** - Developer sets the filesystem path for their project (e.g., `/Users/jehcyadorna/My React Project/jezz-work`)
3. Developer completes the steps and settings save to `localStorage`
4. A green connection dot appears in the top bar

### 11b: Analyze changelog (read-only)

1. Developer has made several visual changes (styles, positions, reorders)
2. Developer clicks "Send to Claude Code" in the right panel Changes tab
3. The button changes to a progress spinner: "Analyzing with Claude Code..."
4. The editor sends the changelog + project root to `/api/claude/analyze`
5. The API route spawns `claude -p "<prompt>" --output-format json --allowedTools Read`
6. Claude Code CLI reads the project's source files, identifies where each element's styles are defined
7. Claude generates code diffs (converting to Tailwind classes, updating CSS modules, etc.)
8. The response flows back to the editor
9. The **right panel** renders the results (replacing the Changes tab content):
    - A summary card: "3 files need changes — 12 lines added, 5 removed"
    - Collapsible DiffCard for each file (e.g., `src/components/Hero.tsx`)
    - Syntax-highlighted diffs with green (additions) and red (removals) on dark background
10. Developer reviews the diffs to verify they look correct

### 11c: Apply changes to source files

1. Developer is satisfied with the diffs from step 11b
2. Developer clicks "Apply All" (or individual "Apply" on specific DiffCards)
3. A confirmation dialog appears: "This will modify your source files. Continue?"
4. Developer confirms
5. The editor sends a follow-up request to `/api/claude/apply` with `--resume <sessionId>` and `--allowedTools Read,Edit`
6. Claude Code CLI applies the diffs to the actual source files
7. The right panel ResultsSummary updates: "Changes applied successfully to 3 files"
8. Developer's dev server hot-reloads and the center iframe preview updates automatically

### 11d: Fallback — Copy Changelog (no Claude integration)

1. If `claude` CLI is unavailable on the server
2. The "Copy Changelog" button still works as before (copies formatted text to clipboard)
3. Developer can paste the changelog into Claude Code manually in their terminal
4. The "Send to Claude Code" button shows a subtle setup icon prompting configuration

**Success:** Visual tweaks are automatically analyzed and applied to source files via Claude Code CLI.

**Error Scenarios:**
- **Claude CLI not installed:** Error panel with install link and instructions
- **Not authenticated:** Message to run `claude` in terminal to sign in
- **Timeout (>120s):** Suggestion to try with fewer changes
- **Response parse failure:** Shows raw response text with a "Copy to Clipboard" button

---

## Scenario Summary Table

| # | Scenario | Panels Used | Key Messages (postMessage) | Persistence |
|---|----------|-------------|---------------------------|-------------|
| 1 | Connect via URL input | Top bar (URL input), Left (tree) | `INSPECTOR_READY` | localStorage (recent URLs) |
| 1b | Switch target project | Top bar (URL input) | `INSPECTOR_READY` | localStorage (recent URLs, changes keyed by URL) |
| 2 | Inspect & select | Left (tree), Right (Design) | `SELECT_ELEMENT`, `ELEMENT_SELECTED` | — |
| 3 | Edit styles | Right (Design), Right (Changes) | `PREVIEW_CHANGE` | localStorage |
| 4 | Undo changes | Right (Changes) | `REVERT_CHANGE` | localStorage |
| 5 | Export changelog | Right (Changes) | — (clipboard) | — |
| 6 | Responsive testing | Top bar, Right (Design/Changes) | `SET_BREAKPOINT` | localStorage |
| 7 | Multi-page editing | Left, Right, Top bar | `INSPECTOR_READY`, `DOM_UPDATED` | localStorage |
| 8 | Live DOM mutations | Left (tree) | `DOM_UPDATED` | — |
| 9 | Disconnection | Top bar | `INSPECTOR_READY` (on reconnect) | localStorage |
| 10 | Drag & drop | Left (tree), Right (Design/Changes) | `DRAG_MODE_CHANGED`, `POSITION_CHANGED`, `ELEMENT_REORDERED` | localStorage |
| 11 | Claude Code analysis | Right (Changes/Claude) | — (HTTP fetch to API routes) | localStorage |

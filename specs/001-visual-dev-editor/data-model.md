# Data Model: Visual pAInt

**Branch**: `001-visual-dev-editor` | **Date**: 2026-02-14

All state lives client-side in a Zustand store (5 slices) and localStorage. No server-side database.

## Entities

### UIState (uiSlice)

Editor-wide UI state shared across all panels.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| targetUrl | `string \| null` | `null` | Currently connected localhost URL |
| connectionStatus | `'disconnected' \| 'connecting' \| 'connected'` | `'disconnected'` | Proxy connection state |
| recentUrls | `string[]` | `[]` | Previously connected URLs (max 10, most recent first) |
| activeBreakpoint | `Breakpoint` | `'desktop'` | Current responsive breakpoint |
| dragMode | `'off' \| 'free' \| 'reorder'` | `'off'` | Active drag behavior mode |
| leftPanelOpen | `boolean` | `true` | Left panel visibility |
| rightPanelOpen | `boolean` | `true` | Right panel visibility |
| leftPanelWidth | `number` | `240` | Left panel width in pixels |
| rightPanelWidth | `number` | `300` | Right panel width in pixels |
| activeRightTab | `'design' \| 'changes'` | `'design'` | Active tab in right panel |

**Validation**:
- `targetUrl` MUST match `^https?://(localhost|127\.0\.0\.1)(:\d+)?` when set
- `recentUrls` MUST not exceed 10 entries; oldest dropped on overflow
- `leftPanelWidth` MUST be between 180 and 400
- `rightPanelWidth` MUST be between 240 and 500

**Persistence**: `targetUrl`, `recentUrls`, `leftPanelWidth`, `rightPanelWidth`, `leftPanelOpen`, `rightPanelOpen` persisted to localStorage.

---

### SelectedElement (elementSlice)

The currently inspected element in the preview.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| selectorPath | `string \| null` | `null` | CSS selector path (e.g., `section.hero > h1`) |
| tagName | `string \| null` | `null` | HTML tag name |
| className | `string \| null` | `null` | Element's class attribute |
| id | `string \| null` | `null` | Element's id attribute |
| computedStyles | `Record<string, string>` | `{}` | Computed CSS property values |
| boundingRect | `DOMRect \| null` | `null` | Element position and dimensions |

**Validation**:
- `selectorPath` MUST be a valid CSS selector string when set
- `computedStyles` keys MUST be valid CSS property names

**State transitions**:
- `null → selected`: User clicks element in preview or tree node
- `selected → different`: User clicks a different element
- `selected → null`: User presses Escape or element is removed from DOM

---

### TreeNode (treeSlice)

Serialized DOM tree for the left panel.

| Field | Type | Description |
|-------|------|-------------|
| id | `string` | Unique node identifier (CSS selector path) |
| tagName | `string` | HTML tag name |
| className | `string \| null` | Class attribute |
| elementId | `string \| null` | ID attribute |
| children | `TreeNode[]` | Child nodes (recursive) |
| isExpanded | `boolean` | Whether node is expanded in tree view |

**treeSlice fields**:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| rootNode | `TreeNode \| null` | `null` | Root of the serialized DOM tree |
| searchQuery | `string` | `''` | Current search/filter text |
| highlightedNodeId | `string \| null` | `null` | Node highlighted via hover |

---

### StyleChange (changeSlice)

A single tracked property modification.

| Field | Type | Description |
|-------|------|-------------|
| id | `string` | Unique change ID (uuid) |
| elementSelector | `string` | CSS selector path of the modified element |
| property | `string` | CSS property name (e.g., `font-size`) |
| originalValue | `string` | Value before modification |
| newValue | `string` | Value after modification |
| breakpoint | `Breakpoint` | Breakpoint at time of change |
| timestamp | `number` | Unix timestamp (ms) |

---

### PositionChange (changeSlice)

A grouped free-position drag result.

| Field | Type | Description |
|-------|------|-------------|
| id | `string` | Unique change ID (uuid) |
| type | `'position'` | Discriminator |
| elementSelector | `string` | CSS selector path |
| originalPosition | `{ position: string; top: string; left: string }` | Values before drag |
| newPosition | `{ position: string; top: string; left: string }` | Values after drag |
| breakpoint | `Breakpoint` | Breakpoint at time of drag |
| timestamp | `number` | Unix timestamp (ms) |

---

### ReorderChange (changeSlice)

A sibling reorder drag result.

| Field | Type | Description |
|-------|------|-------------|
| id | `string` | Unique change ID (uuid) |
| type | `'reorder'` | Discriminator |
| parentSelector | `string` | CSS selector path of parent container |
| childSelector | `string` | CSS selector path of moved child |
| originalIndex | `number` | Child's original position among siblings |
| newIndex | `number` | Child's new position among siblings |
| timestamp | `number` | Unix timestamp (ms) |

---

### changeSlice aggregate fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| styleChanges | `StyleChange[]` | `[]` | All tracked style modifications |
| positionChanges | `PositionChange[]` | `[]` | All tracked position drags |
| reorderChanges | `ReorderChange[]` | `[]` | All tracked reorder drags |
| changeCount | `number` (computed) | `0` | Total count across all change types |

**Validation**:
- `elementSelector` MUST be a non-empty string
- `originalValue` and `newValue` MUST differ for StyleChange
- `originalIndex` and `newIndex` MUST differ for ReorderChange

**Persistence**: All changes persisted to localStorage keyed by `targetUrl + pagePath`.

---

### ClaudeAnalysis (claudeSlice)

State for the Claude Code API integration.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| status | `'idle' \| 'analyzing' \| 'complete' \| 'applying' \| 'applied' \| 'error'` | `'idle'` | Current workflow state |
| projectRoot | `string \| null` | `null` | Filesystem path of the target project |
| cliAvailable | `boolean \| null` | `null` | Whether `claude` CLI is installed |
| sessionId | `string \| null` | `null` | Claude session ID for resume |
| parsedDiffs | `ParsedDiff[]` | `[]` | Analysis results |
| error | `ClaudeError \| null` | `null` | Error state if analysis/apply failed |

**ParsedDiff**:

| Field | Type | Description |
|-------|------|-------------|
| filePath | `string` | Relative path of the affected file |
| hunks | `DiffHunk[]` | Individual diff sections |
| linesAdded | `number` | Total lines added |
| linesRemoved | `number` | Total lines removed |

**DiffHunk**:

| Field | Type | Description |
|-------|------|-------------|
| header | `string` | Hunk header (e.g., `@@ -10,5 +10,8 @@`) |
| lines | `DiffLine[]` | Individual lines with +/- markers |

**ClaudeError**:

| Field | Type | Description |
|-------|------|-------------|
| code | `'CLI_NOT_FOUND' \| 'AUTH_REQUIRED' \| 'TIMEOUT' \| 'PARSE_FAILURE' \| 'UNKNOWN'` | Error classification |
| message | `string` | Human-readable error message |

**Validation**:
- `projectRoot` MUST be an absolute path when set
- `sessionId` MUST be set before `apply` step

**Persistence**: `projectRoot` and `cliAvailable` persisted to localStorage.

**State transitions**:
```
idle → analyzing    (user clicks "Send to Claude Code")
analyzing → complete (analysis returned successfully)
analyzing → error   (analysis failed)
complete → applying (user clicks "Apply All")
applying → applied  (apply succeeded)
applying → error    (apply failed)
error → idle        (user dismisses error)
applied → idle      (user starts new session)
```

## Enums

### Breakpoint

| Value | Label | Width |
|-------|-------|-------|
| `'mobile'` | Mobile | 375px |
| `'tablet'` | Tablet | 768px |
| `'desktop'` | Desktop | 1280px |

## Relationships

```
UIState ──────────── 1:1 ──── SelectedElement
   │                              │
   │ activeBreakpoint             │ selectorPath
   │                              │
   ▼                              ▼
StyleChange ◄────── groups ──── elementSelector
PositionChange ◄─── groups ──── elementSelector
ReorderChange ◄──── groups ──── parentSelector
   │
   │ all changes
   ▼
Changelog (formatted export)
   │
   │ input
   ▼
ClaudeAnalysis (API integration)
```

## localStorage Schema

| Key Pattern | Value Type | Description |
|-------------|-----------|-------------|
| `dev-editor:recent-urls` | `string[]` | Recent target URLs |
| `dev-editor:panel-sizes` | `{ left: number, right: number }` | Panel widths |
| `dev-editor:panel-visibility` | `{ left: boolean, right: boolean }` | Panel open/closed |
| `dev-editor:changes:{url}:{path}` | `{ style: StyleChange[], position: PositionChange[], reorder: ReorderChange[] }` | Changes keyed by target URL + page path |
| `dev-editor:claude:project-root` | `string` | Claude project root path |
| `dev-editor:claude:cli-available` | `boolean` | Claude CLI availability cache |

# Data Model: Improve Navigator Layers Panel

**Feature**: 006-improve-navigator-layers
**Date**: 2026-02-16

## Entities

### TreeNode (modified)

Represents a DOM element in the layer tree, serialized by the inspector and sent via postMessage.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | CSS selector path (unique identifier) |
| tagName | string | yes | Lowercase HTML tag name |
| className | string or null | no | Space-separated class list |
| elementId | string or null | no | Element `id` attribute |
| children | TreeNode[] | yes | Child nodes |
| isExpanded | boolean | no | **REMOVED** — expansion state moves to store |
| imgSrc | string or null | no | **NEW** — `src` attribute value for `<img>` elements only |

**Changes from current**:
- `isExpanded` removed from TreeNode — expansion state is now managed in a flat `Set<string>` in the Zustand store, not embedded in the tree structure
- `imgSrc` added — only populated for `<img>` tags, `null` for all others

### TreeSlice (modified)

Zustand store slice for tree state.

| Field | Type | Description |
|-------|------|-------------|
| rootNode | TreeNode or null | Root of the serialized DOM tree |
| expandedNodeIds | Set\<string\> | **NEW** — set of node IDs that are expanded (replaces per-node `isExpanded`) |
| searchQuery | string | Current search/filter text |
| highlightedNodeId | string or null | Node being hovered in the preview |

**Removed fields**: None (isExpanded was on TreeNode, not the slice)

**New actions**:
- `toggleNodeExpanded(nodeId)` — adds or removes from `expandedNodeIds` set (O(1))
- `expandToNode(nodeId)` — adds all ancestor node IDs to `expandedNodeIds`
- `collapseAll()` — clears `expandedNodeIds`
- `initializeExpanded(nodeIds)` — bulk-set expanded state (for initial tree load)

### StyleChange (unchanged, referenced)

Used to determine which elements have been edited.

| Field | Type | Description |
|-------|------|-------------|
| elementSelector | string | CSS selector path — matches `TreeNode.id` |
| property | string | CSS property name |
| originalValue | string | Value before edit |
| newValue | string | Current edited value |

## Derived State

### changedElementSelectors

Derived from `styleChanges` array. A `Set<string>` of unique `elementSelector` values from all current style changes. Computed via `useMemo` at the `LayersPanel` level and passed to child `LayerNode` components as a prop.

**Purpose**: Enables O(1) lookup to determine if a tree node has been edited, driving the amber color indicator.

## Color Priority

The display color of a node label/icon follows this priority (highest first):

1. **Selected** (blue accent `var(--accent)` / `#4a9eff`) — user clicked this node
2. **Edited** (amber `#fbbf24`) — element has entries in `styleChanges`
3. **Component** (purple-pink `#c084fc`) — semantic/landmark HTML elements
4. **Default** (neutral `var(--text-primary)` / `var(--text-muted)`) — generic elements

## Label Format

| Element Type | Label Format | Example |
|-------------|-------------|---------|
| `<body>` | `Body` | `Body` |
| Semantic tag with id | `tag#id` | `footer#site-footer` |
| Semantic tag with class | `tag` | `footer` |
| Semantic tag, no class/id | `tag` | `section` |
| `<div>` with id | `div#id` | `div#hero` |
| `<div>` with class | `div.firstClass` | `div.flex` |
| `<div>` no class/id | `div` | `div` |
| `<img>` with src filename | `img filename` | `img logo.png` |
| `<img>` with data URI | `img` | `img` |
| `<img>` no src | `img` | `img` |
| Any tag with id | `tag#id` | `h2#title` |
| Any tag without id | `tag` | `h2` |

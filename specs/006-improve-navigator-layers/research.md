# Research: Improve Navigator Layers Panel

**Feature**: 006-improve-navigator-layers
**Date**: 2026-02-16

## R1: Label Strategy — Tag Name vs Class Name

**Decision**: Show HTML tag name as primary label for ALL elements. For generic `<div>` elements, append the first class as a qualifier (e.g., `div.flex`). For elements with an `id`, show `tag#id`.

**Rationale**: The current `getDisplayLabel()` function prioritizes `id` > first class > tag name. This causes semantic elements like `<footer class="border-t">` to display as `border-t` instead of `footer`. The new priority should be: tag name always shown, with id/class as secondary qualifiers. This matches how Cursor and VS Code display JSX component trees.

**Alternatives considered**:
- Keep current behavior (class-first) — rejected because class names like `flex`, `border-t` are meaningless for structure
- Show tag + all classes — rejected because too verbose for the tree view
- Show tag only — rejected because generic `<div>` elements need some distinguishing context

**Current code**: `LayerNode.tsx:159-169` (`getDisplayLabel` function)

## R2: Color System — Purple-Pink for Components

**Decision**: Replace the current green (`#4ade80`) color for semantic/component elements with purple-pink (`#c084fc` — Tailwind purple-400).

**Rationale**: User explicitly requested matching Cursor's color scheme. The current green color is used by `GREEN_CATEGORIES` set containing `component` and `section` categories. This needs to become a purple-pink color applied to the same categories.

**Alternatives considered**:
- `#e879f9` (fuchsia-400) — too bright/saturated for a dark background
- `#a855f7` (purple-500) — slightly too dark, less readable
- `#c084fc` (purple-400) — good balance: visible, not oversaturated, matches Cursor

**Current code**: `LayerNode.tsx:155` (`GREEN_CATEGORIES`), lines 239-249 (color resolution)

## R3: Amber Color for Edited Elements

**Decision**: Elements with entries in `styleChanges` array (matched by `elementSelector`) turn amber (`#fbbf24`). This overrides default/purple-pink but not selection blue.

**Rationale**: The `changeSlice` stores `styleChanges` with `elementSelector` that matches `TreeNode.id` (both are selector paths from `generateSelectorPath`). The LayerNode can derive "has changes" by checking if any `styleChange.elementSelector === node.id`.

**Implementation approach**: Create a `useMemo`-derived `Set<string>` of all changed element selectors at the `LayersPanel` level (not per-node), pass it down as a prop or read from store. This avoids N individual store subscriptions.

**Alternatives considered**:
- Per-node store subscription — rejected because creates N subscriptions, one per visible node
- Store a separate `changedElementPaths: Set<string>` in the store — viable but adds redundant derived state; a `useMemo` at the panel level is simpler

## R4: Image Filename Extraction

**Decision**: Extend `TreeNode` type with an optional `imgSrc` field. Inspector's `serializeTree` extracts the `src` attribute for `<img>` elements. The `getDisplayLabel` function parses the filename from the URL.

**Rationale**: The filename must come from the inspector (iframe) because the editor cannot access iframe DOM directly (postMessage-only architecture). The inspector already has access to `element.getAttribute('src')`.

**Filename extraction logic**:
1. Strip query params: `url.split('?')[0]`
2. Get last path segment: `url.split('/').pop()`
3. If starts with `data:` → return empty (fallback to `img`)
4. If empty → return empty
5. Truncate to ~25 chars with ellipsis if needed

## R5: Accordion Performance

**Decision**: The performance bottleneck is in `treeSlice.ts` — `toggleNodeExpanded` and `expandAncestors` both do a full recursive tree clone on every toggle. Fix by using a separate `expandedNodes: Set<string>` map in the store instead of embedding `isExpanded` in the tree structure.

**Rationale**: Current approach:
- `toggleExpanded()` (line 16-23): Recursively maps ALL children of the entire tree to find and toggle one node. For a 500-node tree, this creates 500 new objects on every click.
- `expandAncestors()` (line 27-41): Same recursive cloning pattern.
- This triggers re-renders of the entire `<LayerNode>` tree because every node reference changes.

**New approach**:
- Store expanded state in a flat `Map<string, boolean>` or `Set<string>` (expanded node IDs)
- `toggleNodeExpanded` just adds/removes from the set — O(1), no tree cloning
- Each `LayerNode` subscribes to its own expanded state via a selector: `useEditorStore(s => s.expandedNodeIds.has(node.id))`
- `expandToNode` adds ancestor IDs to the set (ancestor IDs can be derived from the selector path string)
- Wrap `LayerNode` in `React.memo` so nodes only re-render when their own props change

**Alternatives considered**:
- Virtualized rendering (react-window) — overkill for trees of <500 nodes, adds complexity
- `requestAnimationFrame` batching — doesn't fix the root cause (excessive object creation)
- Immer for immutable updates — adds dependency, still re-renders the full tree

## R6: TreeNode Type Extension

**Decision**: Add optional `imgSrc: string | null` field to `TreeNode` interface.

**Rationale**: Minimal type change. Only populated for `<img>` elements. Does not break existing code since it's optional. The inspector's `serializeTree` is the only place that creates `TreeNode` objects, so only one code path needs updating.

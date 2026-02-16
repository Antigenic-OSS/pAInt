# Implementation Plan: Improve Navigator Layers Panel

**Branch**: `006-improve-navigator-layers` | **Date**: 2026-02-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-improve-navigator-layers/spec.md`

## Summary

Overhaul the Navigator (Layers) panel to show HTML5 semantic tag names as primary labels, replace green component colors with purple-pink, add amber indicators for edited elements, display image filenames, and fix accordion performance by replacing recursive tree cloning with a flat expanded-state map.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 15 (App Router), React 19, Zustand 5, Tailwind CSS 4
**Storage**: N/A (state in Zustand store, no persistence changes)
**Testing**: Manual verification (connect to target project, inspect Navigator behavior)
**Target Platform**: Web (Chrome/Edge/Firefox, desktop)
**Project Type**: Web application (single repo, Next.js)
**Performance Goals**: Accordion expand/collapse < 100ms for trees up to 500 nodes, no frame drops
**Constraints**: postMessage-only communication between editor and iframe; Zustand single store; dark mode only
**Scale/Scope**: ~5 files modified, ~2 new concepts (expanded set, changed set), 0 new dependencies

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Dark Mode Only | PASS | No theme changes. New colors (purple-pink, amber) are within dark palette. |
| II. Iframe + Reverse Proxy | PASS | Inspector sends `imgSrc` via existing postMessage tree serialization. No new message types. |
| III. Localhost Only | PASS | No URL handling changes. |
| IV. Phase-Driven Implementation | PASS | Left Panel is Phase 2 (complete). This is an enhancement to existing Phase 2 work. |
| V. Zustand Single Store | PASS | `expandedNodeIds` added to existing `treeSlice`. No React Context. |
| VI. Strategy Pattern | N/A | No drag behavior changes. |
| VII. Changelog as Truth | PASS | Amber indicator reads from existing `styleChanges` array. No changelog format changes. |
| Runtime (Bun) | PASS | No new scripts or commands. |
| Styling (Tailwind) | PASS | Colors use CSS custom properties or direct hex values consistent with palette. |
| No Over-Engineering | PASS | No new dependencies, no abstractions beyond what's needed. |

**Gate result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/006-improve-navigator-layers/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 research decisions
├── data-model.md        # Data model changes
├── quickstart.md        # Quick reference
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (files to modify)

```text
src/
├── types/
│   └── tree.ts                          # Add imgSrc, remove isExpanded
├── inspector/
│   └── DOMTraverser.ts                  # Extract img src in serializeTree
├── store/
│   └── treeSlice.ts                     # Replace recursive toggle with expandedNodeIds Set
└── components/
    └── left-panel/
        ├── LayersPanel.tsx              # Derive changedElementSelectors, pass to children
        └── LayerNode.tsx                # New labels, colors, React.memo, read from Set
```

**Structure Decision**: Single web application. All changes within existing `src/` directories. No new directories or file structure changes needed.

## Implementation Phases

### Phase A: Data Layer (TreeNode type + store refactor)

**Goal**: Fix the performance bottleneck and extend the data model.

**Task A1**: Update `TreeNode` type (`src/types/tree.ts`)
- Add `imgSrc: string | null` (optional field for `<img>` src attribute)
- Remove `isExpanded` field (expansion state moves to store)

**Task A2**: Refactor `treeSlice.ts` (`src/store/treeSlice.ts`)
- Add `expandedNodeIds: Set<string>` to the slice state
- Rewrite `toggleNodeExpanded(nodeId)`: toggle in/out of the Set (O(1))
- Rewrite `expandToNode(nodeId)`: parse ancestor IDs from the selector path string and add all to the Set
- Remove recursive `toggleExpanded()` and `expandAncestors()` helper functions
- Default: root node's children expanded on initial tree load

**Task A3**: Update `DOMTraverser.ts` (`src/inspector/DOMTraverser.ts`)
- In `serializeTree()`, for `<img>` elements, set `imgSrc: element.getAttribute('src')`
- For all other elements, set `imgSrc: null`
- Remove `isExpanded` from the returned TreeNode (no longer part of the type)

### Phase B: Label System (display names)

**Goal**: Show semantic HTML tag names and image filenames.

**Task B1**: Rewrite `getDisplayLabel()` in `LayerNode.tsx`
- New priority:
  1. `body` → "Body"
  2. `img` with `imgSrc` → `img <filename>` (extracted from URL)
  3. Any tag with `elementId` → `tag#id`
  4. `div` with class → `div.firstClass`
  5. All other tags → just the tag name (e.g., `footer`, `h2`, `span`)
- Add helper `extractImageFilename(src: string): string`
  - Strip query params (`split('?')[0]`)
  - Get last path segment (`split('/').pop()`)
  - Return empty string for `data:` URIs or empty src

**Task B2**: Update tag badge logic
- Currently shows tag badge when label comes from className. Invert: show class badge after tag name only for `<div>` elements (the `.firstClass` part handles this in the label itself, so the separate badge may not be needed for most cases)
- For selected semantic elements, hide the tag badge (label already IS the tag)

### Phase C: Color System

**Goal**: Purple-pink for components, amber for edited, correct priority.

**Task C1**: Replace green with purple-pink in `LayerNode.tsx`
- Rename `GREEN_CATEGORIES` → `COMPONENT_CATEGORIES`
- Change color from `#4ade80` to `#c084fc` (purple-400)
- Update both `iconColor` and `labelColor` resolution

**Task C2**: Add amber for edited elements
- In `LayersPanel.tsx`, derive `changedElementSelectors`:
  ```
  const styleChanges = useEditorStore(s => s.styleChanges);
  const changedSelectors = useMemo(() =>
    new Set(styleChanges.map(c => c.elementSelector)),
    [styleChanges]
  );
  ```
- Pass `changedSelectors` as prop to `LayerNode`
- In `LayerNode`, check `changedSelectors.has(node.id)` for amber color
- Color priority: selected (blue `var(--accent)`) > edited (`#fbbf24`) > component (`#c084fc`) > default

### Phase D: Performance (React.memo + expanded Set)

**Goal**: Make accordion instant.

**Task D1**: Wire `LayerNode` to read from `expandedNodeIds` Set
- Replace `const isExpanded = node.isExpanded !== false` with store read:
  `const isExpanded = useEditorStore(s => s.expandedNodeIds.has(node.id))`
- This gives each node a granular subscription — only re-renders when ITS expansion state changes

**Task D2**: Wrap `LayerNode` with `React.memo`
- Memoize to prevent re-renders when parent re-renders but props haven't changed
- Custom comparison: compare `node.id`, `depth`, `searchQuery`, `changedSelectors` reference
- Children rendering stays inside the memo boundary (children are separate LayerNode instances)

**Task D3**: Verify performance
- Connect to a target page with 100+ elements
- Rapidly toggle expand/collapse — should be instant with no lag
- Verify selection, highlighting, and search still work correctly

## Dependency Graph

```
A1 (TreeNode type) ──┬──→ A2 (treeSlice refactor) ──→ D1 (wire expanded Set)
                     │                                        │
                     └──→ A3 (DOMTraverser imgSrc)            ├──→ D2 (React.memo)
                            │                                 │
                            └──→ B1 (label rewrite) ──→ B2    └──→ D3 (verify perf)

C1 (purple-pink color) ──→ C2 (amber for edited) ──→ D2 (React.memo)
```

**Parallelizable**: A2 and A3 can run in parallel. B1 and C1 can run in parallel after their prerequisites.

## Complexity Tracking

> No constitution violations to justify. All changes stay within existing architecture.

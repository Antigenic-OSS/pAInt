# Quickstart: Improve Navigator Layers Panel

**Feature**: 006-improve-navigator-layers
**Date**: 2026-02-16

## Overview

This feature improves the Navigator (Layers) panel with 5 changes:
1. Show HTML semantic tag names instead of CSS class names
2. Purple-pink color for component/landmark elements
3. Amber color for edited elements
4. Image filenames in the tree
5. Faster accordion expand/collapse

## Files to Modify

### Inspector (runs inside iframe)

| File | Change |
|------|--------|
| `src/types/tree.ts` | Add `imgSrc` field, remove `isExpanded` |
| `src/inspector/DOMTraverser.ts` | Extract `src` attribute for `<img>` elements |

### Store (state management)

| File | Change |
|------|--------|
| `src/store/treeSlice.ts` | Replace recursive tree cloning with `expandedNodeIds: Set<string>` |

### Left Panel (UI)

| File | Change |
|------|--------|
| `src/components/left-panel/LayerNode.tsx` | New label logic, purple-pink colors, amber for edited, `React.memo` |
| `src/components/left-panel/LayersPanel.tsx` | Derive `changedElementSelectors` set, pass to children |

## Key Decisions

- **Label priority**: tag name always primary, id/class as qualifiers
- **Color priority**: selected (blue) > edited (amber) > component (purple-pink) > default (neutral)
- **Performance fix**: Flat `Set<string>` for expansion state instead of recursive tree cloning
- **Image filenames**: Extracted in inspector, passed via `imgSrc` on `TreeNode`

## How to Test

1. `bun dev` on port 4000
2. Start a target project (e.g., Next.js on port 3000)
3. Connect pAInt to target
4. Verify Navigator shows tag names (footer, header, h2, etc.)
5. Verify component elements are purple-pink
6. Edit a style property, verify the tree node turns amber
7. Check `<img>` elements show filenames
8. Rapidly expand/collapse nodes — should be instant

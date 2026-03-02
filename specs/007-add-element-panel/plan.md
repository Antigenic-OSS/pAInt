# Implementation Plan: Add Element Panel

**Branch**: `007-add-element-panel` | **Date**: 2026-02-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-add-element-panel/spec.md`

## Summary

Add an "Add Element" tab to the left panel of pAInt that provides a palette of 9 draggable HTML element types (div, section, h1–h6, p) grouped into Structure and Text categories. Users can drag elements from the palette onto the preview iframe to insert them into the target page DOM, or click to insert at the currently selected element. All insertions are tracked as changes with full undo/redo support and changelog export.

**Technical approach**: Extend the existing left panel tab system (IconSidebar + LeftPanel) with a new `add-element` tab. Use HTML5 Drag and Drop API for cross-iframe drag (palette → iframe). The inspector script (injected via proxy) handles drop target detection, DOM insertion, and sends `ELEMENT_INSERTED` messages back to the editor. Change tracking reuses the existing `__sentinel_property__` pattern (like `__element_deleted__` and `__text_content__`).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), JavaScript ES5 (inspector script)
**Primary Dependencies**: Next.js 15 (App Router), React 19, Zustand 5, Tailwind CSS 4
**Storage**: localStorage (changes keyed by target URL)
**Testing**: Manual verification against acceptance scenarios (no automated test framework configured)
**Target Platform**: Web browser (Chrome/Edge primary), macOS development
**Project Type**: Web application (single codebase, editor + inspector)
**Performance Goals**: Element insertion < 5 seconds per element (SC-001), undo < 1 second (SC-003)
**Constraints**: Inspector script must be ES5-compatible (runs inside proxied iframe). All editor↔iframe communication via postMessage only.
**Scale/Scope**: 9 element types, 2 categories, single-panel UI addition

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Dark Mode Only | PASS | Palette uses dark mode CSS variables (`--bg-tertiary`, `--accent`, `--text-primary`) |
| II. Iframe + Reverse Proxy | PASS | Drag-drop events handled by inspector inside iframe; postMessage for all communication; no direct DOM access |
| III. Localhost Only | PASS | No new network access; operates within existing proxy infrastructure |
| IV. Phase-Driven Implementation | PASS | Phases 1–8 complete on main; this extends Phase 2 (Left Panel) functionality |
| V. Zustand Single Store | PASS | `activeLeftTab` extended in existing `uiSlice`; change tracking uses existing `changeSlice` |
| VI. Strategy Pattern | N/A | No new drag modes; uses HTML5 DnD API directly (not the existing DragHandler) |
| VII. Changelog as Truth | PASS | All insertions tracked with `__element_inserted__` sentinel property; included in changelog export |
| Bun Everywhere | PASS | No new scripts; `bun dev` / `bun run build` unchanged |
| No Shell Exec | N/A | No CLI spawning |
| postMessage Only | PASS | `INSERT_ELEMENT` / `ELEMENT_INSERTED` / `REMOVE_INSERTED_ELEMENT` messages added |
| Middleware Scope | N/A | No middleware changes |

**Gate result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/007-add-element-panel/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (message contracts)
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
src/
├── components/
│   └── left-panel/
│       ├── AddElementPanel.tsx    # NEW — Element palette UI
│       ├── IconSidebar.tsx        # MODIFIED — Add 'add-element' tab
│       ├── LeftPanel.tsx          # MODIFIED — Route to AddElementPanel
│       └── icons.tsx              # MODIFIED — AddElementIcon SVG
├── hooks/
│   ├── usePostMessage.ts          # MODIFIED — Handle ELEMENT_INSERTED
│   └── useChangeTracker.ts        # MODIFIED — Undo/redo/revert for insertions
├── store/
│   └── uiSlice.ts                 # MODIFIED — Extended activeLeftTab type
├── types/
│   └── messages.ts                # MODIFIED — New message types
├── lib/
│   └── constants.ts               # MODIFIED — New message type constants
├── app/
│   └── api/proxy/[[...path]]/
│       └── route.ts               # MODIFIED — Inspector handles INSERT/DROP
└── inspector/
    └── (source reference only — runtime inlined in proxy)

public/
└── dev-editor-inspector.js        # MODIFIED — Standalone inspector with same handlers
```

**Structure Decision**: Single web application. All changes fit within the existing `src/` structure. One new file (`AddElementPanel.tsx`), remainder are modifications to existing files.

## Complexity Tracking

No constitution violations — table not needed.

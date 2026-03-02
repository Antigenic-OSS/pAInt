# Implementation Plan: Visual pAInt

**Branch**: `001-visual-dev-editor` | **Date**: 2026-02-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-visual-dev-editor/spec.md`

## Summary

Build a Webflow-style visual design editor that connects to any localhost dev server via a reverse proxy, lets developers inspect, select, and edit element styles in real time through a three-column dark UI, tracks all changes in a structured changelog, and optionally sends that changelog to Claude Code CLI for automated code generation. The application is a Next.js 15 App Router web app running on Bun with Zustand state management and Tailwind CSS styling.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 15 (App Router), React 19, Zustand 5, Tailwind CSS 4
**Storage**: localStorage (browser-only, no server-side database)
**Testing**: Manual verification per phase (test criteria defined in each phase)
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge) — desktop only
**Project Type**: Web application (single Next.js project)
**Performance Goals**: <100ms style preview latency, 60fps drag-and-drop, <3s initial connection
**Constraints**: Localhost-only proxy, dark mode only, no external dependencies beyond Bun/Next.js ecosystem
**Scale/Scope**: Single-user local dev tool, 1 page (editor), 4 API routes, ~60 source files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Evidence |
|---|-----------|--------|----------|
| I | Dark Mode Only | PASS | Single dark theme with CSS custom properties. No theme toggle. |
| II | Iframe + Reverse Proxy | PASS | `/api/proxy/[...path]` route with inspector injection. postMessage-only communication. |
| III | Localhost Only | PASS | URL validation rejects non-local origins. Proxy refuses external hosts. |
| IV | Phase-Driven Implementation | PASS | 8 phases in strict dependency order, matching constitution definition. |
| V | Zustand Single Store | PASS | Single store with 5 slices (element, change, ui, tree, claude). No React Context for state. |
| VI | Strategy Pattern | PASS | DragHandler delegates to FreePositionStrategy / SiblingReorderStrategy. |
| VII | Changelog as Source of Truth | PASS | All changes (style, position, reorder) captured with original/new values and CSS selectors. |

**Gate result: ALL PASS** — proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-visual-dev-editor/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── postmessage-api.md
│   └── rest-api.md
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── api/
│       ├── proxy/[...path]/route.ts
│       └── claude/
│           ├── analyze/route.ts
│           ├── apply/route.ts
│           └── status/route.ts
├── components/
│   ├── Editor.tsx
│   ├── TopBar.tsx
│   ├── TargetSelector.tsx
│   ├── BreakpointTabs.tsx
│   ├── PageSelector.tsx
│   ├── DragModeToggle.tsx
│   ├── PreviewFrame.tsx
│   ├── left-panel/
│   │   ├── LeftPanel.tsx
│   │   ├── LayersPanel.tsx
│   │   ├── LayerNode.tsx
│   │   └── LayerSearch.tsx
│   ├── right-panel/
│   │   ├── RightPanel.tsx
│   │   ├── PanelTabs.tsx
│   │   ├── design/
│   │   │   ├── DesignPanel.tsx
│   │   │   ├── ElementBreadcrumb.tsx
│   │   │   ├── SizeSection.tsx
│   │   │   ├── SpacingSection.tsx
│   │   │   ├── TypographySection.tsx
│   │   │   ├── BorderSection.tsx
│   │   │   ├── ColorSection.tsx
│   │   │   ├── LayoutSection.tsx
│   │   │   ├── PositionSection.tsx
│   │   │   └── PropertyInput.tsx
│   │   ├── changes/
│   │   │   ├── ChangesPanel.tsx
│   │   │   ├── ChangeEntry.tsx
│   │   │   └── ChangelogActions.tsx
│   │   └── claude/
│   │       ├── ClaudeIntegrationPanel.tsx
│   │       ├── ProjectRootSelector.tsx
│   │       ├── ClaudeProgressIndicator.tsx
│   │       ├── DiffViewer.tsx
│   │       ├── DiffCard.tsx
│   │       ├── ResultsSummary.tsx
│   │       ├── ClaudeErrorState.tsx
│   │       └── SetupFlow.tsx
│   └── common/
│       ├── CollapsibleSection.tsx
│       ├── ColorPicker.tsx
│       ├── ResizablePanel.tsx
│       └── UnitInput.tsx
├── hooks/
│   ├── useTargetUrl.ts
│   ├── usePostMessage.ts
│   ├── useSelectedElement.ts
│   ├── useChangeTracker.ts
│   ├── useClaudeAPI.ts
│   ├── useDOMTree.ts
│   └── useResizable.ts
├── store/
│   ├── index.ts
│   ├── elementSlice.ts
│   ├── changeSlice.ts
│   ├── uiSlice.ts
│   ├── treeSlice.ts
│   └── claudeSlice.ts
├── types/
│   ├── messages.ts
│   ├── element.ts
│   ├── changelog.ts
│   ├── tree.ts
│   ├── drag.ts
│   └── claude.ts
├── lib/
│   ├── constants.ts
│   ├── utils.ts
│   ├── promptBuilder.ts
│   └── diffParser.ts
└── inspector/
    ├── inspector.ts
    ├── DOMTraverser.ts
    ├── ElementSelector.ts
    ├── HoverHighlighter.ts
    ├── SelectionHighlighter.ts
    ├── StyleExtractor.ts
    ├── ViewportController.ts
    ├── messaging.ts
    └── drag/
        ├── DragHandler.ts
        ├── FreePositionStrategy.ts
        ├── SiblingReorderStrategy.ts
        ├── DragOverlay.ts
        └── types.ts
```

**Structure Decision**: Single Next.js web application. All source code under `src/` at repository root. Inspector code lives in `src/inspector/` but is bundled separately and injected into the iframe via the proxy. No monorepo, no separate backend/frontend — the Next.js App Router handles both server (API routes) and client (React components).

## Complexity Tracking

> No constitution violations found. Table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

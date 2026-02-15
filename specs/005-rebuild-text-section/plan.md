# Implementation Plan: Rebuild Typography / Text Section

**Branch**: `005-rebuild-text-section` | **Date**: 2026-02-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-rebuild-text-section/spec.md`

## Summary

Rebuild the `TextSection` component in the Design panel to match Webflow's comprehensive typography panel. The current implementation has 9 properties across flat inputs. The rebuilt version covers 17+ CSS properties organized into a core section (font, weight, size, height, color, alignment, decoration) and a collapsible "More type options" section (letter spacing, text indent, columns, italicize, capitalize, direction, word/line breaking, wrap, truncate, stroke) plus a text shadows multi-entry section. All changes flow through the existing `useChangeTracker.applyChange()` pipeline — no new state management or API routes needed.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 15 (App Router), React 19, Zustand 5, Tailwind CSS 4
**Storage**: N/A (changes tracked in Zustand store + localStorage)
**Testing**: Manual visual testing against connected localhost target
**Target Platform**: Desktop browser (Chrome/Edge/Firefox/Safari)
**Project Type**: Web application (single codebase, frontend-only change)
**Performance Goals**: Style changes preview in <200ms; panel renders at 60fps during interaction
**Constraints**: Dark mode only; all inputs reuse existing component patterns; no new dependencies
**Scale/Scope**: 1 component file rebuilt (`TextSection.tsx`), 1 new utility file (`textShadowUtils.ts`), new icons added to `icons.tsx`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Dark Mode Only | PASS | All inputs use CSS custom properties (`--bg-tertiary`, `--text-primary`, etc.) |
| II. Iframe + Reverse Proxy | PASS | No changes to proxy or iframe communication. Uses existing `PREVIEW_CHANGE` postMessage. |
| III. Localhost Only | PASS | No network changes. |
| IV. Phase-Driven Implementation | PASS | Right Panel (Phase 3) is complete. This is an enhancement within the existing phase. |
| V. Zustand Single Store | PASS | Reads from `computedStyles` and `cssVariableUsages` in the existing store. No new slices. |
| VI. Strategy Pattern | N/A | No drag or inspector behaviors affected. |
| VII. Changelog as Truth | PASS | All changes go through `applyChange()` which auto-tracks in the changelog. |
| Technical Constraints | PASS | Bun runtime, Tailwind styling, no new dependencies. |
| No Over-Engineering | PASS | Reuses `CompactInput`, `IconToggleGroup`, `ColorInput`, `SectionHeader`. Only new code is the component rebuild + text shadow parser. |

**Result**: All gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/005-rebuild-text-section/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (files affected)

```text
src/
├── components/
│   └── right-panel/
│       └── design/
│           ├── TextSection.tsx           # REBUILD — full rewrite
│           ├── icons.tsx                 # MODIFY — add decoration/direction/italic icons
│           └── inputs/
│               ├── CompactInput.tsx      # EXISTING — reused as-is
│               ├── IconToggleGroup.tsx   # EXISTING — reused as-is
│               ├── ColorInput.tsx        # EXISTING — reused as-is
│               └── SectionHeader.tsx     # EXISTING — reused as-is
└── lib/
    └── textShadowUtils.ts              # NEW — parse/serialize text-shadow values
```

**Structure Decision**: This is a frontend-only change within the existing Next.js App Router project. All files live under `src/`. No new directories needed — the feature rebuilds an existing component and adds one utility module.

## Complexity Tracking

> No violations. Table not needed.

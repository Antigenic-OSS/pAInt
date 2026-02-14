# Implementation Plan: Components Tab

**Branch**: `003-components-tab` | **Date**: 2026-02-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-components-tab/spec.md`

## Summary

Add a third "Comps" tab to the left panel that detects UI components on the inspected page (buttons, inputs, cards, navigation, etc.), lists them in a searchable panel, enables variant switching (size, color, state, pseudo-states) with live preview, and supports marking components for extraction via the changelog. The feature must be lightweight — lazy-loaded panel, batched DOM scanning with idle callbacks, and zero measurable impact on editor startup.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 15 (App Router), React 19, Zustand 5, Tailwind CSS 4
**Storage**: localStorage (browser-only, keyed by target URL)
**Testing**: Manual verification against acceptance scenarios (no automated test framework configured)
**Target Platform**: Web (Chrome/Edge, macOS/Windows/Linux)
**Project Type**: Web application (Next.js monolith with iframe-based inspector)
**Performance Goals**: <50ms startup impact, <500ms detection scan, <300ms variant switch, <100ms search filter
**Constraints**: Inspector code must be ES5-compatible (runs inside proxied iframe), lazy-loaded panel, batched scanning with requestIdleCallback
**Scale/Scope**: Typical pages: 50-200 DOM elements, up to 500 elements for large pages, up to 150 detected components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Dark Mode Only | PASS | ComponentsPanel uses dark palette CSS variables (`--text-primary`, `--accent`, `--bg-input`) |
| II. Iframe + Reverse Proxy | PASS | Detection logic runs inside inspector IIFE (injected by proxy). Communication via postMessage only. No direct iframe DOM access. |
| III. Localhost Only | PASS | No external connections. Inspector scans the already-proxied localhost page. |
| IV. Phase-Driven Implementation | PASS | Left Panel (Phase 2) and Change Tracking (Phase 4) are complete on branch 002. This feature is additive — extends existing infrastructure. |
| V. Zustand Single Store | PASS | New componentSlice follows the established StateCreator slice pattern, wired into the single store. |
| VI. Strategy Pattern | N/A | No new drag modes or extensible behaviors. |
| VII. Changelog as Source of Truth | PASS | Component extraction entries stored in changeSlice as StyleChange records with sentinel key `__component_creation__`. Included in exported changelog. |
| Bun everywhere | PASS | No new scripts or commands. |
| No shell exec | N/A | No CLI spawning in this feature. |
| Singleton message listener | PASS | New message types handled in the existing singleton listener in usePostMessage.ts. |
| Middleware scope | PASS | No middleware changes. |

**Pre-design gate**: PASSED (0 violations)

---

## Project Structure

### Documentation (this feature)

```text
specs/003-components-tab/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: research decisions
├── data-model.md        # Phase 1: entity definitions
├── quickstart.md        # Phase 1: development guide
├── contracts/
│   └── messages.md      # Phase 1: postMessage contracts
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── types/
│   ├── component.ts          # NEW — DetectedComponent, VariantGroup, VariantOption types
│   └── messages.ts           # MODIFY — 5 new message interfaces + union updates
├── lib/
│   ├── constants.ts          # MODIFY — 5 new MESSAGE_TYPES entries
│   └── utils.ts              # MODIFY — formatChangelog handles __component_creation__
├── store/
│   ├── componentSlice.ts     # NEW — component detection state & actions
│   └── index.ts              # MODIFY — wire componentSlice into EditorStore
├── components/
│   └── left-panel/
│       ├── ComponentsPanel.tsx   # NEW — Components tab UI (lazy-loaded)
│       └── LeftPanel.tsx         # MODIFY — add 3rd tab, React.lazy import
├── hooks/
│   └── usePostMessage.ts    # MODIFY — handle COMPONENTS_DETECTED, VARIANT_APPLIED
└── app/
    └── api/
        └── proxy/[[...path]]/
            └── route.ts      # MODIFY — inspector detection + variant handling (~200 lines ES5)
```

**Structure Decision**: Single web application structure. All changes are within the existing `src/` directory. 3 new files, 7 modified files. No new directories needed (all target directories already exist).

---

## File Change Summary

| File | Action | Lines (est.) | Risk | Description |
|------|--------|-------------|------|-------------|
| `src/types/component.ts` | CREATE | ~45 | Low | Type definitions — no runtime code |
| `src/store/componentSlice.ts` | CREATE | ~70 | Low | Standard Zustand slice — follows established pattern |
| `src/components/left-panel/ComponentsPanel.tsx` | CREATE | ~250 | Medium | Main UI — search, list, variants, create button |
| `src/types/messages.ts` | MODIFY | +30 | Low | Add 5 interfaces to existing unions |
| `src/lib/constants.ts` | MODIFY | +5 | Low | Add 5 keys to MESSAGE_TYPES |
| `src/store/index.ts` | MODIFY | +3 | Low | Import and spread new slice |
| `src/app/api/proxy/[[...path]]/route.ts` | MODIFY | +200 | High | ES5 inspector code — detection maps, scanning, message handlers |
| `src/hooks/usePostMessage.ts` | MODIFY | +25 | Medium | 3 new message cases + REQUEST_COMPONENTS on ready |
| `src/components/left-panel/LeftPanel.tsx` | MODIFY | +10 | Low | Tab type extension, lazy import, conditional render |
| `src/lib/utils.ts` | MODIFY | +40 | Low | Changelog section for component extractions |

**Total**: ~680 new/modified lines across 10 files.

---

## Performance Design

### Lazy Loading Strategy (FR-015, SC-004)

```
Initial Load:
  LeftPanel.tsx imports Layers, Pages directly (existing)
  ComponentsPanel imported via React.lazy() — NOT in initial bundle

First Tab Click:
  React.lazy triggers dynamic import
  Suspense shows brief loading indicator
  Panel renders and requests component scan
```

### Batched Detection (FR-016)

```
scanForComponents(rootElement):
  Collect all elements into array
  Process in batches of 50 elements
  Use requestIdleCallback between batches
  Fallback: requestAnimationFrame if requestIdleCallback unavailable

  Batch 1: elements[0..49]   → yield
  Batch 2: elements[50..99]  → yield
  ...until complete

  Send COMPONENTS_DETECTED with full results
```

### Debounced Rescan (FR-013)

```
DOM_UPDATED event → clearTimeout(rescanTimer) → setTimeout(rescan, 1000ms)
Page navigation   → immediate rescan (no debounce)
Tab activation    → rescan only if detectedComponents is empty
```

---

## Post-Design Constitution Re-Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Dark Mode Only | PASS | All UI uses CSS variables from dark palette |
| II. Iframe + Reverse Proxy | PASS | Detection is inspector-side; communication is postMessage |
| III. Localhost Only | PASS | No external access |
| IV. Phase-Driven | PASS | Extends completed phases 2+4 |
| V. Zustand Single Store | PASS | componentSlice merged into EditorStore |
| VI. Strategy Pattern | N/A | — |
| VII. Changelog as Truth | PASS | Component extractions in changeSlice + exported changelog |

**Post-design gate**: PASSED (0 violations)

## Complexity Tracking

No violations to justify — all design decisions follow established patterns.

# Implementation Plan: Direct Iframe Loading

**Branch**: `004-direct-iframe` | **Date**: 2026-02-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-direct-iframe/spec.md`

## Summary

Replace the reverse proxy iframe loading approach with direct iframe loading. The target page is loaded via its actual URL in the iframe. A standalone inspector script (`public/dev-editor-inspector.js`) is served by the editor and added to the target project by the developer. Cross-origin `postMessage` communication replaces same-origin messaging. A setup instructions component guides developers who haven't installed the inspector script.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), JavaScript (ES5 for inspector script)
**Primary Dependencies**: Next.js 15 (App Router), React 19, Zustand 5, Tailwind CSS 4
**Storage**: localStorage (browser-only, keyed by target URL) — no changes
**Testing**: Manual verification per acceptance scenarios (no test framework configured)
**Target Platform**: Web browser (Chrome/Firefox/Safari/Edge)
**Project Type**: Web application (Next.js)
**Performance Goals**: Connection established within 10 seconds; zero inspector overhead when not in iframe
**Constraints**: Localhost-only origins; inspector served from editor's `public/` directory
**Scale/Scope**: 5 files modified/created; ~700 lines of inspector script extracted and adapted

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Dark Mode Only | PASS | No UI theme changes. SetupInstructions uses existing dark palette. |
| II. Iframe + Reverse Proxy Architecture | VIOLATION — JUSTIFIED | This feature intentionally replaces the proxy iframe approach with direct iframe loading. The proxy is retained as an unused fallback. The core principle of "iframe + postMessage" is preserved — only the proxy intermediary is bypassed. See Complexity Tracking. |
| III. Localhost Only | PASS | Origin validation continues to enforce localhost-only. Enhanced with `isLocalhostOrigin()` helper. |
| IV. Phase-Driven Implementation | PASS | This is an architectural improvement that doesn't skip phases — all prior phase features continue working. |
| V. Zustand Single Store | PASS | No new store slices. Setup instructions use component-local state (UI-only, not shared). |
| VI. Strategy Pattern | PASS | No drag behavior changes. |
| VII. Changelog as Source of Truth | PASS | Change tracking is unchanged — all style changes still recorded. |

**Post-Phase 1 Re-check**: All gates still pass. No new violations introduced by data model or contracts.

## Project Structure

### Documentation (this feature)

```text
specs/004-direct-iframe/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── postmessage-api.md  # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
public/
└── dev-editor-inspector.js     # NEW — standalone inspector script

src/
├── components/
│   ├── PreviewFrame.tsx         # MODIFY — direct iframe src, remove sandbox
│   ├── TopBar.tsx               # MODIFY — render SetupInstructions
│   └── SetupInstructions.tsx    # NEW — setup guidance component
└── hooks/
    └── usePostMessage.ts        # MODIFY — cross-origin origin check + targeted postMessage
```

**Structure Decision**: Existing Next.js web application structure. New files placed in established directories (`public/` for static assets, `src/components/` for UI components). No new directories beyond `public/` (which Next.js expects).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Constitution II: Iframe + Reverse Proxy bypassed | The proxy causes HMR conflicts, reload loops, prevents React fiber access for component detection, and adds ~600 lines of URL rewriting complexity. Direct iframe eliminates all of these while preserving the iframe + postMessage communication model. | Keeping the proxy and patching more edge cases (HMR, script stripping, URL rewriting for dynamic content) would compound technical debt. Each new target framework introduces new proxy edge cases. Direct loading sidesteps the entire category. |

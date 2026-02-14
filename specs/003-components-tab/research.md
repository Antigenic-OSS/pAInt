# Research: Components Tab

**Feature Branch**: `003-components-tab`
**Date**: 2026-02-14

## R-001: Component Detection Strategy in Sandboxed Iframe

**Decision**: Heuristic detection running inside the inspector IIFE (injected via proxy), using five detection methods in priority order: data-component attributes > custom elements > semantic HTML > ARIA roles > CSS class patterns.

**Rationale**: The inspector already runs inside the iframe IIFE with full DOM access. Detection runs in the same sandboxed context, keeping it consistent with the existing architecture. Priority order ensures the most explicit signals (data attributes, custom elements) take precedence over heuristic patterns (class matching). This approach is framework-agnostic — it works with Bootstrap, Tailwind UI, Material, semantic HTML, or custom design systems without requiring framework-specific adapters.

**Alternatives considered**:
- External detection service (rejected — adds latency, breaks localhost-only constraint)
- AST-based detection from source files (rejected — requires file system access, too complex for visual editor scope)
- User-configured component maps (rejected — friction for first-time use, can be added later if needed)

---

## R-002: Variant Detection via Stylesheet Scanning

**Decision**: Scan `document.styleSheets` for class rules sharing a base prefix with the component's current classes. Group matches into Size (xs/sm/md/lg/xl), Color (primary/secondary/success/danger/warning), and State (active/disabled/loading) categories. For pseudo-states, compare `getComputedStyle(el)` vs `getComputedStyle(el, ':hover')` on key visual properties.

**Rationale**: CSS class naming conventions (BEM, Tailwind, Bootstrap) use predictable patterns with shared prefixes and variant suffixes. Scanning rules matching the current element's class prefix provides high signal without framework-specific knowledge. Pseudo-state detection via `getComputedStyle` is the only reliable cross-browser approach since pseudo-class rules can't be enumerated from `CSSStyleSheet.cssRules` directly.

**Alternatives considered**:
- Parse Tailwind config for variant definitions (rejected — framework-specific, not available at runtime in production builds)
- Record computed styles while toggling pseudo classes via DevTools protocol (rejected — no DevTools protocol access from iframe)
- Only detect class variants, skip pseudo states (rejected — pseudo states are among the most common variant types users want to preview)

**Limitations**:
- Cross-origin stylesheets that block `cssRules` access will be silently skipped
- Pseudo-state detection compares a limited set of visual properties (color, background-color, border-color, opacity, transform, box-shadow) — some subtle pseudo effects may be missed

---

## R-003: Performance — Lazy Loading & Scan Budgeting

**Decision**: Use `React.lazy()` + `Suspense` for the ComponentsPanel to ensure zero impact on initial editor load. Component detection runs with a time budget: process DOM elements in batches of 50 using `requestIdleCallback` (with `requestAnimationFrame` fallback), yielding control after each batch to prevent main thread blocking.

**Rationale**: The spec mandates <50ms initial load impact (SC-004) and <100ms main thread blocking (FR-016). Lazy loading eliminates the panel's JS from the initial bundle. Batched scanning with `requestIdleCallback` keeps the UI responsive during detection on large pages. For typical pages (50-200 elements), scanning completes in a single batch (<50ms). For large pages (500+), it spreads across multiple idle frames.

**Alternatives considered**:
- Web Worker for detection (rejected — Workers can't access DOM, would need complex serialization)
- Intersection Observer to scan only visible elements (rejected — component list needs all elements regardless of visibility)
- Fixed requestAnimationFrame batching (rejected — requestIdleCallback is more appropriate since detection is non-urgent work)

---

## R-004: Tab Integration Pattern

**Decision**: Extend the existing `LeftTab` union type from `'layers' | 'pages'` to `'layers' | 'pages' | 'components'`. Use the same conditional rendering pattern but with `React.lazy()` for the ComponentsPanel only. Tab label: "Comps" (abbreviated to fit the 180px minimum panel width).

**Rationale**: Follows the established tab pattern exactly. The existing Layers and Pages panels use direct imports since they're small — ComponentsPanel uses lazy import specifically because it includes detection logic that's heavier than a simple list. The abbreviated label matches the compact left-panel design.

**Alternatives considered**:
- Separate floating panel (rejected — breaks three-column layout convention)
- Sub-tab within Layers panel (rejected — Components tab has distinct purpose and different interaction model)
- Full "Components" label with auto-truncation (rejected — at 180px width with 3 tabs, abbreviated labels are clearer)

---

## R-005: Changelog Integration for Component Extraction

**Decision**: Introduce a `__component_creation__` property key in the existing `StyleChange` structure. The `formatChangelog()` function detects these entries and renders them in a separate "Component Extractions" section with component name, selector, and suggested props derived from detected variants.

**Rationale**: Reusing the existing `StyleChange` array and `changeSlice` persistence avoids creating a parallel storage system. The special property key (`__component_creation__`) is a sentinel value that cannot collide with real CSS properties (CSS properties don't start with `__`). This approach lets component extractions benefit from the existing localStorage persistence, per-URL keying, and export infrastructure.

**Alternatives considered**:
- Separate `componentExtractions` array in changeSlice (rejected — would need its own persistence, export, and UI handling)
- New dedicated slice for component extractions (rejected — over-engineering for what is essentially a specialized changelog entry)
- Store in componentSlice only (rejected — extractions must appear in the Changes tab and exported changelog, which are driven by changeSlice)

---

## R-006: Zustand Slice Design

**Decision**: New `componentSlice` with minimal state: `detectedComponents[]`, `selectedComponentPath`, `componentSearchQuery`, `createdComponents` record. Actions: `setDetectedComponents`, `setSelectedComponentPath`, `setComponentSearchQuery`, `addCreatedComponent`, `removeCreatedComponent`, `updateComponentVariantActiveIndex`, `clearComponents`.

**Rationale**: Follows the established slice pattern (StateCreator with set/get). State is scoped narrowly — only component detection data and UI state that's specific to the Components tab. The `createdComponents` record enables O(1) lookup to check if a component has already been marked for extraction (drives the "Created" button state). All cross-panel data flows through existing slices (elementSlice for selection, changeSlice for extractions).

**Alternatives considered**:
- Store detected components in elementSlice (rejected — elementSlice is for the currently selected element, not a list)
- Store search query in uiSlice (rejected — uiSlice is already large, and the search is specific to the Components tab)

# Quickstart: Components Tab

**Feature Branch**: `003-components-tab`
**Date**: 2026-02-14

## Prerequisites

- Bun installed (`bun --version`)
- pAInt running (`bun dev`)
- A localhost project running (e.g., `bun dev` on port 3001)

## Development Setup

```bash
# Switch to feature branch
git checkout 003-components-tab

# Install dependencies (if needed)
bun install

# Start dev server
bun dev
```

## Implementation Order

Follow this sequence — each step builds on the previous:

### Step 1: Types & Constants
- Create `src/types/component.ts` with DetectedComponent, VariantGroup, VariantOption types
- Add 5 new message type interfaces to `src/types/messages.ts`
- Add message type keys to `src/lib/constants.ts`

### Step 2: Store Slice
- Create `src/store/componentSlice.ts` with component state and actions
- Wire into store in `src/store/index.ts`

### Step 3: Inspector Detection Logic
- Add component detection functions to `getInspectorCode()` in proxy route
- Add message handlers: REQUEST_COMPONENTS, APPLY_VARIANT, REVERT_VARIANT
- Add auto-scan on INSPECTOR_READY (500ms delay)

### Step 4: Message Routing
- Update `src/hooks/usePostMessage.ts` to handle COMPONENTS_DETECTED and VARIANT_APPLIED
- Add REQUEST_COMPONENTS dispatch on INSPECTOR_READY

### Step 5: ComponentsPanel UI
- Create `src/components/left-panel/ComponentsPanel.tsx`
- Component list, search, variant dropdowns, "Create as Component" button

### Step 6: Left Panel Integration
- Update `src/components/left-panel/LeftPanel.tsx` to add third tab
- Lazy import ComponentsPanel

### Step 7: Changelog Integration
- Update `formatChangelog()` in `src/lib/utils.ts` for component extraction entries
- Update `ChangesPanel.tsx` to render extraction entries distinctly

## Verification Checklist

```bash
# Build check (no type errors)
bun run build
```

1. Open pAInt, connect to a localhost page
2. Click "Comps" tab in left panel — components should list
3. Click a component — iframe highlights it, right panel shows styles
4. Change a variant dropdown — element updates in iframe
5. Click "Create as Component" — entry appears in Changes tab
6. Export changelog — component extraction section included

## Key Files

| File | Purpose |
|------|---------|
| `src/types/component.ts` | Type definitions |
| `src/store/componentSlice.ts` | Zustand slice |
| `src/components/left-panel/ComponentsPanel.tsx` | Main UI |
| `src/components/left-panel/LeftPanel.tsx` | Tab integration |
| `src/hooks/usePostMessage.ts` | Message routing |
| `src/app/api/proxy/[[...path]]/route.ts` | Inspector detection |
| `src/lib/utils.ts` | Changelog formatting |
| `src/lib/constants.ts` | Message type constants |

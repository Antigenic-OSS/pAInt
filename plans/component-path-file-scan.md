# Plan: Component Path Detection via Project File System Scan

## Context

When a user selects an element in the Dev Editor preview, the right panel shows SOURCE (page/layout file) and COMPONENT (the React component file). Currently, COMPONENT is always empty in proxy mode because React fibers aren't available (scripts are stripped to prevent reload loops).

**Solution**: Scan the target project's file system for component files, then match selected elements to those files using reliable signals (IDs, data attributes, class patterns). Pure file system operations — no Claude CLI, no AI tokens.

**Key reuse**: The project root picker (`ProjectRootSelector`), per-URL storage (`portRoots` in `claudeSlice`), folder picker API (`/api/claude/pick-folder`), and path validation (`validateProjectRoot()`) all already exist.

## Files to Create

### 1. `src/lib/validatePath.ts` — Shared path validation
Extract `validateProjectRoot()` from `src/app/api/claude/analyze/route.ts` (lines 22-50) into a shared utility. Both the existing Claude routes and the new scan route will import from here.

### 2. `src/app/api/project-scan/route.ts` — File system scan API
POST endpoint. Accepts `{ projectRoot: string }`.

- Validate path using shared `validateProjectRoot()`
- Check `package.json` exists → read `name` field, detect framework from `dependencies` (next, react)
- If no `package.json` → return 400 `"Not a valid project directory"`
- Walk `src/`, `app/`, `components/` recursively
- Skip: `node_modules`, `.next`, `dist`, `build`, `.git`, `__tests__`, `__mocks__`
- Collect `.tsx`/`.jsx` files + PascalCase `.ts`/`.js` files
- Build map: `{ "FeaturedProducts": "src/components/sections/FeaturedProducts.tsx" }`
- If duplicate basenames, prefer shorter path (closer to `src/components/`)
- Safety cap: abort at 5000 files
- Return: `{ projectName, componentCount, componentFileMap, framework }`

### 3. `src/lib/componentMatcher.ts` — Element-to-component matching
Pure function. Takes element signals + file map → returns matched path or `null`.

**Matching strategies (priority order):**
1. `data-component` attribute → exact lookup in file map
2. `data-testid` attribute → convert kebab-to-PascalCase → lookup
3. Element `id` → convert to PascalCase → lookup
4. Walk up `selectorPath` ancestors → check each for matches
5. Class names that look PascalCase or convert from kebab-case → lookup

**Critical rule**: Only return paths that exist in the scanned file map. Never fabricate.

## Files to Modify

### 4. `src/store/claudeSlice.ts` — Add scan state
Add to `ClaudeSlice`:
```
componentFileMap: Record<string, string> | null
scanStatus: 'idle' | 'scanning' | 'complete' | 'error'
scanError: string | null
scannedProjectName: string | null
```
Plus actions: `setComponentFileMap`, `setScanStatus`, `setScanError`, `setScannedProjectInfo`, `clearScan`.

No localStorage persistence needed — re-scanned on each connection.

### 5. `src/hooks/usePostMessage.ts` — Wire matching into element selection
- **`INSPECTOR_READY` handler**: Auto-trigger scan if project root is configured for this URL and `componentFileMap` is null.
- **`ELEMENT_SELECTED` handler**: After `store.selectElement()`, if `componentFileMap` exists and `componentPath` is null, run `matchElementToComponent()` and update the store.

### 6. `src/components/TopBar.tsx` — Project folder prompt
When `connectionStatus === 'connected'` and no project root is set for this URL, show a subtle one-line banner below the top bar:

```
Set project folder to enable component detection  [Browse]
```

Clicking opens the existing `ProjectRootSelector` in a dropdown. Dismissible.

### 7. `src/components/right-panel/claude/ProjectRootSelector.tsx` — Enhanced validation
After saving a project root:
- Trigger the scan immediately
- Show results: "Found 45 components in my-app" (green) or "No components found — check folder" (warning)
- Show detected project name from `package.json` so user can verify they picked the right folder

### 8. `src/app/api/claude/analyze/route.ts` + `status/route.ts` — Use shared validation
Replace inline `validateProjectRoot()` with import from `src/lib/validatePath.ts`.

## Execution Order

```
Step 1: src/lib/validatePath.ts (extract shared validation)
Step 2: src/app/api/project-scan/route.ts (new scan API)
Step 3: src/store/claudeSlice.ts (add scan state)
Step 4: src/lib/componentMatcher.ts (matching logic)
Step 5: src/hooks/usePostMessage.ts (wire matching + auto-scan)
Step 6: src/components/TopBar.tsx (folder prompt)
Step 7: src/components/right-panel/claude/ProjectRootSelector.tsx (enhanced validation)
Step 8: Update existing Claude routes to use shared validation
```

## Wrong Folder Prevention

- `package.json` must exist → otherwise 400 error with clear message
- Project name from `package.json` shown to user for confirmation
- Component count shown after scan ("Found 45 components")
- 0 components found → warning: "No component files found in src/"
- Path must be absolute, under HOME, exist, be a directory (existing validation)

## Verification

1. `bun run build` — no type errors
2. Connect to a localhost project → set project folder → see "Found N components" feedback
3. Select an element with a `data-component` or `data-testid` attribute → COMPONENT path appears
4. Select a generic `<div>` → COMPONENT stays empty (not fabricated)
5. Set wrong folder (e.g., HOME) → see "No component files found" warning
6. Set folder without package.json → see "Not a valid project directory" error

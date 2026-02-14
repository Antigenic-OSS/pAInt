# Quickstart: Direct Iframe Loading

**Feature Branch**: `004-direct-iframe`
**Date**: 2026-02-15

## Prerequisites

- Dev Editor running: `bun dev` (port 4000)
- A target localhost project running on another port (e.g., 3001)

## Setup

### 1. Add Inspector Script to Target Project

Add this `<script>` tag to your target project's HTML layout (e.g., `layout.tsx`, `index.html`, or `_document.tsx`):

```html
<script src="http://localhost:4000/dev-editor-inspector.js"></script>
```

Place it before `</body>` or at the end of `<head>`. The script auto-detects it's in an iframe and does nothing when the page is loaded directly.

### 2. Connect from Dev Editor

1. Open the Dev Editor at `http://localhost:4000`
2. Enter your target URL (e.g., `http://localhost:3001`) in the URL bar
3. Click Connect
4. The connection dot turns green when the inspector establishes communication

### 3. Start Editing

- Click elements to select them
- Modify CSS properties in the right panel
- Changes preview live in the iframe
- View all changes in the Changes tab

## Troubleshooting

**Connection stays in "connecting" state**:
- Verify the inspector script tag is in your target project's HTML
- Verify your target project is running and accessible
- Check browser console for errors

**Setup instructions appear**:
- The editor shows setup instructions if no connection is established within 5 seconds
- Follow the instructions to add the script tag, then reload your target page

**Inspector script has no effect**:
- The script only activates inside an iframe — loading the target page directly in a browser tab is expected to do nothing

## Key Files

| File | Purpose |
|------|---------|
| `public/dev-editor-inspector.js` | Standalone inspector script served by the editor |
| `src/hooks/usePostMessage.ts` | Cross-origin message handling |
| `src/components/PreviewFrame.tsx` | Direct iframe loading |
| `src/components/SetupInstructions.tsx` | Setup guidance UI |
| `src/components/TopBar.tsx` | Integrates setup instructions |

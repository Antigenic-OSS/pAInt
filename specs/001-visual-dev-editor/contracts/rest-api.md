# REST API Contract

**Branch**: `001-visual-dev-editor` | **Date**: 2026-02-14

All API routes are Next.js App Router API routes under `/api/`.

## GET /api/proxy/[...path]

Reverse proxy that forwards requests to the target localhost dev server.

### Request

- **Method**: GET (also POST, PUT, DELETE — passthrough)
- **Headers**: `X-Dev-Editor-Target: <target-url>` (e.g., `http://localhost:3000`)
- **Path**: Any path after `/api/proxy/` is forwarded to the target

### Response

- **HTML responses**: Inspector `<script>` tag injected before `</body>`
- **Other responses**: Passed through unchanged (CSS, JS, images, fonts)
- **Headers**: Proxied from target, with CORS headers adjusted for same-origin

### Errors

| Status | Condition |
|--------|-----------|
| 400 | Missing `X-Dev-Editor-Target` header |
| 400 | Target URL is not localhost/127.0.0.1 |
| 502 | Target server is unreachable |
| 504 | Target server timeout (10s) |

---

## GET /api/claude/status

Check if the `claude` CLI is available on the server.

### Request

- **Method**: GET
- **Body**: None

### Response (200)

```json
{
  "available": true,
  "version": "1.2.3"
}
```

### Response (200 — not available)

```json
{
  "available": false,
  "error": "claude CLI not found in PATH"
}
```

---

## POST /api/claude/analyze

Send a changelog to Claude Code CLI for read-only analysis.

### Request

```json
{
  "changelog": "=== DEV EDITOR CHANGELOG ===\n...",
  "projectRoot": "/Users/jehcyadorna/My React Project/my-app"
}
```

### Validation

- `changelog` MUST be a non-empty string, max 50KB
- `changelog` MUST NOT contain control characters (stripped)
- `projectRoot` MUST be an absolute path
- `projectRoot` MUST exist on the filesystem
- `projectRoot` MUST be under `$HOME`

### Response (200)

```json
{
  "sessionId": "abc123-def456",
  "diffs": [
    {
      "filePath": "src/components/Hero.tsx",
      "hunks": [
        {
          "header": "@@ -10,5 +10,8 @@",
          "lines": [
            { "type": "context", "content": "  return (" },
            { "type": "removal", "content": "    <h1 className=\"text-2xl\">" },
            { "type": "addition", "content": "    <h1 className=\"text-3xl font-bold\">" }
          ]
        }
      ],
      "linesAdded": 5,
      "linesRemoved": 3
    }
  ],
  "summary": "3 files need changes — 12 lines added, 5 removed"
}
```

### Errors

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `INVALID_CHANGELOG` | Changelog empty or exceeds 50KB |
| 400 | `INVALID_PROJECT_ROOT` | Path not absolute, not found, or not under $HOME |
| 500 | `CLI_NOT_FOUND` | `claude` CLI not available |
| 500 | `AUTH_REQUIRED` | Claude CLI requires authentication |
| 504 | `TIMEOUT` | Analysis exceeded 120 seconds |
| 500 | `PARSE_FAILURE` | Could not parse Claude CLI output |

Error response format:

```json
{
  "error": {
    "code": "TIMEOUT",
    "message": "Analysis exceeded 120 seconds. Try with fewer changes."
  }
}
```

---

## POST /api/claude/apply

Resume a Claude Code session to apply diffs to source files.

### Request

```json
{
  "sessionId": "abc123-def456",
  "projectRoot": "/Users/jehcyadorna/My React Project/my-app"
}
```

### Validation

- `sessionId` MUST be a non-empty string
- `projectRoot` MUST pass the same validation as `/analyze`

### Response (200)

```json
{
  "success": true,
  "filesModified": [
    "src/components/Hero.tsx",
    "src/components/Footer.tsx"
  ],
  "summary": "Applied changes to 2 files"
}
```

### Errors

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `INVALID_SESSION` | Session ID empty or not found |
| 400 | `INVALID_PROJECT_ROOT` | Same as /analyze |
| 500 | `CLI_NOT_FOUND` | `claude` CLI not available |
| 500 | `APPLY_FAILED` | Claude CLI returned an error during apply |
| 504 | `TIMEOUT` | Apply exceeded 120 seconds |

---

## Security Notes

- Proxy route validates localhost-only targets before forwarding
- Claude routes validate `projectRoot` is absolute, exists, and is under `$HOME`
- CLI spawned via `Bun.spawn` or `execFile` — never `exec` with shell strings
- Analyze mode: `--allowedTools Read` (read-only)
- Apply mode: `--allowedTools Read,Edit` (no Bash tool)
- Changelog content sanitized: control characters stripped, 50KB max enforced

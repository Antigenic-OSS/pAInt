# Contributing

Thanks for contributing to pAInt.

## Scope

This repository contains pAInt, a visual design editor for localhost web projects.

## Development prerequisites

- Bun (latest stable)
- Node.js 20+ (recommended for tool compatibility)

## Local workflow

1. Create a branch from `main`.
2. Make focused code and/or documentation changes.
3. Run:

```bash
bun install
bun run lint
bun run build
```

4. If behavior changed, update `README.md` and any relevant docs in `docs/`.
5. Open a pull request with:
- What changed
- Why it changed
- Any user-visible impact

## Pull request expectations

- Keep changes focused and reversible.
- Include validation evidence (lint/build output summary).
- Avoid unrelated refactors in the same PR.

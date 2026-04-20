---
description: Lint and fix code quality issues across the Gonok workspace.
---

Lint and fix code quality issues across the Gonok workspace.

Steps:
1. Run the linter: `npx nx run-many --target=lint --all`
2. If there are fixable errors, run with fix: `npx nx run-many --target=lint --all -- --fix`
3. Summarize what was found and fixed.
4. If there are remaining unfixable issues, list them with file paths and line numbers, and offer to fix them manually.

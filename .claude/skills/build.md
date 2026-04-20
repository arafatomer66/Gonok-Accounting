---
description: Build the Gonok project and report any issues.
---

Build the Gonok project and report any issues.

Steps:
1. Build both apps: `npx nx run-many --target=build --all`
2. If the build succeeds, report the output sizes from `dist/`.
3. If the build fails, read the error messages, identify the root cause, and fix the issues.
4. After fixing, re-run the build to confirm it passes.

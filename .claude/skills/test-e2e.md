---
description: Run the Cypress end-to-end test suite for Gonok.
---

Run the Cypress end-to-end test suite for Gonok.

Steps:
1. Check if the dev servers (API on port 3333, web on port 4200) are running. If not, warn the user they need to start them first with `/serve`.
2. Run Cypress tests: `npx cypress run --browser chrome`
3. Summarize the results: how many specs passed, failed, and any notable failures with their error messages.
4. If any tests fail, read the failing test file and the relevant component to diagnose the issue.

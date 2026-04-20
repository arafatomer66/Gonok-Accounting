---
description: Start the development servers for the Gonok project.
---

Start the development servers for the Gonok project.

Run the API server and the web dev server in parallel:

1. Start the API server on port 3333: `npx nx serve api`
2. Start the web dev server on port 4200: `npx nx serve web`

Run both in the background so the user can continue working. Confirm both servers are starting and remind the user:
- Web app: http://localhost:4200
- API: http://localhost:3333
- The web app proxies `/api` requests to the API server

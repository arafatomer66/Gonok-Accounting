---
description: Help set up the local development databases for Gonok.
---

Help set up the local development databases for Gonok.

Check and guide the user through:

1. **Docker** — Start PostgreSQL and CouchDB via Docker:
   ```
   docker compose up -d
   ```

2. **PostgreSQL** — Verify PostgreSQL is running on port 5433. Check the database exists or offer to create it.

3. **CouchDB** — Verify CouchDB is running on port 5984. Enable CORS if needed:
   ```
   curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/httpd/enable_cors -d '"true"'
   curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/origins -d '"*"'
   curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/credentials -d '"true"'
   curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/methods -d '"GET, PUT, POST, HEAD, DELETE"'
   curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/headers -d '"accept, authorization, content-type, origin, referer"'
   ```

4. **Run migrations** — Start the API server (migrations run automatically on startup):
   ```
   npx nx serve api
   ```

5. **Verify connectivity** — Confirm both databases are accessible and ready for development.

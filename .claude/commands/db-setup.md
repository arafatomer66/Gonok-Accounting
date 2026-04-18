Help set up the local development databases for Gonok.

Check and guide the user through:

1. **PostgreSQL** — Check if PostgreSQL is running locally. If not, suggest how to start it. Verify the database exists or offer to create it.

2. **CouchDB** — Check if CouchDB is running on port 5984. If not, suggest starting it via Docker using the project's `docker-compose.yml`:
   ```
   docker compose up -d
   ```

3. **Run migrations** — Run TypeORM migrations for the API:
   ```
   npx nx serve api
   ```
   (Migrations run automatically on startup)

4. **Verify connectivity** — Confirm both databases are accessible and ready for development.

# Gonok (গণক) — Offline-First Accounting System

A full-featured accounting system built for Bangladeshi small businesses. Works offline, syncs across devices, and supports Bangla + English.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 21, @ngrx/signals, PouchDB, SCSS |
| Backend | Express.js, TypeORM, JWT Auth |
| Databases | PostgreSQL (auth), CouchDB (data sync), PouchDB (offline storage) |
| Monorepo | Nx |
| E2E Tests | Cypress |

## Architecture

```
apps/
  web/          → Angular frontend (standalone components, signals, PouchDB)
  api/          → Express backend (TypeORM, PostgreSQL, JWT auth)
libs/
  shared-types/ → Shared TypeScript interfaces, enums, models
cypress/        → E2E tests (9 specs)
```

All business data (products, parties, transactions, expenses) lives in PouchDB (browser) and syncs bidirectionally with CouchDB. PostgreSQL only stores auth data.

---

## Local Setup

### Prerequisites

- **Node.js** 20 or later
- **Docker** and **Docker Compose** (for databases)
- **Git**

### 1. Clone the repository

```bash
git clone https://github.com/arafatomer66/Gonok-Accounting.git
cd Gonok-Accounting
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the databases

The project includes a `docker-compose.yml` that runs PostgreSQL and CouchDB:

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on port `5433` (user: `gonok`, password: `gonok`, database: `gonok`)
- **CouchDB** on port `5984` (user: `admin`, password: `password`)

Verify they're running:

```bash
docker compose ps
```

> **Without Docker:** If you prefer running databases natively, install PostgreSQL and CouchDB manually and ensure they match the ports/credentials above. CouchDB must have CORS enabled.

### 4. Configure environment (optional)

The API uses sensible defaults for local development. To override, create a `.env` file in the project root:

```env
# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=gonok
DB_PASSWORD=gonok
DB_NAME=gonok

# CouchDB
COUCHDB_URL=http://localhost:5984
COUCHDB_USERNAME=admin
COUCHDB_PASSWORD=password

# JWT
JWT_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# Server
PORT=3333
NODE_ENV=development
```

### 5. Start the development servers

**Option A — Run both in separate terminals:**

```bash
# Terminal 1: API server (port 3333)
npx nx serve api

# Terminal 2: Web app (port 4200)
npx nx serve web
```

**Option B — Run both at once:**

```bash
npx nx run-many --target=serve --projects=api,web --parallel
```

The web app will be available at **http://localhost:4200**. The API runs at **http://localhost:3333** and the web app proxies `/api` requests to it automatically.

> Database migrations run automatically when the API server starts.

### 6. Access the app

1. Open **http://localhost:4200** in your browser
2. Register a new account with any phone number
3. Use OTP code **`123456`** (dev mode)
4. Create a business and start using the app

---

## Common Commands

| Command | Description |
|---------|-------------|
| `npx nx serve api` | Start API server on port 3333 |
| `npx nx serve web` | Start web app on port 4200 |
| `npx nx build web` | Production build of web app |
| `npx nx build api` | Production build of API |
| `npx nx run-many --target=build --all` | Build everything |
| `npx nx run-many --target=lint --all` | Lint all projects |
| `npx cypress run --browser chrome` | Run e2e tests |
| `npx cypress open` | Open Cypress test runner |
| `docker compose up -d` | Start databases |
| `docker compose down` | Stop databases |
| `docker compose down -v` | Stop databases and delete data |

---

## Project Structure

```
apps/
  api/
    src/
      config/          → Database and environment config
      entities/        → TypeORM entities (User, Business, BusinessUser)
      middleware/      → Auth and error middleware
      routes/          → API route handlers
      services/        → Business logic (auth, CouchDB provisioning)
  web/
    src/
      app/
        core/
          guards/      → Auth and business route guards
          services/    → PouchDB, sync, auth, API services
          stores/      → @ngrx/signals stores (auth, catalog, transaction, expense)
        features/      → Feature pages (dashboard, products, parties, transactions, etc.)
        layouts/       → Shell, sidebar, navbar
        shared/        → Reusable components (confirm dialog, search, transaction form)
      styles/          → Global SCSS (variables, mixins, components)
libs/
  shared-types/        → Shared interfaces, enums, models
cypress/
  e2e/                 → 9 e2e test specs
```

---

## Testing

The project uses Cypress for end-to-end testing. Make sure both servers are running before running tests.

```bash
# Start servers first
npx nx serve api &
npx nx serve web &

# Run tests
npx cypress run --browser chrome

# Or open the Cypress UI
npx cypress open
```

**Test user:** phone `01700000000`, OTP `123456`

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ECONNREFUSED` on port 5433 | Run `docker compose up -d` to start PostgreSQL |
| `ECONNREFUSED` on port 5984 | Run `docker compose up -d` to start CouchDB |
| Sync errors in browser console | Ensure CouchDB CORS is enabled |
| Port 4200 already in use | Kill the process: `lsof -ti:4200 \| xargs kill` |
| Port 3333 already in use | Kill the process: `lsof -ti:3333 \| xargs kill` |
| `node_modules` issues | Delete and reinstall: `rm -rf node_modules && npm install` |

---

## License

MIT

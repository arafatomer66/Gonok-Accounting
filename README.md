# Gonok (গণক) — Offline-First Accounting ERP

A full-featured, offline-first accounting and business management system built for Bangladeshi small businesses. Works without internet, syncs across devices, and supports Bangla + English.

![Angular](https://img.shields.io/badge/Angular-21-red) ![Node](https://img.shields.io/badge/Node.js-20+-green) ![PouchDB](https://img.shields.io/badge/PouchDB-Offline--First-blue) ![License](https://img.shields.io/badge/License-MIT-yellow)

---

## Features

### Core Accounting
- **Sales & Purchase** — Full invoice creation with items, quantities, prices, discounts, VAT
- **Sales & Purchase Returns** — Process returns with stock adjustment
- **Payment In / Out** — Track receivables and payables
- **Expenses** — Categorized expense tracking with payment types (Cash, bKash, Nagad, Bank, Cheque)
- **Due List** — See all outstanding balances at a glance
- **Cash Adjustment** — Manual cash register corrections
- **Bank Accounts** — Track bank balances and transactions

### Point of Sale (POS)
- Split-screen layout: product grid + cart
- Barcode scan support
- Multiple payment methods (Cash, bKash, Nagad, Cheque)
- Hold & recall sales
- Receipt printing
- Keyboard shortcuts (F2 pay, F4 hold, F11 fullscreen)

### Quotations / Estimates
- Create quotes with items and pricing
- Status workflow: Draft → Sent → Accepted → Rejected
- One-click convert to sales invoice

### Delivery / Challan Management
- Create delivery challans from sales or standalone
- Track status: Pending → Dispatched → In Transit → Delivered
- Driver info (name, phone, vehicle number)
- Printable challan slip with signature lines
- Partial delivery support

### Payroll
- Employee management (name, designation, department, salary)
- Monthly salary sheet generation
- Bonus, deduction, and advance tracking
- Individual or bulk salary payment

### Recurring Expenses
- Auto-generate monthly rent, utilities, subscriptions
- Frequency options: Daily, Weekly, Monthly, Yearly
- Overdue tracking with batch generation

### Inventory
- Product catalog with categories and units
- Purchase price, sales price, MRP tracking
- Real-time stock tracking (adjusted by sales/purchases/returns)
- Stock summary reports

### Parties (Customers & Suppliers)
- Customer and supplier management
- Party groups for organization
- Balance tracking per party
- Party statement reports

### Reports
- Profit & Loss
- Sales Report / Purchase Report
- Day Book
- Stock Summary
- Party Statement
- Balance Sheet
- Cash Flow
- Profit per sale (inline in sales list)

### Global Search (Cmd+K)
- Search products, parties, transactions, and pages from anywhere
- Keyboard navigation with arrow keys
- Quick page jumping

### Other Features
- **Multi-business** — Manage multiple businesses from one account
- **Multi-branch** — Branch-level organization
- **User Roles** — Owner, Editor, Viewer
- **Invoice Printing** — Professional invoice print with business branding
- **Import Data** — Bulk import products/parties from Excel
- **Backup & Restore** — Export/import full business data
- **Activity Log** — Track all create/update/delete actions
- **Bilingual UI** — Full English and Bangla (বাংলা) support
- **Offline-First** — Works without internet, syncs when online
- **Cross-Device Sync** — Bidirectional PouchDB ↔ CouchDB replication

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 21, @ngrx/signals, PouchDB, SCSS |
| Backend | Express.js, TypeORM, JWT Auth (Phone + OTP) |
| Databases | PostgreSQL (auth), CouchDB (sync), PouchDB (offline) |
| Monorepo | Nx |
| E2E Tests | Cypress (9 specs, 59 tests) |

## Architecture

```
apps/
  web/          → Angular frontend (standalone components, signals, PouchDB)
  api/          → Express backend (TypeORM, PostgreSQL, JWT auth)
libs/
  shared-types/ → Shared TypeScript interfaces, enums, models
cypress/        → E2E tests
```

All business data lives in **PouchDB** (browser IndexedDB) and syncs bidirectionally with **CouchDB**. PostgreSQL only stores auth data (users, businesses). The app works fully offline — no server needed for day-to-day operations.

---

## Quick Start

### Prerequisites

- **Node.js** 20+
- **Docker** and **Docker Compose** (for databases)

### 1. Clone and install

```bash
git clone https://github.com/arafatomer66/Gonok-Accounting.git
cd Gonok-Accounting
npm install
```

### 2. Start databases

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on port `5433` (user: `gonok`, password: `gonok`, db: `gonok`)
- **CouchDB** on port `5984` (user: `admin`, password: `password`)

### 3. Start the app

```bash
# Option A: Separate terminals
npx nx serve api    # Terminal 1 — API on port 3333
npx nx serve web    # Terminal 2 — Web on port 4200

# Option B: Both at once
npx nx run-many --target=serve --projects=api,web --parallel
```

### 4. Open and login

1. Open **http://localhost:4200**
2. Register with any phone number
3. Enter OTP **`123456`** (dev mode)
4. Create a business and start using

> Database migrations run automatically on API startup.

---

## Common Commands

| Command | Description |
|---------|-------------|
| `npx nx serve api` | Start API server (port 3333) |
| `npx nx serve web` | Start web app (port 4200) |
| `npx nx build web` | Production build of web app |
| `npx nx build api` | Production build of API |
| `npx nx run-many --target=build --all` | Build everything |
| `npx cypress run --browser chrome` | Run e2e tests |
| `npx cypress open` | Open Cypress test runner |
| `docker compose up -d` | Start databases |
| `docker compose down` | Stop databases |
| `docker compose down -v` | Stop and delete all data |

---

## Environment Variables (optional)

The API uses sensible defaults. To override, create `.env` in the project root:

```env
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=gonok
DB_PASSWORD=gonok
DB_NAME=gonok
COUCHDB_URL=http://localhost:5984
COUCHDB_USERNAME=admin
COUCHDB_PASSWORD=password
JWT_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
PORT=3333
NODE_ENV=development
```

---

## Project Structure

```
apps/
  api/src/
    config/          → Database and environment config
    entities/        → TypeORM entities (User, Business, BusinessUser)
    middleware/      → Auth and error middleware
    routes/          → API route handlers
    services/        → Business logic (auth, CouchDB provisioning)
  web/src/app/
    core/
      guards/        → Auth and business route guards
      services/      → PouchDB, sync, auth, API services
      stores/        → @ngrx/signals stores (auth, catalog, transaction, expense, delivery, quotation, payroll, recurring-expense)
    features/        → Feature pages (22 feature modules)
    layouts/         → Shell, sidebar, navbar
    shared/          → Reusable components (invoice print, challan print, command palette, transaction form, confirm dialog)
  styles/            → Global SCSS (variables, mixins, components)
libs/
  shared-types/      → Shared interfaces, enums, models
cypress/e2e/         → 9 e2e test specs
```

---

## Testing

```bash
# Start servers first, then run tests
npx nx serve api &
npx nx serve web &
npx cypress run --browser chrome
```

**Test credentials:** phone `01700000000`, OTP `123456`

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ECONNREFUSED` on port 5433/5984 | Run `docker compose up -d` |
| Sync errors in browser | Ensure CouchDB CORS is enabled |
| Port already in use | `lsof -ti:4200 \| xargs kill` |
| Stale build cache | `npx nx reset` then rebuild |
| `node_modules` issues | `rm -rf node_modules && npm install` |

---

## License

MIT

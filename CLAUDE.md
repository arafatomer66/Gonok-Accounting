# গণক (Gonok) — Project Guide

## Overview

Gonok is a full-featured offline-first accounting ERP for Bangladeshi small businesses. Monorepo using Nx with three apps (`web`, `api`, and `storefront`) and a shared types library.

## Architecture

```
apps/
  web/          → Angular 21 frontend (standalone components, signals, PouchDB)
  storefront/   → Angular 21 public product catalog (lightweight, no PouchDB/ngrx)
  api/          → Express/Node.js backend (TypeORM, PostgreSQL, JWT auth)
libs/
  shared-types/ → Shared TypeScript interfaces, enums, models
cypress/        → Cypress e2e tests (9 specs, 59 tests)
```

### Frontend Stack
- **Angular 21** with standalone components, new control flow (`@if`, `@for`, `@empty`)
- **@ngrx/signals** `signalStore` for state management (withState, withComputed, withMethods, patchState)
- **PouchDB** (pouchdb-browser) for offline-first local storage (IndexedDB)
- **CouchDB** for cross-device sync (bidirectional live replication)
- **Template-driven forms** with `[(ngModel)]` + `name` attribute
- **SCSS** with component-scoped styles using `@use '../styles/abstracts/variables' as *`
- **@ngx-translate** for i18n (English + Bangla)

### Backend Stack
- **Express.js** with TypeORM and PostgreSQL
- **JWT auth** with phone + OTP (dev OTP: `123456`)
- **CouchDB provisioning** — per-user databases (`gonok-{userUuid}`)
- API base: `/api/v1`

### Storefront Stack (Micro-Frontend)
- **Angular 21** lightweight app — no PouchDB, no @ngrx/signals, no auth
- **Plain Angular signals** (`signal()`, `computed()`) for local state
- **HttpClient** calls to public storefront API endpoints
- **Separate build/deploy** — served at `/shop/*` via nginx
- Shares `@org/shared-types` with web and api apps

### Data Flow
- All business data lives in **PouchDB** (browser IndexedDB)
- PouchDB syncs bidirectionally with **CouchDB** (per-user databases)
- PostgreSQL stores only auth data (users, businesses, business_users)
- Document IDs: `{table_type}::{uuid}` (e.g., `product::abc-123`)
- **Storefront data flow**: Public API reads CouchDB directly via `nano` (admin credentials, server-side only)

## Stores

| Store | File | Manages |
|-------|------|---------|
| AuthStore | `core/stores/auth.store.ts` | User session, businesses, active business |
| CatalogStore | `core/stores/catalog.store.ts` | Products, categories, units, parties, party groups |
| TransactionStore | `core/stores/transaction.store.ts` | Sales, purchases, returns, payments |
| ExpenseStore | `core/stores/expense.store.ts` | Expenses, expense categories |
| QuotationStore | `core/stores/quotation.store.ts` | Quotations/estimates, quotation items |
| RecurringExpenseStore | `core/stores/recurring-expense.store.ts` | Recurring expenses, auto-generation |
| PayrollStore | `core/stores/payroll.store.ts` | Employees, salaries |
| DeliveryStore | `core/stores/delivery.store.ts` | Deliveries/challans, delivery items |

## Feature Pages (22 modules)

All in `apps/web/src/app/features/`:

| Feature | Route | Description |
|---------|-------|-------------|
| dashboard | `/dashboard` | Sales/purchase/balance summary, recent transactions |
| pos | `/pos` | Point of Sale with product grid, cart, payment modal, receipt print |
| products | `/products` | Product CRUD, categories, units |
| parties | `/parties` | Customer/supplier management, groups |
| sales | `/sales` | Sales transactions with profit-per-sale display |
| purchase | `/purchase` | Purchase transactions |
| sales-return | `/sales-return` | Sales returns |
| purchase-return | `/purchase-return` | Purchase returns |
| payment-in | `/payment-in` | Receive payments |
| payment-out | `/payment-out` | Make payments |
| quotations | `/quotations` | Quotations with convert-to-sale |
| deliveries | `/deliveries` | Delivery challans with print, status tracking |
| expenses | `/expenses` | Expense tracking |
| recurring-expenses | `/recurring-expenses` | Auto-recurring expenses |
| payroll | `/payroll` | Employees, salary sheets, payment |
| due-list | `/due-list` | Outstanding balances |
| cash-adjustment | `/cash-adjustment` | Manual cash corrections |
| bank | `/bank` | Bank account tracking |
| reports | `/reports/*` | P&L, sales, purchase, daybook, stock, party statement, balance sheet |
| import | `/import` | Bulk import from Excel |
| backup | `/backup` | Export/import business data |
| activity-log | `/activity-log` | Action history log |

## Shared Components

| Component | Path | Purpose |
|-----------|------|---------|
| CommandPaletteComponent | `shared/components/command-palette/` | Global Cmd+K search |
| ChallanPrintComponent | `shared/components/challan-print/` | Printable delivery slip |
| InvoicePrintComponent | `shared/components/invoice/` | Printable sales/purchase invoice |
| TransactionListComponent | `shared/components/transaction-list/` | Reusable transaction table with profit display |
| TransactionFormComponent | `shared/components/transaction-form/` | Reusable sale/purchase form |
| ConfirmDialogComponent | `shared/components/confirm-dialog/` | Reusable confirm modal |

## Shared Types (ETables enum)

All entity types in `libs/shared-types/src/lib/enums/tables.enum.ts`:
`PRODUCT`, `PRODUCT_CATEGORY`, `PRODUCT_UNIT`, `PARTY`, `PARTY_GROUP`, `TRANSACTION`, `TRANSACTION_ITEM`, `EXPENSE`, `EXPENSE_CATEGORY`, `SETTINGS`, `BALANCE_SHEET`, `QUOTATION`, `QUOTATION_ITEM`, `RECURRING_EXPENSE`, `EMPLOYEE`, `SALARY`, `DELIVERY`, `DELIVERY_ITEM`

## Storefront App (Public Catalog)

### Architecture
The storefront is a **micro-frontend** (Option 2 — separate app, shared types). It's a completely independent Angular app that fetches data from public API endpoints.

**Resolution chain**: `businessSlug` (URL) → PostgreSQL `businesses` table → `business_users` owner → CouchDB `gonok-{userUuid}`

### Storefront Routes
All in `apps/storefront/src/app/`:

| Route | Page | Description |
|-------|------|-------------|
| `/:businessSlug` | CatalogPage | Product grid with search, category filter, pagination |
| `/:businessSlug/product/:slugOrUuid` | ProductDetailPage | Single product view |
| `/` | LandingPage | Default landing |

### Public API Endpoints (no auth)
All at `/api/v1/storefront/` — rate limited (200 req/15min/IP):

| Endpoint | Description |
|----------|-------------|
| `GET /:businessSlug` | Business info (name, phone, address, logo) |
| `GET /:businessSlug/products?page=&limit=&category=&search=` | Paginated product listing |
| `GET /:businessSlug/products/:slugOrUuid` | Single product detail |
| `GET /:businessSlug/categories` | Category list |

### Storefront Components
| Component | Path | Purpose |
|-----------|------|---------|
| BusinessHeaderComponent | `components/business-header/` | Store logo, name, contact |
| ProductCardComponent | `components/product-card/` | Product tile with image, price, discount |
| CategoryFilterComponent | `components/category-filter/` | Category pill filter |
| SearchBarComponent | `components/search-bar/` | Debounced search input |

### Enabling Storefront for a Business
1. Go to Settings > Storefront tab in the main app
2. Enable storefront toggle
3. Set a URL slug (lowercase, hyphens, alphanumeric)
4. Save — the store is accessible at `/shop/{slug}`

### Storefront Key Files
- `apps/storefront/` — Angular app (port 4300 in dev)
- `apps/api/src/routes/storefront.routes.ts` — Public API routes
- `apps/api/src/services/storefront.service.ts` — CouchDB query service
- `libs/shared-types/src/lib/models/storefront.model.ts` — Storefront interfaces
- `apps/web/nginx.conf` — Nginx `/shop/` routing block

## Running the Project

```bash
docker compose up -d              # Start PostgreSQL + CouchDB
npx nx serve api                  # API on port 3333
npx nx serve web                  # Web on port 4200
npx nx serve storefront           # Storefront on port 4300
npx nx build web                  # Production build (main app)
npx nx build storefront           # Production build (storefront)
npx cypress run --browser chrome  # E2E tests
```

### Prerequisites
- Node.js 20+, Docker
- PostgreSQL on port 5433 (via docker-compose)
- CouchDB on port 5984 (via docker-compose)
- Dev OTP: `123456`, Test user: `01700000000`

## Code Patterns

### Creating a new feature page
1. Create component in `apps/web/src/app/features/{name}/`
2. Use standalone component with inline template (or external `styleUrl` if styles > 6kB)
3. Inject relevant store(s), call `loadAll()` in `ngOnInit` if not initialized
4. Add lazy route in `apps/web/src/app/app.routes.ts`
5. Add sidebar link in `apps/web/src/app/layouts/sidebar/sidebar.component.ts`
6. Add translations in `apps/web/public/assets/i18n/{en,bn}.json`

### Adding a new entity type
1. Define interface in `libs/shared-types/src/lib/models/`
2. Export from `libs/shared-types/src/lib/models/index.ts`
3. Add table type to `ETables` enum in `libs/shared-types/src/lib/enums/tables.enum.ts`
4. Create signal store in `apps/web/src/app/core/stores/` (or add methods to existing store)
5. Use `pouchDb.put(ETables.XXX, uuid, doc)` for persistence

### Store method pattern
```typescript
async addThing(data: Partial<IThing>): Promise<IThing> {
  const bizUuid = getBizUuid();
  const uuid = crypto.randomUUID();
  const now = Date.now();
  const thing: IThing = { uuid, table_type: ETables.THING, business_uuid: bizUuid, ...data, created_at: now, updated_at: now };
  await pouchDb.put(ETables.THING, uuid, thing as unknown as Record<string, unknown>);
  patchState(store, { things: [...store.things(), thing] });
  return thing;
}
```

### Modal/Form pattern
- Forms use `.modal-backdrop > .modal` structure
- Confirm dialogs use `ConfirmDialogComponent` with `visible`, `title`, `message`, `variant` inputs
- Delete confirm buttons have class `.btn--danger` inside `.modal__footer`

### Style budget
- `anyComponentStyle` budget: warning at 6kB, error at 12kB (in `apps/web/project.json`)
- If inline styles exceed budget, extract to external `.scss` file with `styleUrl`
- SCSS variable path depends on component depth: `@use '../../../styles/abstracts/variables' as *`

### CSS classes available globally
`.card`, `.btn`, `.btn--primary`, `.btn--sm`, `.btn--ghost`, `.btn--danger`, `.form-group`, `.form-label`, `.form-input`, `.form-error`, `.badge`, `.badge--success`, `.badge--info`, `.badge--warning`, `.table-wrapper`, `.table`, `.modal-backdrop`, `.modal`, `.modal--wide`, `.page-header`

## Business Logic

- **Stock tracking**: `stock_count` = initial/opening stock, `quantity` = running stock adjusted by transactions
- **Business isolation**: All data is scoped by `business_uuid`; switching business resets and reloads all stores via `BusinessSwitchService`
- **Cash Sale**: Virtual party (uuid = businessUuid, can_delete = false) prepended to all parties lists
- **General group**: Virtual party group prepended to all party group lists
- **Default units**: Seeded on first load if no units exist (Piece, Kilogram, Gram, Litre, etc.)
- **Sync**: Initial one-time sync completes before stores load; then live bidirectional sync continues

## Testing

- **E2e tests**: `cypress/e2e/` — 9 spec files covering auth, dashboard, products, parties, transactions, expenses, settings, users, businesses, navigation
- **Dev OTP**: Always `123456` in non-production mode
- **Test user**: phone `01700000000`
- PouchDB sync errors are suppressed in Cypress via `uncaught:exception` handler

## Important Notes

- Do NOT use `patchState` across stores (type limitation) — use store methods like `catalogStore.updateProduct()` instead
- Business data (products, parties, etc.) is in PouchDB, NOT PostgreSQL
- When adding imports, use `@org/shared-types` for shared types
- The proxy config (`apps/web/proxy.conf.json`) forwards `/api` to `localhost:3333`
- CouchDB CORS must be enabled for cross-browser sync to work
- `npx nx reset` clears build cache if config changes aren't picked up
- **Storefront** is served at `/shop/*` in production via nginx (`apps/web/nginx.conf`)
- Storefront dev proxy at `apps/storefront/proxy.conf.json` forwards `/api` to `localhost:3333`
- Business `slug` and `storefront_enabled` columns are on the PostgreSQL `businesses` table

## Deployment & CI/CD

### AWS Infrastructure
- **EC2**: `13.234.68.147` (ap-south-1, t3.small, Ubuntu 22.04) — managed via `terraform/main.tf`
- **SSH**: `ssh -i ~/.ssh/gonok.pem ubuntu@13.234.68.147`
- **Security group**: Ports 80, 443, 22 open

### Docker (Production)
```bash
docker compose -f docker-compose.prod.yml up -d --build   # Build and start all services
docker compose -f docker-compose.prod.yml logs api -f      # Tail API logs
docker compose -f docker-compose.prod.yml ps               # Check service status
```

**Services**: web (nginx, port 80), api (Express, port 3333 internal), postgres (5432 internal), couchdb (5984 internal)

### CI/CD Pipeline
- **File**: `.github/workflows/deploy.yml`
- **Trigger**: Push to `main` or manual dispatch
- **Flow**: Build & test (Node 20) → Deploy via SSH (git pull + docker compose up --build)
- **GitHub Secrets**: `EC2_SSH_KEY`, `EC2_HOST`, `EC2_USER`

### First Deploy Checklist
1. SSH into EC2: `ssh -i ~/.ssh/gonok.pem ubuntu@13.234.68.147`
2. Clone repo: `git clone https://github.com/arafatomer66/Gonok-Accounting.git`
3. Create `.env.prod` from `.env.prod.example` — update all `CHANGE_ME` values
4. Set `DB_SYNC=true` for first run (creates tables), then set to `false`
5. Run: `docker compose -f docker-compose.prod.yml up -d --build`
6. Enable CouchDB CORS: `source .env.prod && bash scripts/init-couchdb.sh`
7. Verify: `curl http://localhost/api/health`

### Key Deployment Files
| File | Purpose |
|------|---------|
| `apps/web/Dockerfile` | Builds web + storefront, serves via nginx |
| `apps/api/Dockerfile` | Multi-stage API build with prod-only deps |
| `docker-compose.prod.yml` | 4-service production stack |
| `.env.prod.example` | Complete env var template |
| `.github/workflows/deploy.yml` | CI/CD: build, test, deploy to EC2 |
| `scripts/init-couchdb.sh` | Enable CouchDB CORS |
| `terraform/main.tf` | EC2 + security group IaC |

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## Nx Workspace

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first
- Always run tasks through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`)
- Prefix nx commands with `npx` (e.g., `npx nx serve web`)
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`
- NEVER guess CLI flags - check `--help` first

### Scaffolding & Generators
- For scaffolding tasks, ALWAYS invoke the `nx-generate` skill FIRST

<!-- nx configuration end-->

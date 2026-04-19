# গণক (Gonok) — Project Guide

## Overview

Gonok is a full-featured offline-first accounting ERP for Bangladeshi small businesses. Monorepo using Nx with two apps (`web` and `api`) and a shared types library.

## Architecture

```
apps/
  web/          → Angular 21 frontend (standalone components, signals, PouchDB)
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

### Data Flow
- All business data lives in **PouchDB** (browser IndexedDB)
- PouchDB syncs bidirectionally with **CouchDB** (per-user databases)
- PostgreSQL stores only auth data (users, businesses, business_users)
- Document IDs: `{table_type}::{uuid}` (e.g., `product::abc-123`)

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

## Running the Project

```bash
docker compose up -d              # Start PostgreSQL + CouchDB
npx nx serve api                  # API on port 3333
npx nx serve web                  # Web on port 4200
npx nx build web                  # Production build
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

# গণক (Gonok) — Project Guide

## Overview

Gonok is a full-featured offline-first accounting system for Bangladeshi small businesses. It runs as a monorepo using Nx with two apps (`web` and `api`) and a shared types library.

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
- All business data (products, parties, transactions, expenses) lives in **PouchDB** (browser IndexedDB)
- PouchDB syncs bidirectionally with **CouchDB** (per-user databases)
- PostgreSQL stores only auth data (users, businesses, business_users)
- Document IDs use the pattern: `{table_type}::{uuid}` (e.g., `product::abc-123`)

## Key Stores

| Store | File | Manages |
|-------|------|---------|
| AuthStore | `core/stores/auth.store.ts` | User session, businesses, active business |
| CatalogStore | `core/stores/catalog.store.ts` | Products, categories, units, parties, party groups |
| TransactionStore | `core/stores/transaction.store.ts` | Sales, purchases, returns, payments |
| ExpenseStore | `core/stores/expense.store.ts` | Expenses, expense categories |

## Running the Project

```bash
# Start API server (port 3333)
npx nx serve api

# Start web dev server (port 4200, proxies /api to 3333)
npx nx serve web

# Run Cypress e2e tests
npx cypress run --browser chrome

# Open Cypress UI
npx cypress open
```

### Prerequisites
- PostgreSQL running locally (for auth/business data)
- CouchDB running on port 5984 (for data sync, admin/password)
- Node.js 20+

## Code Patterns

### Creating a new feature page
1. Create component in `apps/web/src/app/features/{name}/`
2. Use standalone component with inline template and styles
3. Inject relevant store(s), call `loadAll()` in `ngOnInit` if not initialized
4. Add lazy route in `apps/web/src/app/app.routes.ts`
5. Add sidebar link in `apps/web/src/app/layouts/sidebar/sidebar.component.ts`

### Adding a new entity type
1. Define interface in `libs/shared-types/src/lib/models/`
2. Add table type to `ETables` enum in `libs/shared-types/src/lib/enums/tables.enum.ts`
3. Add CRUD methods to the relevant store (CatalogStore, TransactionStore, etc.)
4. Use `pouchDb.put(ETables.XXX, uuid, doc)` for persistence

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

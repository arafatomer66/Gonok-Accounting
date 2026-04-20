---
description: Scaffold a new entity type for the Gonok data model.
---

Scaffold a new entity type for the Gonok data model.

Ask the user for:
1. Entity name (e.g., "invoice", "warehouse")
2. Fields and their types
3. Which store it belongs to (CatalogStore, TransactionStore, ExpenseStore, CrmStore, or a new store)

Then create the following, following existing project patterns:

1. **Interface** in `libs/shared-types/src/lib/models/{name}.model.ts`
   - Extend `IBaseModel` and `ICouchDoc` from `base.model.js`
   - Export from `libs/shared-types/src/lib/models/index.ts`

2. **Table type** — add to `ETables` enum in `libs/shared-types/src/lib/enums/tables.enum.ts`

3. **Store methods** — add CRUD methods to the relevant store:
   - `loadAll()` — load from PouchDB via `pouchDb.findByBusiness()`
   - `add{Name}()` — create with `crypto.randomUUID()`, timestamps, business_uuid
   - `update{Name}()` — update in PouchDB and state via `patchState()`
   - `delete{Name}()` — remove from PouchDB and state
   - Follow the existing pattern with `pouchDb.put()` and `patchState()`

4. **Export** from barrel files in `libs/shared-types/src/lib/`

Use existing entities (like IProduct, IParty, ICrmInteraction) as reference for the exact patterns.

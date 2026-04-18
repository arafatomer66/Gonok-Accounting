Scaffold a new entity type for the Gonok data model.

Ask the user for:
1. Entity name (e.g., "invoice", "warehouse")
2. Fields and their types
3. Which store it belongs to (CatalogStore, TransactionStore, ExpenseStore, or a new store)

Then create the following, following existing project patterns:

1. **Interface** in `libs/shared-types/src/lib/models/{name}.model.ts`
   - Extend `IBase` from `base.model.ts`
   - Export from `libs/shared-types/src/lib/models/index.ts`

2. **Table type** — add to `ETables` enum in `libs/shared-types/src/lib/enums/tables.enum.ts`

3. **Store methods** — add CRUD methods to the relevant store:
   - `loadAll{Name}s()` — load from PouchDB
   - `add{Name}()` — create with UUID, timestamps, business_uuid
   - `update{Name}()` — update in PouchDB and state
   - `delete{Name}()` — remove from PouchDB and state
   - Follow the existing store method pattern with `pouchDb.put()` and `patchState()`

4. **Export** from `libs/shared-types/src/index.ts`

Use existing entities (like IProduct, IParty) as reference for the exact patterns.

Create or extend an @ngrx/signals store for this project.

## Arguments
- `$ARGUMENTS` — Store name and entity (e.g., "invoice" or "extend catalog with warehouses")

## Instructions

Follow Gonok's store patterns in `apps/web/src/app/core/stores/`:

1. Use `signalStore` with `withState`, `withComputed`, `withMethods`, `patchState`
2. Inject `PouchDbService` via `inject()` inside `withMethods`
3. Use `ETables` enum for document type prefixes
4. Document IDs follow pattern: `{table_type}::{uuid}`
5. All entities must include: `uuid`, `table_type`, `business_uuid`, `created_at`, `updated_at`
6. Get `business_uuid` from `AuthStore` via `getBizUuid()` helper
7. Generate UUIDs with `crypto.randomUUID()`
8. Use `Date.now()` for timestamps
9. After PouchDB write, update local state with `patchState()`

## CRUD Method Pattern

```typescript
async addEntity(data: Partial<IEntity>): Promise<IEntity> {
  const bizUuid = getBizUuid();
  const uuid = crypto.randomUUID();
  const now = Date.now();
  const entity: IEntity = {
    uuid, table_type: ETables.ENTITY,
    business_uuid: bizUuid, ...data,
    created_at: now, updated_at: now,
  };
  await pouchDb.put(ETables.ENTITY, uuid, entity as unknown as Record<string, unknown>);
  patchState(store, { entities: [...store.entities(), entity] });
  return entity;
}

async updateEntity(uuid: string, data: Partial<IEntity>): Promise<void> {
  const updated = { ...store.entities().find(e => e.uuid === uuid)!, ...data, updated_at: Date.now() };
  await pouchDb.put(ETables.ENTITY, uuid, updated as unknown as Record<string, unknown>);
  patchState(store, { entities: store.entities().map(e => e.uuid === uuid ? updated : e) });
}

async deleteEntity(uuid: string): Promise<void> {
  await pouchDb.remove(ETables.ENTITY, uuid);
  patchState(store, { entities: store.entities().filter(e => e.uuid !== uuid) });
}
```

## Important
- Do NOT use `patchState` across stores — use store methods instead
- Define interface in `libs/shared-types/src/lib/models/`
- Add table type to `ETables` enum
- Business data goes in PouchDB, NOT PostgreSQL

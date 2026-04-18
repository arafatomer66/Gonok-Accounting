Scaffold a new feature page for the Gonok app.

Ask the user for:
1. Feature name (e.g., "invoices", "reports-detail")
2. Which store(s) it needs (CatalogStore, TransactionStore, ExpenseStore, AuthStore)

Then create the following, following existing project patterns:

1. **Component file** at `apps/web/src/app/features/{name}/{name}.component.ts`
   - Standalone Angular component with inline template and SCSS styles
   - Use new control flow syntax (`@if`, `@for`, `@empty`)
   - Inject the relevant store(s)
   - Call `loadAll()` in `ngOnInit` if applicable
   - Include `TranslateModule` in imports for i18n
   - Import variables with `@use '../../../styles/abstracts/variables' as *`

2. **Lazy route** in `apps/web/src/app/app.routes.ts`

3. **Sidebar link** in `apps/web/src/app/layouts/sidebar/sidebar.component.ts`

4. **Translation keys** in both `apps/web/public/assets/i18n/en.json` and `apps/web/public/assets/i18n/bn.json`

Use existing feature components (like products or parties) as reference for the exact patterns.

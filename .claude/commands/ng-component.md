Generate a new Angular standalone component for this project.

## Arguments
- `$ARGUMENTS` — Component name and location (e.g., "features/invoices/invoice-list")

## Instructions

Create a new standalone Angular component at `apps/web/src/app/$ARGUMENTS/$ARGUMENTS.component.ts` following Gonok's patterns:

1. **Standalone component** with inline template and inline styles
2. Use Angular 21 control flow: `@if`, `@for`, `@empty` (NOT `*ngIf`, `*ngFor`)
3. Use **signals** for state (`signal()`, `computed()`)
4. Inject stores via `inject()` — NOT constructor injection
5. Call `store.loadAll()` in `ngOnInit` if data isn't initialized
6. SCSS: use `@use` with relative path to `styles/abstracts/variables`
7. Use global CSS classes: `.card`, `.page-header`, `.btn`, `.btn--primary`, `.form-group`, `.form-input`, `.table-wrapper`, `.table`
8. Use `@ngx-translate` `TranslateModule` for all user-facing text
9. Add a lazy route in `apps/web/src/app/app.routes.ts`
10. Add translations to both `apps/web/public/assets/i18n/en.json` and `bn.json`

## Template

```typescript
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'gonok-COMPONENT_NAME',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  styles: [`
    @use '../../styles/abstracts/variables' as *;
    // adjust @use depth based on component location
  `],
  template: `
    <div class="page-header">
      <h1>{{ 'TRANSLATION_KEY' | translate }}</h1>
    </div>
  `,
})
export class ComponentNameComponent implements OnInit {
  ngOnInit() {}
}
```

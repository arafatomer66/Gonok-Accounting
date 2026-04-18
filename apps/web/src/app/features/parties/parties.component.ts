import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CatalogStore } from '../../core/stores/catalog.store';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { PartyFormComponent } from './party-form/party-form.component';
import { IParty } from '@org/shared-types';

@Component({
  selector: 'gonok-parties',
  standalone: true,
  imports: [
    DecimalPipe,
    SearchInputComponent,
    ConfirmDialogComponent,
    PartyFormComponent,
  ],
  template: `
    <div class="page-header">
      <h1 class="page-header__title">Parties</h1>
      <button class="btn btn--primary" (click)="openForm()">+ New Party</button>
    </div>

    <div class="filter-bar">
      <button
        class="btn btn--sm"
        [class.btn--primary]="filterType() === 'all'"
        [class.btn--ghost]="filterType() !== 'all'"
        (click)="filterType.set('all')"
      >All</button>
      <button
        class="btn btn--sm"
        [class.btn--primary]="filterType() === 'customer'"
        [class.btn--ghost]="filterType() !== 'customer'"
        (click)="filterType.set('customer')"
      >Customers</button>
      <button
        class="btn btn--sm"
        [class.btn--primary]="filterType() === 'supplier'"
        [class.btn--ghost]="filterType() !== 'supplier'"
        (click)="filterType.set('supplier')"
      >Suppliers</button>
    </div>

    <gonok-search-input
      placeholder="Search by name or phone..."
      (searchChange)="searchTerm.set($event)"
    />

    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Type</th>
            <th class="text-right">Balance</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (party of filteredParties(); track party.uuid) {
            <tr>
              <td>{{ party.name }}</td>
              <td>{{ party.phone || '-' }}</td>
              <td>
                <span class="badge"
                  [class.badge--info]="party.party_type === 'customer'"
                  [class.badge--warning]="party.party_type === 'supplier'"
                >
                  {{ party.party_type === 'customer' ? 'Customer' : 'Supplier' }}
                </span>
              </td>
              <td class="col-amount">&#2547;{{ party.current_balance | number:'1.2-2' }}</td>
              <td>
                @if (party.can_delete) {
                  <div class="action-btns">
                    <button class="btn btn--sm btn--ghost" (click)="editParty(party)">Edit</button>
                    <button class="btn btn--sm btn--ghost btn--danger-text" (click)="confirmDelete(party)">Delete</button>
                  </div>
                }
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5" class="text-center text-muted">No parties found.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <div class="summary-bar">
      Total: {{ catalogStore.parties().length }} parties &middot;
      Customers: {{ catalogStore.customers().length }} &middot;
      Suppliers: {{ catalogStore.suppliers().length }}
    </div>

    @if (showForm()) {
      <gonok-party-form
        [party]="editingParty()"
        (saved)="onSaved()"
        (cancelled)="closeForm()"
      />
    }

    <gonok-confirm-dialog
      [visible]="showDeleteConfirm()"
      title="Delete Party"
      [message]="deleteMessage()"
      confirmLabel="Delete"
      variant="danger"
      (confirmed)="doDelete()"
      (cancelled)="showDeleteConfirm.set(false)"
    ></gonok-confirm-dialog>
  `,
  styles: `
    @use '../../../styles/abstracts/variables' as *;

    .filter-bar {
      display: flex;
      gap: $space-2;
      margin-bottom: $space-3;
    }

    .action-btns {
      display: flex;
      gap: $space-1;
    }

    .btn--danger-text {
      color: $color-danger;
      &:hover { background: rgba($color-danger, 0.08); }
    }

    .text-center { text-align: center; }
    .text-muted { color: $color-text-secondary; }

    .summary-bar {
      margin-top: $space-4;
      padding: $space-3 $space-4;
      background: $color-gray-50;
      border-radius: $radius-md;
      font-size: $font-size-sm;
      color: $color-text-secondary;
    }
  `,
})
export class PartiesComponent implements OnInit {
  catalogStore = inject(CatalogStore);

  searchTerm = signal('');
  filterType = signal<'all' | 'customer' | 'supplier'>('all');
  showForm = signal(false);
  editingParty = signal<IParty | null>(null);
  showDeleteConfirm = signal(false);
  deletingParty = signal<IParty | null>(null);

  deleteMessage = computed(
    () => `Delete "${this.deletingParty()?.name || ''}"? This cannot be undone.`,
  );

  filteredParties = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const type = this.filterType();
    let parties = this.catalogStore.allParties();

    if (type !== 'all') {
      parties = parties.filter((p) => p.party_type === type);
    }
    if (term) {
      parties = parties.filter(
        (p) =>
          p.name?.toLowerCase().includes(term) ||
          p.phone?.includes(term),
      );
    }

    // Cash Sale always first, rest alphabetical
    return [...parties].sort((a, b) => {
      if (!a.can_delete) return -1;
      if (!b.can_delete) return 1;
      return (a.name || '').localeCompare(b.name || '', 'en', {
        numeric: true,
      });
    });
  });

  ngOnInit(): void {
    if (!this.catalogStore.initialized()) {
      this.catalogStore.loadAll();
    }
  }

  openForm(): void {
    this.editingParty.set(null);
    this.showForm.set(true);
  }

  editParty(party: IParty): void {
    this.editingParty.set(party);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingParty.set(null);
  }

  onSaved(): void {
    this.closeForm();
  }

  confirmDelete(party: IParty): void {
    this.deletingParty.set(party);
    this.showDeleteConfirm.set(true);
  }

  async doDelete(): Promise<void> {
    const party = this.deletingParty();
    if (party) {
      await this.catalogStore.deleteParty(party.uuid);
    }
    this.showDeleteConfirm.set(false);
    this.deletingParty.set(null);
  }
}

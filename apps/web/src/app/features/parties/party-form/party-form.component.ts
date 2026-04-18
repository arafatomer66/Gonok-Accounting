import { Component, inject, input, output, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogStore } from '../../../core/stores/catalog.store';
import { PartyGroupModalComponent } from '../party-group-modal/party-group-modal.component';
import { IParty, IPartyGroup, EPartyType } from '@org/shared-types';

@Component({
  selector: 'gonok-party-form',
  standalone: true,
  imports: [FormsModule, PartyGroupModalComponent],
  template: `
    <div class="modal-backdrop" (click)="cancelled.emit()">
      <div class="modal modal--wide" (click)="$event.stopPropagation()">
        <div class="modal__header">
          <h3 class="modal__title">{{ party() ? 'Edit Party' : 'New Party' }}</h3>
          <button class="modal__close" (click)="cancelled.emit()">&times;</button>
        </div>
        <form (ngSubmit)="save()" class="modal__body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Party Name *</label>
              <input class="form-input" type="text" [(ngModel)]="name" name="name" placeholder="Party name" required />
            </div>
            <div class="form-group">
              <label class="form-label">Type</label>
              <select class="form-input" [(ngModel)]="partyType" name="partyType">
                <option value="customer">Customer</option>
                <option value="supplier">Supplier</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Phone</label>
              <input class="form-input" type="tel" [(ngModel)]="phone" name="phone" placeholder="01XXXXXXXXX" />
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input class="form-input" type="email" [(ngModel)]="email" name="email" placeholder="email@example.com" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Party Group</label>
              <div class="input-with-action">
                <select class="form-input" [(ngModel)]="groupUuid" name="groupUuid">
                  @for (g of catalogStore.allPartyGroups(); track g.uuid) {
                    <option [value]="g.uuid">{{ g.name }}</option>
                  }
                </select>
                <button class="btn btn--sm btn--ghost" type="button" (click)="showGroupModal.set(true)">+</button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">TIN</label>
              <input class="form-input" type="text" [(ngModel)]="tin" name="tin" placeholder="Tax ID number" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">
                {{ partyType === 'customer' ? 'Opening Receivable' : 'Opening Payable' }}
              </label>
              <input class="form-input" type="number" [(ngModel)]="currentBalance" name="currentBalance" step="0.01" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">Balance Date</label>
              <input class="form-input" type="date" [(ngModel)]="balanceDate" name="balanceDate" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Address</label>
            <textarea class="form-input" [(ngModel)]="address" name="address" rows="2" placeholder="Street address"></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Shipping Address</label>
            <textarea class="form-input" [(ngModel)]="shippingAddress" name="shippingAddress" rows="2" placeholder="Shipping address"></textarea>
          </div>

          @if (error()) {
            <p class="form-error">{{ error() }}</p>
          }
        </form>
        <div class="modal__footer">
          <button class="btn btn--ghost" type="button" (click)="cancelled.emit()">Cancel</button>
          <button class="btn btn--primary" (click)="save()" [disabled]="saving()">
            {{ saving() ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>
    </div>

    @if (showGroupModal()) {
      <gonok-party-group-modal
        (created)="onGroupCreated($event)"
        (closed)="showGroupModal.set(false)"
      />
    }
  `,
  styles: `
    @use '../../../../styles/abstracts/variables' as *;

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: $space-4;
      margin-bottom: $space-4;
      @media (max-width: 640px) { grid-template-columns: 1fr; }
    }

    .form-group { margin-bottom: 0; }

    .input-with-action {
      display: flex;
      gap: $space-2;
      .form-input { flex: 1; }
    }
  `,
})
export class PartyFormComponent implements OnInit {
  catalogStore = inject(CatalogStore);

  party = input<IParty | null>(null);
  saved = output<void>();
  cancelled = output<void>();

  showGroupModal = signal(false);
  saving = signal(false);
  error = signal('');

  name = '';
  partyType: 'customer' | 'supplier' = 'customer';
  phone = '';
  email = '';
  groupUuid = '';
  tin = '';
  currentBalance = 0;
  balanceDate = '';
  address = '';
  shippingAddress = '';

  ngOnInit(): void {
    const p = this.party();
    if (p) {
      this.name = p.name || '';
      this.partyType = p.party_type as 'customer' | 'supplier';
      this.phone = p.phone || '';
      this.email = p.email || '';
      this.groupUuid = p.group_uuid || '';
      this.tin = p.tin || '';
      this.currentBalance = p.current_balance || 0;
      this.balanceDate = p.current_balance_date
        ? new Date(p.current_balance_date).toISOString().split('T')[0]
        : '';
      this.address = p.address || '';
      this.shippingAddress = p.shipping_address || '';
    } else {
      // Default group to General (business uuid)
      const groups = this.catalogStore.allPartyGroups();
      if (groups.length > 0) {
        this.groupUuid = groups[0].uuid;
      }
    }
  }

  async save(): Promise<void> {
    if (!this.name.trim()) {
      this.error.set('Party name is required');
      return;
    }

    const editingUuid = this.party()?.uuid;
    const parties = this.catalogStore.parties();

    const nameDup = parties.some(
      (p) =>
        p.uuid !== editingUuid &&
        p.name?.toLowerCase() === this.name.trim().toLowerCase(),
    );
    if (nameDup) {
      this.error.set('A party with this name already exists');
      return;
    }

    if (this.phone.trim()) {
      if (!/^01[3-9]\d{8}$/.test(this.phone.trim())) {
        this.error.set('Invalid phone number (must be 01XXXXXXXXX)');
        return;
      }
      const phoneDup = parties.some(
        (p) =>
          p.uuid !== editingUuid &&
          p.phone === this.phone.trim(),
      );
      if (phoneDup) {
        this.error.set('A party with this phone number already exists');
        return;
      }
    }

    if (this.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) {
      this.error.set('Invalid email address');
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const data: Partial<IParty> = {
      name: this.name.trim(),
      party_type: this.partyType as EPartyType,
      phone: this.phone.trim() || null,
      email: this.email.trim() || null,
      group_uuid: this.groupUuid || null,
      tin: this.tin.trim() || null,
      current_balance: this.currentBalance || 0,
      current_balance_date: this.balanceDate
        ? new Date(this.balanceDate).getTime()
        : 0,
      address: this.address.trim() || null,
      shipping_address: this.shippingAddress.trim() || null,
    };

    try {
      if (editingUuid) {
        await this.catalogStore.updateParty(editingUuid, data);
      } else {
        await this.catalogStore.addParty(data);
      }
      this.saved.emit();
    } catch (err) {
      this.error.set('Failed to save party');
      this.saving.set(false);
    }
  }

  onGroupCreated(group: IPartyGroup): void {
    this.groupUuid = group.uuid;
    this.showGroupModal.set(false);
  }
}

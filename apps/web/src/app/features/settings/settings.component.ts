import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { PouchDbService } from '../../core/services/pouchdb.service';
import { AuthStore } from '../../core/stores/auth.store';
import {
  ISettings,
  IItemSettings,
  IPartySettings,
  ITransactionSettings,
  IExportSettings,
  ETables,
} from '@org/shared-types';

const DEFAULT_ITEM_SETTINGS: IItemSettings = {
  item_type: 'product',
  active: true,
  barcode_scan_enabled: false,
  stock_maintenance_enabled: true,
  unit_enabled: true,
  category_enabled: true,
  party_wise_rate_enabled: false,
  description_enabled: true,
  item_wise_tax_enabled: true,
  discount_enabled: true,
  quantity_decimal_place: 2,
  mrp_price_enabled: true,
  mrp_price_value: 0,
  batch_no_enabled: false,
  batch_no_value: null,
  exp_date_enabled: false,
  exp_date_format: 'dd/MM/yyyy',
  exp_date_value: null,
  mfg_date_enabled: false,
  mfg_date_format: 'dd/MM/yyyy',
  mfg_date_value: null,
  serial_no_enabled: false,
  serial_no_value: null,
  size_enabled: false,
  size_value: null,
  purchase_price_enabled: true,
  sales_price_enabled: true,
};

const DEFAULT_PARTY_SETTINGS: IPartySettings = {
  party_grouping: true,
  shipping_address_enabled: false,
  shipping_address_print_enabled: false,
  payment_reminder_enabled: false,
  payment_reminder_message: 'Payment is due. Please pay at the earliest.',
  payment_reminder_due_days: 7,
  additional_field_1_enabled: false,
  additional_field_1: null,
  additional_field_1_print_enabled: false,
  additional_field_2_enabled: false,
  additional_field_2: null,
  additional_field_2_print_enabled: false,
  additional_field_3_enabled: false,
  additional_field_3: null,
  additional_field_3_print_enabled: false,
  additional_field_4_enabled: false,
  additional_field_4: null,
  additional_field_4_date_format: 'dd/MM/yyyy',
  additional_field_4_print_enabled: false,
};

const DEFAULT_TX_SETTINGS: ITransactionSettings = {
  invoice_no_enabled: true,
  cash_sale_by_default: true,
  show_parties_billing_name: false,
  customer_PO_details: false,
  inclusive_tax_on_rate: false,
  show_item_purchase_price: true,
  show_item_sales_price: true,
  show_free_item_quantity: false,
  transaction_wise_tax: false,
  transaction_wise_discount: true,
  round_total: true,
  show_invoice_preview: false,
  enable_passcode_on_transaction_delete: false,
  enable_payment_discount: false,
};

const DEFAULT_EXPORT_SETTINGS: IExportSettings = {
  show_title: true,
  show_company_name: true,
  show_company_logo: false,
  show_footer: true,
  show_export_date: true,
  show_merchant_info: true,
};

@Component({
  selector: 'gonok-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <h1 class="page-header__title">Settings</h1>
    </div>

    @if (loading()) {
      <div class="card"><div class="card__body"><p class="text-muted">Loading settings...</p></div></div>
    } @else {
      <!-- Tab bar -->
      <div class="tab-bar">
        <button class="tab" [class.tab--active]="activeTab() === 'item'" (click)="activeTab.set('item')">Item</button>
        <button class="tab" [class.tab--active]="activeTab() === 'party'" (click)="activeTab.set('party')">Party</button>
        <button class="tab" [class.tab--active]="activeTab() === 'transaction'" (click)="activeTab.set('transaction')">Transaction</button>
        <button class="tab" [class.tab--active]="activeTab() === 'export'" (click)="activeTab.set('export')">Export</button>
        <button class="tab" [class.tab--active]="activeTab() === 'storefront'" (click)="activeTab.set('storefront')">Storefront</button>
      </div>

      <!-- Item Settings -->
      @if (activeTab() === 'item') {
        <div class="card">
          <div class="card__header"><h3 class="card__title">Item Settings</h3></div>
          <div class="card__body settings-grid">
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="item.stock_maintenance_enabled" name="stock" />
              <span>Stock Maintenance</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="item.unit_enabled" name="unit" />
              <span>Unit</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="item.category_enabled" name="category" />
              <span>Category</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="item.description_enabled" name="desc" />
              <span>Description</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="item.item_wise_tax_enabled" name="tax" />
              <span>Item-wise Tax</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="item.discount_enabled" name="disc" />
              <span>Discount</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="item.mrp_price_enabled" name="mrp" />
              <span>MRP Price</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="item.barcode_scan_enabled" name="barcode" />
              <span>Barcode Scan</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="item.batch_no_enabled" name="batch" />
              <span>Batch No</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="item.exp_date_enabled" name="exp" />
              <span>Expiry Date</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="item.mfg_date_enabled" name="mfg" />
              <span>Manufacturing Date</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="item.serial_no_enabled" name="serial" />
              <span>Serial No</span>
            </label>
          </div>
        </div>
      }

      <!-- Party Settings -->
      @if (activeTab() === 'party') {
        <div class="card">
          <div class="card__header"><h3 class="card__title">Party Settings</h3></div>
          <div class="card__body settings-grid">
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="party.party_grouping" name="grouping" />
              <span>Party Grouping</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="party.shipping_address_enabled" name="shipping" />
              <span>Shipping Address</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="party.payment_reminder_enabled" name="reminder" />
              <span>Payment Reminder</span>
            </label>
            @if (party.payment_reminder_enabled) {
              <div class="form-group">
                <label class="form-label">Reminder Due Days</label>
                <input class="form-input" type="number" [(ngModel)]="party.payment_reminder_due_days" name="dueDays" min="1" />
              </div>
              <div class="form-group full-width">
                <label class="form-label">Reminder Message</label>
                <textarea class="form-input" [(ngModel)]="party.payment_reminder_message" name="reminderMsg" rows="2"></textarea>
              </div>
            }
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="party.additional_field_1_enabled" name="af1" />
              <span>Additional Field 1</span>
            </label>
            @if (party.additional_field_1_enabled) {
              <div class="form-group">
                <input class="form-input" type="text" [(ngModel)]="party.additional_field_1" name="af1Val" placeholder="Field name" />
              </div>
            }
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="party.additional_field_2_enabled" name="af2" />
              <span>Additional Field 2</span>
            </label>
            @if (party.additional_field_2_enabled) {
              <div class="form-group">
                <input class="form-input" type="text" [(ngModel)]="party.additional_field_2" name="af2Val" placeholder="Field name" />
              </div>
            }
          </div>
        </div>
      }

      <!-- Transaction Settings -->
      @if (activeTab() === 'transaction') {
        <div class="card">
          <div class="card__header"><h3 class="card__title">Transaction Settings</h3></div>
          <div class="card__body settings-grid">
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="tx.invoice_no_enabled" name="invNo" />
              <span>Auto Invoice Number</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="tx.cash_sale_by_default" name="cashDefault" />
              <span>Cash Sale by Default</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="tx.show_item_purchase_price" name="showPP" />
              <span>Show Purchase Price</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="tx.show_item_sales_price" name="showSP" />
              <span>Show Sales Price</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="tx.transaction_wise_discount" name="txDisc" />
              <span>Transaction-wise Discount</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="tx.transaction_wise_tax" name="txTax" />
              <span>Transaction-wise Tax</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="tx.round_total" name="round" />
              <span>Round Total</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="tx.inclusive_tax_on_rate" name="incTax" />
              <span>Inclusive Tax on Rate</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="tx.enable_passcode_on_transaction_delete" name="passcode" />
              <span>Passcode on Delete</span>
            </label>
          </div>
        </div>
      }

      <!-- Export Settings -->
      @if (activeTab() === 'export') {
        <div class="card">
          <div class="card__header"><h3 class="card__title">Export / Print Settings</h3></div>
          <div class="card__body settings-grid">
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="exp.show_title" name="expTitle" />
              <span>Show Title</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="exp.show_company_name" name="expCompany" />
              <span>Show Company Name</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="exp.show_company_logo" name="expLogo" />
              <span>Show Company Logo</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="exp.show_footer" name="expFooter" />
              <span>Show Footer</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="exp.show_export_date" name="expDate" />
              <span>Show Export Date</span>
            </label>
            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="exp.show_merchant_info" name="expMerchant" />
              <span>Show Merchant Info</span>
            </label>
          </div>
        </div>
      }

      <!-- Storefront Settings -->
      @if (activeTab() === 'storefront') {
        <div class="card">
          <div class="card__header"><h3 class="card__title">Storefront Settings</h3></div>
          <div class="card__body">
            <p class="storefront-desc">Enable a public product catalog that customers can browse without logging in.</p>

            <label class="toggle-row" style="margin-bottom: 1rem;">
              <input type="checkbox" [(ngModel)]="storefrontEnabled" name="sfEnabled" />
              <span>Enable Storefront</span>
            </label>

            @if (storefrontEnabled) {
              <div class="form-group">
                <label class="form-label">Store URL Slug</label>
                <input
                  class="form-input"
                  type="text"
                  [(ngModel)]="storefrontSlug"
                  name="sfSlug"
                  placeholder="my-store"
                  pattern="[a-z0-9-]+"
                  maxlength="100"
                />
                <small class="storefront-hint">
                  Only lowercase letters, numbers, and hyphens. Your store will be at: <code>/shop/{{ storefrontSlug || 'my-store' }}</code>
                </small>
              </div>

              @if (storefrontSlug) {
                <button class="btn btn--sm" style="margin-top: 0.5rem;" (click)="copyStorefrontLink()">
                  {{ storefrontLinkCopied() ? 'Copied!' : 'Copy Store Link' }}
                </button>
              }
            }

            <div class="save-bar" style="margin-top: 1.5rem;">
              <button class="btn btn--primary" (click)="saveStorefront()" [disabled]="savingStorefront()">
                {{ savingStorefront() ? 'Saving...' : 'Save Storefront Settings' }}
              </button>
              @if (storefrontSaved()) {
                <span class="save-msg">Storefront settings saved!</span>
              }
              @if (storefrontError()) {
                <span class="save-error">{{ storefrontError() }}</span>
              }
            </div>
          </div>
        </div>
      }

      <div class="save-bar">
        <button class="btn btn--primary" (click)="save()" [disabled]="saving()">
          {{ saving() ? 'Saving...' : 'Save Settings' }}
        </button>
        @if (saved()) {
          <span class="save-msg">Settings saved!</span>
        }
      </div>
    }
  `,
  styles: `
    @use '../../../styles/abstracts/variables' as *;

    .tab-bar {
      display: flex;
      gap: $space-1;
      margin-bottom: $space-4;
      border-bottom: 2px solid $color-border;
      padding-bottom: $space-1;
    }

    .tab {
      padding: $space-2 $space-4;
      border: none;
      background: none;
      cursor: pointer;
      font-size: $font-size-sm;
      font-weight: $font-weight-medium;
      color: $color-text-secondary;
      border-bottom: 2px solid transparent;
      margin-bottom: -3px;
      transition: all $transition-fast;

      &--active {
        color: $color-primary;
        border-bottom-color: $color-primary;
      }
      &:hover { color: $color-primary; }
    }

    .settings-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: $space-3 $space-6;
      @media (max-width: 640px) { grid-template-columns: 1fr; }
    }

    .toggle-row {
      display: flex;
      align-items: center;
      gap: $space-2;
      cursor: pointer;
      font-size: $font-size-sm;

      input[type="checkbox"] {
        width: 18px;
        height: 18px;
        accent-color: $color-primary;
      }
    }

    .full-width { grid-column: 1 / -1; }

    .save-bar {
      margin-top: $space-4;
      display: flex;
      align-items: center;
      gap: $space-3;
    }

    .save-msg {
      color: $color-success;
      font-size: $font-size-sm;
      font-weight: $font-weight-medium;
    }

    .text-muted { color: $color-text-secondary; }

    .storefront-desc {
      font-size: $font-size-sm;
      color: $color-text-secondary;
      margin: 0 0 $space-3;
    }

    .storefront-hint {
      display: block;
      margin-top: $space-1;
      font-size: 12px;
      color: $color-text-secondary;

      code {
        background: darken($color-bg, 5%);
        padding: 1px 4px;
        border-radius: 3px;
      }
    }

    .save-error {
      color: $color-danger;
      font-size: $font-size-sm;
      font-weight: $font-weight-medium;
    }
  `,
})
export class SettingsComponent implements OnInit {
  private pouchDb = inject(PouchDbService);
  private authStore = inject(AuthStore);
  private http = inject(HttpClient);

  loading = signal(true);
  saving = signal(false);
  saved = signal(false);
  activeTab = signal<'item' | 'party' | 'transaction' | 'export' | 'storefront'>('item');

  // Storefront settings
  storefrontSlug = '';
  storefrontEnabled = false;
  savingStorefront = signal(false);
  storefrontSaved = signal(false);
  storefrontError = signal<string | null>(null);
  storefrontLinkCopied = signal(false);

  private settingsUuid = '';

  item: IItemSettings = { ...DEFAULT_ITEM_SETTINGS };
  party: IPartySettings = { ...DEFAULT_PARTY_SETTINGS };
  tx: ITransactionSettings = { ...DEFAULT_TX_SETTINGS };
  exp: IExportSettings = { ...DEFAULT_EXPORT_SETTINGS };

  async ngOnInit(): Promise<void> {
    const bizUuid = this.authStore.activeBusinessUuid();
    if (!bizUuid) {
      this.loading.set(false);
      return;
    }

    try {
      const all = await this.pouchDb.findByBusiness<ISettings>(ETables.SETTINGS, bizUuid);
      if (all.length > 0) {
        const s = all[0];
        this.settingsUuid = s.uuid;
        this.item = { ...DEFAULT_ITEM_SETTINGS, ...s.item_settings };
        this.party = { ...DEFAULT_PARTY_SETTINGS, ...s.party_settings };
        this.tx = { ...DEFAULT_TX_SETTINGS, ...s.transaction_settings };
        this.exp = { ...DEFAULT_EXPORT_SETTINGS, ...s.export_settings };
      }
    } catch {
      // First time — use defaults
    }

    // Load storefront settings from API
    this.http.get<{ success: boolean; data: any }>(`/api/v1/businesses/${bizUuid}`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.storefrontSlug = res.data.slug || '';
          this.storefrontEnabled = res.data.storefront_enabled || false;
        }
      },
    });

    this.loading.set(false);
  }

  async save(): Promise<void> {
    const bizUuid = this.authStore.activeBusinessUuid();
    if (!bizUuid) return;

    this.saving.set(true);
    this.saved.set(false);

    const uuid = this.settingsUuid || crypto.randomUUID();
    const now = Date.now();

    const settings: Record<string, unknown> = {
      uuid,
      table_type: ETables.SETTINGS,
      business_uuid: bizUuid,
      item_settings: { ...this.item },
      party_settings: { ...this.party },
      transaction_settings: { ...this.tx },
      export_settings: { ...this.exp },
      created_at: this.settingsUuid ? undefined : now,
      updated_at: now,
      created_by: null,
      updated_by: null,
    };

    await this.pouchDb.put(ETables.SETTINGS, uuid, settings);
    this.settingsUuid = uuid;
    this.saving.set(false);
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 3000);
  }

  saveStorefront(): void {
    const bizUuid = this.authStore.activeBusinessUuid();
    if (!bizUuid) return;

    // Validate slug format
    const slug = this.storefrontSlug.trim().toLowerCase();
    if (this.storefrontEnabled && !slug) {
      this.storefrontError.set('Please enter a store URL slug');
      return;
    }
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      this.storefrontError.set('Slug can only contain lowercase letters, numbers, and hyphens');
      return;
    }

    this.savingStorefront.set(true);
    this.storefrontError.set(null);
    this.storefrontSaved.set(false);

    this.http
      .put<{ success: boolean; error?: string }>(`/api/v1/businesses/${bizUuid}`, {
        slug: slug || null,
        storefront_enabled: this.storefrontEnabled,
      })
      .subscribe({
        next: () => {
          this.storefrontSlug = slug;
          this.savingStorefront.set(false);
          this.storefrontSaved.set(true);
          setTimeout(() => this.storefrontSaved.set(false), 3000);
        },
        error: (err) => {
          this.savingStorefront.set(false);
          this.storefrontError.set(err.error?.error || 'Failed to save storefront settings');
        },
      });
  }

  copyStorefrontLink(): void {
    const link = `${window.location.origin}/shop/${this.storefrontSlug}`;
    navigator.clipboard.writeText(link).then(() => {
      this.storefrontLinkCopied.set(true);
      setTimeout(() => this.storefrontLinkCopied.set(false), 2000);
    });
  }
}

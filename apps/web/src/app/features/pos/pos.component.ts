import { Component, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { CatalogStore } from '../../core/stores/catalog.store';
import { TransactionStore } from '../../core/stores/transaction.store';
import { AuthStore } from '../../core/stores/auth.store';
import { IProduct, ITransaction, ITransactionItem, ETransactionType, ETransactionMode } from '@org/shared-types';

interface CartItem {
  product: IProduct;
  quantity: number;
  price: number;
  discount: number;
  total: number;
}

interface HeldSale {
  id: string;
  items: CartItem[];
  note: string;
  time: number;
}

@Component({
  selector: 'gonok-pos',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe],
  template: `
    <div class="pos" [class.pos--fullscreen]="isFullscreen()">
      <!-- Header Bar -->
      <header class="pos-header">
        <div class="pos-header__left">
          <button class="pos-btn pos-btn--icon" (click)="goBack()" title="Back to Dashboard">←</button>
          <h1 class="pos-title">POS</h1>
          <span class="pos-date">{{ today | date:'EEE, dd MMM yyyy' }}</span>
        </div>
        <div class="pos-header__right">
          @if (heldSales().length > 0) {
            <button class="pos-btn pos-btn--outline" (click)="showHeldPanel.set(!showHeldPanel())">
              🕐 Held ({{ heldSales().length }})
            </button>
          }
          <button class="pos-btn pos-btn--icon" (click)="toggleFullscreen()" title="Toggle Fullscreen">
            {{ isFullscreen() ? '⊡' : '⊞' }}
          </button>
        </div>
      </header>

      <div class="pos-body">
        <!-- LEFT: Product Grid -->
        <div class="pos-products">
          <!-- Search & Filter Bar -->
          <div class="pos-search-bar">
            <input
              class="pos-search"
              type="text"
              [(ngModel)]="searchTerm"
              name="search"
              placeholder="Search products or scan barcode..."
              (keydown.enter)="onSearchEnter()"
              #searchInput
            />
            <select class="pos-category-filter" [(ngModel)]="filterCategory" name="catFilter">
              <option value="">All Categories</option>
              @for (cat of catalogStore.categories(); track cat.uuid) {
                <option [value]="cat.uuid">{{ cat.name }}</option>
              }
            </select>
          </div>

          <!-- Product Grid -->
          <div class="pos-grid">
            @for (product of filteredProducts(); track product.uuid) {
              <button
                class="product-tile"
                [class.product-tile--low-stock]="product.quantity <= 0"
                (click)="addToCart(product)"
                [disabled]="product.quantity <= 0"
              >
                <div class="product-tile__name">{{ product.name }}</div>
                <div class="product-tile__price">&#2547;{{ product.sales_price | number:'1.0-0' }}</div>
                <div class="product-tile__stock" [class.text-danger]="product.quantity <= 0">
                  {{ product.quantity > 0 ? product.quantity + ' in stock' : 'Out of stock' }}
                </div>
                @if (product.code) {
                  <div class="product-tile__code">{{ product.code }}</div>
                }
              </button>
            } @empty {
              <div class="pos-empty">
                @if (searchTerm) {
                  <p>No products match "{{ searchTerm }}"</p>
                } @else {
                  <p>No products available</p>
                }
              </div>
            }
          </div>
        </div>

        <!-- RIGHT: Cart -->
        <div class="pos-cart">
          <div class="cart-header">
            <h3>Current Sale</h3>
            @if (cart().length > 0) {
              <button class="pos-btn pos-btn--sm pos-btn--ghost" (click)="clearCart()">Clear</button>
            }
          </div>

          <!-- Customer Select -->
          <div class="cart-customer">
            <select class="pos-select" [(ngModel)]="selectedPartyUuid" name="customer">
              @for (party of catalogStore.allParties(); track party.uuid) {
                <option [value]="party.uuid">{{ party.name }}</option>
              }
            </select>
          </div>

          <!-- Cart Items -->
          <div class="cart-items">
            @for (item of cart(); track item.product.uuid; let i = $index) {
              <div class="cart-item">
                <div class="cart-item__info">
                  <div class="cart-item__name">{{ item.product.name }}</div>
                  <div class="cart-item__price">&#2547;{{ item.price | number:'1.0-0' }} x {{ item.quantity }}</div>
                </div>
                <div class="cart-item__actions">
                  <button class="qty-btn" (click)="decrementQty(i)">−</button>
                  <input
                    class="qty-input"
                    type="number"
                    [value]="item.quantity"
                    (change)="setQty(i, $event)"
                    min="1"
                  />
                  <button class="qty-btn" (click)="incrementQty(i)">+</button>
                </div>
                <div class="cart-item__total">
                  &#2547;{{ item.total | number:'1.0-0' }}
                </div>
                <button class="cart-item__remove" (click)="removeFromCart(i)">&times;</button>
              </div>
            } @empty {
              <div class="cart-empty">
                <p>Cart is empty</p>
                <small>Select products to start a sale</small>
              </div>
            }
          </div>

          <!-- Cart Summary -->
          @if (cart().length > 0) {
            <div class="cart-summary">
              <div class="summary-row">
                <span>Subtotal ({{ totalItems() }} items)</span>
                <span>&#2547;{{ subtotal() | number:'1.2-2' }}</span>
              </div>
              <div class="summary-row">
                <span>Discount</span>
                <div class="discount-input-wrap">
                  <span>&#2547;</span>
                  <input
                    class="discount-input"
                    type="number"
                    [(ngModel)]="cartDiscount"
                    name="discount"
                    min="0"
                    [max]="subtotal()"
                  />
                </div>
              </div>
              <div class="summary-row summary-row--grand">
                <span>Total</span>
                <span>&#2547;{{ grandTotal() | number:'1.2-2' }}</span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="cart-actions">
              <button class="pos-btn pos-btn--outline pos-btn--full" (click)="holdSale()">
                🕐 Hold
              </button>
              <button class="pos-btn pos-btn--pay pos-btn--full" (click)="openPayment()">
                💰 Pay &#2547;{{ grandTotal() | number:'1.0-0' }}
              </button>
            </div>
          }
        </div>
      </div>

      <!-- Payment Modal -->
      @if (showPayment()) {
        <div class="modal-backdrop" (click)="closePayment()">
          <div class="payment-modal" (click)="$event.stopPropagation()">
            <div class="payment-header">
              <h3>Payment</h3>
              <button class="modal__close" (click)="closePayment()">&times;</button>
            </div>

            <div class="payment-total">
              <span class="payment-label">Total Amount</span>
              <span class="payment-amount">&#2547;{{ grandTotal() | number:'1.2-2' }}</span>
            </div>

            <!-- Payment Type -->
            <div class="payment-types">
              <button class="pay-type-btn" [class.pay-type-btn--active]="paymentType === 'Cash'" (click)="paymentType = 'Cash'">💵 Cash</button>
              <button class="pay-type-btn" [class.pay-type-btn--active]="paymentType === 'bKash'" (click)="paymentType = 'bKash'">📱 bKash</button>
              <button class="pay-type-btn" [class.pay-type-btn--active]="paymentType === 'Nagad'" (click)="paymentType = 'Nagad'">📱 Nagad</button>
              <button class="pay-type-btn" [class.pay-type-btn--active]="paymentType === 'Cheque'" (click)="paymentType = 'Cheque'">📝 Cheque</button>
            </div>

            <!-- Cash Tendered -->
            @if (paymentType === 'Cash') {
              <div class="cash-section">
                <label class="payment-field-label">Cash Received</label>
                <input
                  class="cash-input"
                  type="number"
                  [(ngModel)]="cashTendered"
                  name="cashTendered"
                  min="0"
                  (input)="calculateChange()"
                />
                <div class="quick-cash">
                  @for (amount of quickCashAmounts; track amount) {
                    <button class="quick-cash-btn" (click)="cashTendered = amount; calculateChange()">
                      &#2547;{{ amount | number:'1.0-0' }}
                    </button>
                  }
                  <button class="quick-cash-btn quick-cash-btn--exact" (click)="cashTendered = grandTotal(); calculateChange()">
                    Exact
                  </button>
                </div>
                @if (cashTendered >= grandTotal()) {
                  <div class="change-display">
                    <span>Change</span>
                    <span class="change-amount">&#2547;{{ changeAmount | number:'1.2-2' }}</span>
                  </div>
                }
              </div>
            }

            @if (paymentType === 'bKash' || paymentType === 'Nagad') {
              <div class="form-group">
                <label class="payment-field-label">Transaction ID</label>
                <input class="form-input" type="text" [(ngModel)]="mobileTxId" name="mobileTxId" placeholder="Enter transaction ID" />
              </div>
            }

            @if (paymentError()) {
              <p class="form-error">{{ paymentError() }}</p>
            }

            <button
              class="pos-btn pos-btn--pay pos-btn--full pos-btn--lg"
              (click)="completeSale()"
              [disabled]="processing()"
            >
              {{ processing() ? 'Processing...' : 'Complete Sale' }}
            </button>
          </div>
        </div>
      }

      <!-- Receipt Modal -->
      @if (showReceipt()) {
        <div class="modal-backdrop">
          <div class="receipt-modal">
            <div class="receipt" id="pos-receipt">
              <div class="receipt-header">
                <h3>{{ businessName }}</h3>
                <p>{{ receiptDate | date:'dd/MM/yyyy hh:mm a' }}</p>
                <p>Invoice: {{ receiptInvoiceNo }}</p>
              </div>
              <div class="receipt-divider">--------------------------------</div>
              @for (item of receiptItems(); track $index) {
                <div class="receipt-item">
                  <span>{{ item.product.name }}</span>
                  <span>{{ item.quantity }} x {{ item.price | number:'1.0-0' }} = {{ item.total | number:'1.0-0' }}</span>
                </div>
              }
              <div class="receipt-divider">--------------------------------</div>
              @if (cartDiscount > 0) {
                <div class="receipt-line">
                  <span>Discount</span>
                  <span>-&#2547;{{ cartDiscount | number:'1.2-2' }}</span>
                </div>
              }
              <div class="receipt-line receipt-line--total">
                <span>TOTAL</span>
                <span>&#2547;{{ receiptTotal | number:'1.2-2' }}</span>
              </div>
              <div class="receipt-line">
                <span>Payment</span>
                <span>{{ paymentType }}</span>
              </div>
              @if (paymentType === 'Cash' && changeAmount > 0) {
                <div class="receipt-line">
                  <span>Cash</span>
                  <span>&#2547;{{ cashTendered | number:'1.2-2' }}</span>
                </div>
                <div class="receipt-line">
                  <span>Change</span>
                  <span>&#2547;{{ changeAmount | number:'1.2-2' }}</span>
                </div>
              }
              <div class="receipt-divider">--------------------------------</div>
              <p class="receipt-thanks">Thank you!</p>
              <p class="receipt-powered">Powered by Gonok</p>
            </div>
            <div class="receipt-actions">
              <button class="pos-btn pos-btn--outline" (click)="printReceipt()">🖨 Print</button>
              <button class="pos-btn pos-btn--pay" (click)="newSale()">New Sale</button>
            </div>
          </div>
        </div>
      }

      <!-- Held Sales Panel -->
      @if (showHeldPanel()) {
        <div class="held-panel-backdrop" (click)="showHeldPanel.set(false)">
          <div class="held-panel" (click)="$event.stopPropagation()">
            <h3>Held Sales</h3>
            @for (held of heldSales(); track held.id) {
              <div class="held-item">
                <div class="held-info">
                  <span class="held-time">{{ held.time | date:'hh:mm a' }}</span>
                  <span class="held-count">{{ held.items.length }} items</span>
                  @if (held.note) {
                    <span class="held-note">{{ held.note }}</span>
                  }
                </div>
                <div class="held-actions">
                  <button class="pos-btn pos-btn--sm pos-btn--pay" (click)="recallSale(held)">Recall</button>
                  <button class="pos-btn pos-btn--sm pos-btn--ghost" (click)="deleteHeld(held)">&times;</button>
                </div>
              </div>
            } @empty {
              <p class="text-muted">No held sales</p>
            }
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './pos.component.scss',
})
export class PosComponent implements OnInit {
  catalogStore = inject(CatalogStore);
  private transactionStore = inject(TransactionStore);
  private authStore = inject(AuthStore);
  private router = inject(Router);

  today = Date.now();
  searchTerm = '';
  filterCategory = '';
  isFullscreen = signal(false);
  showPayment = signal(false);
  showReceipt = signal(false);
  showHeldPanel = signal(false);
  processing = signal(false);
  paymentError = signal('');

  // Cart
  cart = signal<CartItem[]>([]);
  cartDiscount = 0;
  selectedPartyUuid = '';

  // Payment
  paymentType = 'Cash';
  cashTendered = 0;
  changeAmount = 0;
  mobileTxId = '';

  // Receipt
  receiptItems = signal<CartItem[]>([]);
  receiptTotal = 0;
  receiptDate = 0;
  receiptInvoiceNo = '';
  businessName = '';

  // Held Sales
  heldSales = signal<HeldSale[]>([]);

  // Quick cash amounts
  quickCashAmounts = [100, 200, 500, 1000, 2000, 5000];

  // Computed
  filteredProducts = computed(() => {
    let products = this.catalogStore.products().filter((p) => p.active !== false);
    const term = this.searchTerm.toLowerCase();

    if (term) {
      products = products.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(term) ||
          (p.code || '').toLowerCase().includes(term),
      );
    }

    if (this.filterCategory) {
      products = products.filter((p) => p.category_uuid === this.filterCategory);
    }

    return products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  });

  subtotal = computed(() =>
    this.cart().reduce((s, item) => s + item.total, 0),
  );

  totalItems = computed(() =>
    this.cart().reduce((s, item) => s + item.quantity, 0),
  );

  grandTotal = computed(() =>
    Math.max(0, this.subtotal() - this.cartDiscount),
  );

  ngOnInit(): void {
    if (!this.catalogStore.initialized()) this.catalogStore.loadAll();
    if (!this.transactionStore.initialized()) this.transactionStore.loadAll();

    const biz = this.authStore.activeBusiness();
    this.businessName = biz?.name_en || biz?.name_bn || 'Business';
    this.selectedPartyUuid = biz?.uuid || '';

    // Load held sales from sessionStorage
    const held = sessionStorage.getItem('gonok_held_sales');
    if (held) {
      this.heldSales.set(JSON.parse(held));
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    // F11 for fullscreen
    if (event.key === 'F11') {
      event.preventDefault();
      this.toggleFullscreen();
    }
    // Escape to close modals
    if (event.key === 'Escape') {
      if (this.showReceipt()) return; // Don't close receipt accidentally
      if (this.showPayment()) this.closePayment();
      if (this.showHeldPanel()) this.showHeldPanel.set(false);
    }
    // F2 to focus search
    if (event.key === 'F2') {
      event.preventDefault();
      const input = document.querySelector('.pos-search') as HTMLInputElement;
      input?.focus();
    }
    // F4 to pay
    if (event.key === 'F4' && this.cart().length > 0 && !this.showPayment()) {
      event.preventDefault();
      this.openPayment();
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  toggleFullscreen(): void {
    this.isFullscreen.update((v) => !v);
  }

  // ─── Cart Operations ───
  addToCart(product: IProduct): void {
    if (product.quantity <= 0) return;

    this.cart.update((items) => {
      const existing = items.find((i) => i.product.uuid === product.uuid);
      if (existing) {
        if (existing.quantity >= product.quantity) return items; // Don't exceed stock
        return items.map((i) =>
          i.product.uuid === product.uuid
            ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price }
            : i,
        );
      }
      return [...items, {
        product,
        quantity: 1,
        price: product.sales_price,
        discount: 0,
        total: product.sales_price,
      }];
    });
  }

  onSearchEnter(): void {
    // If search matches exactly one product by code, add it
    const term = this.searchTerm.toLowerCase();
    const match = this.catalogStore.products().find(
      (p) => (p.code || '').toLowerCase() === term && p.quantity > 0,
    );
    if (match) {
      this.addToCart(match);
      this.searchTerm = '';
    }
  }

  incrementQty(index: number): void {
    this.cart.update((items) => {
      const item = items[index];
      if (item.quantity >= item.product.quantity) return items;
      return items.map((i, idx) =>
        idx === index
          ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price }
          : i,
      );
    });
  }

  decrementQty(index: number): void {
    this.cart.update((items) => {
      const item = items[index];
      if (item.quantity <= 1) return items.filter((_, idx) => idx !== index);
      return items.map((i, idx) =>
        idx === index
          ? { ...i, quantity: i.quantity - 1, total: (i.quantity - 1) * i.price }
          : i,
      );
    });
  }

  setQty(index: number, event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    if (isNaN(value) || value < 1) return;

    this.cart.update((items) => {
      const item = items[index];
      const qty = Math.min(value, item.product.quantity);
      return items.map((i, idx) =>
        idx === index
          ? { ...i, quantity: qty, total: qty * i.price }
          : i,
      );
    });
  }

  removeFromCart(index: number): void {
    this.cart.update((items) => items.filter((_, i) => i !== index));
  }

  clearCart(): void {
    this.cart.set([]);
    this.cartDiscount = 0;
  }

  // ─── Hold & Recall ───
  holdSale(): void {
    if (this.cart().length === 0) return;

    const held: HeldSale = {
      id: crypto.randomUUID(),
      items: [...this.cart()],
      note: `${this.totalItems()} items - ৳${this.grandTotal().toFixed(0)}`,
      time: Date.now(),
    };

    this.heldSales.update((sales) => [...sales, held]);
    this.saveHeldSales();
    this.clearCart();
  }

  recallSale(held: HeldSale): void {
    this.cart.set([...held.items]);
    this.heldSales.update((sales) => sales.filter((s) => s.id !== held.id));
    this.saveHeldSales();
    this.showHeldPanel.set(false);
  }

  deleteHeld(held: HeldSale): void {
    this.heldSales.update((sales) => sales.filter((s) => s.id !== held.id));
    this.saveHeldSales();
  }

  private saveHeldSales(): void {
    sessionStorage.setItem('gonok_held_sales', JSON.stringify(this.heldSales()));
  }

  // ─── Payment ───
  openPayment(): void {
    this.paymentType = 'Cash';
    this.cashTendered = 0;
    this.changeAmount = 0;
    this.mobileTxId = '';
    this.paymentError.set('');
    this.showPayment.set(true);
  }

  closePayment(): void {
    this.showPayment.set(false);
  }

  calculateChange(): void {
    this.changeAmount = Math.max(0, this.cashTendered - this.grandTotal());
  }

  async completeSale(): Promise<void> {
    if (this.paymentType === 'Cash' && this.cashTendered < this.grandTotal()) {
      this.paymentError.set('Cash received is less than the total amount');
      return;
    }

    if (['bKash', 'Nagad'].includes(this.paymentType) && !this.mobileTxId.trim()) {
      this.paymentError.set('Transaction ID is required');
      return;
    }

    this.processing.set(true);
    this.paymentError.set('');

    const items = this.cart();
    const total = this.grandTotal();

    const txData: Partial<ITransaction> = {
      type: ETransactionType.SALES,
      party_uuid: this.selectedPartyUuid || null,
      transaction_date: Date.now(),
      transaction_mode: ETransactionMode.CASH,
      payment_type: this.paymentType,
      mobile_tx_id: this.mobileTxId.trim() || null,
      discount: this.cartDiscount,
      total_amount: total,
      paid_amount: total,
      due_amount: 0,
    };

    const txItems: Partial<ITransactionItem>[] = items.map((item) => ({
      item_uuid: item.product.uuid,
      sales_price: item.price,
      purchase_price: item.product.purchase_price,
      quantity: item.quantity,
      item_wise_tax: 0,
      total_tax: 0,
    }));

    try {
      const tx = await this.transactionStore.addTransaction(txData, txItems);

      // Show receipt
      this.receiptItems.set([...items]);
      this.receiptTotal = total;
      this.receiptDate = Date.now();
      this.receiptInvoiceNo = tx.invoice_no || tx.order_number || '';
      this.showPayment.set(false);
      this.showReceipt.set(true);
    } catch {
      this.paymentError.set('Failed to save sale. Please try again.');
    }

    this.processing.set(false);
  }

  // ─── Receipt ───
  printReceipt(): void {
    window.print();
  }

  newSale(): void {
    this.showReceipt.set(false);
    this.clearCart();
    this.today = Date.now();
  }
}

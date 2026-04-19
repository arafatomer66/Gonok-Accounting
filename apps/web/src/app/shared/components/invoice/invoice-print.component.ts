import { Component, input, output, inject, OnInit } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { ITransaction } from '@org/shared-types';
import { CatalogStore } from '../../../core/stores/catalog.store';
import { AuthStore } from '../../../core/stores/auth.store';

@Component({
  selector: 'gonok-invoice-print',
  standalone: true,
  imports: [DecimalPipe, DatePipe],
  template: `
    @if (visible()) {
      <div class="print-backdrop" (click)="closed.emit()">
        <div class="print-container" (click)="$event.stopPropagation()">
          <div class="print-actions no-print">
            <button class="btn btn--primary" (click)="print()">🖨️ Print</button>
            <button class="btn btn--ghost" (click)="closed.emit()">Close</button>
          </div>

          <div class="invoice" id="invoice-content">
            <!-- Header -->
            <div class="invoice-header">
              <div class="invoice-brand">
                <h2 class="invoice-company">{{ businessName }}</h2>
                @if (businessPhone) {
                  <p class="invoice-company-detail">{{ businessPhone }}</p>
                }
              </div>
              <div class="invoice-meta">
                <h3 class="invoice-title">{{ invoiceTitle }}</h3>
                <table class="meta-table">
                  <tr>
                    <td class="meta-label">{{ refLabel }}:</td>
                    <td class="meta-value">{{ refNo }}</td>
                  </tr>
                  <tr>
                    <td class="meta-label">Date:</td>
                    <td class="meta-value">{{ tx().transaction_date | date:'dd/MM/yyyy' }}</td>
                  </tr>
                </table>
              </div>
            </div>

            <hr class="divider" />

            <!-- Party Info -->
            <div class="invoice-party">
              <div>
                <p class="party-label">{{ partyTypeLabel }}</p>
                <p class="party-name">{{ partyName }}</p>
                @if (partyPhone) {
                  <p class="party-detail">Phone: {{ partyPhone }}</p>
                }
              </div>
              <div class="invoice-payment">
                <p><strong>Payment:</strong> {{ tx().payment_type || 'Cash' }}</p>
                <p><strong>Mode:</strong> {{ tx().transaction_mode || 'Cash' }}</p>
              </div>
            </div>

            <!-- Items Table -->
            <table class="invoice-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item</th>
                  <th class="text-right">Price</th>
                  <th class="text-right">Qty</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                @for (item of tx().items; track item.uuid; let i = $index) {
                  <tr>
                    <td>{{ i + 1 }}</td>
                    <td>{{ getProductName(item.item_uuid) }}</td>
                    <td class="text-right">{{ getItemPrice(item) | number:'1.2-2' }}</td>
                    <td class="text-right">{{ item.quantity }}</td>
                    <td class="text-right">{{ getItemAmount(item) | number:'1.2-2' }}</td>
                  </tr>
                }
              </tbody>
            </table>

            <!-- Totals -->
            <div class="invoice-totals">
              <div class="total-line">
                <span>Subtotal</span>
                <span>&#2547;{{ tx().total_amount + tx().discount | number:'1.2-2' }}</span>
              </div>
              @if (tx().discount) {
                <div class="total-line">
                  <span>Discount</span>
                  <span>- &#2547;{{ tx().discount | number:'1.2-2' }}</span>
                </div>
              }
              <div class="total-line total-line--grand">
                <span>Total</span>
                <span>&#2547;{{ tx().total_amount | number:'1.2-2' }}</span>
              </div>
              @if (tx().transaction_mode === 'Credit') {
                <div class="total-line">
                  <span>Paid</span>
                  <span>&#2547;{{ tx().paid_amount | number:'1.2-2' }}</span>
                </div>
                <div class="total-line total-line--due">
                  <span>Due</span>
                  <span>&#2547;{{ tx().due_amount | number:'1.2-2' }}</span>
                </div>
              }
            </div>

            @if (tx().description) {
              <div class="invoice-notes">
                <p class="notes-label">Notes:</p>
                <p>{{ tx().description }}</p>
              </div>
            }

            <!-- Footer -->
            <div class="invoice-footer">
              <div class="signature-line">
                <div class="sig">
                  <div class="sig-line"></div>
                  <span>Authorized Signature</span>
                </div>
                <div class="sig">
                  <div class="sig-line"></div>
                  <span>Customer Signature</span>
                </div>
              </div>
              <p class="invoice-thanks">Thank you for your business!</p>
              <p class="invoice-powered">Powered by Gonok (গণক)</p>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .print-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      display: flex;
      justify-content: center;
      overflow-y: auto;
      padding: 20px;
    }

    .print-container {
      background: white;
      width: 100%;
      max-width: 800px;
      border-radius: 8px;
      position: relative;
      height: fit-content;
    }

    .print-actions {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0;
      position: sticky;
      top: 0;
      background: white;
      border-radius: 8px 8px 0 0;
      z-index: 1;
    }

    .invoice {
      padding: 40px;
      font-family: 'Segoe UI', system-ui, sans-serif;
      color: #1e293b;
      font-size: 14px;
      line-height: 1.5;
    }

    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .invoice-company {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }

    .invoice-company-detail {
      color: #64748b;
      font-size: 13px;
      margin: 2px 0 0;
    }

    .invoice-title {
      font-size: 18px;
      font-weight: 600;
      color: #4f46e5;
      text-transform: uppercase;
      margin: 0 0 8px;
      text-align: right;
    }

    .meta-table {
      margin-left: auto;
    }

    .meta-label {
      color: #64748b;
      padding-right: 12px;
      font-size: 13px;
      text-align: right;
    }

    .meta-value {
      font-weight: 600;
      font-size: 13px;
    }

    .divider {
      border: none;
      border-top: 2px solid #e2e8f0;
      margin: 16px 0;
    }

    .invoice-party {
      display: flex;
      justify-content: space-between;
      margin-bottom: 24px;
    }

    .party-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94a3b8;
      margin: 0 0 4px;
    }

    .party-name {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 2px;
    }

    .party-detail {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }

    .invoice-payment p {
      margin: 2px 0;
      font-size: 13px;
      text-align: right;
    }

    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    .invoice-table th {
      background: #f1f5f9;
      padding: 10px 12px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      font-weight: 600;
      border-bottom: 2px solid #e2e8f0;
    }

    .invoice-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #f1f5f9;
    }

    .text-right {
      text-align: right;
    }

    .invoice-totals {
      margin-left: auto;
      width: 280px;
      margin-bottom: 24px;
    }

    .total-line {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 14px;
    }

    .total-line--grand {
      font-weight: 700;
      font-size: 16px;
      border-top: 2px solid #1e293b;
      padding-top: 8px;
      margin-top: 4px;
    }

    .total-line--due {
      color: #dc2626;
      font-weight: 600;
    }

    .invoice-notes {
      background: #f8fafc;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 24px;
      font-size: 13px;
    }

    .notes-label {
      font-weight: 600;
      margin: 0 0 4px;
      font-size: 12px;
      color: #64748b;
    }

    .invoice-notes p:last-child {
      margin: 0;
    }

    .invoice-footer {
      margin-top: 40px;
      text-align: center;
    }

    .signature-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 32px;
      padding: 0 24px;
    }

    .sig {
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }

    .sig-line {
      width: 160px;
      border-bottom: 1px solid #cbd5e1;
      margin-bottom: 6px;
      height: 40px;
    }

    .invoice-thanks {
      font-size: 14px;
      font-weight: 600;
      color: #4f46e5;
      margin: 0 0 4px;
    }

    .invoice-powered {
      font-size: 11px;
      color: #94a3b8;
      margin: 0;
    }

    @media print {
      .no-print { display: none !important; }
      .print-backdrop {
        background: none;
        padding: 0;
        position: static;
      }
      .print-container {
        border-radius: 0;
        box-shadow: none;
        max-width: none;
      }
      .invoice {
        padding: 20px;
      }
    }
  `,
})
export class InvoicePrintComponent implements OnInit {
  private catalogStore = inject(CatalogStore);
  private authStore = inject(AuthStore);

  tx = input.required<ITransaction>();
  visible = input(false);
  closed = output<void>();

  businessName = '';
  businessPhone = '';
  invoiceTitle = '';
  refLabel = '';
  refNo = '';
  partyTypeLabel = '';
  partyName = '';
  partyPhone = '';

  ngOnInit(): void {
    this.updateInfo();
  }

  private updateInfo(): void {
    const biz = this.authStore.activeBusiness();
    this.businessName = biz?.name_en || biz?.name_bn || 'Business';
    this.businessPhone = biz?.phone || '';

    const t = this.tx();
    const typeMap: Record<string, { title: string; refLabel: string; partyLabel: string }> = {
      sales: { title: 'Invoice', refLabel: 'Invoice No', partyLabel: 'Bill To' },
      purchase: { title: 'Purchase Bill', refLabel: 'Bill No', partyLabel: 'Supplier' },
      sales_return: { title: 'Sales Return', refLabel: 'Return No', partyLabel: 'Customer' },
      purchase_return: { title: 'Purchase Return', refLabel: 'Return No', partyLabel: 'Supplier' },
      payment_in: { title: 'Payment Receipt', refLabel: 'Receipt No', partyLabel: 'Received From' },
      payment_out: { title: 'Payment Voucher', refLabel: 'Voucher No', partyLabel: 'Paid To' },
    };

    const info = typeMap[t.type || ''] || { title: 'Transaction', refLabel: 'Ref', partyLabel: 'Party' };
    this.invoiceTitle = info.title;
    this.refLabel = info.refLabel;
    this.refNo = t.invoice_no || t.order_number || t.return_no || '-';
    this.partyTypeLabel = info.partyLabel;

    const party = this.catalogStore.parties().find((p) => p.uuid === t.party_uuid);
    this.partyName = party?.name || 'Cash Sale';
    this.partyPhone = party?.phone || '';
  }

  getProductName(itemUuid: string | null): string {
    if (!itemUuid) return '-';
    const product = this.catalogStore.products().find((p) => p.uuid === itemUuid);
    return product?.name || '-';
  }

  getItemPrice(item: any): number {
    const t = this.tx();
    if (t.type === 'sales' || t.type === 'sales_return') return item.sales_price || 0;
    return item.purchase_price || 0;
  }

  getItemAmount(item: any): number {
    return this.getItemPrice(item) * (item.quantity || 0);
  }

  print(): void {
    window.print();
  }
}

import { Component, input, output, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { IDelivery, IDeliveryItem, ETables } from '@org/shared-types';
import { CatalogStore } from '../../../core/stores/catalog.store';
import { AuthStore } from '../../../core/stores/auth.store';
import { PouchDbService } from '../../../core/services/pouchdb.service';

@Component({
  selector: 'gonok-challan-print',
  standalone: true,
  imports: [DatePipe],
  template: `
    @if (visible()) {
      <div class="print-backdrop" (click)="closed.emit()">
        <div class="print-container" (click)="$event.stopPropagation()">
          <div class="print-actions no-print">
            <button class="btn btn--primary" (click)="print()">🖨️ Print Challan</button>
            <button class="btn btn--ghost" (click)="closed.emit()">Close</button>
          </div>

          <div class="challan">
            <!-- Header -->
            <div class="challan-header">
              <div class="challan-brand">
                <h2 class="challan-company">{{ businessName }}</h2>
                @if (businessPhone) {
                  <p class="challan-detail">{{ businessPhone }}</p>
                }
              </div>
              <div class="challan-meta">
                <h3 class="challan-title">DELIVERY CHALLAN</h3>
                <h3 class="challan-title challan-title--bn">ডেলিভারি চালান</h3>
              </div>
            </div>

            <div class="challan-divider"></div>

            <!-- Info Grid -->
            <div class="challan-info">
              <div class="challan-info__col">
                <div class="info-row"><span class="info-label">Challan No:</span> <strong>{{ delivery().delivery_no }}</strong></div>
                <div class="info-row"><span class="info-label">Date:</span> {{ delivery().delivery_date | date:'dd/MM/yyyy' }}</div>
                @if (delivery().transaction_uuid) {
                  <div class="info-row"><span class="info-label">Sale Ref:</span> {{ saleRef }}</div>
                }
              </div>
              <div class="challan-info__col">
                <div class="info-row"><span class="info-label">To:</span> <strong>{{ partyName }}</strong></div>
                @if (delivery().delivery_address) {
                  <div class="info-row"><span class="info-label">Address:</span> {{ delivery().delivery_address }}</div>
                }
                @if (partyPhone) {
                  <div class="info-row"><span class="info-label">Phone:</span> {{ partyPhone }}</div>
                }
              </div>
            </div>

            <!-- Driver Info -->
            @if (delivery().driver_name || delivery().vehicle_no) {
              <div class="challan-driver">
                @if (delivery().driver_name) {
                  <span>Driver: <strong>{{ delivery().driver_name }}</strong></span>
                }
                @if (delivery().driver_phone) {
                  <span>Ph: {{ delivery().driver_phone }}</span>
                }
                @if (delivery().vehicle_no) {
                  <span>Vehicle: <strong>{{ delivery().vehicle_no }}</strong></span>
                }
              </div>
            }

            <div class="challan-divider"></div>

            <!-- Items Table -->
            <table class="challan-table">
              <thead>
                <tr>
                  <th class="col-sl">#</th>
                  <th>Item Description</th>
                  <th class="col-qty">Ordered</th>
                  <th class="col-qty">Delivered</th>
                </tr>
              </thead>
              <tbody>
                @for (item of items(); track item.uuid; let i = $index) {
                  <tr>
                    <td class="col-sl">{{ i + 1 }}</td>
                    <td>{{ getProductName(item.item_uuid) }}</td>
                    <td class="col-qty">{{ item.ordered_quantity }}</td>
                    <td class="col-qty"><strong>{{ item.delivered_quantity }}</strong></td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" class="text-right"><strong>Total</strong></td>
                  <td class="col-qty">{{ totalOrdered }}</td>
                  <td class="col-qty"><strong>{{ totalDelivered }}</strong></td>
                </tr>
              </tfoot>
            </table>

            <!-- Notes -->
            @if (delivery().notes) {
              <div class="challan-notes">
                <strong>Notes:</strong> {{ delivery().notes }}
              </div>
            }

            <div class="challan-divider"></div>

            <!-- Signatures -->
            <div class="challan-signatures">
              <div class="sig-block">
                <div class="sig-line"></div>
                <p>Prepared By</p>
              </div>
              <div class="sig-block">
                <div class="sig-line"></div>
                <p>Delivered By</p>
              </div>
              <div class="sig-block">
                <div class="sig-line"></div>
                <p>Received By</p>
              </div>
            </div>

            <p class="challan-footer">This is a delivery note. No payment is due against this document.</p>
            <p class="challan-powered">Powered by Gonok</p>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    @use '../../../../styles/abstracts/variables' as *;

    .print-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 800;
      display: flex;
      justify-content: center;
      overflow-y: auto;
      padding: $space-6;
    }

    .print-container {
      width: 700px;
      max-width: 100%;
    }

    .print-actions {
      display: flex;
      gap: $space-2;
      margin-bottom: $space-3;
      justify-content: flex-end;
    }

    .challan {
      background: white;
      padding: 40px;
      font-size: 13px;
      line-height: 1.5;
      color: #1a1a1a;
    }

    .challan-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .challan-company {
      margin: 0;
      font-size: 20px;
      color: #1e40af;
    }

    .challan-detail {
      margin: 2px 0 0;
      color: #666;
      font-size: 12px;
    }

    .challan-title {
      margin: 0;
      font-size: 18px;
      text-align: right;
      color: #1e40af;
      letter-spacing: 2px;

      &--bn {
        font-size: 14px;
        color: #666;
        letter-spacing: 0;
      }
    }

    .challan-divider {
      border-top: 2px solid #1e40af;
      margin: 16px 0;
    }

    .challan-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 16px;
    }

    .info-row {
      font-size: 12px;
      margin-bottom: 4px;
    }

    .info-label {
      color: #666;
    }

    .challan-driver {
      display: flex;
      gap: 24px;
      padding: 8px 12px;
      background: #f8fafc;
      border-radius: 6px;
      font-size: 12px;
      margin-bottom: 8px;
    }

    .challan-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;

      th, td {
        border: 1px solid #e2e8f0;
        padding: 8px 12px;
        font-size: 12px;
      }

      th {
        background: #f1f5f9;
        font-weight: 600;
        text-align: left;
      }

      tfoot td {
        background: #f8fafc;
        font-weight: 600;
      }
    }

    .col-sl { width: 40px; text-align: center; }
    .col-qty { width: 80px; text-align: center; }
    .text-right { text-align: right; }

    .challan-notes {
      font-size: 12px;
      padding: 8px 12px;
      background: #fefce8;
      border-radius: 6px;
      margin-bottom: 8px;
    }

    .challan-signatures {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 24px;
      margin-top: 48px;
    }

    .sig-block {
      text-align: center;
      p { margin: 4px 0 0; font-size: 11px; color: #666; }
    }

    .sig-line {
      border-top: 1px solid #333;
      width: 100%;
    }

    .challan-footer {
      text-align: center;
      font-size: 10px;
      color: #999;
      margin-top: 24px;
      font-style: italic;
    }

    .challan-powered {
      text-align: center;
      font-size: 9px;
      color: #ccc;
      margin-top: 4px;
    }

    @media print {
      .print-backdrop { position: static; background: none; padding: 0; }
      .print-container { width: 100%; }
      .no-print { display: none !important; }
      .challan { padding: 20px; box-shadow: none; }
    }
  `,
})
export class ChallanPrintComponent implements OnInit {
  private catalogStore = inject(CatalogStore);
  private authStore = inject(AuthStore);
  private pouchDb = inject(PouchDbService);

  delivery = input.required<IDelivery>();
  visible = input(false);
  closed = output<void>();

  items = signal<IDeliveryItem[]>([]);
  businessName = '';
  businessPhone = '';
  partyName = '';
  partyPhone = '';
  saleRef = '';
  totalOrdered = 0;
  totalDelivered = 0;

  async ngOnInit(): Promise<void> {
    const biz = this.authStore.activeBusiness();
    this.businessName = biz?.name_en || biz?.name_bn || '';
    this.businessPhone = biz?.phone || '';

    const d = this.delivery();
    const party = this.catalogStore.allParties().find((p) => p.uuid === d.party_uuid);
    this.partyName = party?.name || '-';
    this.partyPhone = party?.phone || '';

    // Load items
    const bizUuid = this.authStore.activeBusinessUuid();
    if (bizUuid) {
      const allItems = await this.pouchDb.findByBusiness<IDeliveryItem>(ETables.DELIVERY_ITEM, bizUuid);
      const dItems = allItems.filter((i) => i.delivery_uuid === d.uuid);
      this.items.set(dItems);
      this.totalOrdered = dItems.reduce((s, i) => s + i.ordered_quantity, 0);
      this.totalDelivered = dItems.reduce((s, i) => s + i.delivered_quantity, 0);
    }

    if (d.transaction_uuid) {
      this.saleRef = d.transaction_uuid.slice(0, 8).toUpperCase();
    }
  }

  getProductName(uuid: string | null): string {
    if (!uuid) return '-';
    return this.catalogStore.products().find((p) => p.uuid === uuid)?.name || '-';
  }

  print(): void {
    window.print();
  }
}

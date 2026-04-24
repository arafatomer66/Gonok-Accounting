# গণক (Gonok) — Feature Roadmap

Next features to build, prioritized by revenue impact, user retention, and competitive gap analysis against Bangladeshi competitors (HishabPati, Hishabee, Haal Khata, Biznify, etc.).

---

## Phase 1: "Get Paid" — Revenue Essentials

Features that close the biggest gaps vs competitors. These are table-stakes features that BD shop owners expect.

### 1.1 PDF Invoice Generation
- **Status:** Not started
- **Why:** Businesses need to send invoices via WhatsApp/email. Currently only browser `window.print()`. Every competitor has PDF invoices.
- **How:** Use `jspdf` + `html2canvas` in-browser (offline-first). Reuse existing `InvoicePrintComponent` HTML template. Add shared `PdfService` in `core/services/`. Web Share API for mobile sharing.
- **Key files:** `apps/web/src/app/shared/components/invoice/invoice-print.component.ts`

### 1.2 Bluetooth Thermal Printer Support
- **Status:** Not started
- **Why:** HishabPati and Hishabee both support portable Bluetooth thermal printers. Every BD retail shop uses them for receipts. This is the #1 feature gap for POS users.
- **How:** Use Web Bluetooth API (`navigator.bluetooth`) or WebSerial API to connect to ESC/POS compatible thermal printers. Create a `ThermalPrintService` that formats receipt data into ESC/POS commands. Add "Print Receipt" button in POS and sales pages.
- **Key files:** `apps/web/src/app/features/pos/pos.component.ts`, new `core/services/thermal-print.service.ts`

### 1.3 WhatsApp Invoice Share
- **Status:** Not started (depends on 1.1)
- **Why:** WhatsApp is THE business communication channel in Bangladesh. Combined with PDF generation, this lets users generate and share professional invoices in two taps.
- **How:** `navigator.share({ files: [pdfBlob] })` on mobile, `wa.me` deep link with text summary on desktop. Add shared `ShareService`. Zero server-side changes.
- **Key files:** New `core/services/share.service.ts`, invoice-print component

### 1.4 SMS/WhatsApp Payment Reminders
- **Status:** Not started
- **Why:** Due collection is the #1 pain point for BD wholesale/retail businesses. Hishabee has SMS reminders. The due-list page exists but is passive — no way to ping customers.
- **How:** Server-side API endpoint (`POST /api/v1/sms/send-reminder`) integrating with SSLWireless or BulkSMSBD (0.25-0.50 BDT/SMS). "Send Reminder" button on due-list page. Bulk "Send All Reminders" option. SMS provider config in settings.
- **Existing foundation:** `IPartySettings` already has `payment_reminder_enabled`, `payment_reminder_message`, `payment_reminder_due_days`. `TransactionStore` computes `overdueTransactions`.
- **Key files:** `apps/web/src/app/features/due-list/`, new `apps/api/src/routes/sms.routes.ts`, new `apps/api/src/services/sms.service.ts`

### 1.5 Barcode Scanning (Camera-based)
- **Status:** Not started (settings toggle exists but no implementation)
- **Why:** HishabPati has barcode scanning. POS search says "scan barcode" but it doesn't work. Retail shops need fast product lookup by scanning.
- **How:** Use `html5-qrcode` library for camera scanning. Create shared `BarcodeScanner` component for POS, products, and stock transfer pages. Match scanned code against `IProduct.code` field. Camera needs HTTPS (already have via Caddy).
- **Key files:** New `shared/components/barcode-scanner/`, `apps/web/src/app/features/pos/pos.component.ts`

### 1.6 Barcode Label Printing
- **Status:** Not started (depends on 1.5)
- **Why:** Hishabee can print barcode labels. Completes the barcode workflow: print labels → stick on products → scan at POS.
- **How:** Use `jsbarcode` library to generate barcode SVGs. Create a label template component with product name + price + barcode. Support batch printing (select multiple products → print sheet of labels).
- **Key files:** New `shared/components/barcode-label/`, `apps/web/src/app/features/products/`

### 1.7 VAT/Tax Management (Bangladesh NBR)
- **Status:** Not started (data model partially supports it)
- **Why:** Bangladesh NBR requires 15% VAT for businesses above 30 lakh BDT turnover. Can't do formal invoicing without it. Biznify, Tally, AmarSolution all have NBR-ready VAT.
- **How:** Add `TAX_RATE` entity to PouchDB (uuid, name, rate, type: inclusive/exclusive, is_default). Predefined BD VAT rates: 15%, 7.5%, 5%, exempt. Tax rate selector in transaction form. VAT summary on invoices. New "VAT Report" under reports.
- **Existing foundation:** `ITransactionItem` has `item_wise_tax` and `total_tax` fields. `ISettings.IItemSettings` has `item_wise_tax_enabled`. `ITransactionSettings` has `inclusive_tax_on_rate`.
- **Key files:** New `libs/shared-types/src/lib/models/tax.model.ts`, `libs/shared-types/src/lib/enums/tables.enum.ts`, transaction form component

---

## Phase 2: "Run Better" — Operational Excellence

Features that make daily operations faster, add financial visibility, and open new revenue channels.

### 2.1 Profit & Loss Report
- **Status:** Not started
- **Why:** Business owners need to know if they're making money. All data exists in stores — just needs a computed view. Banks and investors ask for this.
- **How:** Purely computed report: Revenue (sales - sales returns) - COGS (purchase_price × qty from transaction items) - Expenses = Net Profit. Date range filters. Follow existing report page pattern.
- **Key files:** New `apps/web/src/app/features/reports/profit-loss/`, `reports.routes.ts`

### 2.2 Balance Sheet Report
- **Status:** Not started
- **Why:** Banks require balance sheets for loan applications — critical for SMBs seeking capital. `IBalanceSheet` model already exists.
- **How:** Computed view: Assets (Cash + Stock Value + Receivables) = Liabilities (Payables) + Equity (Opening capital + Retained earnings). Derived from transaction data.
- **Key files:** New `apps/web/src/app/features/reports/balance-sheet/`, `reports.routes.ts`

### 2.3 Storefront Cart & Order Placement
- **Status:** Not started
- **Why:** Hishabee's killer feature is online ordering. Gonok's storefront is a read-only catalog — customers can browse but not buy. Adding cart + orders turns it into a sales channel.
- **How:** Cart state in browser localStorage (no auth needed). New API endpoint `POST /api/v1/storefront/:slug/orders` writes to owner's CouchDB. Order includes: customer name, phone, delivery address, items. "Online Orders" section in main app. Cash-on-delivery by default (Bangladesh norm).
- **Key files:** New `apps/storefront/src/app/services/cart.service.ts`, new cart/checkout pages, new `libs/shared-types/src/lib/models/storefront-order.model.ts`

### 2.4 bKash/Nagad Digital Payment Integration
- **Status:** Not started
- **Why:** Hishabee has integrated digital payments. bKash and Nagad are ubiquitous in Bangladesh. Customers expect to pay via mobile banking.
- **How:** Integrate bKash Payment Gateway API and/or Nagad API for storefront checkout. Payment confirmation webhook updates order status. For POS, record payment method (cash/bKash/Nagad) on transactions.
- **Key files:** New `apps/api/src/services/payment.service.ts`, storefront checkout page

### 2.5 Subscription & Pricing System
- **Status:** Not started
- **Why:** All competitors have free + paid tiers. Gonok needs a monetization model. `ISubscription` model already exists in shared-types.
- **How:** Free tier (1 business, basic features). Premium (99-199 BDT/mo: unlimited businesses, SMS reminders, PDF export, advanced reports). Store subscription in PostgreSQL. Feature gating via `AuthStore`. Payment via bKash/Nagad.
- **Existing foundation:** `libs/shared-types/src/lib/models/subscription.model.ts` already exists.
- **Key files:** Subscription model, new `apps/api/src/routes/subscription.routes.ts`, settings page

---

## Phase 3: "Scale Up" — Growth Features

Features for businesses outgrowing basic operations. Differentiate Gonok from simple khata/ledger apps.

### 3.1 Chart of Accounts (Double-Entry Foundation)
- **Status:** Not started
- **Why:** Foundation for proper accounting. Progressive — simple users never see it, accountants can drill in. Opens the door for journal entries, general ledger, trial balance.
- **How:** New `ACCOUNT` entity: uuid, name, code, type (asset/liability/equity/income/expense), parent_uuid, is_system. Seed Bangladesh-appropriate defaults. Auto-map existing transactions behind the scenes.
- **Key files:** New `libs/shared-types/src/lib/models/account.model.ts`, new `core/stores/accounting.store.ts`

### 3.2 General Ledger & Journal Entries
- **Status:** Not started (depends on 3.1)
- **Why:** Completes double-entry bookkeeping. Manual journal entries for depreciation, accruals, corrections. General ledger provides complete audit trail.
- **How:** `JOURNAL_ENTRY` entity with debit/credit lines linked to accounts. All transactions auto-generate journal entries. General ledger view per account with running balance.

### 3.3 Trial Balance Report
- **Status:** Not started (depends on 3.2)
- **Why:** Standard verification report confirming debits = credits. Accountants expect this.
- **How:** Computed from journal entries grouped by account. Small effort once GL exists.

### 3.4 FIFO Inventory Costing
- **Status:** Not started
- **Why:** Current COGS uses static `purchase_price`. When prices change (common with BDT inflation), profit calculations go wrong. FIFO is the BD standard.
- **How:** Add `cost_layers` array to product documents. Sales consume from oldest layers first. Affects COGS in P&L and stock valuation in balance sheet.

### 3.5 Manufacturing / Bill of Materials (BOM)
- **Status:** Not started
- **Why:** Many BD businesses are manufacturers (garments, food processing, furniture). Define finished product as combination of raw materials → produce → consume raw materials + add finished goods. No offline BD competitor has this.
- **How:** New entities: `BOM` (product + raw material items) and `PRODUCTION_ORDER`. Production consumes raw material stock, adds finished goods.

### 3.6 Approval Workflows
- **Status:** Not started
- **Why:** As businesses grow, owners want to control spending. POs above threshold need approval. Makes role-based access meaningful.
- **How:** New `APPROVAL` entity. Settings define rules (e.g., "Purchases > 10,000 BDT require owner approval"). Works offline via CouchDB sync.

---

## Phase 4: "Enterprise Lite" — Premium Features

Features that push Gonok beyond simple bookkeeping into lightweight ERP territory. Justify premium pricing.

### 4.1 Mobile App (Play Store)
- **Status:** Not started
- **Why:** All BD competitors are Play Store apps. For shop owners, a native app feels more "real" than a PWA. Play Store presence = discoverability.
- **How:** Wrap existing Angular PWA with Capacitor (or Ionic). Native features: push notifications, Bluetooth printer access, camera barcode scanning. Publish to Google Play Store.

### 4.2 Multi-Currency Support
- **Status:** Not started
- **Why:** Import/export businesses (garment exporters, Chinese goods importers) deal in USD, CNY, EUR. Currently BDT-only.
- **How:** Add `currency` and `exchange_rate` fields to transactions. Exchange rate table entity. All reports convert to base currency.

### 4.3 Custom Fields System
- **Status:** Partially started (4 hardcoded party fields exist)
- **Why:** Different businesses need different data. Pharmacy: drug license. Garments: size/color. Current system is limited to 4 party-only fields.
- **How:** `CUSTOM_FIELD_DEFINITION` entity. Dynamic form rendering based on definitions. Values stored as JSON on entity documents.

### 4.4 Dashboard Widget System
- **Status:** Not started
- **Why:** Different business types care about different metrics. Current dashboard is fixed layout.
- **How:** 15+ widget types. Drag-and-drop arrangement via Angular CDK DragDrop. Layout saved in settings.

### 4.5 In-App Notification Center
- **Status:** Not started
- **Why:** Centralized alerts for reorder, overdue payments, approvals, storefront orders. Currently alerts are scattered across separate pages.
- **How:** `NOTIFICATION` entity in PouchDB. `NotificationService` generates on events. Notification bell in shell/sidebar with unread badge.

### 4.6 Scheduled Report Export
- **Status:** Not started
- **Why:** Auto-email weekly P&L or daily sales summary without logging in. Retention feature — the app reaches out to users.
- **How:** Server-side report generation from CouchDB data. Email delivery. Schedule config in settings.

### 4.7 Bengali Video Tutorials
- **Status:** Not started
- **Why:** Both HishabPati and Hishabee have Bengali training videos. BD shop owners often aren't tech-savvy. Videos drastically reduce support load.
- **How:** Record screen tutorials for each module. Host on YouTube. Embed help links in the app sidebar/settings.

---

## Competitive Advantages (What Gonok Has That Others Don't)

These are features to **highlight in marketing** — competitors don't have them:

| Feature | Gonok | HishabPati | Hishabee |
|---------|-------|------------|----------|
| Offline-first with cross-device sync | Yes (PouchDB/CouchDB) | Partial | Cloud-only |
| Multi-branch + stock transfers | Yes | No | No |
| CRM with sales pipeline | Yes | No | No |
| Purchase Orders with GRN | Yes | No | No |
| Logistics (vehicles, trips, routes) | Yes | No | No |
| Payroll with salary processing | Yes | Basic | Basic |
| 6 report types (aging, party stmt, etc.) | Yes | Basic | Basic |
| Quotation → Sale conversion | Yes | No | No |
| Delivery challan with print | Yes | No | No |
| Task management | Yes | No | No |
| Public storefront (micro-frontend) | Yes | No | Marketplace |
| Web + Mobile (PWA) | Yes | App-only | App-only |

---

## Sequencing Dependencies

```
1.1 PDF Invoices ──→ 1.3 WhatsApp Share
1.5 Barcode Scan ──→ 1.6 Barcode Print
1.7 VAT/Tax ──→ 3.1 Chart of Accounts ──→ 3.2 General Ledger ──→ 3.3 Trial Balance
2.3 Storefront Orders ──→ 2.4 bKash/Nagad Payment
2.4 bKash/Nagad ──→ 2.5 Subscription System
3.1 Chart of Accounts ──→ 3.2 General Ledger
3.6 Approval Workflows ──→ 4.5 Notifications
```

---

*Last updated: April 2026*

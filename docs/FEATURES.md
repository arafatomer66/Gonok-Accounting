# গণক (Gonok) — Feature Guide

A complete guide to every module in Gonok, the offline-first accounting ERP for Bangladeshi small businesses.

---

## Getting Started

### Registration & Login
- Register with a Bangladeshi phone number and your name
- Login with phone number → receive OTP → verify to access
- Dev OTP is always `123456`

### Creating a Business
- After first login, create your business with name (English + Bangla), phone, and address
- You can create multiple businesses and switch between them
- Each business has completely isolated data

---

## Core Modules

### Dashboard (`/dashboard`)
The home screen showing a summary of your business at a glance:
- **Today's sales** and **today's purchases** totals
- **Cash balance** (total in - total out)
- **Receivable** (money customers owe you) and **Payable** (money you owe suppliers)
- **Recent transactions** list
- Quick-action buttons to create sales, purchases, etc.

### Point of Sale — POS (`/pos`)
A fast, touch-friendly sales interface designed for counter billing:
- **Product grid** with search — tap a product to add it to the cart
- **Cart** with quantity adjustment, discount per item
- **Payment modal** — cash, due, or partial payment
- **Receipt printing** — generates a printable invoice after sale
- Auto-selects "Cash Sale" party for walk-in customers

### Products (`/products`)
Manage your product catalog:
- **Add/edit/delete products** with name, code, sales price, purchase price, MRP
- **Categories** — organize products (e.g., Grocery, Electronics, Stationery)
- **Units** — measurement units (Piece, Kg, Gram, Litre, Box, Bag, etc.)
- **Stock tracking** — opening stock, current quantity (adjusted automatically by transactions)
- **Per-branch stock** — if using branches, stock is tracked per branch
- **Bulk import** from Excel via the Import module

### Parties (`/parties`)
Manage your customers and suppliers:
- **Add/edit/delete parties** — name, phone, address, type (customer/supplier/both)
- **Party groups** — organize parties into groups (e.g., Wholesale, Retail, VIP)
- **Balance tracking** — each party has a running balance (receivable or payable)
- **Cash Sale party** — a virtual party auto-created for walk-in cash transactions
- **General group** — a default group that all parties belong to

---

## Transactions

### Sales (`/sales`)
Record sales to customers:
- Select party (customer), add products with quantity and price
- Apply discounts (per item or overall)
- Choose payment: full paid, partial, or full due
- **Profit per sale** is calculated and displayed (sales price - purchase price)
- Each sale automatically adjusts product stock (decreases quantity)
- Print invoice after creating

### Purchase (`/purchase`)
Record purchases from suppliers:
- Select party (supplier), add products with quantity and purchase price
- Each purchase automatically increases product stock
- Track payment: paid, partial, or due

### Sales Return (`/sales-return`)
Process returns from customers:
- Reference the original sale
- Select returned products and quantities
- Stock is automatically increased (returned items go back to inventory)
- Customer balance is adjusted

### Purchase Return (`/purchase-return`)
Return items to suppliers:
- Reference the original purchase
- Select returned products and quantities
- Stock is automatically decreased
- Supplier balance is adjusted

### Payment In (`/payment-in`)
Record money received from customers:
- Select the party (customer)
- Enter amount received
- Reduces the customer's outstanding balance (receivable)

### Payment Out (`/payment-out`)
Record payments made to suppliers:
- Select the party (supplier)
- Enter amount paid
- Reduces your outstanding balance to that supplier (payable)

---

## Quotations & Orders

### Quotations (`/quotations`)
Create estimates/proforma invoices:
- Build a quotation with products, quantities, prices
- **Convert to sale** — one-click conversion when the customer accepts
- Track quotation status

### Purchase Orders (`/purchase-orders`)
Create formal purchase orders to suppliers:
- Add products with quantities and agreed prices
- **Credit terms** — set payment terms (e.g., Net 30, Net 60)
- Track order status (draft, sent, received)
- Convert to purchase when goods arrive

### Deliveries (`/deliveries`)
Track shipments via delivery challans:
- Create a delivery challan linked to a sale
- Add delivery items with quantities
- **Status tracking** — pending, in-transit, delivered
- **Print challan** — printable delivery slip for the driver/customer

---

## Financial Management

### Expenses (`/expenses`)
Track business expenses:
- Record any expense with amount, date, category, and notes
- **Expense categories** — customizable (Rent, Utilities, Transport, etc.)
- View expenses filtered by date range or category

### Recurring Expenses (`/recurring-expenses`)
Set up auto-repeating expenses:
- Define an expense that repeats (daily, weekly, monthly, yearly)
- Gonok automatically generates expense entries on the schedule
- Useful for rent, subscriptions, salaries, etc.

### Cash Adjustment (`/cash-adjustment`)
Manual corrections to the cash balance:
- Add or subtract cash with a reason/note
- Useful for correcting discrepancies, recording cash found/lost

### Bank (`/bank`)
Track bank account balances:
- Add bank accounts with name and balance
- Record deposits and withdrawals
- View bank transaction history

### Due List (`/due-list`)
View all outstanding balances at a glance:
- **Receivables** — customers who owe you money
- **Payables** — suppliers you owe money to
- Sorted by amount, with quick links to record payments

---

## Reports

### Sales Report (`/reports/sales`)
- View all sales in a date range
- Filter by party, product, or payment status
- Total sales amount, profit summary

### Purchase Report (`/reports/purchase`)
- View all purchases in a date range
- Filter by supplier
- Total purchase amount

### Daybook (`/reports/daybook`)
- Chronological view of ALL transactions (sales, purchases, payments, expenses)
- Filter by date range
- Running cash balance

### Stock Summary (`/reports/stock`)
- Current stock levels for all products
- Stock value (quantity x purchase price)
- Low stock indicators

### Party Statement (`/reports/party-statement`)
- Detailed transaction history for a specific party
- Shows every sale, purchase, payment, and return
- Running balance

### Aging Report (`/reports/aging`)
- Outstanding dues grouped by age (0-30 days, 31-60, 61-90, 90+)
- Helps identify overdue payments
- Separate views for receivables and payables

---

## Payroll (`/payroll`)
Manage employees and salaries:
- **Employee list** — add employees with name, phone, designation, salary amount
- **Salary sheets** — generate monthly salary sheets
- **Payment tracking** — mark salaries as paid, record payment date
- **Salary history** — view past salary payments per employee

---

## Inventory Management

### Branches (`/branches`)
Multi-location support:
- Create branches (e.g., Main Store, Warehouse, Shop 2)
- Products track stock per branch
- Transfer stock between branches

### Stock Transfers (`/stock-transfers`)
Move inventory between branches:
- Select source and destination branch
- Add products and quantities to transfer
- Stock is decreased at source and increased at destination

### Reorder Alerts (`/reorder-alerts`)
Low stock notifications:
- Set minimum stock levels per product
- View products that are below reorder level
- Quick link to create a purchase order

---

## CRM (Customer Relationship Management)

### Pipeline (`/crm/pipeline`)
- Visual sales pipeline with customizable stages
- Drag deals between stages
- Track deal value and expected close date

### Interactions (`/crm/interactions`)
- Log calls, emails, meetings with customers
- Attach to a specific party

### Notes (`/crm/notes`)
- Add notes to customers/deals
- Internal notes for the team

### Follow-ups (`/crm/follow-ups`)
- Schedule follow-up reminders
- Track follow-up status (pending, completed)

---

## Logistics (`/logistics`)
Fleet and delivery management:
- **Vehicles** — register delivery vehicles (truck, van, bike)
- **Trips** — create delivery trips with vehicle, driver, and route
- **Trip items** — assign deliveries to trips
- Track trip status (scheduled, in-progress, completed)

---

## Tasks (`/tasks`)
Trello-like task management:
- **Kanban board** with drag-and-drop columns
- Create tasks with title, description, priority, due date
- Move tasks between columns (To Do, In Progress, Done)
- Assign tasks to team members

---

## Utilities

### Import (`/import`)
Bulk data import from Excel:
- Upload `.xlsx` or `.csv` files
- Map columns to Gonok fields
- Import products, parties, or transactions in bulk

### Backup (`/backup`)
Export and restore business data:
- **Export** — download all business data as a JSON file
- **Import** — restore from a backup file
- Useful for migration or disaster recovery

### Activity Log (`/activity-log`)
Audit trail of all actions:
- View who did what and when
- Tracks creates, updates, deletes across all modules

### Settings (`/settings`)
Business configuration:
- **Business info** — name, phone, address, logo
- **Storefront** — enable public product catalog, set URL slug
- **Invoice settings** — customize invoice format
- **Preferences** — language (English/Bangla), currency format

### Users (`/users`)
Team management:
- Invite users by phone number
- Assign roles (owner, admin, staff)
- Remove users from the business

### Profile (`/profile`)
Personal account settings:
- Update name, phone number
- View linked businesses

---

## Storefront (`/shop/{slug}`)

A public-facing product catalog for each business — a micro-frontend served at `/shop/{slug}`.

### How to Enable
1. Go to **Settings > Storefront** in the main app
2. Toggle storefront ON
3. Set a URL slug (e.g., `my-store`)
4. Share the link: `https://13-234-68-147.sslip.io/shop/my-store`

### What Customers See
- **Business header** — store name, logo, contact info
- **Product grid** — all active products with name, price, discount, stock status
- **Category filter** — filter by product category
- **Search** — search products by name or code
- **Product detail page** — individual product view with full details
- **Pagination** — browse through large catalogs

### Example Stores
- `https://13-234-68-147.sslip.io/shop/my-store` — Bdstall
- `https://13-234-68-147.sslip.io/shop/rahim-traders` — Rahim Traders

### Key Points
- No login required — fully public
- Read-only — customers can browse but not purchase (no cart/checkout yet)
- Real-time — products sync from the main app via CouchDB
- Rate limited — 200 requests per 15 minutes per IP

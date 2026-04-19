#!/usr/bin/env node

/**
 * Gonok Demo Data Seed Script
 *
 * Creates a demo user via the API and inserts realistic Bangladeshi
 * business data into CouchDB for all feature modules.
 *
 * Prerequisites:
 *   - API server running on port 3333 (npx nx serve api)
 *   - PostgreSQL and CouchDB running (docker compose up -d)
 *
 * Usage:
 *   node scripts/seed-demo.mjs
 */

const API = 'http://localhost:3333/api/v1';
const COUCH = 'http://localhost:5984';
const COUCH_AUTH = 'Basic ' + Buffer.from('admin:password').toString('base64');

const DEMO_PHONE = '01712345678';
const DEMO_NAME = 'Demo User';
const DEMO_OTP = '123456';

// ── Helpers ──────────────────────────────────────────────

function uuid() {
  return crypto.randomUUID();
}

const now = Date.now();
function daysAgo(d) { return now - d * 86400000; }
function daysFromNow(d) { return now + d * 86400000; }

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  if (api.token) opts.headers['Authorization'] = `Bearer ${api.token}`;
  const res = await fetch(`${API}${path}`, opts);
  const json = await res.json();
  if (!res.ok && res.status !== 409) {
    throw new Error(`API ${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function couchPut(dbName, doc) {
  const id = `${doc.table_type}::${doc.uuid}`;
  const res = await fetch(`${COUCH}/${dbName}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': COUCH_AUTH },
    body: JSON.stringify({ ...doc, _id: id }),
  });
  if (!res.ok) {
    const err = await res.json();
    if (err.error !== 'conflict') {
      console.error(`  ✗ ${doc.table_type}::${doc.uuid} → ${err.error}`);
    }
  }
}

// ── Step 1: Register + Login ─────────────────────────────

console.log('\n🔧 Gonok Demo Data Seeder\n');

console.log('1. Registering demo user...');
try {
  await api('POST', '/auth/register', { phone: DEMO_PHONE, name: DEMO_NAME });
  console.log(`   ✓ Registered: ${DEMO_PHONE}`);
} catch {
  console.log(`   ⓘ User may already exist, trying login...`);
  await api('POST', '/auth/login', { phone: DEMO_PHONE });
}

console.log('2. Verifying OTP...');
const otpRes = await api('POST', '/auth/verify-otp', { phone: DEMO_PHONE, otp: DEMO_OTP });
const userUuid = otpRes.data.user.uuid;
api.token = otpRes.data.access_token;
console.log(`   ✓ Logged in as: ${userUuid}`);

const dbName = `gonok-${userUuid}`;

// ── Step 2: Create Business ──────────────────────────────

console.log('3. Creating demo business...');
let bizUuid;
const bizList = await api('GET', '/businesses/');
if (bizList.data && bizList.data.length > 0) {
  bizUuid = bizList.data[0].uuid;
  console.log(`   ⓘ Using existing business: ${bizUuid}`);
} else {
  const bizRes = await api('POST', '/businesses/', {
    name_en: 'Rahim Traders',
    name_bn: 'রহিম ট্রেডার্স',
    phone: '01712345678',
    address: {
      display_address: '45 Banani Road, Dhaka-1213',
      city: 'Dhaka',
      district: 'Dhaka',
      country_code: 'BD',
    },
  });
  bizUuid = bizRes.data.uuid;
  console.log(`   ✓ Created business: ${bizUuid}`);
}

// ── Step 3: Seed CouchDB with demo data ──────────────────

console.log(`4. Seeding data into CouchDB (${dbName})...\n`);

// ── Categories ──
const catGrocery     = uuid();
const catElectronics = uuid();
const catStationery  = uuid();

const categories = [
  { uuid: catGrocery,     name: 'Grocery',     comment: 'Daily essentials' },
  { uuid: catElectronics, name: 'Electronics', comment: 'Electronic items' },
  { uuid: catStationery,  name: 'Stationery',  comment: 'Office supplies' },
];

for (const c of categories) {
  await couchPut(dbName, {
    ...c, table_type: 'category', business_uuid: bizUuid, branch_uuid: null,
    is_supplier: false, is_outlet: false, is_enabled: true,
    created_at: now, updated_at: now, created_by: null, updated_by: null,
  });
}
console.log(`   ✓ ${categories.length} categories`);

// ── Units ──
const units = [
  { uuid: uuid(), fullname: 'Piece',    shortname: 'pcs', can_delete: false },
  { uuid: uuid(), fullname: 'Kilogram', shortname: 'kg',  can_delete: false },
  { uuid: uuid(), fullname: 'Litre',    shortname: 'L',   can_delete: false },
  { uuid: uuid(), fullname: 'Dozen',    shortname: 'dz',  can_delete: true },
  { uuid: uuid(), fullname: 'Box',      shortname: 'box', can_delete: true },
];

for (const u of units) {
  await couchPut(dbName, {
    ...u, table_type: 'unit', business_uuid: bizUuid, branch_uuid: null,
    created_at: now, updated_at: now, created_by: null, updated_by: null,
  });
}
console.log(`   ✓ ${units.length} units`);

// ── Products ──
const products = [
  { uuid: uuid(), name: 'Miniket Rice (5kg)',    code: 'RICE-5K',  purchase_price: 350, sales_price: 420, mrp_price: 450, stock_count: 100, quantity: 85, category_uuid: catGrocery, unit: 'bag' },
  { uuid: uuid(), name: 'Soybean Oil (5L)',      code: 'OIL-5L',   purchase_price: 650, sales_price: 750, mrp_price: 780, stock_count: 60,  quantity: 42, category_uuid: catGrocery, unit: 'pcs' },
  { uuid: uuid(), name: 'Lux Soap',              code: 'SOAP-LUX', purchase_price: 35,  sales_price: 50,  mrp_price: 55,  stock_count: 200, quantity: 156, category_uuid: catGrocery, unit: 'pcs' },
  { uuid: uuid(), name: 'Sugar (1kg)',            code: 'SUGAR-1K', purchase_price: 95,  sales_price: 120, mrp_price: 130, stock_count: 150, quantity: 110, category_uuid: catGrocery, unit: 'pcs' },
  { uuid: uuid(), name: 'Nestle Nido (400g)',     code: 'NIDO-400', purchase_price: 400, sales_price: 480, mrp_price: 500, stock_count: 40,  quantity: 28,  category_uuid: catGrocery, unit: 'pcs' },
  { uuid: uuid(), name: 'Samsung Charger',        code: 'CHG-SAM',  purchase_price: 180, sales_price: 280, mrp_price: 320, stock_count: 50,  quantity: 35,  category_uuid: catElectronics, unit: 'pcs' },
  { uuid: uuid(), name: 'Earphone (Wired)',       code: 'EAR-W01',  purchase_price: 80,  sales_price: 150, mrp_price: 180, stock_count: 80,  quantity: 60,  category_uuid: catElectronics, unit: 'pcs' },
  { uuid: uuid(), name: 'LED Bulb 12W',           code: 'LED-12W',  purchase_price: 70,  sales_price: 120, mrp_price: 140, stock_count: 100, quantity: 72,  category_uuid: catElectronics, unit: 'pcs' },
  { uuid: uuid(), name: 'A4 Paper (500 sheets)',  code: 'A4-500',   purchase_price: 350, sales_price: 450, mrp_price: 480, stock_count: 30,  quantity: 18,  category_uuid: catStationery, unit: 'pcs' },
  { uuid: uuid(), name: 'Ball Pen (Box of 10)',   code: 'PEN-10',   purchase_price: 60,  sales_price: 100, mrp_price: 110, stock_count: 50,  quantity: 38,  category_uuid: catStationery, unit: 'box' },
  { uuid: uuid(), name: 'Radhuni Masala Mix',     code: 'RDH-MIX',  purchase_price: 40,  sales_price: 55,  mrp_price: 60,  stock_count: 120, quantity: 95,  category_uuid: catGrocery, unit: 'pcs' },
  { uuid: uuid(), name: 'Pran Mango Juice (1L)',  code: 'JUICE-1L', purchase_price: 70,  sales_price: 95,  mrp_price: 100, stock_count: 80,  quantity: 55,  category_uuid: catGrocery, unit: 'pcs' },
];

for (const p of products) {
  await couchPut(dbName, {
    ...p, table_type: 'product', business_uuid: bizUuid, branch_uuid: null,
    product_type: null, active: true, slug: null, description: null,
    discount: 0, net_price: p.sales_price, image_url: null, thumbnail_url: null,
    party_wise_rate: null, item_wise_tax: 0, batch_no: null,
    exp_date: null, mfg_date: null, serial_no: null, size: null,
    created_at: daysAgo(30), updated_at: now, created_by: null, updated_by: null,
  });
}
console.log(`   ✓ ${products.length} products`);

// ── Party Groups ──
const grpRetail    = uuid();
const grpWholesale = uuid();

const partyGroups = [
  { uuid: grpRetail,    name: 'Retail Customers' },
  { uuid: grpWholesale, name: 'Wholesale Buyers' },
];

for (const g of partyGroups) {
  await couchPut(dbName, {
    ...g, table_type: 'party_group', business_uuid: bizUuid, branch_uuid: null,
    can_delete: true, created_at: now, updated_at: now, created_by: null, updated_by: null,
  });
}
console.log(`   ✓ ${partyGroups.length} party groups`);

// ── Parties ──
const cashPartyUuid = bizUuid; // Cash Sale party = business UUID
const parties = [
  { uuid: cashPartyUuid, name: 'Cash Sale',        party_type: 'customer', group_uuid: null,        phone: null,           address: null,                                 shipping_address: null,                                   current_balance: 0,     can_delete: false },
  { uuid: uuid(),        name: 'Karim Store',       party_type: 'customer', group_uuid: grpRetail,   phone: '01811222333',  address: 'Mirpur 10, Dhaka',                   shipping_address: 'Mirpur 10, Dhaka-1216',               current_balance: 2500,  can_delete: true },
  { uuid: uuid(),        name: 'Fatema Enterprise', party_type: 'customer', group_uuid: grpWholesale,phone: '01922333444',  address: 'Uttara Sector 7, Dhaka',             shipping_address: 'Uttara Sector 7, Dhaka-1230',         current_balance: 8400,  can_delete: true },
  { uuid: uuid(),        name: 'Alam & Sons',       party_type: 'customer', group_uuid: grpWholesale,phone: '01633444555',  address: 'Narayanganj Sadar',                  shipping_address: 'Station Road, Narayanganj',           current_balance: 15000, can_delete: true },
  { uuid: uuid(),        name: 'Janata Variety',    party_type: 'customer', group_uuid: grpRetail,   phone: '01544555666',  address: 'Dhanmondi 27, Dhaka',                shipping_address: 'Dhanmondi 27, Dhaka-1209',            current_balance: 0,     can_delete: true },
  { uuid: uuid(),        name: 'Bengal Distributors',party_type:'supplier', group_uuid: null,        phone: '01755666777',  address: 'Tejgaon Industrial Area, Dhaka',     shipping_address: null,                                   current_balance: -12000,can_delete: true },
  { uuid: uuid(),        name: 'Dhaka Wholesale',   party_type: 'supplier', group_uuid: null,        phone: '01866777888',  address: 'Kawran Bazar, Dhaka',                shipping_address: null,                                   current_balance: -5000, can_delete: true },
  { uuid: uuid(),        name: 'Chittagong Supply', party_type: 'supplier', group_uuid: null,        phone: '01977888999',  address: 'Agrabad, Chittagong',                shipping_address: null,                                   current_balance: 0,     can_delete: true },
];

for (const p of parties) {
  await couchPut(dbName, {
    ...p, table_type: 'party', business_uuid: bizUuid, branch_uuid: null,
    email: null, tin: null, current_balance_date: now,
    created_at: daysAgo(30), updated_at: now, created_by: null, updated_by: null,
  });
}
console.log(`   ✓ ${parties.length} parties (${parties.filter(p=>p.party_type==='customer').length} customers, ${parties.filter(p=>p.party_type==='supplier').length} suppliers)`);

// ── Expense Categories ──
const expCatRent      = uuid();
const expCatUtility   = uuid();
const expCatTransport = uuid();
const expCatSalary    = uuid();
const expCatMisc      = uuid();

const expenseCategories = [
  { uuid: expCatRent,      name: 'Shop Rent' },
  { uuid: expCatUtility,   name: 'Utility Bills' },
  { uuid: expCatTransport, name: 'Transport' },
  { uuid: expCatSalary,    name: 'Staff Salary' },
  { uuid: expCatMisc,      name: 'Miscellaneous' },
];

for (const c of expenseCategories) {
  await couchPut(dbName, {
    ...c, table_type: 'expense_category', business_uuid: bizUuid, branch_uuid: null,
    created_at: now, updated_at: now, created_by: null, updated_by: null,
  });
}
console.log(`   ✓ ${expenseCategories.length} expense categories`);

// ── Transactions (Sales + Purchases) ──
const txSales = [];
const txPurchases = [];
const txItems = [];

// Generate 15 sales over the last 30 days
for (let i = 0; i < 15; i++) {
  const txUuid = uuid();
  const partyIdx = i % 5; // rotate through customers
  const party = parties[partyIdx];
  const date = daysAgo(Math.floor(Math.random() * 30));
  const prod1 = products[i % products.length];
  const prod2 = products[(i + 3) % products.length];
  const qty1 = Math.ceil(Math.random() * 5);
  const qty2 = Math.ceil(Math.random() * 3);
  const total = prod1.sales_price * qty1 + prod2.sales_price * qty2;
  const paid = partyIdx === 0 ? total : Math.floor(total * 0.7); // Cash sale = full paid

  const item1Uuid = uuid();
  const item2Uuid = uuid();

  txSales.push({
    uuid: txUuid, table_type: 'transaction', business_uuid: bizUuid, branch_uuid: null,
    type: 'sale', party_uuid: party.uuid, transaction_date: date,
    transaction_mode: null, description: null,
    order_number: null, payment_type: partyIdx === 0 ? 'cash' : (i % 3 === 0 ? 'bkash' : 'cash'),
    cheque_ref_no: null, bank_account_uuid: null, mobile_tx_id: null,
    items: [], discount: 0, total_amount: total, paid_amount: paid,
    due_amount: total - paid, quantity: qty1 + qty2,
    bill_date: date, total_tax: 0, bill_no: null,
    invoice_date: date, invoice_no: `INV-${(1001 + i).toString()}`,
    return_no: null,
    created_at: date, updated_at: date, created_by: null, updated_by: null,
  });

  txItems.push({
    uuid: item1Uuid, table_type: 'transaction_item', business_uuid: bizUuid, branch_uuid: null,
    party_uuid: party.uuid, transaction_uuid: txUuid, transaction_type: 'sale',
    item_uuid: prod1.uuid, purchase_price: prod1.purchase_price, sales_price: prod1.sales_price,
    item_wise_tax: 0, total_tax: 0, quantity: qty1, transaction_date: date,
    created_at: date, updated_at: date, created_by: null, updated_by: null,
  });
  txItems.push({
    uuid: item2Uuid, table_type: 'transaction_item', business_uuid: bizUuid, branch_uuid: null,
    party_uuid: party.uuid, transaction_uuid: txUuid, transaction_type: 'sale',
    item_uuid: prod2.uuid, purchase_price: prod2.purchase_price, sales_price: prod2.sales_price,
    item_wise_tax: 0, total_tax: 0, quantity: qty2, transaction_date: date,
    created_at: date, updated_at: date, created_by: null, updated_by: null,
  });
}

// Generate 8 purchases over the last 30 days
for (let i = 0; i < 8; i++) {
  const txUuid = uuid();
  const supplier = parties[5 + (i % 3)]; // rotate through suppliers
  const date = daysAgo(Math.floor(Math.random() * 30));
  const prod = products[i % products.length];
  const qty = Math.ceil(Math.random() * 20) + 10;
  const total = prod.purchase_price * qty;
  const paid = i % 2 === 0 ? total : Math.floor(total * 0.6);

  const itemUuid = uuid();

  txPurchases.push({
    uuid: txUuid, table_type: 'transaction', business_uuid: bizUuid, branch_uuid: null,
    type: 'purchase', party_uuid: supplier.uuid, transaction_date: date,
    transaction_mode: null, description: null,
    order_number: null, payment_type: 'cash',
    cheque_ref_no: null, bank_account_uuid: null, mobile_tx_id: null,
    items: [], discount: 0, total_amount: total, paid_amount: paid,
    due_amount: total - paid, quantity: qty,
    bill_date: date, total_tax: 0, bill_no: `BILL-${(2001 + i).toString()}`,
    invoice_date: date, invoice_no: null, return_no: null,
    created_at: date, updated_at: date, created_by: null, updated_by: null,
  });

  txItems.push({
    uuid: itemUuid, table_type: 'transaction_item', business_uuid: bizUuid, branch_uuid: null,
    party_uuid: supplier.uuid, transaction_uuid: txUuid, transaction_type: 'purchase',
    item_uuid: prod.uuid, purchase_price: prod.purchase_price, sales_price: prod.sales_price,
    item_wise_tax: 0, total_tax: 0, quantity: qty, transaction_date: date,
    created_at: date, updated_at: date, created_by: null, updated_by: null,
  });
}

// 3 payment-in transactions
for (let i = 0; i < 3; i++) {
  const party = parties[1 + i]; // customers with due
  const date = daysAgo(Math.floor(Math.random() * 10));
  txSales.push({
    uuid: uuid(), table_type: 'transaction', business_uuid: bizUuid, branch_uuid: null,
    type: 'payment_in', party_uuid: party.uuid, transaction_date: date,
    transaction_mode: null, description: `Payment received from ${party.name}`,
    order_number: null, payment_type: 'cash',
    cheque_ref_no: null, bank_account_uuid: null, mobile_tx_id: null,
    items: [], discount: 0, total_amount: 1000 + i * 500, paid_amount: 1000 + i * 500,
    due_amount: 0, quantity: 0,
    bill_date: date, total_tax: 0, bill_no: null,
    invoice_date: date, invoice_no: null, return_no: null,
    created_at: date, updated_at: date, created_by: null, updated_by: null,
  });
}

const allTx = [...txSales, ...txPurchases];
for (const tx of allTx) { await couchPut(dbName, tx); }
for (const ti of txItems) { await couchPut(dbName, ti); }
console.log(`   ✓ ${txSales.length} sales/payment-in transactions`);
console.log(`   ✓ ${txPurchases.length} purchase transactions`);
console.log(`   ✓ ${txItems.length} transaction items`);

// ── Expenses ──
const expenses = [
  { uuid: uuid(), category_uuid: expCatRent,      expense_date: daysAgo(5),  description: 'Monthly shop rent - April',    total_amount: 15000, payment_type: 'cash' },
  { uuid: uuid(), category_uuid: expCatUtility,   expense_date: daysAgo(8),  description: 'DESCO electricity bill',       total_amount: 3200,  payment_type: 'bkash' },
  { uuid: uuid(), category_uuid: expCatUtility,   expense_date: daysAgo(10), description: 'WASA water bill',              total_amount: 800,   payment_type: 'cash' },
  { uuid: uuid(), category_uuid: expCatTransport, expense_date: daysAgo(3),  description: 'Delivery van fuel',            total_amount: 2500,  payment_type: 'cash' },
  { uuid: uuid(), category_uuid: expCatTransport, expense_date: daysAgo(12), description: 'Courier charges - Pathao',     total_amount: 450,   payment_type: 'nagad' },
  { uuid: uuid(), category_uuid: expCatMisc,      expense_date: daysAgo(1),  description: 'Printer ink cartridge',        total_amount: 1200,  payment_type: 'cash' },
  { uuid: uuid(), category_uuid: expCatMisc,      expense_date: daysAgo(15), description: 'Store cleaning supplies',      total_amount: 600,   payment_type: 'cash' },
  { uuid: uuid(), category_uuid: expCatSalary,    expense_date: daysAgo(2),  description: 'Staff salary advance - Jamal', total_amount: 5000,  payment_type: 'cash' },
];

for (const e of expenses) {
  await couchPut(dbName, {
    ...e, table_type: 'expense', business_uuid: bizUuid, branch_uuid: null,
    type: null, cheque_ref_no: null, bank_account_uuid: null, mobile_tx_id: null,
    total_quantity: 1,
    created_at: e.expense_date, updated_at: e.expense_date, created_by: null, updated_by: null,
  });
}
console.log(`   ✓ ${expenses.length} expenses`);

// ── Quotations ──
const quot1 = uuid();
const quot2 = uuid();
const quot3 = uuid();

const quotations = [
  { uuid: quot1, party_uuid: parties[2].uuid, quotation_no: 'QTN-001', quotation_date: daysAgo(7), valid_until: daysFromNow(14), status: 'sent',     discount: 0, total_amount: 4200, total_tax: 0, converted_transaction_uuid: null, notes: 'Bulk grocery order quotation' },
  { uuid: quot2, party_uuid: parties[3].uuid, quotation_no: 'QTN-002', quotation_date: daysAgo(3), valid_until: daysFromNow(27), status: 'draft',    discount: 100, total_amount: 2650, total_tax: 0, converted_transaction_uuid: null, notes: null },
  { uuid: quot3, party_uuid: parties[1].uuid, quotation_no: 'QTN-003', quotation_date: daysAgo(15), valid_until: daysAgo(1),     status: 'accepted', discount: 0, total_amount: 1500, total_tax: 0, converted_transaction_uuid: null, notes: 'Monthly stationery supply' },
];

for (const q of quotations) {
  await couchPut(dbName, {
    ...q, table_type: 'quotation', business_uuid: bizUuid, branch_uuid: null,
    created_at: q.quotation_date, updated_at: now, created_by: null, updated_by: null,
  });
}

const quotationItems = [
  { uuid: uuid(), quotation_uuid: quot1, item_uuid: products[0].uuid, quantity: 10, price: 420, discount: 0, total: 4200 },
  { uuid: uuid(), quotation_uuid: quot2, item_uuid: products[5].uuid, quantity: 5,  price: 280, discount: 0, total: 1400 },
  { uuid: uuid(), quotation_uuid: quot2, item_uuid: products[6].uuid, quantity: 10, price: 150, discount: 100, total: 1250 },
  { uuid: uuid(), quotation_uuid: quot3, item_uuid: products[8].uuid, quantity: 2,  price: 450, discount: 0, total: 900 },
  { uuid: uuid(), quotation_uuid: quot3, item_uuid: products[9].uuid, quantity: 6,  price: 100, discount: 0, total: 600 },
];

for (const qi of quotationItems) {
  await couchPut(dbName, {
    ...qi, table_type: 'quotation_item', business_uuid: bizUuid, branch_uuid: null,
    created_at: now, updated_at: now, created_by: null, updated_by: null,
  });
}
console.log(`   ✓ ${quotations.length} quotations with ${quotationItems.length} items`);

// ── Deliveries ──
const del1 = uuid();
const del2 = uuid();
const del3 = uuid();

const deliveries = [
  { uuid: del1, delivery_no: 'CHN-001', transaction_uuid: txSales[0].uuid, party_uuid: txSales[0].party_uuid, delivery_date: daysAgo(2), delivery_address: 'Mirpur 10, Dhaka-1216', driver_name: 'Rafiq', driver_phone: '01611222333', vehicle_no: 'DH-KA-12-3456', status: 'delivered', notes: null, total_items: 2, total_quantity: 5 },
  { uuid: del2, delivery_no: 'CHN-002', transaction_uuid: txSales[2].uuid, party_uuid: txSales[2].party_uuid, delivery_date: daysAgo(1), delivery_address: 'Uttara Sector 7, Dhaka-1230', driver_name: 'Shohag', driver_phone: '01711333444', vehicle_no: 'DH-GA-45-6789', status: 'in_transit', notes: 'Handle with care', total_items: 2, total_quantity: 4 },
  { uuid: del3, delivery_no: 'CHN-003', transaction_uuid: null, party_uuid: parties[3].uuid, delivery_date: now, delivery_address: 'Station Road, Narayanganj', driver_name: null, driver_phone: null, vehicle_no: null, status: 'pending', notes: 'Standalone delivery', total_items: 1, total_quantity: 3 },
];

for (const d of deliveries) {
  await couchPut(dbName, {
    ...d, table_type: 'delivery', business_uuid: bizUuid, branch_uuid: null,
    created_at: d.delivery_date, updated_at: d.delivery_date, created_by: null, updated_by: null,
  });
}

const deliveryItems = [
  { uuid: uuid(), delivery_uuid: del1, item_uuid: products[0].uuid, ordered_quantity: 3, delivered_quantity: 3 },
  { uuid: uuid(), delivery_uuid: del1, item_uuid: products[1].uuid, ordered_quantity: 2, delivered_quantity: 2 },
  { uuid: uuid(), delivery_uuid: del2, item_uuid: products[3].uuid, ordered_quantity: 2, delivered_quantity: 2 },
  { uuid: uuid(), delivery_uuid: del2, item_uuid: products[4].uuid, ordered_quantity: 2, delivered_quantity: 2 },
  { uuid: uuid(), delivery_uuid: del3, item_uuid: products[10].uuid, ordered_quantity: 3, delivered_quantity: 3 },
];

for (const di of deliveryItems) {
  await couchPut(dbName, {
    ...di, table_type: 'delivery_item', business_uuid: bizUuid, branch_uuid: null,
    created_at: now, updated_at: now, created_by: null, updated_by: null,
  });
}
console.log(`   ✓ ${deliveries.length} deliveries with ${deliveryItems.length} items`);

// ── Recurring Expenses ──
const recurringExpenses = [
  { uuid: uuid(), name: 'Shop Rent',       category_uuid: expCatRent,    amount: 15000, frequency: 'monthly', start_date: daysAgo(60), next_due_date: daysFromNow(10), last_generated_date: daysAgo(5), active: true, description: 'Monthly shop rent', payment_type: 'cash' },
  { uuid: uuid(), name: 'Internet Bill',   category_uuid: expCatUtility, amount: 1200,  frequency: 'monthly', start_date: daysAgo(90), next_due_date: daysFromNow(15), last_generated_date: daysAgo(15), active: true, description: 'ISP monthly bill', payment_type: 'bkash' },
  { uuid: uuid(), name: 'Cleaner Salary',  category_uuid: expCatSalary,  amount: 3000,  frequency: 'monthly', start_date: daysAgo(45), next_due_date: daysFromNow(5),  last_generated_date: daysAgo(25), active: true, description: 'Part-time cleaner', payment_type: 'cash' },
  { uuid: uuid(), name: 'Software License',category_uuid: expCatMisc,    amount: 5000,  frequency: 'yearly',  start_date: daysAgo(180), next_due_date: daysFromNow(185), last_generated_date: daysAgo(180), active: true, description: 'Accounting software annual', payment_type: 'bank' },
];

for (const r of recurringExpenses) {
  await couchPut(dbName, {
    ...r, table_type: 'recurring_expense', business_uuid: bizUuid, branch_uuid: null,
    created_at: r.start_date, updated_at: now, created_by: null, updated_by: null,
  });
}
console.log(`   ✓ ${recurringExpenses.length} recurring expenses`);

// ── Employees ──
const emp1 = uuid();
const emp2 = uuid();
const emp3 = uuid();
const emp4 = uuid();

const employees = [
  { uuid: emp1, name: 'Jamal Hossain',  phone: '01511111111', designation: 'Sales Manager',     department: 'Sales',     join_date: daysAgo(365), base_salary: 18000, active: true },
  { uuid: emp2, name: 'Sumon Ahmed',     phone: '01522222222', designation: 'Store Keeper',      department: 'Warehouse', join_date: daysAgo(200), base_salary: 12000, active: true },
  { uuid: emp3, name: 'Rima Begum',      phone: '01533333333', designation: 'Cashier',           department: 'Sales',     join_date: daysAgo(150), base_salary: 10000, active: true },
  { uuid: emp4, name: 'Kamal Uddin',     phone: '01544444444', designation: 'Delivery Boy',      department: 'Delivery',  join_date: daysAgo(90),  base_salary: 8000,  active: true },
];

for (const e of employees) {
  await couchPut(dbName, {
    ...e, table_type: 'employee', business_uuid: bizUuid, branch_uuid: null,
    created_at: e.join_date, updated_at: now, created_by: null, updated_by: null,
  });
}
console.log(`   ✓ ${employees.length} employees`);

// ── Salaries (last 2 months) ──
const salaries = [];
for (const month of [3, 4]) { // March and April 2026
  for (const emp of employees) {
    const bonus = month === 3 && emp.uuid === emp1 ? 2000 : 0;
    const deduction = month === 4 && emp.uuid === emp4 ? 500 : 0;
    const advance = month === 3 && emp.uuid === emp2 ? 3000 : 0;
    const net = emp.base_salary + bonus - deduction - advance;
    const isPaid = month === 3; // March paid, April unpaid

    salaries.push({
      uuid: uuid(), table_type: 'salary', business_uuid: bizUuid, branch_uuid: null,
      employee_uuid: emp.uuid, employee_name: emp.name,
      month, year: 2026, base_salary: emp.base_salary,
      bonus, deduction, advance, net_salary: net,
      paid: isPaid, paid_date: isPaid ? daysAgo(15) : null,
      payment_type: isPaid ? 'cash' : null, notes: bonus ? 'Performance bonus' : null,
      created_at: daysAgo(month === 3 ? 20 : 5), updated_at: now, created_by: null, updated_by: null,
    });
  }
}

for (const s of salaries) { await couchPut(dbName, s); }
console.log(`   ✓ ${salaries.length} salary records (2 months)`);

// ── Bank Accounts ──
const bankAccounts = [
  { uuid: uuid(), table_type: 'bank_account', business_uuid: bizUuid, branch_uuid: null, name: 'Dutch-Bangla Bank - Current', account_no: '110-12345678', bank_name: 'Dutch-Bangla Bank', branch: 'Banani Branch', balance: 85000, created_at: daysAgo(60), updated_at: now, created_by: null, updated_by: null },
  { uuid: uuid(), table_type: 'bank_account', business_uuid: bizUuid, branch_uuid: null, name: 'bKash Merchant',              account_no: '01712345678',   bank_name: 'bKash',             branch: null,            balance: 12500, created_at: daysAgo(30), updated_at: now, created_by: null, updated_by: null },
];

for (const b of bankAccounts) { await couchPut(dbName, b); }
console.log(`   ✓ ${bankAccounts.length} bank accounts`);

// ── Summary ──
const totalDocs = categories.length + units.length + products.length + partyGroups.length +
  parties.length + expenseCategories.length + allTx.length + txItems.length +
  expenses.length + quotations.length + quotationItems.length +
  deliveries.length + deliveryItems.length + recurringExpenses.length +
  employees.length + salaries.length + bankAccounts.length;

console.log(`\n✅ Done! Seeded ${totalDocs} documents total.\n`);
console.log('┌─────────────────────────────────────────┐');
console.log('│  Demo Login Credentials                 │');
console.log('├─────────────────────────────────────────┤');
console.log(`│  Phone:    ${DEMO_PHONE}               │`);
console.log(`│  OTP:      ${DEMO_OTP}                      │`);
console.log(`│  Business: Rahim Traders (রহিম ট্রেডার্স)  │`);
console.log('└─────────────────────────────────────────┘');
console.log('\nOpen http://localhost:4200 and login with the above credentials.\n');

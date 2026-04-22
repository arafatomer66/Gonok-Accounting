import { Injectable, inject } from '@angular/core';
import { CatalogStore } from '../stores/catalog.store';
import { TransactionStore } from '../stores/transaction.store';
import { ExpenseStore } from '../stores/expense.store';
import { PurchaseOrderStore } from '../stores/purchase-order.store';
import { ETransactionType, EPartyType } from '@org/shared-types';

@Injectable({ providedIn: 'root' })
export class DemoSeedService {
  private catalogStore = inject(CatalogStore);
  private transactionStore = inject(TransactionStore);
  private expenseStore = inject(ExpenseStore);
  private purchaseOrderStore = inject(PurchaseOrderStore);

  async seed(): Promise<void> {
    // Skip if data already exists
    if (this.catalogStore.products().length > 0) return;

    console.log('[DemoSeed] Seeding demo data...');

    // ─── Categories ──────────────────────────────────
    const catElectronics = await this.catalogStore.addCategory({ name: 'Electronics' });
    const catGrocery = await this.catalogStore.addCategory({ name: 'Grocery' });
    const catStationery = await this.catalogStore.addCategory({ name: 'Stationery' });

    // ─── Products ────────────────────────────────────
    const pPhone = await this.catalogStore.addProduct({
      name: 'Samsung Galaxy A15',
      code: 'SAM-A15',
      category_uuid: catElectronics.uuid,
      purchase_price: 14000,
      sales_price: 16500,
      mrp_price: 17000,
      stock_count: 25,
      item_wise_tax: 5,
    });

    const pCharger = await this.catalogStore.addProduct({
      name: 'Fast Charger 25W',
      code: 'CHG-25W',
      category_uuid: catElectronics.uuid,
      purchase_price: 350,
      sales_price: 550,
      mrp_price: 600,
      stock_count: 50,
    });

    const pRice = await this.catalogStore.addProduct({
      name: 'Miniket Rice 5kg',
      code: 'RICE-5K',
      category_uuid: catGrocery.uuid,
      purchase_price: 380,
      sales_price: 450,
      mrp_price: 460,
      stock_count: 100,
    });

    const pOil = await this.catalogStore.addProduct({
      name: 'Soybean Oil 5L',
      code: 'OIL-5L',
      category_uuid: catGrocery.uuid,
      purchase_price: 620,
      sales_price: 720,
      mrp_price: 750,
      stock_count: 40,
    });

    const pPen = await this.catalogStore.addProduct({
      name: 'Matador Ball Pen (12pc)',
      code: 'PEN-12',
      category_uuid: catStationery.uuid,
      purchase_price: 90,
      sales_price: 130,
      mrp_price: 144,
      stock_count: 200,
    });

    const pNotebook = await this.catalogStore.addProduct({
      name: 'Notebook 200 Page',
      code: 'NB-200',
      category_uuid: catStationery.uuid,
      purchase_price: 55,
      sales_price: 80,
      mrp_price: 85,
      stock_count: 150,
    });

    // ─── Parties ─────────────────────────────────────
    const cRahman = await this.catalogStore.addParty({
      name: 'Rahman Electronics',
      party_type: EPartyType.CUSTOMER,
      phone: '01712345678',
      address: 'Mirpur 10, Dhaka',
    });

    const cKarim = await this.catalogStore.addParty({
      name: 'Karim General Store',
      party_type: EPartyType.CUSTOMER,
      phone: '01812345679',
      address: 'Uttara, Dhaka',
    });

    const cFatema = await this.catalogStore.addParty({
      name: 'Fatema Stationery',
      party_type: EPartyType.CUSTOMER,
      phone: '01912345680',
      address: 'Banani, Dhaka',
    });

    const sGlobal = await this.catalogStore.addParty({
      name: 'Global Electronics Ltd',
      party_type: EPartyType.SUPPLIER,
      phone: '01612345681',
      address: 'Elephant Road, Dhaka',
      credit_limit: 500000,
      payment_terms: 'net_30',
      payment_terms_days: 0,
    });

    const sFresh = await this.catalogStore.addParty({
      name: 'Fresh Agro Supply',
      party_type: EPartyType.SUPPLIER,
      phone: '01512345682',
      address: 'Kawran Bazar, Dhaka',
      credit_limit: 200000,
      payment_terms: 'net_15',
      payment_terms_days: 0,
    });

    // Add credit limits to customers
    await this.catalogStore.updateParty(cRahman.uuid, {
      credit_limit: 100000,
      payment_terms: 'net_30',
    });
    await this.catalogStore.updateParty(cKarim.uuid, {
      credit_limit: 50000,
      payment_terms: 'net_7',
    });
    await this.catalogStore.updateParty(cFatema.uuid, {
      credit_limit: 30000,
      payment_terms: 'net_15',
    });

    // ─── Helper: date offset ─────────────────────────
    const daysAgo = (d: number) => Date.now() - d * 86400000;

    // ─── Purchase Transactions ───────────────────────
    await this.transactionStore.addTransaction(
      {
        type: ETransactionType.PURCHASE,
        party_uuid: sGlobal.uuid,
        transaction_date: daysAgo(15),
        transaction_mode: 'Credit',
        total_amount: 168000,
        paid_amount: 100000,
        due_amount: 68000,
      },
      [
        { item_uuid: pPhone.uuid, quantity: 10, purchase_price: 14000, sales_price: 16500, item_wise_tax: 5, total_tax: 7000 },
        { item_uuid: pCharger.uuid, quantity: 20, purchase_price: 350, sales_price: 550 },
      ],
    );

    await this.transactionStore.addTransaction(
      {
        type: ETransactionType.PURCHASE,
        party_uuid: sFresh.uuid,
        transaction_date: daysAgo(12),
        transaction_mode: 'Cash',
        total_amount: 43600,
        paid_amount: 43600,
        due_amount: 0,
      },
      [
        { item_uuid: pRice.uuid, quantity: 50, purchase_price: 380, sales_price: 450 },
        { item_uuid: pOil.uuid, quantity: 30, purchase_price: 620, sales_price: 720 },
      ],
    );

    await this.transactionStore.addTransaction(
      {
        type: ETransactionType.PURCHASE,
        party_uuid: sGlobal.uuid,
        transaction_date: daysAgo(10),
        transaction_mode: 'Cash',
        total_amount: 9900,
        paid_amount: 9900,
        due_amount: 0,
      },
      [
        { item_uuid: pPen.uuid, quantity: 50, purchase_price: 90, sales_price: 130 },
        { item_uuid: pNotebook.uuid, quantity: 60, purchase_price: 55, sales_price: 80 },
      ],
    );

    // ─── Sales Transactions ──────────────────────────
    await this.transactionStore.addTransaction(
      {
        type: ETransactionType.SALES,
        party_uuid: cRahman.uuid,
        transaction_date: daysAgo(8),
        transaction_mode: 'Credit',
        total_amount: 84750,
        paid_amount: 50000,
        due_amount: 34750,
      },
      [
        { item_uuid: pPhone.uuid, quantity: 5, purchase_price: 14000, sales_price: 16500, item_wise_tax: 5, total_tax: 4125 },
        { item_uuid: pCharger.uuid, quantity: 5, purchase_price: 350, sales_price: 550 },
      ],
    );

    await this.transactionStore.addTransaction(
      {
        type: ETransactionType.SALES,
        party_uuid: cKarim.uuid,
        transaction_date: daysAgo(6),
        transaction_mode: 'Cash',
        total_amount: 16400,
        paid_amount: 16400,
        due_amount: 0,
      },
      [
        { item_uuid: pRice.uuid, quantity: 20, purchase_price: 380, sales_price: 450 },
        { item_uuid: pOil.uuid, quantity: 10, purchase_price: 620, sales_price: 720 },
      ],
    );

    await this.transactionStore.addTransaction(
      {
        type: ETransactionType.SALES,
        party_uuid: cFatema.uuid,
        transaction_date: daysAgo(4),
        transaction_mode: 'Credit',
        total_amount: 5500,
        paid_amount: 3000,
        due_amount: 2500,
      },
      [
        { item_uuid: pPen.uuid, quantity: 20, purchase_price: 90, sales_price: 130 },
        { item_uuid: pNotebook.uuid, quantity: 30, purchase_price: 55, sales_price: 80 },
      ],
    );

    // ─── Sales Return ────────────────────────────────
    await this.transactionStore.addTransaction(
      {
        type: ETransactionType.SALES_RETURN,
        party_uuid: cRahman.uuid,
        transaction_date: daysAgo(3),
        transaction_mode: 'Cash',
        total_amount: 550,
        paid_amount: 550,
        due_amount: 0,
      },
      [
        { item_uuid: pCharger.uuid, quantity: 1, purchase_price: 350, sales_price: 550 },
      ],
    );

    // ─── Payment In ──────────────────────────────────
    await this.transactionStore.addTransaction(
      {
        type: ETransactionType.PAYMENT_IN,
        party_uuid: cRahman.uuid,
        transaction_date: daysAgo(2),
        transaction_mode: 'Cash',
        total_amount: 20000,
        paid_amount: 20000,
        due_amount: 0,
      },
      [],
    );

    // ─── Payment Out ─────────────────────────────────
    await this.transactionStore.addTransaction(
      {
        type: ETransactionType.PAYMENT_OUT,
        party_uuid: sGlobal.uuid,
        transaction_date: daysAgo(1),
        transaction_mode: 'Cash',
        total_amount: 30000,
        paid_amount: 30000,
        due_amount: 0,
      },
      [],
    );

    // ─── Expense Categories ──────────────────────────
    const expCatRent = await this.expenseStore.addCategory('Shop Rent');
    const expCatTransport = await this.expenseStore.addCategory('Transport');
    const expCatUtility = await this.expenseStore.addCategory('Utility Bills');

    // ─── Expenses ────────────────────────────────────
    await this.expenseStore.addExpense(
      {
        category_uuid: expCatRent.uuid,
        expense_date: daysAgo(10),
        description: 'Monthly shop rent - April 2026',
        payment_type: 'Cash',
        total_amount: 15000,
        total_quantity: 1,
      },
      [{ item_name: 'Shop Rent April', rate: 15000, quantity: 1, amount: 15000 }],
    );

    await this.expenseStore.addExpense(
      {
        category_uuid: expCatTransport.uuid,
        expense_date: daysAgo(7),
        description: 'Goods delivery from warehouse',
        payment_type: 'Cash',
        total_amount: 2500,
        total_quantity: 2,
      },
      [
        { item_name: 'Truck Hire', rate: 2000, quantity: 1, amount: 2000 },
        { item_name: 'Labor', rate: 500, quantity: 1, amount: 500 },
      ],
    );

    await this.expenseStore.addExpense(
      {
        category_uuid: expCatUtility.uuid,
        expense_date: daysAgo(5),
        description: 'Electricity bill - March',
        payment_type: 'Cash',
        total_amount: 3200,
        total_quantity: 1,
      },
      [{ item_name: 'DESCO Bill March', rate: 3200, quantity: 1, amount: 3200 }],
    );

    await this.expenseStore.addExpense(
      {
        category_uuid: expCatTransport.uuid,
        expense_date: daysAgo(2),
        description: 'Customer delivery - Uttara',
        payment_type: 'Cash',
        total_amount: 800,
        total_quantity: 1,
      },
      [{ item_name: 'Pathao Delivery', rate: 800, quantity: 1, amount: 800 }],
    );

    // ─── Purchase Orders ──────────────────────────────
    // PO 1: Fully received — ready to convert
    const po1 = await this.purchaseOrderStore.addPurchaseOrder(
      {
        party_uuid: sGlobal.uuid,
        po_date: daysAgo(7),
        expected_delivery_date: daysAgo(2),
        status: 'sent',
        total_amount: 147000,
        total_tax: 7000,
        discount: 0,
        notes: 'Urgent restock of Samsung phones',
      },
      [
        { item_uuid: pPhone.uuid, quantity: 10, price: 14000, discount: 0, total: 140000 },
        { item_uuid: pCharger.uuid, quantity: 20, price: 350, discount: 0, total: 7000 },
      ],
    );

    // Receive all goods for PO1
    const po1Items = await this.purchaseOrderStore.getPurchaseOrderItems(po1.uuid);
    await this.purchaseOrderStore.receiveGoods(po1.uuid, po1Items.map((item) => ({
      po_item_uuid: item.uuid,
      item_uuid: item.item_uuid!,
      ordered_quantity: item.quantity,
      received_quantity: item.quantity,
    })));

    // PO 2: Partially received
    const po2 = await this.purchaseOrderStore.addPurchaseOrder(
      {
        party_uuid: sFresh.uuid,
        po_date: daysAgo(5),
        expected_delivery_date: daysAgo(0),
        status: 'sent',
        total_amount: 37600,
        total_tax: 0,
        discount: 0,
        notes: 'Weekly grocery restock',
      },
      [
        { item_uuid: pRice.uuid, quantity: 40, price: 380, discount: 0, total: 15200 },
        { item_uuid: pOil.uuid, quantity: 30, price: 620, discount: 0, total: 18600 },
        { item_uuid: pPen.uuid, quantity: 30, price: 90, discount: 0, total: 2700 },
      ],
    );

    // Partial receive — only rice delivered so far
    const po2Items = await this.purchaseOrderStore.getPurchaseOrderItems(po2.uuid);
    const riceItem = po2Items.find((i) => i.item_uuid === pRice.uuid);
    if (riceItem) {
      await this.purchaseOrderStore.receiveGoods(po2.uuid, [{
        po_item_uuid: riceItem.uuid,
        item_uuid: riceItem.item_uuid!,
        ordered_quantity: riceItem.quantity,
        received_quantity: 25,
      }]);
    }

    // PO 3: Draft — not yet sent
    await this.purchaseOrderStore.addPurchaseOrder(
      {
        party_uuid: sGlobal.uuid,
        po_date: daysAgo(1),
        expected_delivery_date: Date.now() + 7 * 86400000,
        status: 'draft',
        total_amount: 8800,
        total_tax: 0,
        discount: 0,
        notes: 'Stationery reorder for next month',
      },
      [
        { item_uuid: pPen.uuid, quantity: 40, price: 90, discount: 0, total: 3600 },
        { item_uuid: pNotebook.uuid, quantity: 80, price: 55, discount: 0, total: 4400 },
      ],
    );

    // ─── Overdue transactions for Aging Report ───────
    // Sale to Rahman — overdue 45 days
    await this.transactionStore.addTransaction(
      {
        type: ETransactionType.SALES,
        party_uuid: cRahman.uuid,
        transaction_date: daysAgo(75),
        transaction_mode: 'Credit',
        total_amount: 33000,
        paid_amount: 0,
        due_amount: 33000,
        due_date: daysAgo(45),
      },
      [{ item_uuid: pPhone.uuid, quantity: 2, purchase_price: 14000, sales_price: 16500 }],
    );

    // Sale to Fatema — overdue 10 days
    await this.transactionStore.addTransaction(
      {
        type: ETransactionType.SALES,
        party_uuid: cFatema.uuid,
        transaction_date: daysAgo(25),
        transaction_mode: 'Credit',
        total_amount: 7200,
        paid_amount: 0,
        due_amount: 7200,
        due_date: daysAgo(10),
      },
      [{ item_uuid: pOil.uuid, quantity: 10, purchase_price: 620, sales_price: 720 }],
    );

    // Purchase from Global — overdue 65 days (for payable aging)
    await this.transactionStore.addTransaction(
      {
        type: ETransactionType.PURCHASE,
        party_uuid: sGlobal.uuid,
        transaction_date: daysAgo(95),
        transaction_mode: 'Credit',
        total_amount: 70000,
        paid_amount: 0,
        due_amount: 70000,
        due_date: daysAgo(65),
      },
      [{ item_uuid: pPhone.uuid, quantity: 5, purchase_price: 14000, sales_price: 16500 }],
    );

    console.log('[DemoSeed] Demo data seeded successfully!');
  }
}

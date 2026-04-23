import { Injectable, inject } from '@angular/core';
import { CatalogStore } from '../stores/catalog.store';
import { TransactionStore } from '../stores/transaction.store';
import { ExpenseStore } from '../stores/expense.store';
import { PurchaseOrderStore } from '../stores/purchase-order.store';
import { StockTransferStore } from '../stores/stock-transfer.store';
import { LogisticsStore } from '../stores/logistics.store';
import { DeliveryStore } from '../stores/delivery.store';
import { AuthStore } from '../stores/auth.store';
import { PouchDbService } from './pouchdb.service';
import { ETransactionType, EPartyType, ETables } from '@org/shared-types';

@Injectable({ providedIn: 'root' })
export class DemoSeedService {
  private catalogStore = inject(CatalogStore);
  private transactionStore = inject(TransactionStore);
  private expenseStore = inject(ExpenseStore);
  private purchaseOrderStore = inject(PurchaseOrderStore);
  private stockTransferStore = inject(StockTransferStore);
  private logisticsStore = inject(LogisticsStore);
  private deliveryStore = inject(DeliveryStore);
  private authStore = inject(AuthStore);
  private pouchDb = inject(PouchDbService);

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
      reorder_level: 10,
      reorder_quantity: 20,
    });

    const pCharger = await this.catalogStore.addProduct({
      name: 'Fast Charger 25W',
      code: 'CHG-25W',
      category_uuid: catElectronics.uuid,
      purchase_price: 350,
      sales_price: 550,
      mrp_price: 600,
      stock_count: 50,
      reorder_level: 20,
      reorder_quantity: 30,
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
      reorder_level: 15,
      reorder_quantity: 25,
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

    // ─── Branches ─────────────────────────────────
    const bizUuid = this.authStore.activeBusinessUuid()!;
    const now = Date.now();

    const branchMain = {
      uuid: crypto.randomUUID(),
      table_type: ETables.BRANCH,
      business_uuid: bizUuid,
      name: 'Main Warehouse - Mirpur',
      address: 'Mirpur 10, Dhaka',
      phone: '01711111111',
      is_main: true,
      created_at: now,
      updated_at: now,
    };
    await this.pouchDb.put(ETables.BRANCH, branchMain.uuid, branchMain as unknown as Record<string, unknown>);

    const branchUttara = {
      uuid: crypto.randomUUID(),
      table_type: ETables.BRANCH,
      business_uuid: bizUuid,
      name: 'Uttara Branch',
      address: 'Uttara Sector 7, Dhaka',
      phone: '01722222222',
      is_main: false,
      created_at: now,
      updated_at: now,
    };
    await this.pouchDb.put(ETables.BRANCH, branchUttara.uuid, branchUttara as unknown as Record<string, unknown>);

    const branchBanani = {
      uuid: crypto.randomUUID(),
      table_type: ETables.BRANCH,
      business_uuid: bizUuid,
      name: 'Banani Outlet',
      address: 'Banani Road 11, Dhaka',
      phone: '01733333333',
      is_main: false,
      created_at: now,
      updated_at: now,
    };
    await this.pouchDb.put(ETables.BRANCH, branchBanani.uuid, branchBanani as unknown as Record<string, unknown>);

    // ─── Stock Transfers ────────────────────────────
    // Transfer 1: Received (completed)
    const st1 = await this.stockTransferStore.addTransfer(
      {
        from_branch_uuid: branchMain.uuid,
        from_branch_name: branchMain.name,
        to_branch_uuid: branchUttara.uuid,
        to_branch_name: branchUttara.name,
        transfer_date: daysAgo(5),
        notes: 'Weekly restock for Uttara branch',
      },
      [
        { item_uuid: pRice.uuid, item_name: pRice.name, quantity: 10, unit: 'kg' },
        { item_uuid: pOil.uuid, item_name: pOil.name, quantity: 5, unit: 'pcs' },
      ],
    );
    await this.stockTransferStore.dispatchTransfer(st1.uuid);
    await this.stockTransferStore.receiveTransfer(st1.uuid);

    // Transfer 2: In transit
    const st2 = await this.stockTransferStore.addTransfer(
      {
        from_branch_uuid: branchMain.uuid,
        from_branch_name: branchMain.name,
        to_branch_uuid: branchBanani.uuid,
        to_branch_name: branchBanani.name,
        transfer_date: daysAgo(1),
        notes: 'Sending chargers and pens to Banani',
      },
      [
        { item_uuid: pCharger.uuid, item_name: pCharger.name, quantity: 10, unit: 'pcs' },
        { item_uuid: pPen.uuid, item_name: pPen.name, quantity: 20, unit: 'box' },
      ],
    );
    await this.stockTransferStore.dispatchTransfer(st2.uuid);

    // Transfer 3: Draft
    await this.stockTransferStore.addTransfer(
      {
        from_branch_uuid: branchUttara.uuid,
        from_branch_name: branchUttara.name,
        to_branch_uuid: branchMain.uuid,
        to_branch_name: branchMain.name,
        transfer_date: Date.now() + 2 * 86400000,
        notes: 'Return excess notebooks',
      },
      [
        { item_uuid: pNotebook.uuid, item_name: pNotebook.name, quantity: 15, unit: 'pcs' },
      ],
    );

    // ─── Vehicles ───────────────────────────────────
    const vVan = await this.logisticsStore.addVehicle({
      name: 'Delivery Van 1',
      plate_number: 'ঢাকা মেট্রো গ-১২৩৪',
      vehicle_type: 'Van',
      capacity: '1.5 ton',
      driver_name: 'Rahim Mia',
      driver_phone: '01755555555',
    });

    const vPickup = await this.logisticsStore.addVehicle({
      name: 'Pickup Truck',
      plate_number: 'ঢাকা মেট্রো ঘ-৫৬৭৮',
      vehicle_type: 'Pickup',
      capacity: '800 kg',
      driver_name: 'Kamal Hossain',
      driver_phone: '01766666666',
    });

    await this.logisticsStore.addVehicle({
      name: 'Delivery Bike',
      plate_number: 'ঢাকা মেট্রো চ-৯০১২',
      vehicle_type: 'Motorcycle',
      capacity: '30 kg',
      driver_name: 'Sohel Ahmed',
      driver_phone: '01777777777',
    });

    await this.logisticsStore.addVehicle({
      name: 'Old Van (Under Repair)',
      plate_number: 'ঢাকা মেট্রো গ-৩৪৫৬',
      vehicle_type: 'Van',
      capacity: '1 ton',
      status: 'maintenance' as any,
      notes: 'Engine repair — expected back next week',
    });

    // ─── Deliveries (for trips) ─────────────────────
    const del1 = await this.deliveryStore.addDelivery(
      {
        party_uuid: cRahman.uuid,
        delivery_date: daysAgo(0),
        delivery_address: 'Mirpur 10, Dhaka',
        status: 'pending',
      },
      [
        { item_uuid: pPhone.uuid, ordered_quantity: 3, delivered_quantity: 3 },
        { item_uuid: pCharger.uuid, ordered_quantity: 5, delivered_quantity: 5 },
      ],
    );

    const del2 = await this.deliveryStore.addDelivery(
      {
        party_uuid: cKarim.uuid,
        delivery_date: daysAgo(0),
        delivery_address: 'Uttara Sector 3, Dhaka',
        status: 'pending',
      },
      [
        { item_uuid: pRice.uuid, ordered_quantity: 10, delivered_quantity: 10 },
        { item_uuid: pOil.uuid, ordered_quantity: 5, delivered_quantity: 5 },
      ],
    );

    const del3 = await this.deliveryStore.addDelivery(
      {
        party_uuid: cFatema.uuid,
        delivery_date: daysAgo(0),
        delivery_address: 'Banani Road 11, Dhaka',
        status: 'pending',
      },
      [
        { item_uuid: pPen.uuid, ordered_quantity: 15, delivered_quantity: 15 },
        { item_uuid: pNotebook.uuid, ordered_quantity: 20, delivered_quantity: 20 },
      ],
    );

    // ─── Trips ──────────────────────────────────────
    // Trip 1: In progress (today's run)
    const trip1 = await this.logisticsStore.addTrip(
      {
        vehicle_uuid: vVan.uuid,
        vehicle_name: vVan.name,
        driver_name: 'Rahim Mia',
        driver_phone: '01755555555',
        trip_date: daysAgo(0),
        origin: 'Main Warehouse - Mirpur',
        destination: 'Uttara',
      },
      [
        { party_name: 'Rahman Electronics', address: 'Mirpur 10, Dhaka', delivery_uuid: del1.uuid },
        { party_name: 'Karim General Store', address: 'Uttara Sector 3, Dhaka', delivery_uuid: del2.uuid },
      ],
    );
    await this.logisticsStore.startTrip(trip1.uuid);

    // Trip 2: Planned for tomorrow
    await this.logisticsStore.addTrip(
      {
        vehicle_uuid: vPickup.uuid,
        vehicle_name: vPickup.name,
        driver_name: 'Kamal Hossain',
        driver_phone: '01766666666',
        trip_date: Date.now() + 86400000,
        origin: 'Main Warehouse - Mirpur',
        destination: 'Banani',
      },
      [
        { party_name: 'Fatema Stationery', address: 'Banani Road 11, Dhaka', delivery_uuid: del3.uuid },
        { party_name: 'Banani Outlet (Branch Restock)', address: 'Banani Road 11, Dhaka' },
      ],
    );

    // Trip 3: Completed yesterday
    const trip3 = await this.logisticsStore.addTrip(
      {
        vehicle_uuid: vVan.uuid,
        vehicle_name: vVan.name,
        driver_name: 'Rahim Mia',
        driver_phone: '01755555555',
        trip_date: daysAgo(1),
        origin: 'Main Warehouse',
        destination: 'Mirpur & Uttara',
      },
      [
        { party_name: 'Mirpur Grocery', address: 'Mirpur 2, Dhaka' },
        { party_name: 'Uttara Mart', address: 'Uttara Sector 10, Dhaka' },
      ],
    );
    await this.logisticsStore.startTrip(trip3.uuid);
    await this.logisticsStore.completeTrip(trip3.uuid);

    console.log('[DemoSeed] Demo data seeded successfully!');
  }
}

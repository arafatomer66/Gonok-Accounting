import { IBaseModel, ICouchDoc } from './base.model.js';

export interface ISettings extends IBaseModel, ICouchDoc {
  uuid: string;
  business_uuid: string | null;
  item_settings: IItemSettings;
  party_settings: IPartySettings;
  transaction_settings: ITransactionSettings;
  export_settings: IExportSettings;
}

export interface IItemSettings {
  item_type: string;
  active: boolean;
  barcode_scan_enabled: boolean;
  stock_maintenance_enabled: boolean;
  unit_enabled: boolean;
  category_enabled: boolean;
  party_wise_rate_enabled: boolean;
  description_enabled: boolean;
  item_wise_tax_enabled: boolean;
  discount_enabled: boolean;
  quantity_decimal_place: number;
  mrp_price_enabled: boolean;
  mrp_price_value: number;
  batch_no_enabled: boolean;
  batch_no_value: string | null;
  exp_date_enabled: boolean;
  exp_date_format: string;
  exp_date_value: string | null;
  mfg_date_enabled: boolean;
  mfg_date_format: string;
  mfg_date_value: string | null;
  serial_no_enabled: boolean;
  serial_no_value: string | null;
  size_enabled: boolean;
  size_value: string | null;
  purchase_price_enabled: boolean;
  sales_price_enabled: boolean;
}

export interface IPartySettings {
  party_grouping: boolean;
  shipping_address_enabled: boolean;
  shipping_address_print_enabled: boolean;
  payment_reminder_enabled: boolean;
  payment_reminder_message: string;
  payment_reminder_due_days: number;
  additional_field_1_enabled: boolean;
  additional_field_1: string | null;
  additional_field_1_print_enabled: boolean;
  additional_field_2_enabled: boolean;
  additional_field_2: string | null;
  additional_field_2_print_enabled: boolean;
  additional_field_3_enabled: boolean;
  additional_field_3: string | null;
  additional_field_3_print_enabled: boolean;
  additional_field_4_enabled: boolean;
  additional_field_4: string | null;
  additional_field_4_date_format: string;
  additional_field_4_print_enabled: boolean;
}

export interface ITransactionSettings {
  invoice_no_enabled: boolean;
  cash_sale_by_default: boolean;
  show_parties_billing_name: boolean;
  customer_PO_details: boolean;
  inclusive_tax_on_rate: boolean;
  show_item_purchase_price: boolean;
  show_item_sales_price: boolean;
  show_free_item_quantity: boolean;
  transaction_wise_tax: boolean;
  transaction_wise_discount: boolean;
  round_total: boolean;
  show_invoice_preview: boolean;
  enable_passcode_on_transaction_delete: boolean;
  enable_payment_discount: boolean;
}

export interface IExportSettings {
  show_title: boolean;
  show_company_name: boolean;
  show_company_logo: boolean;
  show_footer: boolean;
  show_export_date: boolean;
  show_merchant_info: boolean;
}

import { IBaseModel, ICouchDoc } from './base.model.js';

export interface ITransaction extends IBaseModel, ICouchDoc {
  uuid: string;
  business_uuid: string | null;
  branch_uuid: string | null;
  type: string | null;
  party_uuid: string | null;
  transaction_date: number;
  transaction_mode: string | null;
  description: string | null;
  order_number: string | null;
  payment_type: string | null;
  cheque_ref_no: string | null;
  bank_account_uuid: string | null;
  mobile_tx_id: string | null;
  items: ITransactionItem[];
  discount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  quantity: number;
  bill_date: number;
  total_tax: number;
  bill_no: string | null;
  invoice_date: number;
  invoice_no: string | null;
  return_no: string | null;
  due_date: number;
  po_uuid: string | null;
}

export interface ITransactionItem extends IBaseModel, ICouchDoc {
  uuid: string;
  business_uuid: string | null;
  branch_uuid: string | null;
  party_uuid: string | null;
  transaction_uuid: string | null;
  transaction_type: string | null;
  item_uuid: string | null;
  purchase_price: number;
  sales_price: number;
  item_wise_tax: number;
  total_tax: number;
  quantity: number;
  transaction_date: number;
}

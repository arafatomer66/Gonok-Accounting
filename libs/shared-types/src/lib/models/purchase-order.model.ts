import { IBaseModel, ICouchDoc } from './base.model.js';

export interface IPurchaseOrder extends IBaseModel, ICouchDoc {
  uuid: string;
  business_uuid: string | null;
  branch_uuid: string | null;
  party_uuid: string | null;
  po_no: string | null;
  po_date: number;
  expected_delivery_date: number;
  status: 'draft' | 'sent' | 'partially_received' | 'received' | 'cancelled';
  notes: string | null;
  discount: number;
  total_amount: number;
  total_tax: number;
  received_amount: number;
  converted_transaction_uuid: string | null;
}

export interface IPurchaseOrderItem extends IBaseModel, ICouchDoc {
  uuid: string;
  business_uuid: string | null;
  branch_uuid: string | null;
  po_uuid: string | null;
  item_uuid: string | null;
  quantity: number;
  received_quantity: number;
  price: number;
  discount: number;
  total: number;
}

export interface IGoodsReceiptNote extends IBaseModel, ICouchDoc {
  uuid: string;
  business_uuid: string | null;
  branch_uuid: string | null;
  po_uuid: string | null;
  grn_no: string | null;
  grn_date: number;
  party_uuid: string | null;
  notes: string | null;
  total_items: number;
  total_quantity: number;
}

export interface IGoodsReceiptNoteItem extends IBaseModel, ICouchDoc {
  uuid: string;
  business_uuid: string | null;
  branch_uuid: string | null;
  grn_uuid: string | null;
  po_item_uuid: string | null;
  item_uuid: string | null;
  ordered_quantity: number;
  received_quantity: number;
}

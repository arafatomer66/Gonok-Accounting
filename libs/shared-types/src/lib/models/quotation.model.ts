import { IBaseModel, ICouchDoc } from './base.model.js';

export interface IQuotation extends IBaseModel, ICouchDoc {
  uuid: string;
  business_uuid: string | null;
  branch_uuid: string | null;
  party_uuid: string | null;
  quotation_no: string | null;
  quotation_date: number;
  valid_until: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';
  notes: string | null;
  discount: number;
  total_amount: number;
  total_tax: number;
  converted_transaction_uuid: string | null;
}

export interface IQuotationItem extends IBaseModel, ICouchDoc {
  uuid: string;
  business_uuid: string | null;
  branch_uuid: string | null;
  quotation_uuid: string | null;
  item_uuid: string | null;
  quantity: number;
  price: number;
  discount: number;
  total: number;
}

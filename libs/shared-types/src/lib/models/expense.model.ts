import { IBaseModel } from './base.model.js';

export interface IExpense extends IBaseModel {
  uuid: string;
  business_uuid: string | null;
  branch_uuid: string | null;
  table_type: string;
  type: string | null;
  category_uuid: string | null;
  expense_date: number;
  description: string | null;
  payment_type: string;
  cheque_ref_no: string | null;
  bank_account_uuid: string | null;
  mobile_tx_id: string | null;
  total_amount: number;
  total_quantity: number;
}

export interface IExpenseItem extends IBaseModel {
  uuid: string;
  item_uuid: string | null;
  item_name: string | null;
  business_uuid: string | null;
  branch_uuid: string | null;
  expense_uuid: string | null;
  table_type: string;
  rate: number;
  quantity: number;
  amount: number;
  expense_date: number;
}

export interface IExpenseCategory extends IBaseModel {
  uuid: string;
  name: string | null;
  business_uuid: string | null;
  branch_uuid: string | null;
  table_type: string;
}

export interface IExpenseBareItem extends IBaseModel {
  uuid: string;
  name: string | null;
  table_type: string;
  business_uuid: string | null;
  branch_uuid: string | null;
}

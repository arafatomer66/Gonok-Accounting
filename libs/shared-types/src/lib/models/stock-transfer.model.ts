import { IBaseModel, ICouchDoc } from './base.model.js';
import { EStockTransferStatus } from '../enums/stock-transfer.enum.js';

export interface IStockTransfer extends IBaseModel, ICouchDoc {
  uuid: string;
  business_uuid: string | null;
  branch_uuid: string | null;
  transfer_no: string;
  from_branch_uuid: string;
  from_branch_name: string;
  to_branch_uuid: string;
  to_branch_name: string;
  transfer_date: number;
  received_date: number | null;
  status: EStockTransferStatus;
  total_items: number;
  total_quantity: number;
  notes: string | null;
}

export interface IStockTransferItem extends IBaseModel, ICouchDoc {
  uuid: string;
  business_uuid: string | null;
  transfer_uuid: string;
  item_uuid: string;
  item_name: string | null;
  quantity: number;
  unit: string | null;
}

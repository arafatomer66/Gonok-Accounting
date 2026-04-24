import { IBaseModel, ICouchDoc } from './base.model.js';

export interface IProduct extends IBaseModel, ICouchDoc {
  uuid: string;
  name: string | null;
  code: string | null;
  business_uuid: string | null;
  branch_uuid: string | null;
  product_type: string | null;
  active: boolean;
  slug: string | null;
  description: string | null;
  purchase_price: number;
  sales_price: number;
  mrp_price: number;
  discount: number;
  net_price: number;
  stock_count: number;
  image_url: string | null;
  thumbnail_url: string | null;
  unit: string | null;
  category_uuid: string | null;
  party_wise_rate: string | null;
  item_wise_tax: number;
  quantity: number;
  stock_by_branch: Record<string, number>;
  batch_no: string | null;
  exp_date: number | null;
  mfg_date: number | null;
  serial_no: string | null;
  size: string | null;
  reorder_level: number;
  reorder_quantity: number;
}

export interface ICategory extends IBaseModel, ICouchDoc {
  uuid: string;
  name: string | null;
  business_uuid: string | null;
  branch_uuid: string | null;
  comment: string | null;
  is_supplier: boolean;
  is_outlet: boolean;
  is_enabled: boolean;
}

export interface IUnit extends IBaseModel, ICouchDoc {
  uuid: string;
  business_uuid: string | null;
  fullname: string | null;
  shortname: string | null;
  can_delete: boolean;
}

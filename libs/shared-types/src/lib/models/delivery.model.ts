import { IBaseModel, ICouchDoc } from './base.model.js';

export interface IDelivery extends IBaseModel, ICouchDoc {
  uuid: string;
  business_uuid: string | null;
  branch_uuid: string | null;
  delivery_no: string | null;
  transaction_uuid: string | null;
  party_uuid: string | null;
  delivery_date: number;
  delivery_address: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  vehicle_no: string | null;
  status: 'pending' | 'dispatched' | 'in_transit' | 'delivered' | 'partial';
  notes: string | null;
  total_items: number;
  total_quantity: number;
}

export interface IDeliveryItem extends IBaseModel, ICouchDoc {
  uuid: string;
  business_uuid: string | null;
  branch_uuid: string | null;
  delivery_uuid: string | null;
  item_uuid: string | null;
  ordered_quantity: number;
  delivered_quantity: number;
}

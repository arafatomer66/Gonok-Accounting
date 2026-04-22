import { IBaseModel, ICouchDoc } from './base.model.js';
import { EPartyType } from '../enums/party.enum.js';

export interface IParty extends IBaseModel, ICouchDoc {
  uuid: string;
  name: string | null;
  business_uuid: string | null;
  branch_uuid: string | null;
  party_type: EPartyType;
  group_uuid: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  shipping_address: string | null;
  tin: string | null;
  current_balance_date: number;
  current_balance: number;
  can_delete: boolean;
  credit_limit: number;
  payment_terms: string | null;
  payment_terms_days: number;
}

export interface IPartyGroup extends IBaseModel, ICouchDoc {
  uuid: string;
  name: string | null;
  business_uuid: string | null;
  branch_uuid: string | null;
  can_delete: boolean;
}

export interface IPartyBalance extends IParty {
  balance: number;
  total_amount?: number;
}

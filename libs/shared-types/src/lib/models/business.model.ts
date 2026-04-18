import { ICouchDoc } from './base.model.js';

export interface IAddress {
  display_address: string | null;
  city: string | null;
  district: string | null;
  country_code: string | null;
}

export interface IBusiness extends ICouchDoc {
  uuid: string;
  name_en: string | null;
  name_bn: string | null;
  phone: string | null;
  display_phone: string | null;
  logo_url: string;
  address: IAddress;
}

import { IBaseModel, ICouchDoc } from './base.model.js';

export interface IBranch extends IBaseModel, ICouchDoc {
  uuid: string;
  business_uuid: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_main: boolean;
}

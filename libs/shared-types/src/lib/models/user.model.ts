import { EUserRole } from '../enums/user-role.enum.js';

export interface IUser {
  uuid: string;
  first_name: string;
  last_name: string;
  name: string;
  phone: string;
  role: EUserRole;
}

export interface IBusinessUser {
  uuid: string;
  user_uuid: string;
  business_uuid: string;
  role: EUserRole;
}

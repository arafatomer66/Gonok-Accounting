import { IBaseModel, ICouchDoc } from './base.model.js';

export interface IEmployee extends IBaseModel, ICouchDoc {
  uuid: string;
  business_uuid: string | null;
  branch_uuid: string | null;
  name: string;
  phone: string | null;
  designation: string | null;
  department: string | null;
  join_date: number;
  base_salary: number;
  active: boolean;
}

export interface ISalary extends IBaseModel, ICouchDoc {
  uuid: string;
  business_uuid: string | null;
  branch_uuid: string | null;
  employee_uuid: string;
  employee_name: string;
  month: number;
  year: number;
  base_salary: number;
  bonus: number;
  deduction: number;
  advance: number;
  net_salary: number;
  paid: boolean;
  paid_date: number | null;
  payment_type: string | null;
  notes: string | null;
}

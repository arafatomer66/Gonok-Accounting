import { IBaseModel, ICouchDoc } from './base.model.js';

export interface IRecurringExpense extends IBaseModel, ICouchDoc {
  uuid: string;
  business_uuid: string | null;
  branch_uuid: string | null;
  name: string;
  category_uuid: string | null;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  start_date: number;
  next_due_date: number;
  last_generated_date: number | null;
  active: boolean;
  description: string | null;
  payment_type: string;
}

export interface IPackage {
  uuid: string;
  name: string;
  sync_enabled: boolean;
  multi_user_enabled: boolean;
  multi_branch_enabled: boolean;
  allowed_monthly_sms: number;
  is_default: boolean;
  duration_months: number;
  subscription_fee: number;
  yearly_discount: number;
  half_yearly_discount: number;
  comment: string;
}

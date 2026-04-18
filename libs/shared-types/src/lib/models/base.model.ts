export interface IBaseModel {
  table_type: string;
  created_at: number;
  updated_at: number;
  created_by: string | null;
  updated_by: string | null;
}

export interface ICouchDoc {
  _id?: string;
  _rev?: string;
}

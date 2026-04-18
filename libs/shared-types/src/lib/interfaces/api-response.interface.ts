export interface IApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface IPaginatedResponse<T> extends IApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}

export interface IDateRangeFilter {
  start_date: number;
  end_date: number;
}

export interface ITransactionSaveResponse {
  transaction_uuid: string;
  item_uuids: string[];
}

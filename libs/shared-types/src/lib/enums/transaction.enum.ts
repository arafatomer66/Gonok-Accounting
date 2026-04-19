export enum ETransactionType {
  PURCHASE = 'purchase',
  SALES = 'sales',
  PURCHASE_RETURN = 'purchase_return',
  SALES_RETURN = 'sales_return',
  PAYMENT_IN = 'payment_in',
  PAYMENT_OUT = 'payment_out',
}

export enum EPaymentType {
  CASH = 'Cash',
  CHEQUE = 'Cheque',
  BKASH = 'bKash',
  NAGAD = 'Nagad',
  ROCKET = 'Rocket',
  BANK = 'Bank',
}

export enum ETransactionMode {
  CASH = 'Cash',
  CREDIT = 'Credit',
}

export enum ESortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

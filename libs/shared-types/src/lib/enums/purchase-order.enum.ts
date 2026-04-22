export enum EPurchaseOrderStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PARTIALLY_RECEIVED = 'partially_received',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
}

export enum EPaymentTerms {
  IMMEDIATE = 'immediate',
  NET_7 = 'net_7',
  NET_15 = 'net_15',
  NET_30 = 'net_30',
  NET_60 = 'net_60',
  NET_90 = 'net_90',
  CUSTOM = 'custom',
}

export function getPaymentTermsDays(terms: EPaymentTerms | string | null): number {
  switch (terms) {
    case EPaymentTerms.IMMEDIATE: return 0;
    case EPaymentTerms.NET_7: return 7;
    case EPaymentTerms.NET_15: return 15;
    case EPaymentTerms.NET_30: return 30;
    case EPaymentTerms.NET_60: return 60;
    case EPaymentTerms.NET_90: return 90;
    default: return 0;
  }
}

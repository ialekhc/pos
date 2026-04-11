export type PaymentProviderRequest = {
  tenantId: string;
  saleId: string;
  amount: number;
  currency: string;
  method: 'CASH' | 'CARD' | 'QR' | 'WALLET' | 'MANUAL';
  metadata?: Record<string, unknown>;
};

export type PaymentProviderResult = {
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  providerTransactionId?: string;
  referenceNumber?: string;
  provider: string;
  responsePayload?: Record<string, unknown>;
  failureReason?: string;
};

export interface PaymentProvider {
  supports(method: PaymentProviderRequest['method']): boolean;
  processPayment(input: PaymentProviderRequest): Promise<PaymentProviderResult>;
}

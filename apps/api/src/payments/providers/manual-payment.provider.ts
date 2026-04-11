import { Injectable } from '@nestjs/common';
import { PaymentProvider, PaymentProviderRequest, PaymentProviderResult } from './payment-provider.interface';

@Injectable()
export class ManualPaymentProvider implements PaymentProvider {
  supports(_method: PaymentProviderRequest['method']): boolean {
    return true;
  }

  async processPayment(input: PaymentProviderRequest): Promise<PaymentProviderResult> {
    const timestamp = Date.now();

    return {
      status: 'SUCCESS',
      provider: `MANUAL_${input.method}`,
      providerTransactionId: `${input.method}-${timestamp}`,
      referenceNumber: `REF-${timestamp}`,
      responsePayload: {
        message: 'Manual provider accepted payment.',
        method: input.method
      }
    };
  }
}

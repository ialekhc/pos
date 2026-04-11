import { Injectable } from '@nestjs/common';
import { ManualPaymentProvider } from './providers/manual-payment.provider';
import { PaymentProvider, PaymentProviderRequest } from './providers/payment-provider.interface';

@Injectable()
export class PaymentProviderFactory {
  constructor(private readonly manualProvider: ManualPaymentProvider) {}

  getProvider(method: PaymentProviderRequest['method']): PaymentProvider {
    // Placeholder for future provider routing (Stripe, Razorpay, Adyen, etc.)
    if (this.manualProvider.supports(method)) {
      return this.manualProvider;
    }

    return this.manualProvider;
  }
}

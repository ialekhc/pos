import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRoleCode } from '@prisma/client';
import { ActiveUser } from '../common/types/active-user.type';
import { AuditService } from '../audit/audit.service';
import { PaymentProviderFactory } from './payment-provider.factory';
import { PaymentsRepository } from './payments.repository';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { ReconcilePaymentDto } from './dto/reconcile-payment.dto';

export type ProcessPaymentInput = {
  tenantId: string;
  saleId: string;
  method: 'CASH' | 'CARD' | 'QR' | 'WALLET' | 'MANUAL';
  amount: number;
  currency: string;
  actorId?: string;
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly providerFactory: PaymentProviderFactory,
    private readonly auditService: AuditService
  ) {}

  list(actor: ActiveUser) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Vendor context required.');
    }

    return this.paymentsRepository.listByTenant(actor.tenantId);
  }

  async processPayment(input: ProcessPaymentInput) {
    const provider = this.providerFactory.getProvider(input.method);

    const providerResult = await provider.processPayment({
      tenantId: input.tenantId,
      saleId: input.saleId,
      amount: input.amount,
      currency: input.currency,
      method: input.method
    });

    const payment = await this.paymentsRepository.createPayment({
      tenantId: input.tenantId,
      saleId: input.saleId,
      method: input.method,
      status: providerResult.status,
      provider: providerResult.provider,
      amount: new Prisma.Decimal(input.amount),
      currency: input.currency,
      referenceNumber: providerResult.referenceNumber,
      paidAt: providerResult.status === 'SUCCESS' ? new Date() : null,
      createdById: input.actorId
    });

    await this.paymentsRepository.createPaymentTransaction({
      tenantId: input.tenantId,
      paymentId: payment.id,
      provider: providerResult.provider,
      providerTransactionId: providerResult.providerTransactionId,
      requestPayload: {
        method: input.method,
        amount: input.amount
      } as Prisma.InputJsonValue,
      responsePayload: providerResult.responsePayload as Prisma.InputJsonValue | undefined,
      status: providerResult.status,
      amount: new Prisma.Decimal(input.amount),
      currency: input.currency,
      failureReason: providerResult.failureReason,
      reconciledAt: providerResult.status === 'SUCCESS' ? new Date() : null
    });

    return payment;
  }

  async record(actor: ActiveUser, dto: RecordPaymentDto) {
    const sale = await this.paymentsRepository.findSaleById(dto.saleId);
    if (!sale) {
      throw new NotFoundException('Sale not found.');
    }

    if (actor.role !== UserRoleCode.SUPER_ADMIN && sale.tenantId !== actor.tenantId) {
      throw new ForbiddenException('Cross-vendor payment recording denied.');
    }

    const payment = await this.processPayment({
      tenantId: sale.tenantId,
      saleId: sale.id,
      method: dto.method,
      amount: dto.amount,
      currency: dto.currency ?? 'NPR',
      actorId: actor.userId
    });

    await this.auditService.logUserEvent({
      actor,
      tenantId: sale.tenantId,
      action: 'PAYMENT_RECORDED',
      entity: 'Payment',
      entityId: payment.id,
      details: {
        saleId: sale.id,
        method: dto.method,
        amount: dto.amount
      }
    });

    return payment;
  }

  async reconcile(actor: ActiveUser, dto: ReconcilePaymentDto) {
    const payment = await this.paymentsRepository.findPaymentById(dto.paymentId);
    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    if (actor.role !== UserRoleCode.SUPER_ADMIN && payment.tenantId !== actor.tenantId) {
      throw new ForbiddenException('Cross-vendor reconciliation denied.');
    }

    await this.paymentsRepository.markTransactionReconciled(payment.id);

    await this.auditService.logUserEvent({
      actor,
      tenantId: payment.tenantId,
      action: 'PAYMENT_RECONCILED',
      entity: 'Payment',
      entityId: payment.id,
      details: dto.notes ? { notes: dto.notes } : undefined
    });

    return { success: true };
  }
}

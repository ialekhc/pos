import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findSaleById(saleId: string) {
    return this.prisma.sale.findUnique({
      where: { id: saleId },
      include: { payments: true }
    });
  }

  createPayment(data: Parameters<PrismaService['payment']['create']>[0]['data']) {
    return this.prisma.payment.create({ data });
  }

  createPaymentTransaction(data: Parameters<PrismaService['paymentTransaction']['create']>[0]['data']) {
    return this.prisma.paymentTransaction.create({ data });
  }

  listByTenant(tenantId: string) {
    return this.prisma.payment.findMany({
      where: { tenantId },
      include: { sale: true, transactions: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  findPaymentById(paymentId: string) {
    return this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { transactions: true, sale: true }
    });
  }

  markTransactionReconciled(paymentId: string) {
    return this.prisma.paymentTransaction.updateMany({
      where: { paymentId },
      data: { reconciledAt: new Date() }
    });
  }

  sumSuccessfulPaymentsForSale(saleId: string) {
    return this.prisma.payment.aggregate({
      where: { saleId, status: 'SUCCESS' },
      _sum: { amount: true }
    });
  }
}

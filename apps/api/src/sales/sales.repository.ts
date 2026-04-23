import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

type SaleItemComputation = {
  productId: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  productName: string;
  sku: string;
};

@Injectable()
export class SalesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly saleItemInclude = {
    product: {
      include: {
        category: {
          include: {
            parent: true
          }
        }
      }
    }
  } as const;

  findByTenant(tenantId: string, take?: number) {
    return this.prisma.sale.findMany({
      where: { tenantId },
      include: {
        items: { include: this.saleItemInclude },
        payments: true,
        cashier: true
      },
      orderBy: { createdAt: 'desc' },
      take
    });
  }

  findById(saleId: string) {
    return this.prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: { include: this.saleItemInclude },
        payments: true,
        cashier: true,
        manager: true,
        counter: true
      }
    });
  }

  countOrdersForTenantInYear(tenantId: string, yearStart: Date, yearEnd: Date) {
    return this.prisma.sale.count({
      where: {
        tenantId,
        createdAt: {
          gte: yearStart,
          lte: yearEnd
        },
        status: {
          in: ['COMPLETED', 'REFUNDED']
        }
      }
    });
  }

  listProductsByIds(productIds: string[]) {
    return this.prisma.product.findMany({
      where: {
        id: {
          in: productIds
        },
        deletedAt: null,
        status: 'ACTIVE'
      }
    });
  }

  async createSaleWithStockReduction(params: {
    tenantId: string;
    cashierId: string;
    managerId?: string;
    counterId?: string;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
    items: SaleItemComputation[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      for (const item of params.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new Error(`PRODUCT_NOT_FOUND:${item.productId}`);
        }

        if (product.stockQuantity < item.quantity) {
          throw new Error(`INSUFFICIENT_STOCK:${item.productId}`);
        }

        const nextQuantity = product.stockQuantity - item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: nextQuantity }
        });

        await tx.inventoryLog.create({
          data: {
            tenantId: params.tenantId,
            productId: item.productId,
            action: 'SALE',
            quantity: item.quantity,
            previousQuantity: product.stockQuantity,
            newQuantity: nextQuantity,
            reason: 'Stock deducted via completed sale',
            referenceType: 'sale',
            createdById: params.cashierId
          }
        });
      }

      const saleNumber = await this.generateSaleNumber(tx, params.tenantId);

      const sale = await tx.sale.create({
        data: {
          tenantId: params.tenantId,
          counterId: params.counterId,
          saleNumber,
          source: 'POS',
          status: 'COMPLETED',
          customerName: params.customerName,
          customerPhone: params.customerPhone,
          notes: params.notes,
          cashierId: params.cashierId,
          managerId: params.managerId,
          subtotal: new Prisma.Decimal(params.subtotal),
          discountAmount: new Prisma.Decimal(params.discountAmount),
          taxAmount: new Prisma.Decimal(params.taxAmount),
          totalAmount: new Prisma.Decimal(params.totalAmount),
          paidAmount: new Prisma.Decimal(0),
          changeAmount: new Prisma.Decimal(0),
          completedAt: new Date(),
          items: {
            create: params.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: new Prisma.Decimal(item.unitPrice),
              costPrice: new Prisma.Decimal(item.costPrice),
              discountAmount: new Prisma.Decimal(item.discountAmount),
              taxAmount: new Prisma.Decimal(item.taxAmount),
              lineTotal: new Prisma.Decimal(item.lineTotal)
            }))
          }
        },
        include: {
          items: { include: this.saleItemInclude },
          payments: true
        }
      });

      return sale;
    });
  }

  async updateSalePaymentTotals(saleId: string, paidAmount: number, changeAmount: number) {
    return this.prisma.sale.update({
      where: { id: saleId },
      data: {
        paidAmount: new Prisma.Decimal(paidAmount),
        changeAmount: new Prisma.Decimal(changeAmount)
      },
      include: {
        items: { include: this.saleItemInclude },
        payments: true,
        cashier: true
      }
    });
  }

  async refundSale(params: {
    saleId: string;
    actorId: string;
    reason?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: params.saleId },
        include: { items: { include: this.saleItemInclude }, payments: true }
      });

      if (!sale) {
        throw new Error('SALE_NOT_FOUND');
      }

      if (sale.status === 'REFUNDED') {
        throw new Error('SALE_ALREADY_REFUNDED');
      }

      if (sale.status === 'CANCELED') {
        throw new Error('SALE_ALREADY_CANCELED');
      }

      for (const item of sale.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          continue;
        }

        const nextQuantity = product.stockQuantity + item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: nextQuantity }
        });

        await tx.inventoryLog.create({
          data: {
            tenantId: sale.tenantId,
            productId: item.productId,
            action: 'REFUND',
            quantity: item.quantity,
            previousQuantity: product.stockQuantity,
            newQuantity: nextQuantity,
            reason: params.reason ?? 'Stock restored after refund',
            referenceType: 'sale_refund',
            referenceId: sale.id,
            createdById: params.actorId
          }
        });
      }

      await tx.payment.updateMany({
        where: { saleId: sale.id, status: 'SUCCESS' },
        data: { status: 'REFUNDED' }
      });

      const successfulPayments = await tx.payment.findMany({
        where: { saleId: sale.id, status: 'REFUNDED' }
      });

      for (const payment of successfulPayments) {
        await tx.paymentTransaction.create({
          data: {
            tenantId: payment.tenantId,
            paymentId: payment.id,
            provider: payment.provider,
            status: 'REFUNDED',
            amount: payment.amount,
            currency: payment.currency,
            responsePayload: {
              reason: params.reason ?? 'Refunded by operator'
            },
            reconciledAt: new Date()
          }
        });
      }

      const updatedSale = await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: 'REFUNDED',
          refundedAt: new Date(),
          refundedById: params.actorId,
          refundReason: params.reason
        },
        include: { items: { include: this.saleItemInclude }, payments: true }
      });

      return updatedSale;
    });
  }

  async cancelSale(params: { saleId: string; reason?: string }) {
    return this.prisma.sale.update({
      where: { id: params.saleId },
      data: {
        status: 'CANCELED',
        notes: params.reason
      }
    });
  }

  createHeldCart(data: Parameters<PrismaService['cart']['create']>[0]['data']) {
    return this.prisma.cart.create({
      data,
      include: { items: { include: { product: true } } }
    });
  }

  listHeldCarts(tenantId: string, cashierId: string) {
    return this.prisma.cart.findMany({
      where: {
        tenantId,
        cashierId,
        status: 'HOLD'
      },
      include: {
        items: { include: { product: true } }
      },
      orderBy: { heldAt: 'desc' }
    });
  }

  resumeHeldCart(cartId: string) {
    return this.prisma.cart.update({
      where: { id: cartId },
      data: {
        status: 'ACTIVE',
        resumedAt: new Date()
      },
      include: {
        items: {
          include: { product: true }
        }
      }
    });
  }

  clearHeldCart(cartId: string) {
    return this.prisma.cart.update({
      where: { id: cartId },
      data: { status: 'ABANDONED' }
    });
  }

  private async generateSaleNumber(tx: Prisma.TransactionClient, tenantId: string) {
    const count = await tx.sale.count({ where: { tenantId } });
    const next = count + 1;
    return `${tenantId.slice(0, 6).toUpperCase()}-${String(next).padStart(6, '0')}`;
  }
}

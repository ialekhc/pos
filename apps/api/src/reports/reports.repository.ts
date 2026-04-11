import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  getSalesSummary(tenantId: string, from: Date, to: Date) {
    return this.prisma.sale.aggregate({
      where: {
        tenantId,
        status: { in: ['COMPLETED', 'REFUNDED'] },
        completedAt: {
          gte: from,
          lte: to
        }
      },
      _sum: {
        subtotal: true,
        discountAmount: true,
        taxAmount: true,
        totalAmount: true,
        paidAmount: true
      },
      _count: {
        _all: true
      }
    });
  }

  topSellingProducts(tenantId: string, from: Date, to: Date) {
    return this.prisma.saleItem.groupBy({
      by: ['productId', 'productName', 'sku'],
      where: {
        sale: {
          tenantId,
          completedAt: {
            gte: from,
            lte: to
          },
          status: {
            in: ['COMPLETED', 'REFUNDED']
          }
        }
      },
      _sum: {
        quantity: true,
        lineTotal: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: 10
    });
  }

  paymentWise(tenantId: string, from: Date, to: Date) {
    return this.prisma.payment.groupBy({
      by: ['method', 'status'],
      where: {
        tenantId,
        createdAt: {
          gte: from,
          lte: to
        }
      },
      _sum: {
        amount: true
      },
      _count: {
        _all: true
      }
    });
  }

  cashierWise(tenantId: string, from: Date, to: Date) {
    return this.prisma.sale.groupBy({
      by: ['cashierId'],
      where: {
        tenantId,
        completedAt: {
          gte: from,
          lte: to
        }
      },
      _sum: {
        totalAmount: true
      },
      _count: {
        _all: true
      }
    });
  }

  cashiersByIds(ids: string[]) {
    return this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });
  }
}

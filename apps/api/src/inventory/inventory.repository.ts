import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  listLogs(tenantId: string) {
    return this.prisma.inventoryLog.findMany({
      where: { tenantId },
      include: { product: true, createdBy: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  findProductById(productId: string) {
    return this.prisma.product.findUnique({ where: { id: productId } });
  }

  async adjustStock(params: {
    tenantId: string;
    productId: string;
    action: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT';
    quantity: number;
    reason?: string;
    userId?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: params.productId } });
      if (!product) {
        throw new Error('PRODUCT_NOT_FOUND');
      }

      const previousQuantity = product.stockQuantity;
      let nextQuantity = previousQuantity;

      if (params.action === 'STOCK_IN') {
        nextQuantity += params.quantity;
      } else if (params.action === 'STOCK_OUT') {
        nextQuantity -= params.quantity;
      } else {
        nextQuantity = params.quantity;
      }

      if (nextQuantity < 0) {
        throw new Error('INSUFFICIENT_STOCK');
      }

      const updatedProduct = await tx.product.update({
        where: { id: params.productId },
        data: { stockQuantity: nextQuantity }
      });

      const log = await tx.inventoryLog.create({
        data: {
          tenantId: params.tenantId,
          productId: params.productId,
          action: params.action,
          quantity: params.quantity,
          previousQuantity,
          newQuantity: nextQuantity,
          reason: params.reason,
          createdById: params.userId
        }
      });

      return { product: updatedProduct, log };
    });
  }
}

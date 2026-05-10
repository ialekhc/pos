import { Injectable } from '@nestjs/common';
import { InventoryAction } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

type InventoryLogFilters = {
  search?: string;
  productId?: string;
  action?: InventoryAction;
  dateFrom?: Date;
  dateTo?: Date;
  take?: number;
};

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  listLogs(tenantId: string, filters?: InventoryLogFilters) {
    const search = filters?.search?.trim();
    const createdAtFilter: {
      gte?: Date;
      lte?: Date;
    } = {};

    if (filters?.dateFrom) {
      createdAtFilter.gte = filters.dateFrom;
    }

    if (filters?.dateTo) {
      createdAtFilter.lte = filters.dateTo;
    }

    return this.prisma.inventoryLog.findMany({
      where: {
        tenantId,
        ...(filters?.productId ? { productId: filters.productId } : {}),
        ...(filters?.action ? { action: filters.action } : {}),
        ...(filters?.dateFrom || filters?.dateTo ? { createdAt: createdAtFilter } : {}),
        ...(search
          ? {
              OR: [
                {
                  product: {
                    name: {
                      contains: search,
                      mode: 'insensitive'
                    }
                  }
                },
                {
                  product: {
                    sku: {
                      contains: search,
                      mode: 'insensitive'
                    }
                  }
                },
                {
                  product: {
                    barcode: {
                      contains: search,
                      mode: 'insensitive'
                    }
                  }
                },
                {
                  product: {
                    hsCode: {
                      contains: search,
                      mode: 'insensitive'
                    }
                  }
                }
              ]
            }
          : {})
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            stockQuantity: true,
            lowStockThreshold: true,
            status: true,
            category: {
              select: {
                id: true,
                name: true,
                parent: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        },
        party: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.take ?? 200
    });
  }

  findProductById(productId: string) {
    return this.prisma.product.findUnique({ where: { id: productId } });
  }

  findPartyById(partyId: string) {
    return this.prisma.party.findUnique({ where: { id: partyId } });
  }

  async adjustStock(params: {
    tenantId: string;
    productId: string;
    action: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT';
    quantity: number;
    reason?: string;
    partyId?: string;
    partyPercent?: number;
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

      const movementQuantity =
        params.action === 'ADJUSTMENT'
          ? Math.abs(nextQuantity - previousQuantity)
          : params.quantity;
      const stockValueAmount = movementQuantity * Number(product.costPrice);
      const partyPercent =
        params.partyPercent !== undefined ? Number(params.partyPercent.toFixed(2)) : undefined;
      const partyAmount =
        partyPercent !== undefined
          ? Number(((stockValueAmount * partyPercent) / 100).toFixed(2))
          : undefined;

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
          partyId: params.partyId,
          partyPercent,
          partyAmount,
          createdById: params.userId
        }
      });

      return { product: updatedProduct, log };
    });
  }

  async getSummary(tenantId: string) {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfLast7Days = new Date(now);
    startOfLast7Days.setDate(startOfLast7Days.getDate() - 6);
    startOfLast7Days.setHours(0, 0, 0, 0);

    const adjustmentActions: InventoryAction[] = ['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT'];

    const [products, adjustmentsToday, adjustmentsLast7Days, lastAdjustment] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: {
          tenantId,
          deletedAt: null,
          status: 'ACTIVE'
        },
        select: {
          id: true,
          stockQuantity: true,
          lowStockThreshold: true
        }
      }),
      this.prisma.inventoryLog.count({
        where: {
          tenantId,
          action: {
            in: adjustmentActions
          },
          createdAt: {
            gte: startOfToday
          }
        }
      }),
      this.prisma.inventoryLog.count({
        where: {
          tenantId,
          action: {
            in: adjustmentActions
          },
          createdAt: {
            gte: startOfLast7Days
          }
        }
      }),
      this.prisma.inventoryLog.findFirst({
        where: {
          tenantId,
          action: {
            in: adjustmentActions
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true
            }
          },
          createdBy: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      })
    ]);

    const totalProducts = products.length;
    const totalStockUnits = products.reduce((sum, product) => sum + product.stockQuantity, 0);
    const outOfStockProducts = products.filter((product) => product.stockQuantity <= 0).length;
    const lowStockProducts = products.filter(
      (product) => product.stockQuantity <= product.lowStockThreshold
    ).length;

    return {
      totalProducts,
      totalStockUnits,
      lowStockProducts,
      outOfStockProducts,
      adjustmentsToday,
      adjustmentsLast7Days,
      lastAdjustment: lastAdjustment
        ? {
            id: lastAdjustment.id,
            action: lastAdjustment.action,
            quantity: lastAdjustment.quantity,
            createdAt: lastAdjustment.createdAt,
            product: lastAdjustment.product,
            createdByName: lastAdjustment.createdBy
              ? `${lastAdjustment.createdBy.firstName} ${lastAdjustment.createdBy.lastName}`.trim() ||
                lastAdjustment.createdBy.email
              : null
          }
        : null
    };
  }
}

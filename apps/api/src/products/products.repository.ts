import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByTenant(tenantId: string, search?: string, categoryId?: string) {
    return this.prisma.product.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(categoryId ? { categoryId } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search, mode: 'insensitive' } },
                { hsCode: { contains: search, mode: 'insensitive' } }
              ]
            }
          : {})
      },
      include: {
        category: {
          include: {
            parent: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  findById(productId: string) {
    return this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: {
          include: {
            parent: true
          }
        }
      }
    });
  }

  countActiveByTenant(tenantId: string) {
    return this.prisma.product.count({
      where: {
        tenantId,
        deletedAt: null,
        status: 'ACTIVE'
      }
    });
  }

  findLowStock(tenantId: string) {
    return this.prisma.product.findMany({
      where: {
        tenantId,
        deletedAt: null
      },
      orderBy: { stockQuantity: 'asc' }
    }).then((rows) => rows.filter((row) => row.stockQuantity <= row.lowStockThreshold));
  }

  create(data: Parameters<PrismaService['product']['create']>[0]['data']) {
    return this.prisma.product.create({
      data,
      include: {
        category: {
          include: {
            parent: true
          }
        }
      }
    });
  }

  update(productId: string, data: Parameters<PrismaService['product']['update']>[0]['data']) {
    return this.prisma.product.update({
      where: { id: productId },
      data,
      include: {
        category: {
          include: {
            parent: true
          }
        }
      }
    });
  }

  softDelete(productId: string) {
    return this.prisma.product.update({
      where: { id: productId },
      data: {
        deletedAt: new Date(),
        status: 'INACTIVE'
      }
    });
  }
}

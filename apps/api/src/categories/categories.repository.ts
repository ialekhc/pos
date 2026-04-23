import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByTenant(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            parentId: true
          }
        },
        children: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            parentId: true
          }
        }
      },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }]
    });
  }

  findById(categoryId: string) {
    return this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        parent: true,
        children: {
          where: { deletedAt: null }
        }
      }
    });
  }

  findByIds(categoryIds: string[]) {
    return this.prisma.category.findMany({
      where: {
        id: { in: categoryIds },
        deletedAt: null
      }
    });
  }

  create(data: Parameters<PrismaService['category']['create']>[0]['data']) {
    return this.prisma.category.create({
      data,
      include: {
        parent: true,
        children: {
          where: { deletedAt: null }
        }
      }
    });
  }

  update(categoryId: string, data: Parameters<PrismaService['category']['update']>[0]['data']) {
    return this.prisma.category.update({
      where: { id: categoryId },
      data,
      include: {
        parent: true,
        children: {
          where: { deletedAt: null }
        }
      }
    });
  }

  softDelete(categoryId: string) {
    return this.prisma
      .$transaction([
        this.prisma.category.updateMany({
          where: { parentId: categoryId },
          data: { parentId: null }
        }),
        this.prisma.category.update({
          where: { id: categoryId },
          data: { deletedAt: new Date(), isActive: false, parentId: null }
        })
      ])
      .then(([, category]) => category);
  }
}

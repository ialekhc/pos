import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByTenant(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: 'asc' }
    });
  }

  findById(categoryId: string) {
    return this.prisma.category.findUnique({ where: { id: categoryId } });
  }

  create(data: Parameters<PrismaService['category']['create']>[0]['data']) {
    return this.prisma.category.create({ data });
  }

  update(categoryId: string, data: Parameters<PrismaService['category']['update']>[0]['data']) {
    return this.prisma.category.update({ where: { id: categoryId }, data });
  }

  softDelete(categoryId: string) {
    return this.prisma.category.update({
      where: { id: categoryId },
      data: { deletedAt: new Date(), isActive: false }
    });
  }
}

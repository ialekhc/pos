import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class TenantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.tenant.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
  }

  findById(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  findBySlug(slug: string) {
    return this.prisma.tenant.findUnique({ where: { slug } });
  }

  create(data: Parameters<PrismaService['tenant']['create']>[0]['data']) {
    return this.prisma.tenant.create({ data });
  }

  update(id: string, data: Parameters<PrismaService['tenant']['update']>[0]['data']) {
    return this.prisma.tenant.update({ where: { id }, data });
  }

  softDelete(id: string) {
    return this.prisma.tenant.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'INACTIVE'
      }
    });
  }
}

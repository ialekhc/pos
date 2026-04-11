import { Injectable } from '@nestjs/common';
import { UserRoleCode } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { role: true, tenant: true }
    });
  }

  findByTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, deletedAt: null },
      include: { role: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  findAll(params?: { tenantId?: string }) {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(params?.tenantId ? { tenantId: params.tenantId } : {})
      },
      include: {
        role: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: [{ createdAt: 'desc' }]
    });
  }

  countActiveStaffByTenant(tenantId: string) {
    return this.prisma.user.count({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        role: {
          code: {
            in: [UserRoleCode.TENANT_ADMIN, UserRoleCode.MANAGER, UserRoleCode.CASHIER]
          }
        }
      }
    });
  }

  findRoleByCode(tenantId: string | null, code: UserRoleCode) {
    return this.prisma.role.findFirst({
      where: {
        code,
        OR: [{ tenantId }, { tenantId: null }]
      },
      orderBy: { tenantId: 'desc' }
    });
  }

  create(data: Parameters<PrismaService['user']['create']>[0]['data']) {
    return this.prisma.user.create({ data, include: { role: true } });
  }

  update(userId: string, data: Parameters<PrismaService['user']['update']>[0]['data']) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      include: { role: true }
    });
  }

  softDelete(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });
  }

  listRoles(tenantId: string | null) {
    return this.prisma.role.findMany({
      where: {
        OR: [{ tenantId }, { tenantId: null }]
      },
      orderBy: [{ tenantId: 'desc' }, { code: 'asc' }]
    });
  }
}

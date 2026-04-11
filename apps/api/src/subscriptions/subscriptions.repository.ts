import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SubscriptionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Parameters<PrismaService['subscription']['create']>[0]['data']) {
    return this.prisma.subscription.create({ data });
  }

  deactivateTenantSubscriptions(tenantId: string) {
    return this.prisma.subscription.updateMany({
      where: {
        tenantId,
        status: {
          in: ['ACTIVE', 'TRIALING']
        }
      },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        autoRenew: false
      }
    });
  }

  findByTenant(tenantId: string) {
    return this.prisma.subscription.findMany({
      where: { tenantId },
      include: { plan: true, tenant: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  findAll(params?: { tenantId?: string }) {
    return this.prisma.subscription.findMany({
      where: {
        ...(params?.tenantId ? { tenantId: params.tenantId } : {})
      },
      include: {
        plan: true,
        tenant: true
      },
      orderBy: [{ createdAt: 'desc' }]
    });
  }

  findCurrentByTenant(tenantId: string) {
    return this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: {
          in: ['ACTIVE', 'TRIALING']
        }
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' }
    });
  }
}

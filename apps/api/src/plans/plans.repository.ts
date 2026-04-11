import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      include: {
        planFeatures: {
          include: {
            feature: true
          }
        }
      },
      orderBy: { monthlyPrice: 'asc' }
    });
  }

  findById(planId: string) {
    return this.prisma.plan.findUnique({
      where: { id: planId },
      include: {
        planFeatures: {
          include: {
            feature: true
          }
        }
      }
    });
  }

  findByCode(code: string) {
    return this.prisma.plan.findUnique({ where: { code } });
  }

  create(data: Parameters<PrismaService['plan']['create']>[0]['data']) {
    return this.prisma.plan.create({ data });
  }

  update(planId: string, data: Parameters<PrismaService['plan']['update']>[0]['data']) {
    return this.prisma.plan.update({ where: { id: planId }, data });
  }

  async upsertPlanFeature(planId: string, featureId: string, enabled: boolean, limitValue?: number) {
    return this.prisma.planFeature.upsert({
      where: {
        planId_featureId: {
          planId,
          featureId
        }
      },
      update: {
        enabled,
        limitValue
      },
      create: {
        planId,
        featureId,
        enabled,
        limitValue
      }
    });
  }

  findFeatureByKey(featureKey: string) {
    return this.prisma.feature.findUnique({ where: { key: featureKey } });
  }

  listFeatures() {
    return this.prisma.feature.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    });
  }

  findSubscriptionWithPlan(tenantId: string) {
    return this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: {
          in: ['ACTIVE', 'TRIALING']
        }
      },
      include: {
        plan: {
          include: {
            planFeatures: {
              include: {
                feature: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}

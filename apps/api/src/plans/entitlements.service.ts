import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRoleCode } from '@prisma/client';
import { PlansRepository } from './plans.repository';
import { RedisService } from '../redis/redis.service';

export type TenantEntitlements = {
  tenantId: string;
  plan: {
    id: string;
    code: string;
    name: string;
    maxProducts: number | null;
    maxOrdersPerYear: number | null;
    maxStaffAccounts: number | null;
  };
  features: Record<string, { enabled: boolean; limitValue: number | null }>;
};

@Injectable()
export class EntitlementsService {
  private readonly cacheTtlSeconds = 60;

  constructor(
    private readonly plansRepository: PlansRepository,
    private readonly redisService: RedisService
  ) {}

  async getTenantEntitlements(tenantId: string): Promise<TenantEntitlements> {
    const cacheKey = `entitlements:${tenantId}`;
    const cached = await this.redisService.getJson<TenantEntitlements>(cacheKey);
    if (cached) {
      return cached;
    }

    const subscription = await this.plansRepository.findSubscriptionWithPlan(tenantId);
    if (!subscription) {
      throw new NotFoundException('No active subscription found for tenant.');
    }

    const entitlements: TenantEntitlements = {
      tenantId,
      plan: {
        id: subscription.plan.id,
        code: subscription.plan.code,
        name: subscription.plan.name,
        maxProducts: subscription.plan.maxProducts,
        maxOrdersPerYear: subscription.plan.maxOrdersPerYear,
        maxStaffAccounts: subscription.plan.maxStaffAccounts
      },
      features: Object.fromEntries(
        subscription.plan.planFeatures.map((feature) => [
          feature.feature.key,
          {
            enabled: feature.enabled,
            limitValue: feature.limitValue
          }
        ])
      )
    };

    await this.redisService.setJson(cacheKey, entitlements, this.cacheTtlSeconds);
    return entitlements;
  }

  async getFeatureAccess(tenantId: string, featureKey: string) {
    const entitlements = await this.getTenantEntitlements(tenantId);
    return entitlements.features[featureKey] ?? { enabled: false, limitValue: null };
  }

  async assertFeature(tenantId: string, featureKey: string, role: UserRoleCode) {
    if (role === 'SUPER_ADMIN') {
      return;
    }

    const feature = await this.getFeatureAccess(tenantId, featureKey);

    if (!feature.enabled) {
      throw new ForbiddenException(`Feature '${featureKey}' is not enabled for current subscription.`);
    }
  }

  async assertWithinPlanLimit(
    tenantId: string,
    limitKey: keyof TenantEntitlements['plan'],
    currentCount: number,
    role: UserRoleCode
  ) {
    if (role === 'SUPER_ADMIN') {
      return;
    }

    const entitlements = await this.getTenantEntitlements(tenantId);
    const limit = entitlements.plan[limitKey];

    if (typeof limit === 'number' && currentCount >= limit) {
      throw new ForbiddenException(`Plan limit exceeded for ${String(limitKey)}.`);
    }
  }

  async invalidateTenantEntitlements(tenantId: string) {
    await this.redisService.del(`entitlements:${tenantId}`);
  }
}

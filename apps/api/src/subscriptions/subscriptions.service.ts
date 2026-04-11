import { Injectable, NotFoundException } from '@nestjs/common';
import { AssignSubscriptionDto } from './dto/assign-subscription.dto';
import { SubscriptionsRepository } from './subscriptions.repository';
import { PlansRepository } from '../plans/plans.repository';
import { EntitlementsService } from '../plans/entitlements.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly plansRepository: PlansRepository,
    private readonly entitlementsService: EntitlementsService
  ) {}

  async assignPlan(dto: AssignSubscriptionDto) {
    const plan = await this.plansRepository.findById(dto.planId);
    if (!plan) {
      throw new NotFoundException('Plan not found.');
    }

    await this.subscriptionsRepository.deactivateTenantSubscriptions(dto.tenantId);

    const subscription = await this.subscriptionsRepository.create({
      tenantId: dto.tenantId,
      planId: dto.planId,
      status: 'ACTIVE',
      startsAt: dto.startsAt ? new Date(dto.startsAt) : new Date(),
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      autoRenew: dto.autoRenew ?? true
    });

    await this.entitlementsService.invalidateTenantEntitlements(dto.tenantId);

    return subscription;
  }

  listSubscriptions(params?: { tenantId?: string }) {
    return this.subscriptionsRepository.findAll(params);
  }

  getByTenant(tenantId: string) {
    return this.subscriptionsRepository.findByTenant(tenantId);
  }

  async getCurrentByTenant(tenantId: string) {
    const subscription = await this.subscriptionsRepository.findCurrentByTenant(tenantId);

    if (!subscription) {
      throw new NotFoundException('Active subscription not found.');
    }

    return subscription;
  }
}

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_KEY, FeatureRequirement } from '../decorators/require-feature.decorator';
import { ActiveUser } from '../types/active-user.type';
import { EntitlementsService } from '../../plans/entitlements.service';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlementsService: EntitlementsService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<FeatureRequirement>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requirement) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as ActiveUser;

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    if (!user.tenantId) {
      throw new ForbiddenException('Tenant context required for feature access.');
    }

    const feature = await this.entitlementsService.getFeatureAccess(user.tenantId, requirement.feature);

    if (!feature?.enabled) {
      throw new ForbiddenException(`Feature '${requirement.feature}' is not enabled for your current plan.`);
    }

    if (typeof requirement.minLimit === 'number' && typeof feature.limitValue === 'number' && feature.limitValue < requirement.minLimit) {
      throw new ForbiddenException(`Feature '${requirement.feature}' limit is below required threshold.`);
    }

    return true;
  }
}

import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRoleCode } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActiveUser } from '../common/types/active-user.type';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpdatePlanFeatureDto } from './dto/update-plan-feature.dto';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get('entitlements/me')
  me(@CurrentUser() user: ActiveUser) {
    if (!user.tenantId) {
      return { plan: null, features: {} };
    }

    return this.plansService.getTenantEntitlements(user.tenantId);
  }

  @Get()
  getPlans() {
    return this.plansService.getPlans();
  }

  @Get('features')
  getFeatures() {
    return this.plansService.listFeatures();
  }

  @Get(':planId')
  getPlan(@Param('planId') planId: string) {
    return this.plansService.getPlanById(planId);
  }

  @Roles(UserRoleCode.SUPER_ADMIN)
  @Post()
  createPlan(@Body() body: CreatePlanDto) {
    return this.plansService.createPlan(body);
  }

  @Roles(UserRoleCode.SUPER_ADMIN)
  @Patch(':planId')
  updatePlan(@Param('planId') planId: string, @Body() body: UpdatePlanDto) {
    return this.plansService.updatePlan(planId, body);
  }

  @Roles(UserRoleCode.SUPER_ADMIN)
  @Patch(':planId/features')
  updatePlanFeature(@Param('planId') planId: string, @Body() body: UpdatePlanFeatureDto) {
    return this.plansService.updatePlanFeature(planId, body);
  }
}

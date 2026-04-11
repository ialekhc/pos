import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { UserRoleCode } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ActiveUser } from '../common/types/active-user.type';
import { AssignSubscriptionDto } from './dto/assign-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Roles(UserRoleCode.SUPER_ADMIN)
  @Post('assign')
  assignPlan(@Body() body: AssignSubscriptionDto) {
    return this.subscriptionsService.assignPlan(body);
  }

  @Roles(UserRoleCode.SUPER_ADMIN)
  @Get()
  list(@Query('tenantId') tenantId?: string) {
    return this.subscriptionsService.listSubscriptions({ tenantId });
  }

  @Roles(UserRoleCode.SUPER_ADMIN)
  @Get('tenant/:tenantId')
  getByTenant(@Param('tenantId') tenantId: string) {
    return this.subscriptionsService.getByTenant(tenantId);
  }

  @Get('me/current')
  me(@CurrentUser() user: ActiveUser) {
    if (!user.tenantId) {
      return { message: 'Super admin does not have tenant subscription context.' };
    }

    return this.subscriptionsService.getCurrentByTenant(user.tenantId);
  }
}

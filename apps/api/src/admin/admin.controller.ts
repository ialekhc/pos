import { Controller, Get, Param, Post } from '@nestjs/common';
import { UserRoleCode } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ActiveUser } from '../common/types/active-user.type';
import { AdminService } from './admin.service';

@Roles(UserRoleCode.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.adminService.getDashboardOverview();
  }

  @Get('tenants')
  tenants() {
    return this.adminService.listTenantsWithSubscriptions();
  }

  @Get('system/health')
  health() {
    return this.adminService.systemHealth();
  }

  @Post('tenants/:tenantId/impersonate')
  impersonate(@CurrentUser() user: ActiveUser, @Param('tenantId') tenantId: string) {
    return this.adminService.createImpersonationToken(tenantId, user.userId);
  }
}

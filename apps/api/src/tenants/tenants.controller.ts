import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRoleCode } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ActiveUser } from '../common/types/active-user.type';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Roles(UserRoleCode.SUPER_ADMIN)
  @Get()
  findAll() {
    return this.tenantsService.getAll();
  }

  @Get('me')
  me(@CurrentUser() user: ActiveUser) {
    if (!user.tenantId) {
      return { message: 'Super admin has no tenant profile.' };
    }

    return this.tenantsService.getById(user.tenantId);
  }

  @Roles(UserRoleCode.SUPER_ADMIN)
  @Get(':tenantId')
  findOne(@Param('tenantId') tenantId: string) {
    return this.tenantsService.getById(tenantId);
  }

  @Roles(UserRoleCode.SUPER_ADMIN)
  @Post()
  create(@Body() body: CreateTenantDto) {
    return this.tenantsService.create(body);
  }

  @Roles(UserRoleCode.SUPER_ADMIN)
  @Patch(':tenantId')
  update(@Param('tenantId') tenantId: string, @Body() body: UpdateTenantDto) {
    return this.tenantsService.update(tenantId, body);
  }

  @Roles(UserRoleCode.SUPER_ADMIN)
  @Patch(':tenantId/status/:status')
  updateStatus(
    @Param('tenantId') tenantId: string,
    @Param('status') status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  ) {
    return this.tenantsService.setStatus(tenantId, status);
  }

  @Roles(UserRoleCode.SUPER_ADMIN)
  @Delete(':tenantId')
  remove(@Param('tenantId') tenantId: string) {
    return this.tenantsService.remove(tenantId);
  }
}

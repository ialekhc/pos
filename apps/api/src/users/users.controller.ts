import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UserRoleCode } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ActiveUser } from '../common/types/active-user.type';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(UserRoleCode.SUPER_ADMIN, UserRoleCode.TENANT_ADMIN, UserRoleCode.MANAGER)
  @Get()
  list(@CurrentUser() user: ActiveUser, @Query('tenantId') tenantId?: string) {
    return this.usersService.listUsers(user, tenantId);
  }

  @Get('roles')
  roles(@CurrentUser() user: ActiveUser, @Query('tenantId') tenantId?: string) {
    return this.usersService.listRoles(user, tenantId);
  }

  @Roles(UserRoleCode.SUPER_ADMIN, UserRoleCode.TENANT_ADMIN)
  @Post()
  create(@CurrentUser() user: ActiveUser, @Body() body: CreateUserDto) {
    return this.usersService.createUser(user, body);
  }

  @Roles(UserRoleCode.SUPER_ADMIN, UserRoleCode.TENANT_ADMIN)
  @Patch(':userId')
  update(@CurrentUser() user: ActiveUser, @Param('userId') userId: string, @Body() body: UpdateUserDto) {
    return this.usersService.updateUser(user, userId, body);
  }

  @Roles(UserRoleCode.SUPER_ADMIN, UserRoleCode.TENANT_ADMIN)
  @Patch(':userId/reset-password')
  resetPassword(
    @CurrentUser() user: ActiveUser,
    @Param('userId') userId: string,
    @Body() body: ResetPasswordDto
  ) {
    return this.usersService.resetPassword(user, userId, body);
  }

  @Roles(UserRoleCode.SUPER_ADMIN, UserRoleCode.TENANT_ADMIN)
  @Delete(':userId')
  remove(@CurrentUser() user: ActiveUser, @Param('userId') userId: string) {
    return this.usersService.deactivateUser(user, userId);
  }
}

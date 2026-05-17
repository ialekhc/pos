import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRoleCode } from '@prisma/client';
import { ActiveUser } from '../common/types/active-user.type';
import { EntitlementsService } from '../plans/entitlements.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly entitlementsService: EntitlementsService,
    private readonly auditService: AuditService
  ) {}

  async listUsers(actor: ActiveUser, targetTenantId?: string) {
    if (actor.role === UserRoleCode.SUPER_ADMIN) {
      return this.usersRepository.findAll({
        tenantId: targetTenantId
      });
    }

    return this.usersRepository.findByTenant(actor.tenantId!);
  }

  listRoles(actor: ActiveUser, targetTenantId?: string) {
    if (actor.role === UserRoleCode.SUPER_ADMIN && targetTenantId) {
      return this.usersRepository.listRoles(targetTenantId);
    }

    return this.usersRepository.listRoles(actor.role === UserRoleCode.SUPER_ADMIN ? null : actor.tenantId);
  }

  async createUser(actor: ActiveUser, dto: CreateUserDto) {
    const tenantId = actor.role === UserRoleCode.SUPER_ADMIN ? dto.tenantId ?? null : actor.tenantId;

    if (!tenantId && dto.role !== UserRoleCode.SUPER_ADMIN) {
      throw new ForbiddenException('Vendor context is required.');
    }

    if (actor.role !== UserRoleCode.SUPER_ADMIN && dto.role === UserRoleCode.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admin can create super admin users.');
    }

    if (actor.role === UserRoleCode.SUPER_ADMIN && dto.role === UserRoleCode.SUPER_ADMIN && dto.tenantId) {
      throw new BadRequestException('Super admin user cannot be assigned to a tenant.');
    }

    const role = await this.usersRepository.findRoleByCode(
      dto.role === UserRoleCode.SUPER_ADMIN ? null : tenantId,
      dto.role
    );

    if (!role) {
      throw new NotFoundException('Role not found for tenant.');
    }

    if (dto.role !== UserRoleCode.SUPER_ADMIN) {
      if (!tenantId) {
        throw new ForbiddenException('Vendor context is required.');
      }

      const currentActiveStaff = await this.usersRepository.countActiveStaffByTenant(tenantId);
      await this.entitlementsService.assertWithinPlanLimit(
        tenantId,
        'maxStaffAccounts',
        currentActiveStaff,
        actor.role
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.usersRepository.create({
      tenantId: dto.role === UserRoleCode.SUPER_ADMIN ? null : tenantId,
      roleId: role.id,
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone
    });

    await this.auditService.logUserEvent({
      actor,
      tenantId,
      action: 'USER_CREATED',
      entity: 'User',
      entityId: user.id,
      details: { email: user.email, role: dto.role }
    });

    return user;
  }

  async updateUser(actor: ActiveUser, userId: string, dto: UpdateUserDto) {
    const existingUser = await this.usersRepository.findById(userId);
    if (!existingUser || existingUser.deletedAt) {
      throw new NotFoundException('User not found.');
    }

    if (actor.role !== UserRoleCode.SUPER_ADMIN && existingUser.tenantId !== actor.tenantId) {
      throw new ForbiddenException('Cannot update user outside vendor scope.');
    }

    const updated = await this.usersRepository.update(userId, {
      ...(dto.firstName ? { firstName: dto.firstName } : {}),
      ...(dto.lastName ? { lastName: dto.lastName } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.roleId ? { roleId: dto.roleId } : {})
    });

    await this.auditService.logUserEvent({
      actor,
      tenantId: existingUser.tenantId,
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: updated.id,
      details: dto
    });

    return updated;
  }

  async resetPassword(actor: ActiveUser, userId: string, dto: ResetPasswordDto) {
    const existingUser = await this.usersRepository.findById(userId);
    if (!existingUser || existingUser.deletedAt) {
      throw new NotFoundException('User not found.');
    }

    if (actor.role !== UserRoleCode.SUPER_ADMIN && existingUser.tenantId !== actor.tenantId) {
      throw new ForbiddenException('Cannot update user outside vendor scope.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    await this.usersRepository.update(userId, { passwordHash, refreshTokenHash: null });

    await this.auditService.logUserEvent({
      actor,
      tenantId: existingUser.tenantId,
      action: 'USER_PASSWORD_RESET',
      entity: 'User',
      entityId: userId
    });

    return { success: true };
  }

  async deactivateUser(actor: ActiveUser, userId: string) {
    const existingUser = await this.usersRepository.findById(userId);
    if (!existingUser || existingUser.deletedAt) {
      throw new NotFoundException('User not found.');
    }

    if (actor.role !== UserRoleCode.SUPER_ADMIN && existingUser.tenantId !== actor.tenantId) {
      throw new ForbiddenException('Cannot remove user outside vendor scope.');
    }

    await this.usersRepository.softDelete(userId);

    await this.auditService.logUserEvent({
      actor,
      tenantId: existingUser.tenantId,
      action: 'USER_DEACTIVATED',
      entity: 'User',
      entityId: userId
    });

    return { success: true };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRoleCode } from '@prisma/client';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantsRepository } from './tenants.repository';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class TenantsService {
  constructor(
    private readonly tenantsRepository: TenantsRepository,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService
  ) {}

  getAll() {
    return this.tenantsRepository.findAll();
  }

  async getById(tenantId: string) {
    const tenant = await this.tenantsRepository.findById(tenantId);
    if (!tenant || tenant.deletedAt) {
      throw new NotFoundException('Tenant not found.');
    }

    return tenant;
  }

  async create(dto: CreateTenantDto) {
    const tenant = await this.prisma.$transaction(async (tx) => {
      if (dto.initialPlanId) {
        const planExists = await tx.plan.findUnique({
          where: { id: dto.initialPlanId },
          select: { id: true }
        });
        if (!planExists) {
          throw new NotFoundException('Selected initial plan was not found.');
        }
      }

      const createdTenant = await tx.tenant.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          timezone: dto.timezone ?? 'UTC',
          currency: dto.currency ?? 'USD',
          domain: dto.domain
        }
      });

      // Bootstrap default tenant roles so super admin can immediately add staff.
      await tx.role.createMany({
        data: [
          {
            tenantId: createdTenant.id,
            code: UserRoleCode.TENANT_ADMIN,
            name: 'Tenant Admin',
            permissions: {
              modules: ['*']
            }
          },
          {
            tenantId: createdTenant.id,
            code: UserRoleCode.MANAGER,
            name: 'Manager',
            permissions: {
              modules: ['dashboard', 'inventory', 'sales', 'reports', 'refund']
            }
          },
          {
            tenantId: createdTenant.id,
            code: UserRoleCode.CASHIER,
            name: 'Cashier',
            permissions: {
              modules: ['pos', 'sales:create']
            }
          }
        ],
        skipDuplicates: true
      });

      await tx.setting.create({
        data: {
          tenantId: createdTenant.id,
          businessName: createdTenant.name,
          currency: createdTenant.currency,
          timezone: createdTenant.timezone,
          paymentConfig: {
            cash: true,
            card: true,
            qr: true,
            wallet: true,
            manual: true
          }
        }
      });

      if (dto.initialPlanId) {
        await tx.subscription.create({
          data: {
            tenantId: createdTenant.id,
            planId: dto.initialPlanId,
            status: 'ACTIVE',
            startsAt: new Date(),
            autoRenew: true
          }
        });
      }

      return createdTenant;
    });

    await this.auditService.logPlatformEvent({
      action: 'TENANT_CREATED',
      entity: 'Tenant',
      entityId: tenant.id,
      details: { slug: dto.slug, initialPlanId: dto.initialPlanId }
    });

    return tenant;
  }

  async update(tenantId: string, dto: UpdateTenantDto) {
    await this.getById(tenantId);

    const tenant = await this.tenantsRepository.update(tenantId, {
      ...(dto.name ? { name: dto.name } : {}),
      ...(dto.slug ? { slug: dto.slug } : {}),
      ...(dto.timezone ? { timezone: dto.timezone } : {}),
      ...(dto.currency ? { currency: dto.currency } : {}),
      ...(dto.domain !== undefined ? { domain: dto.domain } : {})
    });

    await this.auditService.logPlatformEvent({
      action: 'TENANT_UPDATED',
      entity: 'Tenant',
      entityId: tenant.id,
      details: dto
    });

    return tenant;
  }

  async setStatus(tenantId: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') {
    await this.getById(tenantId);
    const tenant = await this.tenantsRepository.update(tenantId, { status });

    await this.auditService.logPlatformEvent({
      action: 'TENANT_STATUS_UPDATED',
      entity: 'Tenant',
      entityId: tenant.id,
      details: { status }
    });

    return tenant;
  }

  async remove(tenantId: string) {
    await this.getById(tenantId);
    await this.tenantsRepository.softDelete(tenantId);

    await this.auditService.logPlatformEvent({
      action: 'TENANT_DEACTIVATED',
      entity: 'Tenant',
      entityId: tenantId
    });

    return { success: true };
  }
}

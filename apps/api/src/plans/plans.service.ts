import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PlansRepository } from './plans.repository';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpdatePlanFeatureDto } from './dto/update-plan-feature.dto';
import { EntitlementsService } from './entitlements.service';

@Injectable()
export class PlansService {
  constructor(
    private readonly plansRepository: PlansRepository,
    private readonly entitlementsService: EntitlementsService
  ) {}

  getPlans() {
    return this.plansRepository.findAll();
  }

  listFeatures() {
    return this.plansRepository.listFeatures();
  }

  async getPlanById(planId: string) {
    const plan = await this.plansRepository.findById(planId);
    if (!plan) {
      throw new NotFoundException('Plan not found.');
    }

    return plan;
  }

  createPlan(dto: CreatePlanDto) {
    return this.plansRepository.create({
      code: dto.code.toUpperCase(),
      name: dto.name,
      description: dto.description,
      monthlyPrice: new Prisma.Decimal(dto.monthlyPrice),
      yearlyPrice: dto.yearlyPrice ? new Prisma.Decimal(dto.yearlyPrice) : undefined,
      maxProducts: dto.maxProducts,
      maxOrdersPerYear: dto.maxOrdersPerYear,
      maxStaffAccounts: dto.maxStaffAccounts,
      domainIncluded: dto.domainIncluded,
      hostingPackage: dto.hostingPackage,
      maintenanceIncluded: dto.maintenanceIncluded,
      supportTier: 'BASIC'
    });
  }

  updatePlan(planId: string, dto: UpdatePlanDto) {
    return this.plansRepository.update(planId, {
      ...(dto.code ? { code: dto.code.toUpperCase() } : {}),
      ...(dto.name ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.monthlyPrice !== undefined ? { monthlyPrice: new Prisma.Decimal(dto.monthlyPrice) } : {}),
      ...(dto.yearlyPrice !== undefined ? { yearlyPrice: new Prisma.Decimal(dto.yearlyPrice) } : {}),
      ...(dto.maxProducts !== undefined ? { maxProducts: dto.maxProducts } : {}),
      ...(dto.maxOrdersPerYear !== undefined ? { maxOrdersPerYear: dto.maxOrdersPerYear } : {}),
      ...(dto.maxStaffAccounts !== undefined ? { maxStaffAccounts: dto.maxStaffAccounts } : {}),
      ...(dto.domainIncluded !== undefined ? { domainIncluded: dto.domainIncluded } : {}),
      ...(dto.hostingPackage !== undefined ? { hostingPackage: dto.hostingPackage } : {}),
      ...(dto.maintenanceIncluded !== undefined ? { maintenanceIncluded: dto.maintenanceIncluded } : {})
    });
  }

  async updatePlanFeature(planId: string, dto: UpdatePlanFeatureDto) {
    const feature = await this.plansRepository.findFeatureByKey(dto.featureKey);
    if (!feature) {
      throw new NotFoundException(`Feature '${dto.featureKey}' does not exist.`);
    }

    return this.plansRepository.upsertPlanFeature(planId, feature.id, dto.enabled, dto.limitValue);
  }

  async getTenantEntitlements(tenantId: string) {
    return this.entitlementsService.getTenantEntitlements(tenantId);
  }
}

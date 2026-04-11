import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ActiveUser } from '../common/types/active-user.type';
import { AuditService } from '../audit/audit.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsRepository } from './settings.repository';

@Injectable()
export class SettingsService {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly auditService: AuditService
  ) {}

  getSettings(actor: ActiveUser) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }

    return this.settingsRepository.findByTenant(actor.tenantId);
  }

  async updateSettings(actor: ActiveUser, dto: UpdateSettingsDto) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }

    const updated = await this.settingsRepository.upsert(actor.tenantId, {
      ...(dto.businessName !== undefined ? { businessName: dto.businessName } : {}),
      ...(dto.taxRate !== undefined ? { taxRate: new Prisma.Decimal(dto.taxRate) } : {}),
      ...(dto.receiptFooter !== undefined ? { receiptFooter: dto.receiptFooter } : {}),
      ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
      ...(dto.paymentConfig !== undefined ? { paymentConfig: dto.paymentConfig as Prisma.InputJsonValue } : {}),
      ...(dto.receiptConfig !== undefined ? { receiptConfig: dto.receiptConfig as Prisma.InputJsonValue } : {}),
      ...(dto.brandingConfig !== undefined ? { brandingConfig: dto.brandingConfig as Prisma.InputJsonValue } : {})
    });

    await this.auditService.logUserEvent({
      actor,
      tenantId: actor.tenantId,
      action: 'SETTINGS_UPDATED',
      entity: 'Setting',
      entityId: updated.id,
      details: dto as unknown as Prisma.InputJsonValue
    });

    return updated;
  }
}

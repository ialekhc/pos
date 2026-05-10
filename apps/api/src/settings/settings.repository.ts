import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByTenant(tenantId: string) {
    return this.prisma.setting.findUnique({ where: { tenantId } });
  }

  upsert(tenantId: string, data: Prisma.SettingUpdateInput) {
    return this.prisma.setting.upsert({
      where: { tenantId },
      update: data,
      create: {
        tenantId,
        businessName: this.unwrapScalar<string>(data.businessName) ?? 'Business',
        taxRate: this.unwrapScalar<Prisma.Decimal | number>(data.taxRate) ?? 0,
        currency: this.unwrapScalar<string>(data.currency) ?? 'NPR',
        timezone: this.unwrapScalar<string>(data.timezone) ?? 'UTC',
        receiptFooter: this.unwrapScalar<string>(data.receiptFooter),
        logoUrl: this.unwrapScalar<string>(data.logoUrl),
        paymentConfig: this.unwrapScalar<Prisma.InputJsonValue>(data.paymentConfig),
        receiptConfig: this.unwrapScalar<Prisma.InputJsonValue>(data.receiptConfig),
        brandingConfig: this.unwrapScalar<Prisma.InputJsonValue>(data.brandingConfig)
      }
    });
  }

  private unwrapScalar<T>(value: unknown): T | undefined {
    if (value && typeof value === 'object' && 'set' in value) {
      return (value as { set: T }).set;
    }

    return value as T | undefined;
  }
}

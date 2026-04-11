import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ActiveUser } from '../common/types/active-user.type';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logUserEvent(params: {
    actor: ActiveUser;
    tenantId?: string | null;
    action: string;
    entity: string;
    entityId?: string;
    details?: unknown;
  }) {
    await this.prisma.auditLog.create({
      data: {
        tenantId: params.tenantId ?? params.actor.tenantId,
        actorType: params.actor.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'USER',
        actorId: params.actor.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details as Prisma.InputJsonValue | undefined
      }
    });
  }

  async logPlatformEvent(params: {
    action: string;
    entity: string;
    entityId?: string;
    details?: unknown;
  }) {
    await this.prisma.auditLog.create({
      data: {
        actorType: 'SYSTEM',
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details as Prisma.InputJsonValue | undefined
      }
    });
  }

  list(params: { tenantId?: string; entity?: string; action?: string }) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(params.tenantId ? { tenantId: params.tenantId } : {}),
        ...(params.entity ? { entity: params.entity } : {}),
        ...(params.action ? { action: params.action } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
  }
}

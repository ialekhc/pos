import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRoleCode } from '@prisma/client';
import { ActiveUser } from '../common/types/active-user.type';
import { AuditService } from '../audit/audit.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { ListInventoryLogsQueryDto } from './dto/list-inventory-logs-query.dto';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto';
import { InventoryRepository } from './inventory.repository';

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway
  ) {}

  listLogs(actor: ActiveUser, query: ListInventoryLogsQueryDto) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Vendor context required.');
    }

    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;

    if (dateFrom) {
      dateFrom.setHours(0, 0, 0, 0);
    }

    if (dateTo) {
      dateTo.setHours(23, 59, 59, 999);
    }

    if (dateFrom && dateTo && dateFrom.getTime() > dateTo.getTime()) {
      throw new BadRequestException('From date cannot be later than To date.');
    }

    return this.inventoryRepository.listLogs(actor.tenantId, {
      search: query.search?.trim(),
      productId: query.productId?.trim(),
      action: query.action,
      dateFrom,
      dateTo,
      take: query.take
    });
  }

  summary(actor: ActiveUser) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Vendor context required.');
    }

    return this.inventoryRepository.getSummary(actor.tenantId);
  }

  async adjustStock(actor: ActiveUser, dto: StockAdjustmentDto) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Vendor context required.');
    }

    const product = await this.inventoryRepository.findProductById(dto.productId);

    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found.');
    }

    if (actor.role !== UserRoleCode.SUPER_ADMIN && product.tenantId !== actor.tenantId) {
      throw new ForbiddenException('Cross-vendor stock modification denied.');
    }

    if (dto.action === 'ADJUSTMENT' && dto.quantity < 0) {
      throw new BadRequestException('Exact stock cannot be negative.');
    }

    if (dto.action !== 'ADJUSTMENT' && dto.quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1 for stock in/out.');
    }

    let partyId: string | undefined;
    let partyPercent: number | undefined;

    if (dto.partyId) {
      const party = await this.inventoryRepository.findPartyById(dto.partyId);

      if (!party || party.deletedAt) {
        throw new NotFoundException('Selected party not found.');
      }

      if (party.tenantId !== actor.tenantId) {
        throw new ForbiddenException('Selected party belongs to a different tenant.');
      }

      if (!party.isActive) {
        throw new ForbiddenException('Selected party is inactive.');
      }

      partyId = party.id;
      partyPercent = dto.partyPercent ?? Number(party.defaultPercent);
    } else if (dto.partyPercent !== undefined) {
      partyPercent = dto.partyPercent;
    }

    try {
      const adjusted = await this.inventoryRepository.adjustStock({
        tenantId: product.tenantId,
        productId: dto.productId,
        action: dto.action,
        quantity: dto.quantity,
        reason: dto.reason?.trim() || undefined,
        partyId,
        partyPercent,
        userId: actor.userId
      });

      await this.auditService.logUserEvent({
        actor,
        tenantId: product.tenantId,
        action: `INVENTORY_${dto.action}`,
        entity: 'Product',
        entityId: product.id,
        details: {
          quantity: dto.quantity,
          previous: adjusted.log.previousQuantity,
          next: adjusted.log.newQuantity,
          partyId: adjusted.log.partyId,
          partyPercent: adjusted.log.partyPercent,
          partyAmount: adjusted.log.partyAmount
        }
      });

      this.realtimeGateway.emitInventoryUpdated(product.tenantId, {
        productId: product.id,
        previousQuantity: adjusted.log.previousQuantity,
        newQuantity: adjusted.log.newQuantity,
        action: dto.action
      });

      return adjusted;
    } catch (error) {
      if (error instanceof Error && error.message === 'INSUFFICIENT_STOCK') {
        throw new ForbiddenException('Stock cannot become negative.');
      }

      if (error instanceof Error && error.message === 'PRODUCT_NOT_FOUND') {
        throw new NotFoundException('Product not found.');
      }

      throw error;
    }
  }
}

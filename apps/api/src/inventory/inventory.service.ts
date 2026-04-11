import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRoleCode } from '@prisma/client';
import { ActiveUser } from '../common/types/active-user.type';
import { AuditService } from '../audit/audit.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto';
import { InventoryRepository } from './inventory.repository';

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway
  ) {}

  listLogs(actor: ActiveUser) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }

    return this.inventoryRepository.listLogs(actor.tenantId);
  }

  async adjustStock(actor: ActiveUser, dto: StockAdjustmentDto) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }

    const product = await this.inventoryRepository.findProductById(dto.productId);

    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found.');
    }

    if (actor.role !== UserRoleCode.SUPER_ADMIN && product.tenantId !== actor.tenantId) {
      throw new ForbiddenException('Cross-tenant stock modification denied.');
    }

    try {
      const adjusted = await this.inventoryRepository.adjustStock({
        tenantId: product.tenantId,
        productId: dto.productId,
        action: dto.action,
        quantity: dto.quantity,
        reason: dto.reason,
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
          next: adjusted.log.newQuantity
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

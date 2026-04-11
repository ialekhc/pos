import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRoleCode } from '@prisma/client';
import { ActiveUser } from '../common/types/active-user.type';
import { AuditService } from '../audit/audit.service';
import { EntitlementsService } from '../plans/entitlements.service';
import { PaymentsService } from '../payments/payments.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateSaleDto } from './dto/create-sale.dto';
import { HoldCartDto } from './dto/hold-cart.dto';
import { RefundSaleDto } from './dto/refund-sale.dto';
import { SalesRepository } from './sales.repository';

@Injectable()
export class SalesService {
  constructor(
    private readonly salesRepository: SalesRepository,
    private readonly paymentsService: PaymentsService,
    private readonly entitlementsService: EntitlementsService,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway
  ) {}

  list(actor: ActiveUser) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }

    return this.salesRepository.findByTenant(actor.tenantId);
  }

  async getById(actor: ActiveUser, saleId: string) {
    const sale = await this.salesRepository.findById(saleId);

    if (!sale) {
      throw new NotFoundException('Sale not found.');
    }

    if (actor.role !== UserRoleCode.SUPER_ADMIN && sale.tenantId !== actor.tenantId) {
      throw new ForbiddenException('Cross-tenant access denied.');
    }

    return sale;
  }

  async create(actor: ActiveUser, dto: CreateSaleDto) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }

    if (!dto.items.length) {
      throw new ForbiddenException('At least one item is required for a sale.');
    }

    if (!dto.payments.length) {
      throw new ForbiddenException('At least one payment entry is required.');
    }

    if (dto.payments.length > 1) {
      await this.entitlementsService.assertFeature(actor.tenantId, 'SPLIT_PAYMENT', actor.role);
    }

    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const yearEnd = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);

    const currentOrders = await this.salesRepository.countOrdersForTenantInYear(actor.tenantId, yearStart, yearEnd);
    await this.entitlementsService.assertWithinPlanLimit(actor.tenantId, 'maxOrdersPerYear', currentOrders, actor.role);

    const uniqueProductIds = [...new Set(dto.items.map((item) => item.productId))];
    const products = await this.salesRepository.listProductsByIds(uniqueProductIds);

    const productsById = new Map(products.map((product) => [product.id, product]));

    const computedItems = dto.items.map((item) => {
      const product = productsById.get(item.productId);
      if (!product) {
        throw new NotFoundException(`Product not found: ${item.productId}`);
      }

      if (product.tenantId !== actor.tenantId) {
        throw new ForbiddenException(`Product ${item.productId} belongs to a different tenant.`);
      }

      const baseLine = Number(product.price) * item.quantity;
      const lineDiscount = item.discountAmount ?? 0;
      const lineTax = Number((baseLine - lineDiscount) * 0.05);
      const lineTotal = baseLine - lineDiscount + lineTax;

      return {
        productId: product.id,
        quantity: item.quantity,
        unitPrice: Number(product.price),
        costPrice: Number(product.costPrice),
        discountAmount: lineDiscount,
        taxAmount: lineTax,
        lineTotal,
        productName: product.name,
        sku: product.sku
      };
    });

    const subtotal = computedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discountAmount = dto.discountAmount ?? computedItems.reduce((sum, item) => sum + item.discountAmount, 0);
    const taxAmount = dto.taxAmount ?? computedItems.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = subtotal - discountAmount + taxAmount;

    const sale = await this.salesRepository.createSaleWithStockReduction({
      tenantId: actor.tenantId,
      cashierId: actor.userId,
      managerId: actor.role === UserRoleCode.MANAGER ? actor.userId : undefined,
      counterId: dto.counterId,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      notes: dto.notes,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      items: computedItems
    });

    let totalPaid = 0;

    for (const payment of dto.payments) {
      const paymentResult = await this.paymentsService.processPayment({
        tenantId: actor.tenantId,
        saleId: sale.id,
        method: payment.method,
        amount: payment.amount,
        currency: 'USD',
        actorId: actor.userId
      });

      if (paymentResult.status === 'SUCCESS') {
        totalPaid += Number(paymentResult.amount);
      }
    }

    const changeAmount = Math.max(totalPaid - totalAmount, 0);

    const updatedSale = await this.salesRepository.updateSalePaymentTotals(sale.id, totalPaid, changeAmount);

    await this.auditService.logUserEvent({
      actor,
      tenantId: actor.tenantId,
      action: 'SALE_COMPLETED',
      entity: 'Sale',
      entityId: sale.id,
      details: {
        saleNumber: sale.saleNumber,
        totalAmount,
        totalPaid
      }
    });

    this.realtimeGateway.emitSaleCreated(actor.tenantId, {
      saleId: sale.id,
      saleNumber: sale.saleNumber,
      totalAmount,
      paidAmount: totalPaid,
      cashierId: actor.userId
    });

    this.realtimeGateway.emitDashboardMetrics(actor.tenantId, {
      event: 'sale_completed',
      amount: totalAmount
    });

    return updatedSale;
  }

  async refund(actor: ActiveUser, dto: RefundSaleDto) {
    const sale = await this.salesRepository.findById(dto.saleId);
    if (!sale) {
      throw new NotFoundException('Sale not found.');
    }

    if (actor.role !== UserRoleCode.SUPER_ADMIN && sale.tenantId !== actor.tenantId) {
      throw new ForbiddenException('Cross-tenant refund denied.');
    }

    const refundAllowedRoles: UserRoleCode[] = [
      UserRoleCode.TENANT_ADMIN,
      UserRoleCode.MANAGER,
      UserRoleCode.SUPER_ADMIN
    ];

    if (!refundAllowedRoles.includes(actor.role)) {
      throw new ForbiddenException('Insufficient permission to process refund.');
    }

    const refunded = await this.salesRepository.refundSale({
      saleId: dto.saleId,
      actorId: actor.userId,
      reason: dto.reason
    });

    await this.auditService.logUserEvent({
      actor,
      tenantId: sale.tenantId,
      action: 'SALE_REFUNDED',
      entity: 'Sale',
      entityId: sale.id,
      details: { reason: dto.reason }
    });

    return refunded;
  }

  async cancel(actor: ActiveUser, saleId: string, reason?: string) {
    const sale = await this.salesRepository.findById(saleId);
    if (!sale) {
      throw new NotFoundException('Sale not found.');
    }

    if (actor.role !== UserRoleCode.SUPER_ADMIN && sale.tenantId !== actor.tenantId) {
      throw new ForbiddenException('Cross-tenant cancel denied.');
    }

    const cancelAllowedRoles: UserRoleCode[] = [
      UserRoleCode.TENANT_ADMIN,
      UserRoleCode.MANAGER,
      UserRoleCode.SUPER_ADMIN
    ];

    if (!cancelAllowedRoles.includes(actor.role)) {
      throw new ForbiddenException('Insufficient permission to cancel sale.');
    }

    const canceled = await this.salesRepository.cancelSale({ saleId, reason });

    await this.auditService.logUserEvent({
      actor,
      tenantId: sale.tenantId,
      action: 'SALE_CANCELED',
      entity: 'Sale',
      entityId: sale.id,
      details: { reason }
    });

    return canceled;
  }

  async holdCart(actor: ActiveUser, dto: HoldCartDto) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }

    const productIds = [...new Set(dto.items.map((item) => item.productId))];
    const products = await this.salesRepository.listProductsByIds(productIds);
    const productsById = new Map(products.map((product) => [product.id, product]));

    const cartItems = dto.items.map((item) => {
      const product = productsById.get(item.productId);
      if (!product) {
        throw new NotFoundException(`Product not found: ${item.productId}`);
      }

      const lineTotal = Number(product.price) * item.quantity;

      return {
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.price,
        lineTotal
      };
    });

    const subtotal = cartItems.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
    const discountAmount = dto.discountAmount ?? 0;
    const taxAmount = dto.taxAmount ?? subtotal * 0.05;
    const total = subtotal - discountAmount + taxAmount;

    return this.salesRepository.createHeldCart({
      tenantId: actor.tenantId,
      cashierId: actor.userId,
      name: dto.name,
      status: 'HOLD',
      subtotal,
      discountAmount,
      taxAmount,
      total,
      heldAt: new Date(),
      items: {
        create: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal
        }))
      }
    });
  }

  listHeldCarts(actor: ActiveUser) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }

    return this.salesRepository.listHeldCarts(actor.tenantId, actor.userId);
  }

  resumeHeldCart(actor: ActiveUser, cartId: string) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }

    return this.salesRepository.resumeHeldCart(cartId);
  }

  clearHeldCart(actor: ActiveUser, cartId: string) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }

    return this.salesRepository.clearHeldCart(cartId);
  }
}

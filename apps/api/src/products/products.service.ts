import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRoleCode } from '@prisma/client';
import { EntitlementsService } from '../plans/entitlements.service';
import { ActiveUser } from '../common/types/active-user.type';
import { AuditService } from '../audit/audit.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsRepository } from './products.repository';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly entitlementsService: EntitlementsService,
    private readonly auditService: AuditService
  ) {}

  list(actor: ActiveUser, search?: string, categoryId?: string) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Vendor context required.');
    }

    return this.productsRepository.findByTenant(actor.tenantId, search, categoryId);
  }

  getLowStock(actor: ActiveUser) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Vendor context required.');
    }

    return this.productsRepository.findLowStock(actor.tenantId);
  }

  async create(actor: ActiveUser, dto: CreateProductDto) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Vendor context required.');
    }

    const currentCount = await this.productsRepository.countActiveByTenant(actor.tenantId);
    await this.entitlementsService.assertWithinPlanLimit(actor.tenantId, 'maxProducts', currentCount, actor.role);

    if (dto.hasVariants) {
      await this.entitlementsService.assertFeature(actor.tenantId, 'ADVANCED_INVENTORY', actor.role);
    }

    const product = await this.productsRepository.create({
      tenantId: actor.tenantId,
      categoryId: dto.categoryId,
      name: dto.name,
      sku: dto.sku,
      barcode: dto.barcode,
      hsCode: dto.hsCode,
      description: dto.description,
      imageUrl: dto.imageUrl,
      price: new Prisma.Decimal(dto.price),
      costPrice: new Prisma.Decimal(dto.costPrice),
      stockQuantity: dto.stockQuantity ?? 0,
      lowStockThreshold: dto.lowStockThreshold ?? 10,
      hasVariants: dto.hasVariants ?? false
    });

    await this.auditService.logUserEvent({
      actor,
      tenantId: actor.tenantId,
      action: 'PRODUCT_CREATED',
      entity: 'Product',
      entityId: product.id,
      details: { sku: product.sku, name: product.name }
    });

    return product;
  }

  async update(actor: ActiveUser, productId: string, dto: UpdateProductDto) {
    const product = await this.productsRepository.findById(productId);
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found.');
    }

    if (actor.role !== UserRoleCode.SUPER_ADMIN && product.tenantId !== actor.tenantId) {
      throw new ForbiddenException('Cross-vendor product update denied.');
    }

    if (dto.hasVariants) {
      await this.entitlementsService.assertFeature(product.tenantId, 'ADVANCED_INVENTORY', actor.role);
    }

    const updated = await this.productsRepository.update(productId, {
      ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
      ...(dto.name ? { name: dto.name } : {}),
      ...(dto.sku ? { sku: dto.sku } : {}),
      ...(dto.barcode !== undefined ? { barcode: dto.barcode } : {}),
      ...(dto.hsCode !== undefined ? { hsCode: dto.hsCode } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
      ...(dto.price !== undefined ? { price: new Prisma.Decimal(dto.price) } : {}),
      ...(dto.costPrice !== undefined ? { costPrice: new Prisma.Decimal(dto.costPrice) } : {}),
      ...(dto.stockQuantity !== undefined ? { stockQuantity: dto.stockQuantity } : {}),
      ...(dto.lowStockThreshold !== undefined ? { lowStockThreshold: dto.lowStockThreshold } : {}),
      ...(dto.hasVariants !== undefined ? { hasVariants: dto.hasVariants } : {})
    });

    await this.auditService.logUserEvent({
      actor,
      tenantId: product.tenantId,
      action: 'PRODUCT_UPDATED',
      entity: 'Product',
      entityId: updated.id,
      details: dto
    });

    return updated;
  }

  async remove(actor: ActiveUser, productId: string) {
    const product = await this.productsRepository.findById(productId);
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found.');
    }

    if (actor.role !== UserRoleCode.SUPER_ADMIN && product.tenantId !== actor.tenantId) {
      throw new ForbiddenException('Cross-vendor product remove denied.');
    }

    await this.productsRepository.softDelete(productId);

    await this.auditService.logUserEvent({
      actor,
      tenantId: product.tenantId,
      action: 'PRODUCT_DELETED',
      entity: 'Product',
      entityId: productId
    });

    return { success: true };
  }
}

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRoleCode } from '@prisma/client';
import { ActiveUser } from '../common/types/active-user.type';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoriesRepository } from './categories.repository';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  list(actor: ActiveUser) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }

    return this.categoriesRepository.findByTenant(actor.tenantId);
  }

  async create(actor: ActiveUser, dto: CreateCategoryDto) {
    if (!actor.tenantId || actor.role === UserRoleCode.SUPER_ADMIN) {
      throw new ForbiddenException('Tenant context required.');
    }

    return this.categoriesRepository.create({
      tenantId: actor.tenantId,
      name: dto.name,
      description: dto.description
    });
  }

  async update(actor: ActiveUser, categoryId: string, dto: UpdateCategoryDto) {
    const category = await this.categoriesRepository.findById(categoryId);

    if (!category || category.deletedAt) {
      throw new NotFoundException('Category not found.');
    }

    if (actor.role !== UserRoleCode.SUPER_ADMIN && category.tenantId !== actor.tenantId) {
      throw new ForbiddenException('Cannot update category outside tenant scope.');
    }

    return this.categoriesRepository.update(categoryId, {
      ...(dto.name ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {})
    });
  }

  async remove(actor: ActiveUser, categoryId: string) {
    const category = await this.categoriesRepository.findById(categoryId);

    if (!category || category.deletedAt) {
      throw new NotFoundException('Category not found.');
    }

    if (actor.role !== UserRoleCode.SUPER_ADMIN && category.tenantId !== actor.tenantId) {
      throw new ForbiddenException('Cannot remove category outside tenant scope.');
    }

    await this.categoriesRepository.softDelete(categoryId);
    return { success: true };
  }
}

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
      throw new ForbiddenException('Vendor context required.');
    }

    return this.categoriesRepository.findByTenant(actor.tenantId);
  }

  async create(actor: ActiveUser, dto: CreateCategoryDto) {
    if (!actor.tenantId || actor.role === UserRoleCode.SUPER_ADMIN) {
      throw new ForbiddenException('Vendor context required.');
    }

    const parentId = dto.parentId?.trim();
    if (parentId) {
      await this.assertParentCategory(actor.tenantId, parentId);
    }

    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Category name is required.');
    }

    return this.categoriesRepository.create({
      tenantId: actor.tenantId,
      name,
      parentId: parentId || null,
      description: dto.description?.trim() || null
    });
  }

  async update(actor: ActiveUser, categoryId: string, dto: UpdateCategoryDto) {
    const category = await this.categoriesRepository.findById(categoryId);

    if (!category || category.deletedAt) {
      throw new NotFoundException('Category not found.');
    }

    if (actor.role !== UserRoleCode.SUPER_ADMIN && category.tenantId !== actor.tenantId) {
      throw new ForbiddenException('Cannot update category outside vendor scope.');
    }

    if (dto.parentId !== undefined) {
      const nextParentId = dto.parentId?.trim();
      if (nextParentId) {
        if (nextParentId === categoryId) {
          throw new BadRequestException('Category cannot be parent of itself.');
        }

        await this.assertParentCategory(category.tenantId, nextParentId, categoryId);
      }
    }

    if (dto.name !== undefined && !dto.name.trim()) {
      throw new BadRequestException('Category name cannot be empty.');
    }

    return this.categoriesRepository.update(categoryId, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.parentId !== undefined ? { parentId: dto.parentId?.trim() || null } : {}),
      ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {})
    });
  }

  async remove(actor: ActiveUser, categoryId: string) {
    const category = await this.categoriesRepository.findById(categoryId);

    if (!category || category.deletedAt) {
      throw new NotFoundException('Category not found.');
    }

    if (actor.role !== UserRoleCode.SUPER_ADMIN && category.tenantId !== actor.tenantId) {
      throw new ForbiddenException('Cannot remove category outside vendor scope.');
    }

    await this.categoriesRepository.softDelete(categoryId);
    return { success: true };
  }

  private async assertParentCategory(tenantId: string, parentId: string, currentCategoryId?: string) {
    const parent = await this.categoriesRepository.findById(parentId);

    if (!parent || parent.deletedAt) {
      throw new NotFoundException('Parent category not found.');
    }

    if (parent.tenantId !== tenantId) {
      throw new ForbiddenException('Parent category must belong to the same tenant.');
    }

    if (!currentCategoryId) {
      return;
    }

    if (parent.id === currentCategoryId) {
      throw new BadRequestException('Category cannot be parent of itself.');
    }

    let cursorParentId: string | null = parent.parentId ?? null;
    const visited = new Set<string>();

    while (cursorParentId) {
      if (cursorParentId === currentCategoryId) {
        throw new BadRequestException('Category cannot be assigned to one of its own descendants.');
      }

      if (visited.has(cursorParentId)) {
        break;
      }
      visited.add(cursorParentId);

      const rows = await this.categoriesRepository.findByIds([cursorParentId]);
      const next = rows[0];
      cursorParentId = next?.parentId ?? null;
    }
  }
}

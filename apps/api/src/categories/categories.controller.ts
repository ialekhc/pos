import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRoleCode } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ActiveUser } from '../common/types/active-user.type';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  list(@CurrentUser() user: ActiveUser) {
    return this.categoriesService.list(user);
  }

  @Roles(UserRoleCode.TENANT_ADMIN, UserRoleCode.MANAGER)
  @Post()
  create(@CurrentUser() user: ActiveUser, @Body() body: CreateCategoryDto) {
    return this.categoriesService.create(user, body);
  }

  @Roles(UserRoleCode.TENANT_ADMIN, UserRoleCode.MANAGER)
  @Patch(':categoryId')
  update(
    @CurrentUser() user: ActiveUser,
    @Param('categoryId') categoryId: string,
    @Body() body: UpdateCategoryDto
  ) {
    return this.categoriesService.update(user, categoryId, body);
  }

  @Roles(UserRoleCode.TENANT_ADMIN)
  @Delete(':categoryId')
  remove(@CurrentUser() user: ActiveUser, @Param('categoryId') categoryId: string) {
    return this.categoriesService.remove(user, categoryId);
  }
}

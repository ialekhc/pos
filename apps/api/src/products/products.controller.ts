import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UserRoleCode } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ActiveUser } from '../common/types/active-user.type';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  list(
    @CurrentUser() user: ActiveUser,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string
  ) {
    return this.productsService.list(user, search, categoryId);
  }

  @Get('low-stock')
  lowStock(@CurrentUser() user: ActiveUser) {
    return this.productsService.getLowStock(user);
  }

  @Roles(UserRoleCode.TENANT_ADMIN, UserRoleCode.MANAGER)
  @Post()
  create(@CurrentUser() user: ActiveUser, @Body() body: CreateProductDto) {
    return this.productsService.create(user, body);
  }

  @Roles(UserRoleCode.TENANT_ADMIN, UserRoleCode.MANAGER)
  @Patch(':productId')
  update(
    @CurrentUser() user: ActiveUser,
    @Param('productId') productId: string,
    @Body() body: UpdateProductDto
  ) {
    return this.productsService.update(user, productId, body);
  }

  @Roles(UserRoleCode.TENANT_ADMIN)
  @Delete(':productId')
  remove(@CurrentUser() user: ActiveUser, @Param('productId') productId: string) {
    return this.productsService.remove(user, productId);
  }
}

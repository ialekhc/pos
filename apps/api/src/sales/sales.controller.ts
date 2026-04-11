import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRoleCode } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ActiveUser } from '../common/types/active-user.type';
import { CreateSaleDto } from './dto/create-sale.dto';
import { HoldCartDto } from './dto/hold-cart.dto';
import { RefundSaleDto } from './dto/refund-sale.dto';
import { SalesService } from './sales.service';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  list(@CurrentUser() user: ActiveUser) {
    return this.salesService.list(user);
  }

  @Get(':saleId')
  details(@CurrentUser() user: ActiveUser, @Param('saleId') saleId: string) {
    return this.salesService.getById(user, saleId);
  }

  @Roles(UserRoleCode.TENANT_ADMIN, UserRoleCode.MANAGER, UserRoleCode.CASHIER)
  @Post()
  create(@CurrentUser() user: ActiveUser, @Body() body: CreateSaleDto) {
    return this.salesService.create(user, body);
  }

  @Roles(UserRoleCode.TENANT_ADMIN, UserRoleCode.MANAGER)
  @Post('refund')
  refund(@CurrentUser() user: ActiveUser, @Body() body: RefundSaleDto) {
    return this.salesService.refund(user, body);
  }

  @Roles(UserRoleCode.TENANT_ADMIN, UserRoleCode.MANAGER)
  @Patch(':saleId/cancel')
  cancel(
    @CurrentUser() user: ActiveUser,
    @Param('saleId') saleId: string,
    @Body('reason') reason?: string
  ) {
    return this.salesService.cancel(user, saleId, reason);
  }

  @Roles(UserRoleCode.TENANT_ADMIN, UserRoleCode.MANAGER, UserRoleCode.CASHIER)
  @Post('carts/hold')
  holdCart(@CurrentUser() user: ActiveUser, @Body() body: HoldCartDto) {
    return this.salesService.holdCart(user, body);
  }

  @Roles(UserRoleCode.TENANT_ADMIN, UserRoleCode.MANAGER, UserRoleCode.CASHIER)
  @Get('carts/held/list')
  heldCarts(@CurrentUser() user: ActiveUser) {
    return this.salesService.listHeldCarts(user);
  }

  @Roles(UserRoleCode.TENANT_ADMIN, UserRoleCode.MANAGER, UserRoleCode.CASHIER)
  @Patch('carts/:cartId/resume')
  resumeCart(@CurrentUser() user: ActiveUser, @Param('cartId') cartId: string) {
    return this.salesService.resumeHeldCart(user, cartId);
  }

  @Roles(UserRoleCode.TENANT_ADMIN, UserRoleCode.MANAGER, UserRoleCode.CASHIER)
  @Delete('carts/:cartId')
  clearCart(@CurrentUser() user: ActiveUser, @Param('cartId') cartId: string) {
    return this.salesService.clearHeldCart(user, cartId);
  }
}

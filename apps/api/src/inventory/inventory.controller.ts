import { Body, Controller, Get, Post } from '@nestjs/common';
import { UserRoleCode } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ActiveUser } from '../common/types/active-user.type';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Roles(UserRoleCode.TENANT_ADMIN, UserRoleCode.MANAGER)
  @Post('adjust')
  adjust(@CurrentUser() user: ActiveUser, @Body() body: StockAdjustmentDto) {
    return this.inventoryService.adjustStock(user, body);
  }

  @Get('logs')
  logs(@CurrentUser() user: ActiveUser) {
    return this.inventoryService.listLogs(user);
  }
}

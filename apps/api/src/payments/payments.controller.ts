import { Body, Controller, Get, Post } from '@nestjs/common';
import { UserRoleCode } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ActiveUser } from '../common/types/active-user.type';
import { PaymentsService } from './payments.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { ReconcilePaymentDto } from './dto/reconcile-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  list(@CurrentUser() user: ActiveUser) {
    return this.paymentsService.list(user);
  }

  @Roles(UserRoleCode.TENANT_ADMIN, UserRoleCode.MANAGER, UserRoleCode.CASHIER)
  @Post('record')
  record(@CurrentUser() user: ActiveUser, @Body() body: RecordPaymentDto) {
    return this.paymentsService.record(user, body);
  }

  @Roles(UserRoleCode.TENANT_ADMIN, UserRoleCode.MANAGER)
  @Post('reconcile')
  reconcile(@CurrentUser() user: ActiveUser, @Body() body: ReconcilePaymentDto) {
    return this.paymentsService.reconcile(user, body);
  }
}

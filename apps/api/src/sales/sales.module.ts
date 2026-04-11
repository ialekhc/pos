import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { SalesRepository } from './sales.repository';
import { PaymentsModule } from '../payments/payments.module';
import { PlansModule } from '../plans/plans.module';
import { AuditModule } from '../audit/audit.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [PaymentsModule, PlansModule, AuditModule, RealtimeModule],
  controllers: [SalesController],
  providers: [SalesService, SalesRepository],
  exports: [SalesService]
})
export class SalesModule {}

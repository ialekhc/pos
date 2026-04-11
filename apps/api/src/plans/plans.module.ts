import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { PlansRepository } from './plans.repository';
import { EntitlementsService } from './entitlements.service';

@Module({
  controllers: [PlansController],
  providers: [PlansService, PlansRepository, EntitlementsService],
  exports: [EntitlementsService]
})
export class PlansModule {}

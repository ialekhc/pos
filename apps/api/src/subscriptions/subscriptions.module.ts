import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsRepository } from './subscriptions.repository';
import { PlansModule } from '../plans/plans.module';
import { PlansRepository } from '../plans/plans.repository';

@Module({
  imports: [PlansModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionsRepository, PlansRepository],
  exports: [SubscriptionsService]
})
export class SubscriptionsModule {}

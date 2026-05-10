import { Module } from '@nestjs/common';
import { PartiesController } from './parties.controller';
import { PartiesRepository } from './parties.repository';
import { PartiesService } from './parties.service';

@Module({
  controllers: [PartiesController],
  providers: [PartiesService, PartiesRepository],
  exports: [PartiesService]
})
export class PartiesModule {}

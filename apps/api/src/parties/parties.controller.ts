import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UserRoleCode } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ActiveUser } from '../common/types/active-user.type';
import { CreatePartyDto } from './dto/create-party.dto';
import { ListPartiesDto } from './dto/list-parties.dto';
import { UpdatePartyDto } from './dto/update-party.dto';
import { PartiesService } from './parties.service';

@Controller('parties')
export class PartiesController {
  constructor(private readonly partiesService: PartiesService) {}

  @Roles(UserRoleCode.TENANT_ADMIN, UserRoleCode.MANAGER, UserRoleCode.CASHIER)
  @Get()
  list(@CurrentUser() user: ActiveUser, @Query() query: ListPartiesDto) {
    return this.partiesService.list(user, query);
  }

  @Roles(UserRoleCode.TENANT_ADMIN, UserRoleCode.MANAGER)
  @Post()
  create(@CurrentUser() user: ActiveUser, @Body() body: CreatePartyDto) {
    return this.partiesService.create(user, body);
  }

  @Roles(UserRoleCode.TENANT_ADMIN, UserRoleCode.MANAGER)
  @Patch(':partyId')
  update(@CurrentUser() user: ActiveUser, @Param('partyId') partyId: string, @Body() body: UpdatePartyDto) {
    return this.partiesService.update(user, partyId, body);
  }

  @Roles(UserRoleCode.TENANT_ADMIN)
  @Delete(':partyId')
  remove(@CurrentUser() user: ActiveUser, @Param('partyId') partyId: string) {
    return this.partiesService.remove(user, partyId);
  }
}

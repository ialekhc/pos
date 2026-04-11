import { Body, Controller, Get, Patch } from '@nestjs/common';
import { UserRoleCode } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ActiveUser } from '../common/types/active-user.type';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings(@CurrentUser() user: ActiveUser) {
    return this.settingsService.getSettings(user);
  }

  @Roles(UserRoleCode.TENANT_ADMIN)
  @Patch()
  updateSettings(@CurrentUser() user: ActiveUser, @Body() body: UpdateSettingsDto) {
    return this.settingsService.updateSettings(user, body);
  }
}

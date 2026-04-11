import { Controller, Get, Query } from '@nestjs/common';
import { UserRoleCode } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ActiveUser } from '../common/types/active-user.type';
import { QueryAuditDto } from './dto/query-audit.dto';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Roles(UserRoleCode.SUPER_ADMIN, UserRoleCode.TENANT_ADMIN)
  @Get()
  list(@CurrentUser() user: ActiveUser, @Query() query: QueryAuditDto) {
    if (user.role === UserRoleCode.SUPER_ADMIN) {
      return this.auditService.list(query);
    }

    return this.auditService.list({
      tenantId: user.tenantId ?? undefined,
      entity: query.entity,
      action: query.action
    });
  }
}

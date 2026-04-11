import { UserRoleCode } from '@prisma/client';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRoleCode[]) => SetMetadata(ROLES_KEY, roles);

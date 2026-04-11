import { UserRoleCode } from '@prisma/client';

export type ActiveUser = {
  userId: string;
  email: string;
  tenantId: string | null;
  role: UserRoleCode;
};

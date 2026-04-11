'use client';

import { UserRole } from '@/lib/types';

export function hasAnyRole(actualRole: UserRole | undefined, allowed: UserRole[]) {
  if (!actualRole) {
    return false;
  }

  return allowed.includes(actualRole);
}

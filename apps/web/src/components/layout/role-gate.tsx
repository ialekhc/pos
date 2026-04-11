'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/lib/types';
import { useSessionStore } from '@/lib/stores/use-session-store';

export function RoleGate({
  allowed,
  children
}: {
  allowed: UserRole[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useSessionStore((state) => state.user);
  const hasHydrated = useSessionStore((state) => state.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (!allowed.includes(user.role)) {
      if (user.role === 'SUPER_ADMIN') {
        router.replace('/super-admin/dashboard');
      } else {
        router.replace('/tenant/dashboard');
      }
    }
  }, [allowed, hasHydrated, router, user]);

  if (!hasHydrated) {
    return null;
  }

  if (!user || !allowed.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}

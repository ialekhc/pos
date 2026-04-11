'use client';

import { AppShell } from '@/components/layout/app-shell';
import { RoleGate } from '@/components/layout/role-gate';
import { Building2, CreditCard, LayoutDashboard, ShieldPlus, Sparkles } from 'lucide-react';

const navItems = [
  { href: '/super-admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/super-admin/tenants', label: 'Tenants', icon: Building2 },
  { href: '/super-admin/users', label: 'Users', icon: ShieldPlus },
  { href: '/super-admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/super-admin/plans', label: 'Plans & Features', icon: Sparkles }
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allowed={['SUPER_ADMIN']}>
      <AppShell
        title="Super Admin Control"
        subtitle="Platform management, subscriptions, tenant health, and governance"
        navItems={navItems}
      >
        {children}
      </AppShell>
    </RoleGate>
  );
}

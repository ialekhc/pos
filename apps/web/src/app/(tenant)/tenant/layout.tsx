'use client';

import { AppShell } from '@/components/layout/app-shell';
import { RoleGate } from '@/components/layout/role-gate';
import {
  BarChart3,
  Boxes,
  CreditCard,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Users
} from 'lucide-react';

const navItems = [
  { href: '/tenant/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tenant/pos', label: 'POS', icon: ShoppingCart },
  { href: '/tenant/products', label: 'Products', icon: Package },
  { href: '/tenant/inventory', label: 'Inventory', icon: Boxes },
  { href: '/tenant/sales', label: 'Sales', icon: Receipt },
  { href: '/tenant/staff', label: 'Staff', icon: Users },
  { href: '/tenant/reports', label: 'Reports', icon: BarChart3 },
  { href: '/tenant/settings', label: 'Settings', icon: Settings },
  { href: '/tenant/subscription', label: 'Subscription', icon: CreditCard }
];

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allowed={['TENANT_ADMIN', 'MANAGER', 'CASHIER']}>
      <AppShell
        title="Tenant Workspace"
        subtitle="Store operations, POS, inventory, staff, and analytics"
        navItems={navItems}
      >
        {children}
      </AppShell>
    </RoleGate>
  );
}

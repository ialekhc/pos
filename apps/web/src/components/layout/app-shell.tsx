'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, ShieldCheck, Store, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useSessionStore } from '@/lib/stores/use-session-store';
import { Button } from '@/components/ui/button';

type NavItem = {
  href: string;
  label: string;
  icon?: LucideIcon;
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  TENANT_ADMIN: 'Vendor Admin',
  MANAGER: 'Manager',
  CASHIER: 'Cashier'
};

export function AppShell({
  title,
  subtitle,
  navItems,
  children
}: {
  title: string;
  subtitle?: string;
  navItems: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearSession } = useSessionStore();

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-transparent md:grid md:grid-cols-[270px_1fr]">
      <aside className="relative border-r border-border/70 bg-card/75 p-4 backdrop-blur-xl">
        <div className="absolute inset-x-4 top-4 h-28 rounded-2xl bg-gradient-to-br from-primary/20 via-accent/15 to-secondary/30 blur-xl" />
        <div className="relative mb-6 flex items-center gap-2 rounded-xl border border-white/50 bg-white/70 p-3 shadow-sm">
          {user?.role === 'SUPER_ADMIN' ? <ShieldCheck className="h-5 w-5 text-primary" /> : <Store className="h-5 w-5 text-primary" />}
          <div>
            <p className="text-sm font-semibold">POS Control Cloud</p>
            <p className="text-xs text-muted-foreground">
              {user?.role ? ROLE_LABELS[user.role] ?? user.role.replaceAll('_', ' ') : ''}
            </p>
          </div>
        </div>

        <nav className="relative space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {Icon ? <Icon className="h-4 w-4" /> : null}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="min-h-screen bg-background/75 p-4 md:p-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card/75 px-4 py-3 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-lg border bg-background/75 px-3 py-2 text-right">
              <p className="text-sm font-semibold">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

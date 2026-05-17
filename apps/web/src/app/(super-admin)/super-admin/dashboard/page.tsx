'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MetricCard } from '@/components/layout/metric-card';
import { DataTable } from '@/components/layout/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/api/client';
import { formatCurrency } from '@/lib/utils/currency';

type AdminDashboardResponse = {
  metrics: {
    totalTenants: number;
    activeTenants: number;
    inactiveTenants: number;
    totalUsers: number;
    totalRevenue: number;
    totalOrders: number;
  };
  planDistribution: Array<{
    planId: string;
    planCode: string;
    planName: string;
    count: number;
  }>;
  subscriptionStatus: Array<{
    status: string;
    _count: { _all: number };
  }>;
  recentTenantActivity: Array<{
    action: string;
    entity: string;
    entityId?: string;
    createdAt: string;
  }>;
};

type HealthResponse = {
  database: 'UP' | 'DOWN';
  redis: 'UP' | 'DOWN' | 'DISABLED';
  timestamp: string;
};

export default function SuperAdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([
      apiRequest<AdminDashboardResponse>('/admin/dashboard'),
      apiRequest<HealthResponse>('/admin/system/health')
    ]).then(([dashboardResult, healthResult]) => {
      const endpointErrors: string[] = [];

      if (dashboardResult.status === 'fulfilled') {
        setData(dashboardResult.value);
      } else {
        endpointErrors.push(
          dashboardResult.reason instanceof Error
            ? dashboardResult.reason.message
            : 'Failed to load dashboard metrics'
        );
      }

      if (healthResult.status === 'fulfilled') {
        setHealth(healthResult.value);
      } else {
        endpointErrors.push(
          healthResult.reason instanceof Error
            ? `Health: ${healthResult.reason.message}`
            : 'Health endpoint unavailable'
        );
      }

      setError(endpointErrors.length ? endpointErrors.join(' | ') : null);
    });
  }, []);

  const subscriptionRows = useMemo(
    () =>
      (data?.subscriptionStatus ?? []).map((entry) => [
        entry.status,
        entry._count._all
      ]),
    [data?.subscriptionStatus]
  );

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard title="Total Vendors" value={data?.metrics.totalTenants ?? '-'} />
        <MetricCard title="Active Vendors" value={data?.metrics.activeTenants ?? '-'} />
        <MetricCard title="Inactive/Suspended" value={data?.metrics.inactiveTenants ?? '-'} />
        <MetricCard title="Platform Users" value={data?.metrics.totalUsers ?? '-'} />
        <MetricCard title="Total Orders" value={data?.metrics.totalOrders ?? '-'} />
        <MetricCard
          title="Revenue (All Vendors)"
          value={formatCurrency(data?.metrics.totalRevenue ?? 0)}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platform Health</CardTitle>
            <CardDescription>Live infrastructure status and quick operator actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Database: <strong>{health?.database ?? '-'}</strong>
            </p>
            <p>
              Redis: <strong>{health?.redis ?? '-'}</strong>
            </p>
            <p>Last Checked: {health?.timestamp ? new Date(health.timestamp).toLocaleString() : '-'}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild size="sm">
                <Link href="/super-admin/tenants">Manage Vendors</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/super-admin/users">Manage Users</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/super-admin/subscriptions">Manage Subscriptions</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
            <CardDescription>How vendors are spread across pricing plans</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              headers={['Plan', 'Code', 'Vendors']}
              rows={(data?.planDistribution ?? []).map((row) => [row.planName, row.planCode, row.count])}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>Current status of all vendor subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable headers={['Status', 'Count']} rows={subscriptionRows} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Recent Vendor Activity</CardTitle>
          <CardDescription>System-level vendor events for support and governance</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={['Action', 'Entity', 'Reference', 'Timestamp']}
            rows={(data?.recentTenantActivity ?? []).map((item) => [
              item.action,
              item.entity,
              item.entityId ?? '-',
              new Date(item.createdAt).toLocaleString()
            ])}
          />
        </CardContent>
      </Card>
    </div>
  );
}

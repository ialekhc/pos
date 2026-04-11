'use client';

import { useCallback, useEffect, useState } from 'react';
import { MetricCard } from '@/components/layout/metric-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/layout/data-table';
import { apiRequest } from '@/lib/api/client';
import { useRealtimeSync } from '@/hooks/use-realtime-sync';

type DashboardData = {
  totals: {
    _sum: {
      subtotal: string | null;
      discountAmount: string | null;
      taxAmount: string | null;
      totalAmount: string | null;
      paidAmount: string | null;
    };
    _count: { _all: number };
  };
};

type Product = {
  id: string;
  name: string;
  sku: string;
  stockQuantity: number;
  lowStockThreshold: number;
};

export default function TenantDashboardPage() {
  const [summary, setSummary] = useState<DashboardData | null>(null);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [realtimeHint, setRealtimeHint] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiRequest<DashboardData>('/reports/summary?period=DAILY'),
      apiRequest<Product[]>('/products/low-stock'),
      apiRequest('/sales')
    ])
      .then(([dailySummary, lowStockItems]) => {
        setSummary(dailySummary);
        setLowStock(lowStockItems);
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : 'Failed to load dashboard');
      });
  }, []);

  const handleDashboardMetrics = useCallback(() => {
    setRealtimeHint(`Live update received at ${new Date().toLocaleTimeString()}. Refreshing summary...`);
    apiRequest<DashboardData>('/reports/summary?period=DAILY').then(setSummary).catch(() => null);
  }, []);

  const handleInventoryUpdated = useCallback(() => {
    apiRequest<Product[]>('/products/low-stock').then(setLowStock).catch(() => null);
  }, []);

  useRealtimeSync({
    onDashboardMetrics: handleDashboardMetrics,
    onInventoryUpdated: handleInventoryUpdated
  });

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-6">
      {realtimeHint ? (
        <p className="rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">{realtimeHint}</p>
      ) : null}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Today Revenue"
          value={`$${Number(summary?.totals._sum.totalAmount ?? 0).toFixed(2)}`}
        />
        <MetricCard title="Transactions" value={summary?.totals._count._all ?? '-'} />
        <MetricCard title="Tax Collected" value={`$${Number(summary?.totals._sum.taxAmount ?? 0).toFixed(2)}`} />
        <MetricCard title="Discount Given" value={`$${Number(summary?.totals._sum.discountAmount ?? 0).toFixed(2)}`} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Low Stock Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={['Product', 'SKU', 'Current Stock', 'Threshold']}
            rows={lowStock.map((item) => [item.name, item.sku, item.stockQuantity, item.lowStockThreshold])}
            emptyMessage="No low-stock alerts. Inventory is healthy."
          />
        </CardContent>
      </Card>
    </div>
  );
}

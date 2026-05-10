'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/layout/metric-card';
import { DataTable } from '@/components/layout/data-table';
import { apiRequest } from '@/lib/api/client';
import { formatCurrency } from '@/lib/utils/currency';

export default function ReportsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [paymentWise, setPaymentWise] = useState<any[]>([]);
  const [cashierWise, setCashierWise] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiRequest('/reports/summary?period=WEEKLY'),
      apiRequest('/reports/top-products?period=WEEKLY').catch(() => []),
      apiRequest('/reports/payment-wise?period=WEEKLY'),
      apiRequest('/reports/cashier-wise?period=WEEKLY')
    ])
      .then(([summaryRows, topProductsRows, paymentRows, cashierRows]) => {
        setSummary(summaryRows);
        setTopProducts(Array.isArray(topProductsRows) ? topProductsRows : []);
        setPaymentWise(Array.isArray(paymentRows) ? paymentRows : []);
        setCashierWise(Array.isArray(cashierRows) ? cashierRows : []);
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : 'Failed to load reports');
      });
  }, []);

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Weekly Revenue"
          value={formatCurrency(summary?.totals?._sum?.totalAmount ?? 0)}
        />
        <MetricCard title="Weekly Orders" value={summary?.totals?._count?._all ?? '-'} />
        <MetricCard
          title="Payments Collected"
          value={formatCurrency(summary?.totals?._sum?.paidAmount ?? 0)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top-Selling Products</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={['Product', 'SKU', 'Units Sold', 'Revenue']}
            rows={topProducts.map((row) => [
              row.productName,
              row.sku,
              row._sum?.quantity ?? 0,
              formatCurrency(row._sum?.lineTotal ?? 0)
            ])}
            emptyMessage="Top-product analytics requires eligible plans (Silver and above by default)."
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment-wise Report</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              headers={['Method', 'Status', 'Transactions', 'Amount']}
              rows={paymentWise.map((row) => [
                row.method,
                row.status,
                row._count?._all ?? 0,
                formatCurrency(row._sum?.amount ?? 0)
              ])}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cashier-wise Report</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              headers={['Cashier', 'Orders', 'Revenue']}
              rows={cashierWise.map((row) => [
                row.cashier ? `${row.cashier.firstName} ${row.cashier.lastName}` : row.cashierId,
                row._count?._all ?? 0,
                formatCurrency(row._sum?.totalAmount ?? 0)
              ])}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

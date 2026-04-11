'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/layout/data-table';
import { apiRequest } from '@/lib/api/client';

type Sale = {
  id: string;
  saleNumber: string;
  status: 'COMPLETED' | 'REFUNDED' | 'CANCELED';
  totalAmount: string;
  paidAmount: string;
  completedAt: string;
  cashier?: { firstName?: string; lastName?: string } | null;
};

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadSales = async () => {
    try {
      const rows = await apiRequest<Sale[]>('/sales');
      setSales(rows);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load sales');
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const refund = async (saleId: string) => {
    await apiRequest('/sales/refund', {
      method: 'POST',
      body: JSON.stringify({
        saleId,
        reason: 'Manual operator refund'
      })
    });
    await loadSales();
  };

  const cancel = async (saleId: string) => {
    await apiRequest(`/sales/${saleId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason: 'Operator cancellation request' })
    });
    await loadSales();
  };

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <DataTable
        headers={['Sale #', 'Status', 'Total', 'Paid', 'Cashier', 'Completed', 'Actions']}
        rows={sales.map((sale) => [
          sale.saleNumber,
          sale.status,
          `$${Number(sale.totalAmount).toFixed(2)}`,
          `$${Number(sale.paidAmount).toFixed(2)}`,
          `${sale.cashier?.firstName ?? ''} ${sale.cashier?.lastName ?? ''}`.trim() || '-',
          new Date(sale.completedAt).toLocaleString(),
          <div key={`${sale.id}-actions`} className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={sale.status !== 'COMPLETED'}
              onClick={() => refund(sale.id)}
            >
              Refund
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={sale.status !== 'COMPLETED'}
              onClick={() => cancel(sale.id)}
            >
              Cancel
            </Button>
          </div>
        ])}
      />
    </div>
  );
}

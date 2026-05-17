'use client';

import { useEffect, useMemo, useState } from 'react';
import { RecentBills } from '@/components/pos/recent-bills';
import { ReceiptPrintContext } from '@/components/pos/receipt-print';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/api/client';
import { useSessionStore } from '@/lib/stores/use-session-store';
import { PosSale, PosSettings } from '@/lib/types';
import { formatCurrency, resolveCurrencyCode } from '@/lib/utils/currency';

function categoryLabel(category?: { name: string; parent?: { name: string } | null } | null) {
  if (!category) {
    return null;
  }
  if (category.parent?.name) {
    return `${category.parent.name} > ${category.name}`;
  }
  return category.name;
}

function normalizeSale(sale: PosSale): PosSale {
  return {
    ...sale,
    billType: sale.billType ?? 'SALE',
    vatMode: sale.vatMode ?? (Number(sale.taxAmount || 0) > 0 ? 'WITH_VAT' : 'WITHOUT_VAT'),
    partyName: sale.partyName ?? sale.customerName ?? null,
    partyPhone: sale.partyPhone ?? sale.customerPhone ?? null,
    partyPercent: sale.partyPercent ?? '0',
    partyAmount: sale.partyAmount ?? '0',
    items: sale.items.map((item) => ({
      ...item,
      categoryName: item.categoryName ?? categoryLabel(item.product?.category) ?? null,
      hsCode: item.hsCode ?? item.product?.hsCode ?? null,
      ioLabel: item.ioLabel ?? 'OUT'
    }))
  };
}

function readReceiptConfigValue(
  config: PosSettings['receiptConfig'] | undefined | null,
  key: 'contactPhone' | 'contactEmail' | 'contactAddress' | 'headerNote'
) {
  const value = config?.[key];
  return typeof value === 'string' ? value : undefined;
}

export default function BillingsPage() {
  const sessionUser = useSessionStore((state) => state.user);
  const [bills, setBills] = useState<PosSale[]>([]);
  const [settings, setSettings] = useState<PosSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const receiptContext = useMemo<ReceiptPrintContext>(
    () => ({
      businessName: settings?.businessName || sessionUser?.tenantName || 'POS Cloud',
      currency: resolveCurrencyCode(settings?.currency),
      receiptFooter: settings?.receiptFooter || undefined,
      logoUrl: settings?.logoUrl || undefined,
      contactPhone: readReceiptConfigValue(settings?.receiptConfig, 'contactPhone'),
      contactEmail: readReceiptConfigValue(settings?.receiptConfig, 'contactEmail'),
      contactAddress: readReceiptConfigValue(settings?.receiptConfig, 'contactAddress'),
      headerNote: readReceiptConfigValue(settings?.receiptConfig, 'headerNote'),
      timezone: settings?.timezone || undefined,
      cashierName: `${sessionUser?.firstName ?? ''} ${sessionUser?.lastName ?? ''}`.trim() || undefined
    }),
    [sessionUser?.firstName, sessionUser?.lastName, sessionUser?.tenantName, settings]
  );

  const totalBilled = useMemo(
    () => bills.reduce((sum, bill) => sum + Number(bill.totalAmount || 0), 0),
    [bills]
  );
  const completedCount = useMemo(
    () => bills.filter((bill) => bill.status === 'COMPLETED').length,
    [bills]
  );
  const refundedCount = useMemo(() => bills.filter((bill) => bill.status === 'REFUNDED').length, [bills]);

  const loadBills = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await apiRequest<PosSale[]>('/sales?take=150');
      setBills(rows.map(normalizeSale));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await apiRequest<PosSettings>('/settings');
      setSettings(data);
    } catch {
      // Use fallback values in receipt context when settings are unavailable.
    }
  };

  useEffect(() => {
    void Promise.all([loadBills(), loadSettings()]);
  }, []);

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Billing Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Total Bills</p>
              <p className="text-lg font-semibold">{bills.length}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Completed Bills</p>
              <p className="text-lg font-semibold">{completedCount}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Total Billed Amount</p>
              <p className="text-lg font-semibold">{formatCurrency(totalBilled, receiptContext.currency)}</p>
            </div>
            <div className="rounded-md border bg-background p-3 sm:col-span-3">
              <p className="text-xs text-muted-foreground">Refunded Bills</p>
              <p className="text-lg font-semibold">{refundedCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <RecentBills bills={bills} loading={loading} onReload={loadBills} receiptContext={receiptContext} />
    </div>
  );
}

'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/layout/data-table';
import { apiRequest } from '@/lib/api/client';

type Product = {
  id: string;
  name: string;
  sku: string;
};

type InventoryLog = {
  id: string;
  action: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  createdAt: string;
  product: Product;
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [form, setForm] = useState({ productId: '', action: 'STOCK_IN', quantity: 1, reason: '' });
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [productRows, logRows] = await Promise.all([
        apiRequest<Product[]>('/products'),
        apiRequest<InventoryLog[]>('/inventory/logs')
      ]);
      setProducts(productRows);
      setLogs(logRows);
      if (!form.productId && productRows.length) {
        setForm((state) => ({ ...state, productId: productRows[0].id }));
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load inventory data');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submitAdjustment = async (event: FormEvent) => {
    event.preventDefault();

    await apiRequest('/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify({
        productId: form.productId,
        action: form.action,
        quantity: form.quantity,
        reason: form.reason || undefined
      })
    });

    setForm((state) => ({ ...state, quantity: 1, reason: '' }));
    await load();
  };

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Stock Adjustment</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={submitAdjustment}>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.productId}
              onChange={(event) => setForm((state) => ({ ...state, productId: event.target.value }))}
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.action}
              onChange={(event) =>
                setForm((state) => ({ ...state, action: event.target.value as 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' }))
              }
            >
              <option value="STOCK_IN">Stock In</option>
              <option value="STOCK_OUT">Stock Out</option>
              <option value="ADJUSTMENT">Set Exact Qty</option>
            </select>

            <Input
              type="number"
              min={1}
              value={form.quantity}
              onChange={(event) => setForm((state) => ({ ...state, quantity: Number(event.target.value || 1) }))}
            />

            <Input
              placeholder="Reason"
              value={form.reason}
              onChange={(event) => setForm((state) => ({ ...state, reason: event.target.value }))}
            />

            <Button className="md:col-span-4">Apply Adjustment</Button>
          </form>
        </CardContent>
      </Card>

      <DataTable
        headers={['When', 'Product', 'Action', 'Qty', 'Previous', 'New', 'Reason']}
        rows={logs.map((log) => [
          new Date(log.createdAt).toLocaleString(),
          `${log.product.name} (${log.product.sku})`,
          log.action,
          log.quantity,
          log.previousQuantity,
          log.newQuantity,
          log.reason ?? '-'
        ])}
      />
    </div>
  );
}

'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/layout/data-table';
import { apiRequest } from '@/lib/api/client';
import { Product } from '@/lib/types';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    sku: '',
    price: 0,
    costPrice: 0,
    stockQuantity: 0,
    lowStockThreshold: 10
  });

  const loadProducts = async () => {
    try {
      const data = await apiRequest<Product[]>('/products');
      setProducts(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load products');
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const createProduct = async (event: FormEvent) => {
    event.preventDefault();

    await apiRequest('/products', {
      method: 'POST',
      body: JSON.stringify(form)
    });

    setForm({
      name: '',
      sku: '',
      price: 0,
      costPrice: 0,
      stockQuantity: 0,
      lowStockThreshold: 10
    });
    await loadProducts();
  };

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Create Product</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={createProduct}>
            <Input
              placeholder="Product name"
              value={form.name}
              onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
              required
            />
            <Input
              placeholder="SKU"
              value={form.sku}
              onChange={(event) => setForm((state) => ({ ...state, sku: event.target.value }))}
              required
            />
            <Input
              type="number"
              placeholder="Price"
              value={form.price || ''}
              onChange={(event) => setForm((state) => ({ ...state, price: Number(event.target.value || 0) }))}
              required
            />
            <Input
              type="number"
              placeholder="Cost price"
              value={form.costPrice || ''}
              onChange={(event) =>
                setForm((state) => ({ ...state, costPrice: Number(event.target.value || 0) }))
              }
              required
            />
            <Input
              type="number"
              placeholder="Opening stock"
              value={form.stockQuantity || ''}
              onChange={(event) =>
                setForm((state) => ({ ...state, stockQuantity: Number(event.target.value || 0) }))
              }
            />
            <Input
              type="number"
              placeholder="Low stock threshold"
              value={form.lowStockThreshold || ''}
              onChange={(event) =>
                setForm((state) => ({ ...state, lowStockThreshold: Number(event.target.value || 0) }))
              }
            />
            <Button className="md:col-span-3">Add Product</Button>
          </form>
        </CardContent>
      </Card>

      <DataTable
        headers={['Name', 'SKU', 'Price', 'Stock', 'Threshold', 'Status']}
        rows={products.map((product) => [
          product.name,
          product.sku,
          `$${Number(product.price).toFixed(2)}`,
          product.stockQuantity,
          product.lowStockThreshold,
          product.status
        ])}
      />
    </div>
  );
}

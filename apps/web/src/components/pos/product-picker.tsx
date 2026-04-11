'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Product } from '@/lib/types';

export function ProductPicker({
  products,
  search,
  onSearchChange,
  onAdd
}: {
  products: Product[];
  search: string;
  onSearchChange: (value: string) => void;
  onAdd: (product: Product) => void;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-4 flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name, SKU, barcode"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <button
            key={product.id}
            type="button"
            className="rounded-lg border bg-background p-3 text-left transition hover:border-primary"
            onClick={() => onAdd(product)}
          >
            <p className="font-semibold">{product.name}</p>
            <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
            <p className="mt-2 text-sm font-medium">${Number(product.price).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Stock: {product.stockQuantity}</p>
          </button>
        ))}
      </div>

      {!products.length ? (
        <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
          No products found for the selected filters.
        </div>
      ) : null}

      <div className="mt-4 text-xs text-muted-foreground">
        Barcode scanner integration can be attached by binding scanner input events to the same add flow.
      </div>

      <Button className="mt-3" variant="outline" size="sm">
        Barcode Placeholder Ready
      </Button>
    </div>
  );
}

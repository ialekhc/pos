'use client';

import { useEffect, useMemo, useState } from 'react';
import { ProductPicker } from '@/components/pos/product-picker';
import { CartPanel } from '@/components/pos/cart-panel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOfflineCart } from '@/hooks/use-offline-cart';
import { apiRequest } from '@/lib/api/client';
import { Product } from '@/lib/types';

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [checkoutAmount, setCheckoutAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const {
    currentCart,
    heldCarts,
    addItem,
    updateQuantity,
    removeItem,
    clear,
    holdCart,
    resumeHold,
    clearHold,
    subtotal,
    tax,
    total
  } = useOfflineCart();

  const filteredProducts = useMemo(() => {
    if (!search) {
      return products;
    }

    const query = search.toLowerCase();
    return products.filter((product) =>
      [product.name, product.sku, product.barcode ?? ''].some((field) => field.toLowerCase().includes(query))
    );
  }, [products, search]);

  const loadProducts = async () => {
    try {
      const rows = await apiRequest<Product[]>('/products');
      setProducts(rows);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load products');
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const checkout = async () => {
    if (!currentCart.length) {
      setError('Add at least one item before checkout.');
      return;
    }

    const paid = checkoutAmount || total;

    try {
      await apiRequest('/sales', {
        method: 'POST',
        body: JSON.stringify({
          items: currentCart.map((line) => ({
            productId: line.productId,
            quantity: line.quantity
          })),
          payments: [
            {
              method: 'CASH',
              amount: paid
            }
          ],
          taxAmount: tax,
          discountAmount: 0
        })
      });

      setMessage('Sale completed and synced.');
      setError(null);
      setCheckoutAmount(0);
      clear();
      await loadProducts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Checkout failed');
      setMessage(null);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
      <div className="space-y-4">
        <ProductPicker
          products={filteredProducts}
          search={search}
          onSearchChange={setSearch}
          onAdd={(product) =>
            addItem({
              productId: product.id,
              name: product.name,
              sku: product.sku,
              price: Number(product.price)
            })
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Held Carts (Offline-safe)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {heldCarts.map((draft) => (
              <div key={draft.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <div>
                  <p className="font-medium">{draft.name || 'Untitled Hold Cart'}</p>
                  <p className="text-xs text-muted-foreground">{new Date(draft.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => resumeHold(draft.id)}>
                    Resume
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => clearHold(draft.id)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            {!heldCarts.length ? <p className="text-sm text-muted-foreground">No held carts.</p> : null}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {error ? <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p> : null}
        {message ? <p className="rounded-md bg-primary/10 p-2 text-sm text-primary">{message}</p> : null}

        <CartPanel
          items={currentCart}
          subtotal={subtotal}
          tax={tax}
          total={total}
          onUpdateQuantity={updateQuantity}
          onRemove={removeItem}
          onClear={clear}
          onHold={() => holdCart('Counter Hold')}
          onCheckout={checkout}
          checkoutAmount={checkoutAmount}
          onCheckoutAmountChange={setCheckoutAmount}
        />
      </div>
    </div>
  );
}

'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type CartLine = {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
};

export function CartPanel({
  items,
  subtotal,
  tax,
  total,
  onUpdateQuantity,
  onRemove,
  onClear,
  onHold,
  onCheckout,
  checkoutAmount,
  onCheckoutAmountChange
}: {
  items: CartLine[];
  subtotal: number;
  tax: number;
  total: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onHold: () => void;
  onCheckout: () => void;
  checkoutAmount: number;
  onCheckoutAmountChange: (value: number) => void;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Current Cart</h3>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>

      <div className="max-h-[340px] space-y-3 overflow-y-auto pr-1">
        {items.map((item) => (
          <div key={item.productId} className="rounded-lg border bg-background p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.sku}</p>
              </div>
              <button type="button" onClick={() => onRemove(item.productId)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center text-sm">{item.quantity}</span>
                <Button variant="outline" size="sm" onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
            </div>
          </div>
        ))}

        {!items.length ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No items in cart. Add products from the catalog.
          </div>
        ) : null}
      </div>

      <div className="mt-4 space-y-2 border-t pt-4 text-sm">
        <div className="flex items-center justify-between">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Tax (5%)</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-base font-semibold">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Received Amount</label>
        <Input
          type="number"
          step="0.01"
          min={0}
          value={checkoutAmount || ''}
          onChange={(event) => onCheckoutAmountChange(Number(event.target.value || 0))}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onHold}>
          Hold
        </Button>
        <Button onClick={onCheckout}>Checkout</Button>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { ProductPicker } from '@/components/pos/product-picker';
import { CartPanel } from '@/components/pos/cart-panel';
import { BillingPanel } from '@/components/pos/billing-panel';
import { RecentBills } from '@/components/pos/recent-bills';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOfflineCart } from '@/hooks/use-offline-cart';
import { apiRequest } from '@/lib/api/client';
import { PaymentMethod, PosSale, Product, SalePaymentInput } from '@/lib/types';

const TAX_RATE = 0.05;

type PaymentLineDraft = {
  id: string;
  method: PaymentMethod;
  amount: number;
};

function createPaymentDraft(method: PaymentMethod = 'CASH'): PaymentLineDraft {
  return {
    id: crypto.randomUUID(),
    method,
    amount: 0
  };
}

function extractErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Request failed.';
  }

  const fallback = error.message || 'Request failed.';
  try {
    const parsed = JSON.parse(error.message) as {
      message?: string | string[];
      error?: string;
      statusCode?: number;
    };

    if (Array.isArray(parsed.message)) {
      return parsed.message.join(', ');
    }

    if (typeof parsed.message === 'string') {
      return parsed.message;
    }

    return fallback;
  } catch {
    return fallback;
  }
}

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [recentBills, setRecentBills] = useState<PosSale[]>([]);
  const [search, setSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [splitMode, setSplitMode] = useState(false);
  const [singlePaymentMethod, setSinglePaymentMethod] = useState<PaymentMethod>('CASH');
  const [singlePaymentAmount, setSinglePaymentAmount] = useState(0);
  const [splitPayments, setSplitPayments] = useState<PaymentLineDraft[]>([createPaymentDraft('CASH')]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingBills, setIsLoadingBills] = useState(false);
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
    subtotal
  } = useOfflineCart();

  const clampedDiscount = useMemo(
    () => Math.min(Math.max(discountAmount, 0), subtotal),
    [discountAmount, subtotal]
  );
  const taxableSubtotal = useMemo(() => Math.max(subtotal - clampedDiscount, 0), [clampedDiscount, subtotal]);
  const tax = useMemo(() => Number((taxableSubtotal * TAX_RATE).toFixed(2)), [taxableSubtotal]);
  const total = useMemo(() => Number((taxableSubtotal + tax).toFixed(2)), [tax, taxableSubtotal]);

  const checkoutPayments = useMemo<SalePaymentInput[]>(() => {
    if (splitMode) {
      return splitPayments
        .filter((line) => line.amount > 0)
        .map((line) => ({
          method: line.method,
          amount: Number(line.amount.toFixed(2))
        }));
    }

    const amount = singlePaymentAmount > 0 ? singlePaymentAmount : total;
    return [
      {
        method: singlePaymentMethod,
        amount: Number(amount.toFixed(2))
      }
    ];
  }, [singlePaymentAmount, singlePaymentMethod, splitMode, splitPayments, total]);

  const paidTotal = useMemo(
    () => Number(checkoutPayments.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2)),
    [checkoutPayments]
  );
  const balanceDue = useMemo(() => Number(Math.max(total - paidTotal, 0).toFixed(2)), [paidTotal, total]);
  const changeAmount = useMemo(() => Number(Math.max(paidTotal - total, 0).toFixed(2)), [paidTotal, total]);

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
      setError(extractErrorMessage(requestError));
    }
  };

  const loadRecentBills = async () => {
    setIsLoadingBills(true);
    try {
      const bills = await apiRequest<PosSale[]>('/sales?take=15');
      setRecentBills(bills);
    } catch (requestError) {
      setError(extractErrorMessage(requestError));
    } finally {
      setIsLoadingBills(false);
    }
  };

  useEffect(() => {
    void loadProducts();
    void loadRecentBills();
  }, []);

  const resetBillingState = () => {
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setDiscountAmount(0);
    setSplitMode(false);
    setSinglePaymentMethod('CASH');
    setSinglePaymentAmount(0);
    setSplitPayments([createPaymentDraft('CASH')]);
  };

  const checkout = async () => {
    if (!currentCart.length) {
      setError('Add at least one item before checkout.');
      return;
    }

    if (!checkoutPayments.length) {
      setError('Add at least one payment entry before checkout.');
      return;
    }

    if (balanceDue > 0) {
      setError(`Payment is short by $${balanceDue.toFixed(2)}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const sale = await apiRequest<PosSale>('/sales', {
        method: 'POST',
        body: JSON.stringify({
          items: currentCart.map((line) => ({
            productId: line.productId,
            quantity: line.quantity
          })),
          payments: checkoutPayments,
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          notes: notes.trim() || undefined,
          taxAmount: tax,
          discountAmount: clampedDiscount
        })
      });

      setMessage(`Bill ${sale.saleNumber} completed and synced.`);
      setError(null);
      clear();
      resetBillingState();
      await Promise.all([loadProducts(), loadRecentBills()]);
    } catch (requestError) {
      setError(extractErrorMessage(requestError));
      setMessage(null);
    } finally {
      setIsSubmitting(false);
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      resumeHold(draft.id);
                      setMessage(`Resumed cart: ${draft.name || 'Untitled Hold Cart'}.`);
                      setError(null);
                    }}
                  >
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
          onHold={() => {
            holdCart('Counter Hold');
            setMessage('Current cart moved to hold.');
            setError(null);
          }}
        />

        <BillingPanel
          customerName={customerName}
          customerPhone={customerPhone}
          notes={notes}
          onCustomerNameChange={setCustomerName}
          onCustomerPhoneChange={setCustomerPhone}
          onNotesChange={setNotes}
          discountAmount={discountAmount}
          onDiscountAmountChange={setDiscountAmount}
          subtotal={subtotal}
          tax={tax}
          total={total}
          splitMode={splitMode}
          onSplitModeChange={(value) => {
            setSplitMode(value);
            if (value && !splitPayments.length) {
              setSplitPayments([createPaymentDraft('CASH')]);
            }
          }}
          singlePaymentMethod={singlePaymentMethod}
          singlePaymentAmount={singlePaymentAmount}
          onSinglePaymentMethodChange={setSinglePaymentMethod}
          onSinglePaymentAmountChange={setSinglePaymentAmount}
          splitPayments={splitPayments}
          onAddSplitPayment={() =>
            setSplitPayments((current) => [...current, createPaymentDraft(singlePaymentMethod)])
          }
          onRemoveSplitPayment={(id) =>
            setSplitPayments((current) => {
              if (current.length === 1) {
                return current;
              }
              return current.filter((line) => line.id !== id);
            })
          }
          onSplitPaymentMethodChange={(id, method) =>
            setSplitPayments((current) =>
              current.map((line) => (line.id === id ? { ...line, method } : line))
            )
          }
          onSplitPaymentAmountChange={(id, amount) =>
            setSplitPayments((current) =>
              current.map((line) => (line.id === id ? { ...line, amount: Math.max(amount, 0) } : line))
            )
          }
          paidTotal={paidTotal}
          balanceDue={balanceDue}
          changeAmount={changeAmount}
          isSubmitting={isSubmitting}
          onCheckout={checkout}
        />

        <RecentBills bills={recentBills} loading={isLoadingBills} onReload={loadRecentBills} />
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { ProductPicker } from '@/components/pos/product-picker';
import { CartPanel } from '@/components/pos/cart-panel';
import { BillingPanel } from '@/components/pos/billing-panel';
import { RecentBills } from '@/components/pos/recent-bills';
import { CheckoutReceiptDialog } from '@/components/pos/checkout-receipt-dialog';
import { ReceiptPrintContext, printSaleReceipt } from '@/components/pos/receipt-print';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOfflineCart } from '@/hooks/use-offline-cart';
import { apiRequest } from '@/lib/api/client';
import { useSessionStore } from '@/lib/stores/use-session-store';
import { Party, PaymentMethod, PosSale, PosSettings, Product, SalePaymentInput } from '@/lib/types';

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

function sanitizeTaxRate(value: number | string | null | undefined) {
  const parsed = Number(value ?? 5);
  if (!Number.isFinite(parsed)) {
    return 5;
  }
  return Math.min(Math.max(parsed, 0), 100);
}

function createEstimateNumber() {
  return `EST-${Date.now().toString().slice(-8)}`;
}

function categoryLabel(category?: { name: string; parent?: { name: string } | null } | null) {
  if (!category) {
    return null;
  }
  if (category.parent?.name) {
    return `${category.parent.name} > ${category.name}`;
  }
  return category.name;
}

export default function PosPage() {
  const sessionUser = useSessionStore((state) => state.user);
  const [products, setProducts] = useState<Product[]>([]);
  const [recentBills, setRecentBills] = useState<PosSale[]>([]);
  const [settings, setSettings] = useState<PosSettings | null>(null);
  const [clientParties, setClientParties] = useState<Party[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [partyPercent, setPartyPercent] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [vatEnabled, setVatEnabled] = useState(true);
  const [splitMode, setSplitMode] = useState(false);
  const [singlePaymentMethod, setSinglePaymentMethod] = useState<PaymentMethod>('CASH');
  const [singlePaymentAmount, setSinglePaymentAmount] = useState(0);
  const [splitPayments, setSplitPayments] = useState<PaymentLineDraft[]>([createPaymentDraft('CASH')]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingBills, setIsLoadingBills] = useState(false);
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(true);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<PosSale | null>(null);
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

  const clampedManualDiscount = useMemo(
    () => Math.min(Math.max(discountAmount, 0), subtotal),
    [discountAmount, subtotal]
  );
  const partyDiscountAmount = useMemo(
    () => Number(((subtotal * Math.min(Math.max(partyPercent, 0), 100)) / 100).toFixed(2)),
    [partyPercent, subtotal]
  );
  const totalDiscount = useMemo(
    () => Number(Math.min(clampedManualDiscount + partyDiscountAmount, subtotal).toFixed(2)),
    [clampedManualDiscount, partyDiscountAmount, subtotal]
  );
  const taxRatePercent = useMemo(() => sanitizeTaxRate(settings?.taxRate), [settings?.taxRate]);
  const taxRateFactor = useMemo(() => taxRatePercent / 100, [taxRatePercent]);
  const taxableSubtotal = useMemo(() => Math.max(subtotal - totalDiscount, 0), [subtotal, totalDiscount]);
  const tax = useMemo(
    () => Number((vatEnabled ? taxableSubtotal * taxRateFactor : 0).toFixed(2)),
    [taxRateFactor, taxableSubtotal, vatEnabled]
  );
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
      [
        product.name,
        product.sku,
        product.barcode ?? '',
        product.hsCode ?? '',
        product.category?.name ?? '',
        product.category?.parent?.name ?? ''
      ].some((field) => field.toLowerCase().includes(query))
    );
  }, [products, search]);

  const selectedClientParty = useMemo(
    () => clientParties.find((party) => party.id === selectedPartyId) ?? null,
    [clientParties, selectedPartyId]
  );

  const receiptContext = useMemo<ReceiptPrintContext>(
    () => ({
      businessName: settings?.businessName || sessionUser?.tenantName || 'POS Cloud',
      currency: settings?.currency || 'USD',
      receiptFooter: settings?.receiptFooter || undefined,
      timezone: settings?.timezone || undefined,
      cashierName: `${sessionUser?.firstName ?? ''} ${sessionUser?.lastName ?? ''}`.trim() || undefined
    }),
    [sessionUser?.firstName, sessionUser?.lastName, sessionUser?.tenantName, settings]
  );

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
      setRecentBills(
        bills.map((sale) => ({
          ...sale,
          billType: sale.billType ?? 'SALE',
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
        }))
      );
    } catch (requestError) {
      setError(extractErrorMessage(requestError));
    } finally {
      setIsLoadingBills(false);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await apiRequest<PosSettings>('/settings');
      setSettings(data);
    } catch {
      // Receipt rendering falls back to tenant/session defaults if settings are unavailable.
    }
  };

  const loadClientParties = async () => {
    try {
      const parties = await apiRequest<Party[]>('/parties?type=CLIENT');
      setClientParties(parties);
    } catch {
      setClientParties([]);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('pos-auto-print-receipt');
      if (stored === 'false') {
        setAutoPrintReceipt(false);
      }
    }
    void loadProducts();
    void loadRecentBills();
    void loadSettings();
    void loadClientParties();
  }, []);

  const resetBillingState = () => {
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setDiscountAmount(0);
    setSelectedPartyId('');
    setPartyPercent(0);
    setSplitMode(false);
    setSinglePaymentMethod('CASH');
    setSinglePaymentAmount(0);
    setSplitPayments([createPaymentDraft('CASH')]);
  };

  const enrichSaleWithCartMetadata = (sale: PosSale) => {
    const cartByProductId = new Map(currentCart.map((item) => [item.productId, item]));
    return {
      ...sale,
      billType: sale.billType ?? 'SALE',
      partyName: sale.partyName ?? sale.customerName ?? null,
      partyPhone: sale.partyPhone ?? sale.customerPhone ?? null,
      partyPercent: sale.partyPercent ?? '0',
      partyAmount: sale.partyAmount ?? '0',
      items: sale.items.map((item) => {
        const cartLine = cartByProductId.get(item.productId);
        return {
          ...item,
          categoryName:
            item.categoryName ?? categoryLabel(item.product?.category) ?? cartLine?.categoryName ?? null,
          hsCode: item.hsCode ?? item.product?.hsCode ?? cartLine?.hsCode ?? null,
          ioLabel: item.ioLabel ?? 'OUT'
        };
      })
    };
  };

  const printEstimation = () => {
    if (!currentCart.length) {
      setError('Add at least one item before printing an estimation bill.');
      return;
    }

    const estimationItems = currentCart.map((line) => {
      const baseAmount = line.price * line.quantity;
      const weight = subtotal > 0 ? baseAmount / subtotal : 0;
      const lineDiscount = Number((totalDiscount * weight).toFixed(2));
      const lineTax = Number((tax * weight).toFixed(2));
      const lineTotal = Number((baseAmount - lineDiscount + lineTax).toFixed(2));

      return {
        id: `${line.productId}-estimate`,
        productId: line.productId,
        productName: line.name,
        sku: line.sku,
        categoryName: line.categoryName ?? null,
        hsCode: line.hsCode ?? null,
        ioLabel: 'ESTIMATE' as const,
        quantity: line.quantity,
        unitPrice: line.price.toFixed(2),
        discountAmount: lineDiscount.toFixed(2),
        taxAmount: lineTax.toFixed(2),
        lineTotal: lineTotal.toFixed(2)
      };
    });

    if (estimationItems.length) {
      const lastIndex = estimationItems.length - 1;
      const distributedDiscount = estimationItems.reduce(
        (sum, item) => sum + Number(item.discountAmount),
        0
      );
      const distributedTax = estimationItems.reduce((sum, item) => sum + Number(item.taxAmount), 0);
      const discountDelta = Number((totalDiscount - distributedDiscount).toFixed(2));
      const taxDelta = Number((tax - distributedTax).toFixed(2));

      if (discountDelta !== 0 || taxDelta !== 0) {
        const current = estimationItems[lastIndex];
        const baseAmount = Number(current.unitPrice) * current.quantity;
        const adjustedDiscount = Number((Number(current.discountAmount) + discountDelta).toFixed(2));
        const adjustedTax = Number((Number(current.taxAmount) + taxDelta).toFixed(2));
        const adjustedLineTotal = Number((baseAmount - adjustedDiscount + adjustedTax).toFixed(2));

        estimationItems[lastIndex] = {
          ...current,
          discountAmount: adjustedDiscount.toFixed(2),
          taxAmount: adjustedTax.toFixed(2),
          lineTotal: adjustedLineTotal.toFixed(2)
        };
      }
    }

    const nowIso = new Date().toISOString();
    const resolvedPartyName = customerName.trim() || selectedClientParty?.name || undefined;
    const resolvedPartyPhone = customerPhone.trim() || selectedClientParty?.phone || undefined;
    const estimateSale: PosSale = {
      id: `estimate-${Date.now()}`,
      saleNumber: createEstimateNumber(),
      billType: 'ESTIMATION',
      status: 'COMPLETED',
      source: 'POS',
      customerName: resolvedPartyName,
      customerPhone: resolvedPartyPhone,
      partyId: selectedPartyId || undefined,
      partyType: selectedPartyId ? 'CLIENT' : undefined,
      partyName: resolvedPartyName,
      partyPhone: resolvedPartyPhone,
      partyPercent: partyPercent.toFixed(2),
      subtotal: subtotal.toFixed(2),
      partyAmount: partyDiscountAmount.toFixed(2),
      discountAmount: totalDiscount.toFixed(2),
      taxAmount: tax.toFixed(2),
      totalAmount: total.toFixed(2),
      paidAmount: '0.00',
      changeAmount: '0.00',
      notes: notes.trim() || undefined,
      completedAt: nowIso,
      createdAt: nowIso,
      items: estimationItems,
      payments: [],
      cashier: {
        firstName: sessionUser?.firstName ?? undefined,
        lastName: sessionUser?.lastName ?? undefined
      }
    };

    setLastCompletedSale(estimateSale);
    setReceiptDialogOpen(true);
    printSaleReceipt(estimateSale, receiptContext, {
      billType: 'ESTIMATION',
      vatEnabled,
      ioLabel: 'ESTIMATE'
    });
    setMessage(`Estimation bill ${estimateSale.saleNumber} generated.`);
    setError(null);
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
      const resolvedPartyName = customerName.trim() || selectedClientParty?.name || undefined;
      const resolvedPartyPhone = customerPhone.trim() || selectedClientParty?.phone || undefined;
      const normalizedNotes = notes.trim();
      const composedNotes = [normalizedNotes, vatEnabled ? '' : 'WITHOUT_VAT_BILL']
        .filter(Boolean)
        .join(' | ');

      const sale = await apiRequest<PosSale>('/sales', {
        method: 'POST',
        body: JSON.stringify({
          items: currentCart.map((line) => ({
            productId: line.productId,
            quantity: line.quantity
          })),
          payments: checkoutPayments,
          customerName: resolvedPartyName,
          customerPhone: resolvedPartyPhone,
          partyId: selectedPartyId || undefined,
          partyType: selectedPartyId ? 'CLIENT' : undefined,
          partyName: resolvedPartyName,
          partyPhone: resolvedPartyPhone,
          partyPercent: Number(partyPercent.toFixed(2)),
          notes: composedNotes || undefined,
          taxAmount: tax,
          discountAmount: clampedManualDiscount
        })
      });

      const enrichedSale = enrichSaleWithCartMetadata({
        ...sale,
        billType: 'SALE'
      });

      setMessage(`Bill ${enrichedSale.saleNumber} completed and synced.`);
      setError(null);
      setLastCompletedSale(enrichedSale);
      setReceiptDialogOpen(true);
      if (autoPrintReceipt) {
        printSaleReceipt(enrichedSale, receiptContext, {
          billType: 'SALE',
          vatEnabled,
          ioLabel: 'OUT'
        });
      }
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
              categoryName: categoryLabel(product.category) ?? null,
              hsCode: product.hsCode ?? null,
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

        <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm">
          <p className="text-muted-foreground">Receipt printing</p>
          <Button
            type="button"
            size="sm"
            variant={autoPrintReceipt ? 'default' : 'outline'}
            onClick={() => {
              const next = !autoPrintReceipt;
              setAutoPrintReceipt(next);
              if (typeof window !== 'undefined') {
                window.localStorage.setItem('pos-auto-print-receipt', String(next));
              }
            }}
          >
            {autoPrintReceipt ? 'Auto Print On' : 'Auto Print Off'}
          </Button>
        </div>

        <CartPanel
          items={currentCart}
          subtotal={subtotal}
          tax={tax}
          total={total}
          taxLabel={vatEnabled ? `VAT (${taxRatePercent.toFixed(2)}%)` : 'VAT (Disabled)'}
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
          clientParties={clientParties}
          selectedPartyId={selectedPartyId}
          onSelectedPartyIdChange={(partyId) => {
            setSelectedPartyId(partyId);
            const selected = clientParties.find((party) => party.id === partyId);
            if (selected) {
              setPartyPercent(Number(selected.defaultPercent || 0));
              if (!customerName.trim()) {
                setCustomerName(selected.name);
              }
              if (!customerPhone.trim() && selected.phone) {
                setCustomerPhone(selected.phone);
              }
            } else {
              setPartyPercent(0);
            }
          }}
          partyPercent={partyPercent}
          onPartyPercentChange={setPartyPercent}
          customerName={customerName}
          customerPhone={customerPhone}
          notes={notes}
          onCustomerNameChange={setCustomerName}
          onCustomerPhoneChange={setCustomerPhone}
          onNotesChange={setNotes}
          discountAmount={discountAmount}
          onDiscountAmountChange={setDiscountAmount}
          vatEnabled={vatEnabled}
          onVatEnabledChange={setVatEnabled}
          taxRatePercent={taxRatePercent}
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
          onPrintEstimation={printEstimation}
          canPrintEstimation={currentCart.length > 0}
        />

        <RecentBills
          bills={recentBills}
          loading={isLoadingBills}
          onReload={loadRecentBills}
          receiptContext={receiptContext}
        />
      </div>

      <CheckoutReceiptDialog
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
        sale={lastCompletedSale}
        printContext={receiptContext}
      />
    </div>
  );
}

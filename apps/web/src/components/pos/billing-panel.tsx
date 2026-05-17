'use client';

import { Plus, ReceiptText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Party, PaymentMethod, VatMode } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/currency';

type PaymentLineDraft = {
  id: string;
  method: PaymentMethod;
  amount: number;
};

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'QR', 'WALLET', 'MANUAL'];

export function BillingPanel({
  clientParties,
  selectedPartyId,
  onSelectedPartyIdChange,
  partyPercent,
  onPartyPercentChange,
  customerName,
  customerPhone,
  notes,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onNotesChange,
  discountAmount,
  onDiscountAmountChange,
  vatMode,
  onVatModeChange,
  taxRatePercent,
  subtotal,
  tax,
  total,
  currencyCode,
  splitMode,
  onSplitModeChange,
  singlePaymentMethod,
  singlePaymentAmount,
  onSinglePaymentMethodChange,
  onSinglePaymentAmountChange,
  splitPayments,
  onAddSplitPayment,
  onRemoveSplitPayment,
  onSplitPaymentMethodChange,
  onSplitPaymentAmountChange,
  paidTotal,
  balanceDue,
  changeAmount,
  isSubmitting,
  onCheckout,
  onPrintEstimation,
  canPrintEstimation
}: {
  clientParties: Party[];
  selectedPartyId: string;
  onSelectedPartyIdChange: (value: string) => void;
  partyPercent: number;
  onPartyPercentChange: (value: number) => void;
  customerName: string;
  customerPhone: string;
  notes: string;
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  discountAmount: number;
  onDiscountAmountChange: (value: number) => void;
  vatMode: VatMode;
  onVatModeChange: (value: VatMode) => void;
  taxRatePercent: number;
  subtotal: number;
  tax: number;
  total: number;
  currencyCode?: string;
  splitMode: boolean;
  onSplitModeChange: (value: boolean) => void;
  singlePaymentMethod: PaymentMethod;
  singlePaymentAmount: number;
  onSinglePaymentMethodChange: (value: PaymentMethod) => void;
  onSinglePaymentAmountChange: (value: number) => void;
  splitPayments: PaymentLineDraft[];
  onAddSplitPayment: () => void;
  onRemoveSplitPayment: (id: string) => void;
  onSplitPaymentMethodChange: (id: string, method: PaymentMethod) => void;
  onSplitPaymentAmountChange: (id: string, amount: number) => void;
  paidTotal: number;
  balanceDue: number;
  changeAmount: number;
  isSubmitting: boolean;
  onCheckout: () => void;
  onPrintEstimation: () => void;
  canPrintEstimation: boolean;
}) {
  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Billing</h3>
        <Badge variant="outline" className="gap-1">
          <ReceiptText className="h-3 w-3" />
          POS Bill
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Client (Optional)</label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={selectedPartyId}
            onChange={(event) => onSelectedPartyIdChange(event.target.value)}
          >
            <option value="">Walk-in / Manual client</option>
            {clientParties.map((party) => (
              <option key={party.id} value={party.id}>
                {party.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Client Percent (%)</label>
          <Input
            type="number"
            step="0.01"
            min={0}
            max={100}
            value={partyPercent || ''}
            onChange={(event) => onPartyPercentChange(Number(event.target.value || 0))}
          />
          <p className="text-[11px] text-muted-foreground">
            This percentage is applied automatically for the selected client on each bill.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Client Name (Optional)</label>
          <Input value={customerName} onChange={(event) => onCustomerNameChange(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Client Phone (Optional)</label>
          <Input value={customerPhone} onChange={(event) => onCustomerPhoneChange(event.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Billing Note (Optional)</label>
        <Textarea
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          rows={2}
          placeholder="Optional note shown in bill record"
        />
      </div>

      <div className="space-y-2 border-y py-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Additional Discount Amount</label>
          <Input
            type="number"
            step="0.01"
            min={0}
            max={subtotal}
            value={discountAmount || ''}
            onChange={(event) => onDiscountAmountChange(Number(event.target.value || 0))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">VAT Mode</label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              variant={vatMode === 'WITH_VAT' ? 'default' : 'outline'}
              onClick={() => onVatModeChange('WITH_VAT')}
            >
              With VAT (13%)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={vatMode === 'WITHOUT_VAT' ? 'default' : 'outline'}
              onClick={() => onVatModeChange('WITHOUT_VAT')}
            >
              Without VAT
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            The selected mode is printed clearly on the final bill.
          </p>
        </div>

        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal, currencyCode)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>{vatMode === 'WITH_VAT' ? `VAT (${taxRatePercent.toFixed(2)}%)` : 'VAT'}</span>
            <span>{vatMode === 'WITH_VAT' ? formatCurrency(tax, currencyCode) : 'Not Applied'}</span>
          </div>
          <div className="flex items-center justify-between text-base font-semibold">
            <span>Bill Total</span>
            <span>{formatCurrency(total, currencyCode)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Payment Entry</label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="sm"
            variant={splitMode ? 'outline' : 'default'}
            onClick={() => onSplitModeChange(false)}
          >
            Single Payment
          </Button>
          <Button
            type="button"
            size="sm"
            variant={splitMode ? 'default' : 'outline'}
            onClick={() => onSplitModeChange(true)}
          >
            Split Payment
          </Button>
        </div>
      </div>

      {!splitMode ? (
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Method</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={singlePaymentMethod}
              onChange={(event) => onSinglePaymentMethodChange(event.target.value as PaymentMethod)}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Received Amount</label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={singlePaymentAmount || ''}
              onChange={(event) => onSinglePaymentAmountChange(Number(event.target.value || 0))}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2 rounded-md border bg-background p-3">
          {splitPayments.map((payment, index) => (
            <div key={payment.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={payment.method}
                onChange={(event) =>
                  onSplitPaymentMethodChange(payment.id, event.target.value as PaymentMethod)
                }
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={payment.amount || ''}
                onChange={(event) => onSplitPaymentAmountChange(payment.id, Number(event.target.value || 0))}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={splitPayments.length === 1}
                onClick={() => onRemoveSplitPayment(payment.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={onAddSplitPayment}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Payment Line
          </Button>
        </div>
      )}

      <div className="grid gap-2 rounded-md border bg-background p-3 text-sm">
        <div className="flex items-center justify-between">
          <span>Paid</span>
          <span>{formatCurrency(paidTotal, currencyCode)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Balance Due</span>
          <span className={balanceDue > 0 ? 'font-medium text-destructive' : ''}>
            {formatCurrency(balanceDue, currencyCode)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Change</span>
          <span>{formatCurrency(changeAmount, currencyCode)}</span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          className="w-full"
          variant="outline"
          onClick={onPrintEstimation}
          disabled={!canPrintEstimation || isSubmitting}
        >
          Print Estimation Bill
        </Button>
        <Button className="w-full" onClick={onCheckout} disabled={isSubmitting}>
          {isSubmitting ? 'Completing Sale...' : 'Generate Bill & Complete Sale'}
        </Button>
      </div>
    </div>
  );
}

'use client';

import { Printer, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { PosSale } from '@/lib/types';
import { ReceiptPrintContext, printSaleReceipt } from './receipt-print';

function toMoney(amount: string | number, currency: string) {
  const numeric = Number(amount || 0);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency
    }).format(numeric);
  } catch {
    return `$${numeric.toFixed(2)}`;
  }
}

export function CheckoutReceiptDialog({
  open,
  onOpenChange,
  sale,
  printContext
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  sale: PosSale | null;
  printContext: ReceiptPrintContext;
}) {
  const print = () => {
    if (!sale) {
      return;
    }
    printSaleReceipt(sale, printContext);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Receipt Ready</DialogTitle>
        </DialogHeader>

        {sale ? (
          <div className="space-y-4 text-sm">
            <div className="grid gap-2 rounded-md border bg-background p-3 sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Bill:</span> {sale.saleNumber}
              </p>
              <p>
                <span className="text-muted-foreground">Status:</span> {sale.status}
              </p>
              <p>
                <span className="text-muted-foreground">Customer:</span> {sale.customerName || '-'}
              </p>
              <p>
                <span className="text-muted-foreground">Phone:</span> {sale.customerPhone || '-'}
              </p>
              <p>
                <span className="text-muted-foreground">Total:</span>{' '}
                {toMoney(sale.totalAmount, printContext.currency)}
              </p>
              <p>
                <span className="text-muted-foreground">Paid:</span>{' '}
                {toMoney(sale.paidAmount, printContext.currency)}
              </p>
            </div>

            <div className="max-h-56 overflow-y-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2">{item.productName}</td>
                      <td className="px-3 py-2">{item.quantity}</td>
                      <td className="px-3 py-2">{toMoney(item.lineTotal, printContext.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <XCircle className="mr-2 h-4 w-4" />
                Close
              </Button>
              <Button onClick={print}>
                <Printer className="mr-2 h-4 w-4" />
                Print Receipt
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No receipt data available.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Printer, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { PosSale } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/currency';
import { ReceiptPrintContext, printSaleReceipt } from './receipt-print';

function categoryLabel(category?: { name: string; parent?: { name: string } | null } | null) {
  if (!category) {
    return '-';
  }
  if (category.parent?.name) {
    return `${category.parent.name} > ${category.name}`;
  }
  return category.name;
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
  const [printError, setPrintError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPrintError(null);
    }
  }, [open, sale?.id]);

  const print = async () => {
    if (!sale) {
      return;
    }
    setPrintError(null);
    const printed = await printSaleReceipt(sale, printContext);
    if (!printed) {
      setPrintError('Unable to open the print dialog. Please allow popups/print permission and try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{sale?.billType === 'ESTIMATION' ? 'Estimation Bill Ready' : 'Main Bill Ready'}</DialogTitle>
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
                <span className="text-muted-foreground">Party:</span>{' '}
                {sale.partyName || sale.customerName || '-'}
              </p>
              <p>
                <span className="text-muted-foreground">Phone:</span>{' '}
                {sale.partyPhone || sale.customerPhone || '-'}
              </p>
              <p>
                <span className="text-muted-foreground">Party Type:</span> {sale.partyType || 'CLIENT'}
              </p>
              <p>
                <span className="text-muted-foreground">Party %:</span>{' '}
                {Number(sale.partyPercent || 0).toFixed(2)}%
              </p>
              <p>
                <span className="text-muted-foreground">Party Amount:</span>{' '}
                {formatCurrency(sale.partyAmount || 0, printContext.currency)}
              </p>
              <p>
                <span className="text-muted-foreground">Total:</span>{' '}
                {formatCurrency(sale.totalAmount, printContext.currency)}
              </p>
              <p>
                <span className="text-muted-foreground">Paid:</span>{' '}
                {formatCurrency(sale.paidAmount, printContext.currency)}
              </p>
            </div>

            <div className="max-h-56 overflow-y-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">I/O</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2">
                        <div>{item.productName}</div>
                        <div className="text-xs text-muted-foreground">
                          Category: {item.categoryName ?? categoryLabel(item.product?.category)} | HS:{' '}
                          {item.hsCode ?? item.product?.hsCode ?? '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2">{item.ioLabel ?? (sale.billType === 'ESTIMATION' ? 'ESTIMATE' : 'OUT')}</td>
                      <td className="px-3 py-2">{item.quantity}</td>
                      <td className="px-3 py-2">{formatCurrency(item.lineTotal, printContext.currency)}</td>
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
            {printError ? <p className="text-sm text-destructive">{printError}</p> : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No receipt data available.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

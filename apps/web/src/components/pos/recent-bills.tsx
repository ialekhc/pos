'use client';

import { useMemo, useState } from 'react';
import { Eye, Printer, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { PosSale } from '@/lib/types';
import { ReceiptPrintContext, printSaleReceipt } from './receipt-print';

function currency(value: string | number) {
  return `$${Number(value).toFixed(2)}`;
}

export function RecentBills({
  bills,
  loading,
  onReload,
  receiptContext
}: {
  bills: PosSale[];
  loading: boolean;
  onReload: () => void;
  receiptContext: ReceiptPrintContext;
}) {
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);

  const selectedBill = useMemo(
    () => bills.find((bill) => bill.id === selectedBillId) ?? null,
    [bills, selectedBillId]
  );

  const printBill = () => {
    if (!selectedBill) {
      return;
    }
    printSaleReceipt(selectedBill, receiptContext);
  };

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Recent Bills</h3>
        <Button variant="outline" size="sm" onClick={onReload} disabled={loading}>
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
        {bills.map((bill) => (
          <div key={bill.id} className="flex items-center justify-between rounded-md border bg-background p-2">
            <div>
              <p className="text-sm font-medium">{bill.saleNumber}</p>
              <p className="text-xs text-muted-foreground">{new Date(bill.completedAt).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{currency(bill.totalAmount)}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => printSaleReceipt(bill, receiptContext)}
              >
                <Printer className="h-3.5 w-3.5" />
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedBillId(bill.id)}
                  >
                    <Eye className="mr-1 h-3.5 w-3.5" />
                    View
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Bill {selectedBill?.saleNumber}</DialogTitle>
                  </DialogHeader>

                  {selectedBill ? (
                    <div className="space-y-4 text-sm">
                      <div className="grid gap-2 rounded-md border bg-background p-3 sm:grid-cols-2">
                        <p>Customer: {selectedBill.customerName || '-'}</p>
                        <p>Phone: {selectedBill.customerPhone || '-'}</p>
                        <p>Status: {selectedBill.status}</p>
                        <p>Completed: {new Date(selectedBill.completedAt).toLocaleString()}</p>
                      </div>

                      <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-muted/60">
                            <tr>
                              <th className="px-3 py-2">Item</th>
                              <th className="px-3 py-2">Qty</th>
                              <th className="px-3 py-2">Rate</th>
                              <th className="px-3 py-2">Line Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedBill.items.map((item) => (
                              <tr key={item.id} className="border-t">
                                <td className="px-3 py-2">{item.productName}</td>
                                <td className="px-3 py-2">{item.quantity}</td>
                                <td className="px-3 py-2">{currency(item.unitPrice)}</td>
                                <td className="px-3 py-2">{currency(item.lineTotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="grid gap-2 rounded-md border bg-background p-3 sm:grid-cols-2">
                        <p>Subtotal: {currency(selectedBill.subtotal)}</p>
                        <p>Discount: {currency(selectedBill.discountAmount)}</p>
                        <p>Tax: {currency(selectedBill.taxAmount)}</p>
                        <p>Total: {currency(selectedBill.totalAmount)}</p>
                        <p>Paid: {currency(selectedBill.paidAmount)}</p>
                        <p>Change: {currency(selectedBill.changeAmount)}</p>
                      </div>

                      <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-muted/60">
                            <tr>
                              <th className="px-3 py-2">Method</th>
                              <th className="px-3 py-2">Status</th>
                              <th className="px-3 py-2">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedBill.payments.map((payment) => (
                              <tr key={payment.id} className="border-t">
                                <td className="px-3 py-2">{payment.method}</td>
                                <td className="px-3 py-2">{payment.status}</td>
                                <td className="px-3 py-2">{currency(payment.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={printBill}>Print Bill</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Bill details unavailable.</p>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ))}

        {!bills.length ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No recent bills yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}

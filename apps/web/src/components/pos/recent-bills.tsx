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
import { Input } from '@/components/ui/input';
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
  const [printError, setPrintError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PosSale['status']>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const selectedBill = useMemo(
    () => bills.find((bill) => bill.id === selectedBillId) ?? null,
    [bills, selectedBillId]
  );

  const filteredBills = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bills.filter((bill) => {
      if (statusFilter !== 'ALL' && bill.status !== statusFilter) {
        return false;
      }

      const completedAt = new Date(bill.completedAt);

      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (completedAt.getTime() < from.getTime()) {
          return false;
        }
      }

      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (completedAt.getTime() > to.getTime()) {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      const partyName = bill.partyName || bill.customerName || '';
      return [bill.saleNumber, partyName, bill.status].some((value) =>
        value.toLowerCase().includes(query)
      );
    });
  }, [bills, dateFrom, dateTo, search, statusFilter]);

  const printBill = async (bill?: PosSale | null) => {
    const targetBill = bill ?? selectedBill;
    if (!targetBill) {
      return;
    }

    setPrintError(null);
    const printed = await printSaleReceipt(targetBill, receiptContext);
    if (!printed) {
      setPrintError('Unable to open the print dialog. Please allow popups/print permission and retry.');
    }
  };

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Previous Bills History</h3>
          <p className="text-xs text-muted-foreground">
            Showing {filteredBills.length} of {bills.length} bills
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onReload} disabled={loading}>
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Search</label>
          <Input
            placeholder="Bill #, party, status"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'ALL' | PosSale['status'])}
          >
            <option value="ALL">All</option>
            <option value="COMPLETED">Completed</option>
            <option value="REFUNDED">Refunded</option>
            <option value="CANCELED">Canceled</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">From Date</label>
          <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">To Date</label>
          <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </div>
      </div>

      {printError ? <p className="text-sm text-destructive">{printError}</p> : null}

      <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
        {filteredBills.map((bill) => (
          <div key={bill.id} className="rounded-md border bg-background p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{bill.saleNumber}</p>
                <p className="text-xs text-muted-foreground">{new Date(bill.completedAt).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  Party: {bill.partyName || bill.customerName || '-'} | Status: {bill.status}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{formatCurrency(bill.totalAmount, receiptContext.currency)}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void printBill(bill);
                  }}
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
                          <p>Party: {selectedBill.partyName || selectedBill.customerName || '-'}</p>
                          <p>Phone: {selectedBill.partyPhone || selectedBill.customerPhone || '-'}</p>
                          <p>Party Type: {selectedBill.partyType || 'CLIENT'}</p>
                          <p>Party %: {Number(selectedBill.partyPercent || 0).toFixed(2)}%</p>
                          <p>Status: {selectedBill.status}</p>
                          <p>Completed: {new Date(selectedBill.completedAt).toLocaleString()}</p>
                        </div>

                        <div className="overflow-x-auto rounded-md border">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-muted/60">
                              <tr>
                                <th className="px-3 py-2">Item</th>
                                <th className="px-3 py-2">I/O</th>
                                <th className="px-3 py-2">Qty</th>
                                <th className="px-3 py-2">Rate</th>
                                <th className="px-3 py-2">Line Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedBill.items.map((item) => (
                                <tr key={item.id} className="border-t">
                                  <td className="px-3 py-2">
                                    <div>{item.productName}</div>
                                    <div className="text-xs text-muted-foreground">
                                      Category: {item.categoryName ?? categoryLabel(item.product?.category) ?? '-'} | HS:{' '}
                                      {item.hsCode ?? item.product?.hsCode ?? '-'}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2">{item.ioLabel ?? 'OUT'}</td>
                                  <td className="px-3 py-2">{item.quantity}</td>
                                  <td className="px-3 py-2">
                                    {formatCurrency(item.unitPrice, receiptContext.currency)}
                                  </td>
                                  <td className="px-3 py-2">
                                    {formatCurrency(item.lineTotal, receiptContext.currency)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="grid gap-2 rounded-md border bg-background p-3 sm:grid-cols-2">
                          <p>Subtotal: {formatCurrency(selectedBill.subtotal, receiptContext.currency)}</p>
                          <p>Total Discount: {formatCurrency(selectedBill.discountAmount, receiptContext.currency)}</p>
                          <p>Party Amount: {formatCurrency(selectedBill.partyAmount || 0, receiptContext.currency)}</p>
                          <p>VAT (13%): {formatCurrency(selectedBill.taxAmount, receiptContext.currency)}</p>
                          <p>Total: {formatCurrency(selectedBill.totalAmount, receiptContext.currency)}</p>
                          <p>Paid: {formatCurrency(selectedBill.paidAmount, receiptContext.currency)}</p>
                          <p>Change: {formatCurrency(selectedBill.changeAmount, receiptContext.currency)}</p>
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
                                  <td className="px-3 py-2">
                                    {formatCurrency(payment.amount, receiptContext.currency)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex justify-end">
                          <Button
                            onClick={() => {
                              void printBill();
                            }}
                          >
                            Print Bill
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Bill details unavailable.</p>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        ))}

        {!filteredBills.length ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No bills found for the selected filters.
          </div>
        ) : null}
      </div>
    </div>
  );
}

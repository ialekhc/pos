'use client';

import { PosSale } from '@/lib/types';

export type ReceiptPrintContext = {
  businessName: string;
  currency: string;
  receiptFooter?: string | null;
  timezone?: string | null;
  cashierName?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

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

export function printSaleReceipt(sale: PosSale, context: ReceiptPrintContext) {
  const rows = sale.items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.productName)}</td>
        <td>${item.quantity}</td>
        <td>${toMoney(item.unitPrice, context.currency)}</td>
        <td>${toMoney(item.lineTotal, context.currency)}</td>
      </tr>
    `
    )
    .join('');

  const paymentRows = sale.payments
    .map(
      (payment) => `
      <tr>
        <td>${payment.method}</td>
        <td>${payment.status}</td>
        <td>${toMoney(payment.amount, context.currency)}</td>
      </tr>
    `
    )
    .join('');

  const completedAt = new Date(sale.completedAt).toLocaleString(undefined, {
    timeZone: context.timezone || undefined
  });

  const opened = window.open('', '_blank', 'width=860,height=780');
  if (!opened) {
    return;
  }

  opened.document.write(`
    <html>
      <head>
        <title>Receipt ${escapeHtml(sale.saleNumber)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #111; line-height: 1.35; }
          h1 { margin: 0; font-size: 24px; }
          h2 { margin: 2px 0 14px; font-size: 14px; color: #555; font-weight: normal; }
          .meta { margin-bottom: 14px; font-size: 12px; color: #444; }
          .meta p { margin: 2px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; vertical-align: top; }
          th { background: #fafafa; }
          .totals { margin-top: 12px; width: 320px; margin-left: auto; border-collapse: collapse; }
          .totals td { border: none; padding: 4px 0; font-size: 13px; }
          .totals tr:last-child td { font-size: 16px; font-weight: bold; padding-top: 8px; }
          .footer { margin-top: 22px; border-top: 1px dashed #ccc; padding-top: 10px; font-size: 12px; color: #555; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(context.businessName || 'POS Receipt')}</h1>
        <h2>Receipt ${escapeHtml(sale.saleNumber)}</h2>

        <div class="meta">
          <p><strong>Completed:</strong> ${escapeHtml(completedAt)}</p>
          <p><strong>Status:</strong> ${escapeHtml(sale.status)}</p>
          <p><strong>Customer:</strong> ${escapeHtml(sale.customerName || '-')}</p>
          <p><strong>Phone:</strong> ${escapeHtml(sale.customerPhone || '-')}</p>
          <p><strong>Cashier:</strong> ${escapeHtml(context.cashierName || '-')}</p>
          <p><strong>Note:</strong> ${escapeHtml(sale.notes || '-')}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Line Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <table class="totals">
          <tbody>
            <tr><td>Subtotal</td><td>${toMoney(sale.subtotal, context.currency)}</td></tr>
            <tr><td>Discount</td><td>${toMoney(sale.discountAmount, context.currency)}</td></tr>
            <tr><td>Tax</td><td>${toMoney(sale.taxAmount, context.currency)}</td></tr>
            <tr><td>Total</td><td>${toMoney(sale.totalAmount, context.currency)}</td></tr>
            <tr><td>Paid</td><td>${toMoney(sale.paidAmount, context.currency)}</td></tr>
            <tr><td>Change</td><td>${toMoney(sale.changeAmount, context.currency)}</td></tr>
          </tbody>
        </table>

        <h3 style="margin-top: 24px; margin-bottom: 8px;">Payments</h3>
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th>Status</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${paymentRows || '<tr><td colspan="3">No payments</td></tr>'}
          </tbody>
        </table>

        ${context.receiptFooter ? `<div class="footer">${escapeHtml(context.receiptFooter)}</div>` : ''}
      </body>
    </html>
  `);

  opened.document.close();
  opened.focus();
  opened.print();
}

'use client';

import { PosSale, PosSaleItem } from '@/lib/types';
import { resolveCurrencyCode } from '@/lib/utils/currency';

export type ReceiptPrintContext = {
  businessName: string;
  currency: string;
  receiptFooter?: string | null;
  timezone?: string | null;
  cashierName?: string;
};

export type PrintBillOptions = {
  billType?: 'SALE' | 'ESTIMATION';
  vatEnabled?: boolean;
  ioLabel?: 'OUT' | 'IN' | 'ESTIMATE';
};

const TIMEZONE_ALIAS_MAP: Record<string, string> = {
  'KATHMANDU/NEPAL': 'Asia/Kathmandu',
  'NEPAL/KATHMANDU': 'Asia/Kathmandu',
  'ASIA/KATMANDU': 'Asia/Kathmandu',
  'GMT+5:45': 'Asia/Kathmandu',
  'UTC+5:45': 'Asia/Kathmandu'
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
  const resolvedCurrency = resolveCurrencyCode(currency);
  try {
    return new Intl.NumberFormat('en-NP', {
      style: 'currency',
      currency: resolvedCurrency,
      currencyDisplay: 'code'
    }).format(numeric);
  } catch {
    return `${resolvedCurrency} ${numeric.toFixed(2)}`;
  }
}

function itemCategoryName(item: PosSaleItem) {
  if (item.categoryName) {
    return item.categoryName;
  }

  const category = item.product?.category;
  if (!category) {
    return null;
  }

  if (category.parent?.name) {
    return `${category.parent.name} > ${category.name}`;
  }

  return category.name;
}

function itemHsCode(item: PosSaleItem) {
  return item.hsCode ?? item.product?.hsCode ?? null;
}

function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function resolveReceiptTimeZone(timeZone?: string | null) {
  const trimmed = timeZone?.trim();
  if (!trimmed) {
    return undefined;
  }

  const alias = TIMEZONE_ALIAS_MAP[trimmed.toUpperCase()];
  if (alias && isValidTimeZone(alias)) {
    return alias;
  }

  if (isValidTimeZone(trimmed)) {
    return trimmed;
  }

  const lowered = trimmed.toLowerCase();
  if ((lowered.includes('kathmandu') || lowered.includes('nepal')) && isValidTimeZone('Asia/Kathmandu')) {
    return 'Asia/Kathmandu';
  }

  return undefined;
}

function buildReceiptHtml({
  sale,
  context,
  billType,
  vatEnabled,
  titlePrefix,
  partyType,
  partyName,
  partyPhone,
  partyPercent,
  partyAmount,
  rows,
  paymentRows,
  completedAt
}: {
  sale: PosSale;
  context: ReceiptPrintContext;
  billType: 'SALE' | 'ESTIMATION';
  vatEnabled: boolean;
  titlePrefix: string;
  partyType: string;
  partyName: string;
  partyPhone: string;
  partyPercent: number;
  partyAmount: number;
  rows: string;
  paymentRows: string;
  completedAt: string;
}) {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(titlePrefix)} ${escapeHtml(sale.saleNumber)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #111; line-height: 1.35; }
        h1 { margin: 0; font-size: 24px; }
        h2 { margin: 2px 0 14px; font-size: 14px; color: #555; font-weight: normal; }
        .meta { margin-bottom: 14px; font-size: 12px; color: #444; }
        .meta p { margin: 2px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; vertical-align: top; }
        th { background: #fafafa; }
        .totals { margin-top: 12px; width: 340px; margin-left: auto; border-collapse: collapse; }
        .totals td { border: none; padding: 4px 0; font-size: 13px; }
        .totals tr:last-child td { font-size: 16px; font-weight: bold; padding-top: 8px; }
        .footer { margin-top: 22px; border-top: 1px dashed #ccc; padding-top: 10px; font-size: 12px; color: #555; white-space: pre-wrap; }
        .label { display: inline-block; padding: 4px 8px; border-radius: 999px; border: 1px solid #ddd; font-size: 11px; margin-top: 6px; }
        .without-vat { background: #fef3c7; border-color: #fcd34d; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(context.businessName || 'POS Bill')}</h1>
      <h2>${escapeHtml(titlePrefix)} ${escapeHtml(sale.saleNumber)}</h2>
      ${!vatEnabled ? '<div class="label without-vat">WITHOUT VAT BILL</div>' : ''}

      <div class="meta">
        <p><strong>Completed:</strong> ${escapeHtml(completedAt)}</p>
        <p><strong>Status:</strong> ${escapeHtml(sale.status)}</p>
        <p><strong>Party Type:</strong> ${escapeHtml(partyType)}</p>
        <p><strong>Party:</strong> ${escapeHtml(partyName)}</p>
        <p><strong>Party Phone:</strong> ${escapeHtml(partyPhone)}</p>
        <p><strong>Party %:</strong> ${escapeHtml(partyPercent.toFixed(2))}%</p>
        <p><strong>Party Amount:</strong> ${toMoney(partyAmount, context.currency)}</p>
        <p><strong>Cashier:</strong> ${escapeHtml(context.cashierName || '-')}</p>
        <p><strong>VAT Mode:</strong> ${vatEnabled ? 'With VAT' : 'Without VAT'}</p>
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
          <tr><td>Total Discount</td><td>${toMoney(sale.discountAmount, context.currency)}</td></tr>
          <tr><td>Party Discount Part</td><td>${toMoney(partyAmount, context.currency)}</td></tr>
          <tr><td>VAT</td><td>${toMoney(sale.taxAmount, context.currency)}</td></tr>
          <tr><td>Total</td><td>${toMoney(sale.totalAmount, context.currency)}</td></tr>
          <tr><td>Paid</td><td>${toMoney(sale.paidAmount, context.currency)}</td></tr>
          <tr><td>Change</td><td>${toMoney(sale.changeAmount, context.currency)}</td></tr>
        </tbody>
      </table>

      <h3 style="margin-top: 24px; margin-bottom: 8px;">Payments / Settlement</h3>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Status</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${
            paymentRows ||
            `<tr><td colspan="3">${billType === 'ESTIMATION' ? 'Estimation only (no payment captured)' : 'No payments'}</td></tr>`
          }
        </tbody>
      </table>

      ${context.receiptFooter ? `<div class="footer">${escapeHtml(context.receiptFooter)}</div>` : ''}
    </body>
  </html>`;
}

function printUsingPopup(html: string) {
  const opened = window.open('', '_blank', 'popup,width=860,height=780');
  if (!opened) {
    return Promise.resolve(false);
  }

  try {
    opened.document.open();
    opened.document.write(html);
    opened.document.close();
  } catch {
    opened.close();
    return Promise.resolve(false);
  }

  return new Promise<boolean>((resolve) => {
    let resolved = false;
    const finish = (value: boolean) => {
      if (resolved) {
        return;
      }
      resolved = true;
      resolve(value);
    };

    const triggerPrint = () => {
      try {
        opened.focus();
        opened.print();
        finish(true);
      } catch {
        finish(false);
      }
    };

    const fallbackTimeout = window.setTimeout(triggerPrint, 350);
    opened.addEventListener(
      'load',
      () => {
        window.clearTimeout(fallbackTimeout);
        window.setTimeout(triggerPrint, 60);
      },
      { once: true }
    );

    if (opened.document.readyState === 'complete') {
      window.clearTimeout(fallbackTimeout);
      window.setTimeout(triggerPrint, 60);
    }
  });
}

function printUsingHiddenIframe(html: string) {
  return new Promise<boolean>((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.opacity = '0';
    iframe.style.border = '0';

    let resolved = false;
    const finish = (value: boolean) => {
      if (resolved) {
        return;
      }
      resolved = true;
      iframe.onload = null;
      window.setTimeout(() => {
        iframe.remove();
      }, 1000);
      resolve(value);
    };

    const triggerPrint = () => {
      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        finish(false);
        return;
      }

      try {
        frameWindow.focus();
        frameWindow.print();
        finish(true);
      } catch {
        finish(false);
      }
    };

    iframe.onload = () => {
      window.setTimeout(triggerPrint, 40);
    };

    document.body.appendChild(iframe);

    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) {
      finish(false);
      return;
    }

    try {
      doc.open();
      doc.write(html);
      doc.close();
    } catch {
      finish(false);
      return;
    }

    window.setTimeout(triggerPrint, 350);
  });
}

export async function printSaleReceipt(
  sale: PosSale,
  context: ReceiptPrintContext,
  options?: PrintBillOptions
) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const billType = options?.billType ?? sale.billType ?? 'SALE';
  const vatDisabledByNote = (sale.notes || '').includes('WITHOUT_VAT_BILL');
  const vatEnabled = options?.vatEnabled ?? (!vatDisabledByNote && Number(sale.taxAmount || 0) > 0);
  const defaultIoLabel = billType === 'ESTIMATION' ? 'ESTIMATE' : 'OUT';
  const partyName = sale.partyName || sale.customerName || '-';
  const partyPhone = sale.partyPhone || sale.customerPhone || '-';
  const partyType = sale.partyType || 'CLIENT';
  const partyPercent = Number(sale.partyPercent || 0);
  const partyAmount = Number(sale.partyAmount || 0);

  const rows = sale.items
    .map((item) => {
      const category = itemCategoryName(item);
      const hsCode = itemHsCode(item);
      const ioLabel = item.ioLabel ?? options?.ioLabel ?? defaultIoLabel;

      const itemMeta = [
        category ? `Category: ${category}` : 'Category: -',
        hsCode ? `HS: ${hsCode}` : 'HS: -',
        `I/O: ${ioLabel}`
      ].join(' | ');

      return `
      <tr>
        <td>
          <div>${escapeHtml(item.productName)}</div>
          <div style="font-size: 11px; color: #666; margin-top: 2px;">${escapeHtml(itemMeta)}</div>
        </td>
        <td>${item.quantity}</td>
        <td>${toMoney(item.unitPrice, context.currency)}</td>
        <td>${toMoney(item.lineTotal, context.currency)}</td>
      </tr>
    `;
    })
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

  const resolvedTimeZone = resolveReceiptTimeZone(context.timezone);
  const completedAt = new Date(sale.completedAt).toLocaleString(
    undefined,
    resolvedTimeZone ? { timeZone: resolvedTimeZone } : undefined
  );

  const titlePrefix = billType === 'ESTIMATION' ? 'Estimation Bill' : 'Main Bill';
  const html = buildReceiptHtml({
    sale,
    context,
    billType,
    vatEnabled,
    titlePrefix,
    partyType,
    partyName,
    partyPhone,
    partyPercent,
    partyAmount,
    rows,
    paymentRows,
    completedAt
  });

  const printedWithPopup = await printUsingPopup(html);
  if (printedWithPopup) {
    return true;
  }

  return printUsingHiddenIframe(html);
}

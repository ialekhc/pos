'use client';

import { PosSale, PosSaleItem, VatMode } from '@/lib/types';
import { resolveCurrencyCode } from '@/lib/utils/currency';

export type ReceiptPrintContext = {
  businessName: string;
  currency: string;
  receiptFooter?: string | null;
  timezone?: string | null;
  cashierName?: string;
  logoUrl?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactAddress?: string | null;
  headerNote?: string | null;
};

export type PrintBillOptions = {
  billType?: 'SALE' | 'ESTIMATION';
  ioLabel?: 'OUT' | 'IN' | 'ESTIMATE';
  vatMode?: VatMode;
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
  vatMode,
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
  vatMode: VatMode;
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
  const billTag =
    billType === 'ESTIMATION'
      ? 'Estimation'
      : vatMode === 'WITH_VAT'
      ? 'Tax Invoice'
      : 'Invoice (Without VAT)';

  const vatModeLabel = vatMode === 'WITH_VAT' ? 'VAT Included (13%)' : 'Without VAT';

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(titlePrefix)} ${escapeHtml(sale.saleNumber)}</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 20px; background: #f4f6fb; color: #111827; line-height: 1.4; font-family: "Segoe UI", Arial, sans-serif; }
        .sheet { max-width: 860px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 22px; }
        .header { display: flex; justify-content: space-between; align-items: start; gap: 12px; margin-bottom: 14px; }
        .brand { display: flex; align-items: center; gap: 12px; }
        .logo { width: 60px; height: 60px; object-fit: contain; border-radius: 10px; border: 1px solid #e5e7eb; background: #fff; }
        h1 { margin: 0; font-size: 24px; line-height: 1.2; }
        .sub { margin-top: 4px; font-size: 13px; color: #6b7280; }
        .head-note { margin-top: 4px; font-size: 12px; color: #4b5563; white-space: pre-wrap; }
        .bill-tag { border: 1px solid #d1d5db; border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: .04em; }
        .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; margin-bottom: 16px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 10px; background: #f9fafb; font-size: 12px; color: #374151; }
        .meta p { margin: 0; }
        .meta strong { color: #111827; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #e5e7eb; padding: 9px; text-align: left; font-size: 12px; vertical-align: top; }
        th { background: #f3f4f6; color: #111827; font-weight: 600; }
        tbody tr:nth-child(even) { background: #fcfcfd; }
        .totals-wrap { margin-top: 12px; display: flex; justify-content: flex-end; }
        .totals { width: 360px; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
        .totals td { border: none; border-bottom: 1px solid #f1f5f9; padding: 8px 10px; font-size: 12px; }
        .totals tr:last-child td { border-bottom: none; font-size: 15px; font-weight: 700; background: #eff6ff; }
        .totals td:last-child { text-align: right; font-weight: 600; }
        h3 { margin-top: 20px; margin-bottom: 8px; font-size: 14px; }
        .footer { margin-top: 22px; border-top: 1px dashed #d1d5db; padding-top: 10px; font-size: 12px; color: #4b5563; white-space: pre-wrap; }
      </style>
    </head>
    <body>
      <div class="sheet">
        <div class="header">
          <div class="brand">
            ${
              context.logoUrl
                ? `<img class="logo" src="${escapeHtml(context.logoUrl)}" alt="${escapeHtml(
                    context.businessName || 'Business Logo'
                  )}" />`
                : ''
            }
            <div>
              <h1>${escapeHtml(context.businessName || 'POS Bill')}</h1>
              <div class="sub">${escapeHtml(titlePrefix)} ${escapeHtml(sale.saleNumber)}</div>
              ${context.headerNote ? `<div class="head-note">${escapeHtml(context.headerNote)}</div>` : ''}
            </div>
          </div>
          <div class="bill-tag">${escapeHtml(billTag)}</div>
        </div>

        <div class="meta">
          <p><strong>Completed:</strong> ${escapeHtml(completedAt)}</p>
          <p><strong>Status:</strong> ${escapeHtml(sale.status)}</p>
          <p><strong>Party Type:</strong> ${escapeHtml(partyType)}</p>
          <p><strong>Party:</strong> ${escapeHtml(partyName)}</p>
          <p><strong>Party Phone:</strong> ${escapeHtml(partyPhone)}</p>
          <p><strong>Party %:</strong> ${escapeHtml(partyPercent.toFixed(2))}%</p>
          <p><strong>Party Amount:</strong> ${toMoney(partyAmount, context.currency)}</p>
          <p><strong>Cashier:</strong> ${escapeHtml(context.cashierName || '-')}</p>
          <p><strong>VAT Mode:</strong> ${escapeHtml(vatModeLabel)}</p>
          <p><strong>Contact Phone:</strong> ${escapeHtml(context.contactPhone || '-')}</p>
          <p><strong>Contact Email:</strong> ${escapeHtml(context.contactEmail || '-')}</p>
          <p><strong>Contact Address:</strong> ${escapeHtml(context.contactAddress || '-')}</p>
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

        <div class="totals-wrap">
          <table class="totals">
            <tbody>
              <tr><td>Subtotal</td><td>${toMoney(sale.subtotal, context.currency)}</td></tr>
              <tr><td>Total Discount</td><td>${toMoney(sale.discountAmount, context.currency)}</td></tr>
              <tr><td>Party Discount Part</td><td>${toMoney(partyAmount, context.currency)}</td></tr>
              ${
                vatMode === 'WITH_VAT'
                  ? `<tr><td>VAT (13%)</td><td>${toMoney(sale.taxAmount, context.currency)}</td></tr>`
                  : `<tr><td>VAT</td><td>Not Applied</td></tr>`
              }
              <tr><td>Total</td><td>${toMoney(sale.totalAmount, context.currency)}</td></tr>
              <tr><td>Paid</td><td>${toMoney(sale.paidAmount, context.currency)}</td></tr>
              <tr><td>Change</td><td>${toMoney(sale.changeAmount, context.currency)}</td></tr>
            </tbody>
          </table>
        </div>

        <h3>Payments / Settlement</h3>
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
      </div>
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
  const defaultIoLabel = billType === 'ESTIMATION' ? 'ESTIMATE' : 'OUT';
  const vatMode: VatMode =
    options?.vatMode ?? sale.vatMode ?? (Number(sale.taxAmount || 0) > 0 ? 'WITH_VAT' : 'WITHOUT_VAT');
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
    vatMode,
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

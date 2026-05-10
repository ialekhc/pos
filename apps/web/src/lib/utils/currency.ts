const DEFAULT_CURRENCY = 'NPR';

export function resolveCurrencyCode(currency?: string | null) {
  const normalized = (currency ?? '').trim().toUpperCase();
  if (!normalized || normalized === 'USD') {
    return DEFAULT_CURRENCY;
  }

  return normalized;
}

export function formatCurrency(
  amount: string | number | null | undefined,
  currency?: string | null
) {
  const numeric = Number(amount ?? 0);
  if (!Number.isFinite(numeric)) {
    return '-';
  }

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

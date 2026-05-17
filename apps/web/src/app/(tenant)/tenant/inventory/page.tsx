'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/layout/data-table';
import { MetricCard } from '@/components/layout/metric-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api/client';
import { Party } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/currency';

type Product = {
  id: string;
  name: string;
  sku: string;
  stockQuantity: number;
  lowStockThreshold: number;
  status: 'ACTIVE' | 'INACTIVE';
  category?: {
    id: string;
    name: string;
    parent?: { id: string; name: string } | null;
  } | null;
};

type InventoryLog = {
  id: string;
  action: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'SALE' | 'REFUND';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  createdAt: string;
  product: Product;
  party?: {
    id: string;
    type: 'VENDOR' | 'CLIENT';
    name: string;
    phone?: string | null;
  } | null;
  partyPercent?: string | null;
  partyAmount?: string | null;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

type InventorySummary = {
  totalProducts: number;
  totalStockUnits: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  adjustmentsToday: number;
  adjustmentsLast7Days: number;
  lastAdjustment?: {
    id: string;
    action: string;
    quantity: number;
    createdAt: string;
    product: {
      id: string;
      name: string;
      sku: string;
    };
    createdByName?: string | null;
  } | null;
};

type AdjustmentAction = 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT';
type TransactionFlow = 'PURCHASE_IN' | 'PURCHASE_REFUND' | 'SALES_RETURN' | 'MANUAL';
type StockView = 'ALL' | 'LOW' | 'OUT' | 'HEALTHY';

type LogFilters = {
  search: string;
  productId: string;
  action: '' | InventoryLog['action'];
  dateFrom: string;
  dateTo: string;
  take: number;
};

const DEFAULT_LOG_FILTERS: LogFilters = {
  search: '',
  productId: '',
  action: '',
  dateFrom: '',
  dateTo: '',
  take: 200
};

const ACTION_LABELS: Record<InventoryLog['action'], string> = {
  STOCK_IN: 'Stock In',
  STOCK_OUT: 'Stock Out',
  ADJUSTMENT: 'Set Exact Qty',
  SALE: 'Sale Deduction',
  REFUND: 'Refund Return'
};

const FLOW_TO_ACTION: Record<Exclude<TransactionFlow, 'MANUAL'>, AdjustmentAction> = {
  PURCHASE_IN: 'STOCK_IN',
  PURCHASE_REFUND: 'STOCK_OUT',
  SALES_RETURN: 'STOCK_IN'
};

const FLOW_LABELS: Record<TransactionFlow, string> = {
  PURCHASE_IN: 'Purchase In',
  PURCHASE_REFUND: 'Purchase Refund',
  SALES_RETURN: 'Sales Return',
  MANUAL: 'Manual Adjustment'
};

function parseRequestError(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Request failed';
  }
  return error.message || 'Request failed';
}

function categoryLabel(product: Product) {
  if (!product.category) {
    return '-';
  }

  if (product.category.parent?.name) {
    return `${product.category.parent.name} > ${product.category.name}`;
  }

  return product.category.name;
}

function formatActorName(log: InventoryLog) {
  if (!log.createdBy) {
    return 'System';
  }

  const fullName = `${log.createdBy.firstName} ${log.createdBy.lastName}`.trim();
  return fullName || log.createdBy.email;
}

function getActionBadgeVariant(action: InventoryLog['action']) {
  if (action === 'STOCK_IN' || action === 'REFUND') {
    return 'default';
  }

  if (action === 'ADJUSTMENT') {
    return 'outline';
  }

  return 'secondary';
}

export default function InventoryPage() {
  const [vendors, setVendors] = useState<Party[]>([]);
  const [clients, setClients] = useState<Party[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [filters, setFilters] = useState<LogFilters>(DEFAULT_LOG_FILTERS);
  const [stockSearch, setStockSearch] = useState('');
  const [stockView, setStockView] = useState<StockView>('ALL');
  const [form, setForm] = useState<{
    productId: string;
    flow: TransactionFlow;
    action: AdjustmentAction;
    quantity: number;
    reason: string;
    partyId: string;
    partyPercent: number;
  }>({
    productId: '',
    flow: 'PURCHASE_IN',
    action: 'STOCK_IN',
    quantity: 1,
    reason: '',
    partyId: '',
    partyPercent: 0
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === form.productId) ?? null,
    [form.productId, products]
  );

  const resolvedAction = useMemo<AdjustmentAction>(() => {
    if (form.flow === 'MANUAL') {
      return form.action;
    }

    return FLOW_TO_ACTION[form.flow];
  }, [form.action, form.flow]);

  const linkedPartyType = form.flow === 'SALES_RETURN' ? 'CLIENT' : 'VENDOR';
  const partyOptions = linkedPartyType === 'CLIENT' ? clients : vendors;

  const filteredStockRows = useMemo(() => {
    const query = stockSearch.trim().toLowerCase();

    return products
      .filter((product) => {
        if (!query) {
          return true;
        }

        return [product.name, product.sku, categoryLabel(product)].some((value) =>
          value.toLowerCase().includes(query)
        );
      })
      .filter((product) => {
        if (stockView === 'LOW') {
          return product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold;
        }

        if (stockView === 'OUT') {
          return product.stockQuantity <= 0;
        }

        if (stockView === 'HEALTHY') {
          return product.stockQuantity > product.lowStockThreshold;
        }

        return true;
      })
      .sort((a, b) => a.stockQuantity - b.stockQuantity);
  }, [products, stockSearch, stockView]);

  const stockMetrics = useMemo(() => {
    const totals = products.reduce(
      (acc, product) => {
        acc.units += product.stockQuantity;
        if (product.stockQuantity <= 0) {
          acc.out += 1;
        }
        if (product.stockQuantity <= product.lowStockThreshold) {
          acc.low += 1;
        }
        return acc;
      },
      {
        units: 0,
        out: 0,
        low: 0
      }
    );

    return {
      totalProducts: summary?.totalProducts ?? products.length,
      totalStockUnits: summary?.totalStockUnits ?? totals.units,
      lowStockProducts: summary?.lowStockProducts ?? totals.low,
      outOfStockProducts: summary?.outOfStockProducts ?? totals.out,
      adjustmentsToday: summary?.adjustmentsToday ?? 0
    };
  }, [products, summary]);

  const syncProductSelections = (productRows: Product[]) => {
    setForm((previous) => {
      if (!productRows.length) {
        return { ...previous, productId: '' };
      }

      if (productRows.some((product) => product.id === previous.productId)) {
        return previous;
      }

      return {
        ...previous,
        productId: productRows[0].id
      };
    });

    setFilters((previous) => {
      if (!previous.productId) {
        return previous;
      }

      if (productRows.some((product) => product.id === previous.productId)) {
        return previous;
      }

      return {
        ...previous,
        productId: ''
      };
    });
  };

  const buildLogsPath = (nextFilters: LogFilters) => {
    const params = new URLSearchParams();

    if (nextFilters.search.trim()) {
      params.set('search', nextFilters.search.trim());
    }

    if (nextFilters.productId) {
      params.set('productId', nextFilters.productId);
    }

    if (nextFilters.action) {
      params.set('action', nextFilters.action);
    }

    if (nextFilters.dateFrom) {
      params.set('dateFrom', nextFilters.dateFrom);
    }

    if (nextFilters.dateTo) {
      params.set('dateTo', nextFilters.dateTo);
    }

    params.set('take', String(nextFilters.take || 200));

    const query = params.toString();
    return query ? `/inventory/logs?${query}` : '/inventory/logs';
  };

  const loadProducts = async () => {
    const productRows = await apiRequest<Product[]>('/products');
    setProducts(productRows);
    syncProductSelections(productRows);
    return productRows;
  };

  const loadLowStock = async () => {
    const lowStockRows = await apiRequest<Product[]>('/products/low-stock');
    setLowStockProducts(lowStockRows);
    return lowStockRows;
  };

  const loadSummary = async () => {
    const summaryPayload = await apiRequest<InventorySummary>('/inventory/summary');
    setSummary(summaryPayload);
    return summaryPayload;
  };

  const loadParties = async () => {
    const [vendorRows, clientRows] = await Promise.all([
      apiRequest<Party[]>('/parties?type=VENDOR'),
      apiRequest<Party[]>('/parties?type=CLIENT')
    ]);
    setVendors(vendorRows);
    setClients(clientRows);
    return { vendorRows, clientRows };
  };

  const loadLogs = async (nextFilters: LogFilters) => {
    setIsLogsLoading(true);
    try {
      const path = buildLogsPath(nextFilters);
      const logRows = await apiRequest<InventoryLog[]>(path);
      setLogs(logRows);
    } finally {
      setIsLogsLoading(false);
    }
  };

  const loadInventoryWorkspace = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([loadProducts(), loadLowStock(), loadSummary(), loadLogs(filters), loadParties()]);
    } catch (requestError) {
      setError(parseRequestError(requestError));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadInventoryWorkspace();
  }, []);

  const submitAdjustment = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.productId) {
      setError('Please choose a product before adjusting stock.');
      return;
    }

    if (resolvedAction !== 'ADJUSTMENT' && form.quantity < 1) {
      setError('Quantity must be at least 1 for stock in/out.');
      return;
    }

    if (resolvedAction === 'ADJUSTMENT' && form.quantity < 0) {
      setError('Target quantity cannot be negative.');
      return;
    }

    const reasonPrefixByFlow: Record<Exclude<TransactionFlow, 'MANUAL'>, string> = {
      PURCHASE_IN: 'Purchase In',
      PURCHASE_REFUND: 'Purchase Refund',
      SALES_RETURN: 'Sales Return'
    };

    const trimmedReason = form.reason.trim();
    const composedReason =
      form.flow === 'MANUAL'
        ? trimmedReason || undefined
        : trimmedReason
          ? `${reasonPrefixByFlow[form.flow]}: ${trimmedReason}`
          : reasonPrefixByFlow[form.flow];

    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await apiRequest('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          productId: form.productId,
          action: resolvedAction,
          quantity: form.quantity,
          reason: composedReason,
          partyId: form.partyId || undefined,
          partyPercent: form.partyId ? form.partyPercent : undefined
        })
      });

      setNotice(`${FLOW_LABELS[form.flow]} recorded successfully.`);
      setForm((state) => ({
        ...state,
        quantity: resolvedAction === 'ADJUSTMENT' ? 0 : 1,
        reason: ''
      }));
      await loadInventoryWorkspace();
    } catch (requestError) {
      setError(parseRequestError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyLogFilters = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    try {
      await loadLogs(filters);
    } catch (requestError) {
      setError(parseRequestError(requestError));
    }
  };

  const resetLogFilters = async () => {
    setError(null);
    setNotice(null);
    setFilters(DEFAULT_LOG_FILTERS);

    try {
      await loadLogs(DEFAULT_LOG_FILTERS);
    } catch (requestError) {
      setError(parseRequestError(requestError));
    }
  };

  const prepareRestock = (product: Product) => {
    const recommendedQty = Math.max(product.lowStockThreshold - product.stockQuantity + 5, 1);
    setForm({
      productId: product.id,
      flow: 'PURCHASE_IN',
      action: 'STOCK_IN',
      quantity: recommendedQty,
      reason: 'Restock against low-stock alert',
      partyId: '',
      partyPercent: 0
    });
    setNotice(`Prepared restock entry for ${product.name}.`);
    setError(null);
  };

  const lastAdjustmentText = summary?.lastAdjustment
    ? `${ACTION_LABELS[summary.lastAdjustment.action as InventoryLog['action']] ?? summary.lastAdjustment.action} • ${summary.lastAdjustment.product.name} (${summary.lastAdjustment.product.sku}) • ${new Date(summary.lastAdjustment.createdAt).toLocaleString()}`
    : 'No stock adjustments recorded yet.';

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">{notice}</p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Tracked Products" value={stockMetrics.totalProducts} />
        <MetricCard title="Stock Units" value={stockMetrics.totalStockUnits} />
        <MetricCard title="Low Stock Items" value={stockMetrics.lowStockProducts} />
        <MetricCard title="Out of Stock" value={stockMetrics.outOfStockProducts} />
        <MetricCard title="Adjustments Today" value={stockMetrics.adjustmentsToday} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Stock Adjustment</CardTitle>
          <CardDescription>
            Record purchase in, purchase refund, sales return, or manual stock adjustments with full audit history.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={submitAdjustment}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Product</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.productId}
                onChange={(event) => setForm((state) => ({ ...state, productId: event.target.value }))}
              >
                {!products.length ? <option value="">No products available</option> : null}
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Transaction Flow</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.flow}
                onChange={(event) =>
                  setForm((state) => ({
                    ...state,
                    flow: event.target.value as TransactionFlow,
                    action: event.target.value === 'MANUAL' ? state.action : 'STOCK_IN',
                    quantity: event.target.value === 'MANUAL' ? state.quantity : Math.max(state.quantity, 1),
                    partyId: '',
                    partyPercent: 0
                  }))
                }
              >
                <option value="PURCHASE_IN">Purchase In</option>
                <option value="PURCHASE_REFUND">Purchase Refund</option>
                <option value="SALES_RETURN">Sales Return</option>
                <option value="MANUAL">Manual Adjustment</option>
              </select>
            </div>

            {form.flow === 'MANUAL' ? (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Adjustment Type</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.action}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      action: event.target.value as AdjustmentAction
                    }))
                  }
                >
                  <option value="STOCK_IN">Stock In (Add)</option>
                  <option value="STOCK_OUT">Stock Out (Deduct)</option>
                  <option value="ADJUSTMENT">Set Exact Quantity</option>
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Stock Movement</label>
                <Input
                  value={
                    form.flow === 'PURCHASE_REFUND'
                      ? 'Stock Out (Deduct from inventory)'
                      : 'Stock In (Add to inventory)'
                  }
                  readOnly
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {resolvedAction === 'ADJUSTMENT' ? 'Target Quantity' : 'Quantity'}
              </label>
              <Input
                type="number"
                min={resolvedAction === 'ADJUSTMENT' ? 0 : 1}
                value={form.quantity}
                onChange={(event) =>
                  setForm((state) => ({ ...state, quantity: Number(event.target.value || 0) }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Reason (Optional)</label>
              <Input
                placeholder={
                  form.flow === 'MANUAL'
                    ? 'Damaged, correction, stock count mismatch...'
                    : 'Optional note for this transaction'
                }
                value={form.reason}
                onChange={(event) => setForm((state) => ({ ...state, reason: event.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {linkedPartyType === 'CLIENT' ? 'Client (Optional)' : 'Vendor (Optional)'}
              </label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.partyId}
                onChange={(event) => {
                  const partyId = event.target.value;
                  const party = partyOptions.find((row) => row.id === partyId);
                  setForm((state) => ({
                    ...state,
                    partyId,
                    partyPercent: party ? Number(party.defaultPercent || 0) : 0
                  }));
                }}
              >
                <option value="">
                  {linkedPartyType === 'CLIENT' ? 'No client linked' : 'No vendor linked'}
                </option>
                {partyOptions.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {linkedPartyType === 'CLIENT' ? 'Client Percent (%)' : 'Vendor Percent (%)'}
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={form.partyPercent}
                onChange={(event) =>
                  setForm((state) => ({ ...state, partyPercent: Number(event.target.value || 0) }))
                }
              />
            </div>

            <div className="md:col-span-2 xl:col-span-4 flex flex-wrap gap-2">
              <Button disabled={isSubmitting || !form.productId}>
                {isSubmitting ? 'Applying...' : `Apply ${FLOW_LABELS[form.flow]}`}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setForm((state) => ({
                    ...state,
                    flow: 'PURCHASE_IN',
                    action: 'STOCK_IN',
                    quantity: 1,
                    reason: '',
                    partyId: '',
                    partyPercent: 0
                  }))
                }
              >
                Reset Form
              </Button>
            </div>
          </form>

          {selectedProduct ? (
            <div className="grid gap-3 rounded-lg border bg-background p-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Selected SKU</p>
                <p className="font-medium">{selectedProduct.sku}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Stock</p>
                <p className="font-medium">{selectedProduct.stockQuantity}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Low-Stock Threshold</p>
                <p className="font-medium">{selectedProduct.lowStockThreshold}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="font-medium">{categoryLabel(selectedProduct)}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Low Stock Alerts</CardTitle>
          <CardDescription>
            Monitor products near or below threshold and prepare restock adjustments quickly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={['Product', 'SKU', 'Category', 'Current', 'Threshold', 'Status', 'Quick Action']}
            rows={lowStockProducts.map((product) => [
              product.name,
              product.sku,
              categoryLabel(product),
              product.stockQuantity,
              product.lowStockThreshold,
              <Badge
                key={`${product.id}-stock-status`}
                className={product.stockQuantity <= 0 ? 'bg-destructive text-destructive-foreground' : undefined}
                variant={product.stockQuantity <= 0 ? 'secondary' : 'outline'}
              >
                {product.stockQuantity <= 0 ? 'Out of Stock' : 'Low Stock'}
              </Badge>,
              <Button
                key={`${product.id}-restock`}
                size="sm"
                variant="outline"
                onClick={() => prepareRestock(product)}
              >
                Prepare Restock
              </Button>
            ])}
            emptyMessage="No low-stock products right now."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock Levels</CardTitle>
          <CardDescription>Organized stock snapshot across all vendor products.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Search Product</label>
              <Input
                placeholder="Name, SKU, or category"
                value={stockSearch}
                onChange={(event) => setStockSearch(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Stock View</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={stockView}
                onChange={(event) => setStockView(event.target.value as StockView)}
              >
                <option value="ALL">All Products</option>
                <option value="LOW">Low Stock Only</option>
                <option value="OUT">Out of Stock Only</option>
                <option value="HEALTHY">Healthy Stock Only</option>
              </select>
            </div>
          </div>

          <DataTable
            headers={['Product', 'SKU', 'Category', 'Stock', 'Threshold', 'Status']}
            rows={filteredStockRows.map((product) => [
              product.name,
              product.sku,
              categoryLabel(product),
              product.stockQuantity,
              product.lowStockThreshold,
              <Badge
                key={`${product.id}-level-status`}
                className={product.stockQuantity <= 0 ? 'bg-destructive text-destructive-foreground' : undefined}
                variant={
                  product.stockQuantity <= 0
                    ? 'secondary'
                    : product.stockQuantity <= product.lowStockThreshold
                      ? 'outline'
                      : 'default'
                }
              >
                {product.stockQuantity <= 0
                  ? 'Out of Stock'
                  : product.stockQuantity <= product.lowStockThreshold
                    ? 'Low'
                    : 'Healthy'}
              </Badge>
            ])}
            emptyMessage="No products found for this stock view."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory History</CardTitle>
          <CardDescription>{lastAdjustmentText}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-6" onSubmit={applyLogFilters}>
            <div className="space-y-1.5 md:col-span-2 xl:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Search Logs</label>
              <Input
                placeholder="Product name, SKU, barcode, HS code"
                value={filters.search}
                onChange={(event) => setFilters((state) => ({ ...state, search: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Product Filter</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={filters.productId}
                onChange={(event) => setFilters((state) => ({ ...state, productId: event.target.value }))}
              >
                <option value="">All products</option>
                {products.map((product) => (
                  <option key={`${product.id}-log-filter`} value={product.id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Action Filter</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={filters.action}
                onChange={(event) =>
                  setFilters((state) => ({
                    ...state,
                    action: event.target.value as LogFilters['action']
                  }))
                }
              >
                <option value="">All actions</option>
                <option value="STOCK_IN">Stock In</option>
                <option value="STOCK_OUT">Stock Out</option>
                <option value="ADJUSTMENT">Set Exact Qty</option>
                <option value="SALE">Sale Deduction</option>
                <option value="REFUND">Refund Return</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">From Date</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(event) => setFilters((state) => ({ ...state, dateFrom: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">To Date</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(event) => setFilters((state) => ({ ...state, dateTo: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Rows</label>
              <Input
                type="number"
                min={1}
                max={500}
                value={filters.take}
                onChange={(event) =>
                  setFilters((state) => ({
                    ...state,
                    take: Number(event.target.value || 200)
                  }))
                }
              />
            </div>
            <div className="md:col-span-3 xl:col-span-6 flex flex-wrap gap-2">
              <Button disabled={isLogsLoading}>{isLogsLoading ? 'Applying...' : 'Apply Filters'}</Button>
              <Button type="button" variant="outline" onClick={resetLogFilters} disabled={isLogsLoading}>
                Reset Filters
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadInventoryWorkspace()}
                disabled={isLoading || isLogsLoading}
              >
                {isLoading ? 'Refreshing...' : 'Refresh Inventory'}
              </Button>
            </div>
          </form>

          <DataTable
            headers={['When', 'Product', 'Action', 'Qty', 'Previous', 'New', 'Party', 'Party %', 'Updated By', 'Reason']}
            rows={logs.map((log) => [
              new Date(log.createdAt).toLocaleString(),
              `${log.product.name} (${log.product.sku})`,
              <Badge key={`${log.id}-action`} variant={getActionBadgeVariant(log.action)}>
                {ACTION_LABELS[log.action]}
              </Badge>,
              log.quantity,
              log.previousQuantity,
              log.newQuantity,
              log.party?.name || '-',
              log.partyPercent ? `${Number(log.partyPercent).toFixed(2)}%` : '-',
              formatActorName(log),
              [log.reason ?? '-', log.partyAmount ? `Share: ${formatCurrency(log.partyAmount)}` : '']
                .filter(Boolean)
                .join(' | ')
            ])}
            emptyMessage="No inventory log records found for the selected filters."
          />
        </CardContent>
      </Card>
    </div>
  );
}

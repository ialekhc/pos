'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/layout/data-table';
import { MetricCard } from '@/components/layout/metric-card';
import { apiRequest } from '@/lib/api/client';
import { formatCurrency } from '@/lib/utils/currency';

type TenantOption = {
  id: string;
  name: string;
  slug: string;
};

type PlanOption = {
  id: string;
  name: string;
  code: string;
  monthlyPrice: string;
};

type SubscriptionRow = {
  id: string;
  tenantId: string;
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'EXPIRED' | 'CANCELED';
  startsAt: string;
  endsAt?: string | null;
  autoRenew: boolean;
  createdAt: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  plan: {
    id: string;
    name: string;
    code: string;
  };
};

export default function SuperAdminSubscriptionsPage() {
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [filterTenantId, setFilterTenantId] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    planId: '',
    startsAt: '',
    endsAt: '',
    autoRenew: true
  });

  const planOptions = useMemo(
    () =>
      plans.map((plan) => ({
        value: plan.id,
        label: `${plan.name} (${plan.code}) - ${formatCurrency(plan.monthlyPrice)}/mo`
      })),
    [plans]
  );
  const metrics = useMemo(() => {
    const total = subscriptions.length;
    const active = subscriptions.filter((subscription) => subscription.status === 'ACTIVE').length;
    const trialing = subscriptions.filter((subscription) => subscription.status === 'TRIALING').length;
    const pastDue = subscriptions.filter((subscription) => subscription.status === 'PAST_DUE').length;
    const expired = subscriptions.filter((subscription) => subscription.status === 'EXPIRED').length;

    return { total, active, trialing, pastDue, expired };
  }, [subscriptions]);

  const loadStaticOptions = async () => {
    const [tenantRows, planRows] = await Promise.all([
      apiRequest<TenantOption[]>('/tenants'),
      apiRequest<PlanOption[]>('/plans')
    ]);
    setTenants(tenantRows);
    setPlans(planRows);
    if (!selectedTenantId && tenantRows.length) {
      setSelectedTenantId(tenantRows[0].id);
    }
    if (!form.planId && planRows.length) {
      setForm((state) => ({ ...state, planId: planRows[0].id }));
    }
  };

  const loadSubscriptions = async (tenantId: string) => {
    const query = tenantId === 'all' ? '' : `?tenantId=${tenantId}`;
    const rows = await apiRequest<SubscriptionRow[]>(`/subscriptions${query}`);
    setSubscriptions(rows);
  };

  const loadAll = async (tenantId: string) => {
    try {
      await Promise.all([loadStaticOptions(), loadSubscriptions(tenantId)]);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load subscriptions');
    }
  };

  useEffect(() => {
    loadAll(filterTenantId);
  }, [filterTenantId]);

  const assignSubscription = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedTenantId) {
      setError('Select a tenant first.');
      return;
    }

    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      await apiRequest('/subscriptions/assign', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: selectedTenantId,
          planId: form.planId,
          startsAt: form.startsAt || undefined,
          endsAt: form.endsAt || undefined,
          autoRenew: form.autoRenew
        })
      });
      setMessage('Subscription assigned successfully.');
      setForm((state) => ({ ...state, startsAt: '', endsAt: '' }));
      await loadSubscriptions(filterTenantId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to assign subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {error ? <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}
      {message ? <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">{message}</p> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Total" value={metrics.total} />
        <MetricCard title="Active" value={metrics.active} />
        <MetricCard title="Trialing" value={metrics.trialing} />
        <MetricCard title="Past Due" value={metrics.pastDue} />
        <MetricCard title="Expired" value={metrics.expired} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Assign Subscription</CardTitle>
          <CardDescription>Issue or change a tenant subscription. Active or trial subscriptions are rotated automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={assignSubscription}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tenant</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedTenantId}
                onChange={(event) => setSelectedTenantId(event.target.value)}
                required
              >
                <option value="">Select tenant</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} ({tenant.slug})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Plan</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.planId}
                onChange={(event) => setForm((state) => ({ ...state, planId: event.target.value }))}
                required
              >
                <option value="">Select plan</option>
                {planOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Auto Renew</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.autoRenew ? 'yes' : 'no'}
                onChange={(event) => setForm((state) => ({ ...state, autoRenew: event.target.value === 'yes' }))}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Start Date (Optional)</label>
              <Input
                type="date"
                value={form.startsAt}
                onChange={(event) => setForm((state) => ({ ...state, startsAt: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">End Date (Optional)</label>
              <Input
                type="date"
                value={form.endsAt}
                onChange={(event) => setForm((state) => ({ ...state, endsAt: event.target.value }))}
              />
            </div>
            <Button disabled={isSubmitting}>{isSubmitting ? 'Assigning...' : 'Assign Subscription'}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription Registry</CardTitle>
          <CardDescription>Platform-wide subscription lifecycle and plan status visibility.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-w-sm">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tenant Filter</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={filterTenantId}
                onChange={(event) => setFilterTenantId(event.target.value)}
              >
                <option value="all">All tenants</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} ({tenant.slug})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DataTable
            headers={['Tenant', 'Plan', 'Status', 'Start', 'End', 'Auto Renew']}
            rows={subscriptions.map((subscription) => [
              `${subscription.tenant.name} (${subscription.tenant.slug})`,
              `${subscription.plan.name} (${subscription.plan.code})`,
              <Badge key={`${subscription.id}-status`} variant={subscription.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {subscription.status}
              </Badge>,
              new Date(subscription.startsAt).toLocaleDateString(),
              subscription.endsAt ? new Date(subscription.endsAt).toLocaleDateString() : 'Open-ended',
              subscription.autoRenew ? 'Yes' : 'No'
            ])}
          />
        </CardContent>
      </Card>
    </div>
  );
}

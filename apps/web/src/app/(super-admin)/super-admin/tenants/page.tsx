'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/layout/data-table';
import { apiRequest } from '@/lib/api/client';

type TenantStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  currency: string;
  timezone: string;
  domain?: string | null;
  subscriptions: Array<{ plan?: { id: string; name: string } | null }>;
  users: Array<{ id: string }>;
  createdAt: string;
};

type PlanOption = {
  id: string;
  name: string;
  code: string;
  monthlyPrice: string;
};

export default function SuperAdminTenantsPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [assignPlanByTenant, setAssignPlanByTenant] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    timezone: 'Australia/Sydney',
    currency: 'AUD',
    domain: '',
    initialPlanId: ''
  });

  const planOptions = useMemo(
    () =>
      plans.map((plan) => ({
        value: plan.id,
        label: `${plan.name} (${plan.code}) - $${Number(plan.monthlyPrice).toFixed(2)}/mo`
      })),
    [plans]
  );

  const loadData = async () => {
    try {
      const [tenantRows, planRows] = await Promise.all([
        apiRequest<TenantRow[]>('/admin/tenants'),
        apiRequest<PlanOption[]>('/plans')
      ]);
      setTenants(tenantRows);
      setPlans(planRows);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load tenants');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createTenant = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await apiRequest('/tenants', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          timezone: form.timezone,
          currency: form.currency,
          domain: form.domain || undefined,
          initialPlanId: form.initialPlanId || undefined
        })
      });

      setForm({
        name: '',
        slug: '',
        timezone: 'Australia/Sydney',
        currency: 'AUD',
        domain: '',
        initialPlanId: ''
      });
      setMessage('Tenant created successfully.');
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to create tenant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setStatus = async (tenantId: string, status: TenantStatus) => {
    setError(null);
    setMessage(null);
    try {
      await apiRequest(`/tenants/${tenantId}/status/${status}`, {
        method: 'PATCH'
      });
      setMessage(`Tenant status updated to ${status}.`);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to update tenant status');
    }
  };

  const assignSubscription = async (tenantId: string) => {
    const planId = assignPlanByTenant[tenantId];
    if (!planId) {
      setError('Please choose a plan before assigning.');
      return;
    }

    setError(null);
    setMessage(null);
    try {
      await apiRequest('/subscriptions/assign', {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          planId,
          autoRenew: true
        })
      });
      setMessage('Subscription assigned.');
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to assign plan');
    }
  };

  return (
    <div className="space-y-6">
      {error ? <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}
      {message ? <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">{message}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Create Tenant Workspace</CardTitle>
          <CardDescription>
            New tenants get default roles and settings automatically, and can optionally start with a plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={createTenant}>
            <Input
              placeholder="Business name"
              value={form.name}
              onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
              required
            />
            <Input
              placeholder="Slug (e.g. sunrise-mart)"
              value={form.slug}
              onChange={(event) => setForm((state) => ({ ...state, slug: event.target.value.trim().toLowerCase() }))}
              required
            />
            <Input
              placeholder="Custom domain (optional)"
              value={form.domain}
              onChange={(event) => setForm((state) => ({ ...state, domain: event.target.value }))}
            />
            <Input
              placeholder="Timezone"
              value={form.timezone}
              onChange={(event) => setForm((state) => ({ ...state, timezone: event.target.value }))}
              required
            />
            <Input
              placeholder="Currency"
              value={form.currency}
              onChange={(event) => setForm((state) => ({ ...state, currency: event.target.value.toUpperCase() }))}
              required
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.initialPlanId}
              onChange={(event) => setForm((state) => ({ ...state, initialPlanId: event.target.value }))}
            >
              <option value="">No initial plan</option>
              {planOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="md:col-span-3">
              <Button disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Tenant'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tenant Operations</CardTitle>
          <CardDescription>Manage statuses, headcount, and subscription assignment from a single control table.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={['Tenant', 'Status', 'Plan', 'Users', 'Region', 'Created', 'Actions']}
            rows={tenants.map((tenant) => [
              <div key={`${tenant.id}-name`} className="space-y-1">
                <p className="font-semibold">{tenant.name}</p>
                <p className="text-xs text-muted-foreground">{tenant.slug}</p>
              </div>,
              <Badge key={`${tenant.id}-status`} variant={tenant.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {tenant.status}
              </Badge>,
              tenant.subscriptions[0]?.plan?.name ?? 'No Plan',
              tenant.users.length,
              `${tenant.currency} • ${tenant.timezone}`,
              new Date(tenant.createdAt).toLocaleDateString(),
              <div key={`${tenant.id}-actions`} className="flex min-w-[320px] flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setStatus(tenant.id, 'ACTIVE')}>
                  Activate
                </Button>
                <Button size="sm" variant="outline" onClick={() => setStatus(tenant.id, 'SUSPENDED')}>
                  Suspend
                </Button>
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  value={assignPlanByTenant[tenant.id] ?? ''}
                  onChange={(event) =>
                    setAssignPlanByTenant((state) => ({
                      ...state,
                      [tenant.id]: event.target.value
                    }))
                  }
                >
                  <option value="">Select plan</option>
                  {planOptions.map((option) => (
                    <option key={`${tenant.id}-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Button size="sm" onClick={() => assignSubscription(tenant.id)}>
                  Assign Plan
                </Button>
              </div>
            ])}
          />
        </CardContent>
      </Card>
    </div>
  );
}

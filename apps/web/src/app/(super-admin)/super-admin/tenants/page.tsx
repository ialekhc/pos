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
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingTenant, setIsUpdatingTenant] = useState(false);
  const [busyTenantId, setBusyTenantId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    timezone: 'Australia/Sydney',
    currency: 'NPR',
    domain: '',
    initialPlanId: ''
  });
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    timezone: '',
    currency: '',
    domain: ''
  });

  const planOptions = useMemo(
    () =>
      plans.map((plan) => ({
        value: plan.id,
        label: `${plan.name} (${plan.code}) - ${formatCurrency(plan.monthlyPrice)}/mo`
      })),
    [plans]
  );
  const tenantMetrics = useMemo(() => {
    const total = tenants.length;
    const active = tenants.filter((tenant) => tenant.status === 'ACTIVE').length;
    const suspended = tenants.filter((tenant) => tenant.status === 'SUSPENDED').length;
    const withoutPlan = tenants.filter((tenant) => !tenant.subscriptions[0]?.plan).length;

    return { total, active, suspended, withoutPlan };
  }, [tenants]);

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
        currency: 'NPR',
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

  const startEditTenant = (tenant: TenantRow) => {
    setEditingTenantId(tenant.id);
    setEditForm({
      name: tenant.name,
      slug: tenant.slug,
      timezone: tenant.timezone,
      currency: tenant.currency,
      domain: tenant.domain ?? ''
    });
    setError(null);
    setMessage(null);
  };

  const cancelTenantEdit = () => {
    setEditingTenantId(null);
    setEditForm({
      name: '',
      slug: '',
      timezone: '',
      currency: '',
      domain: ''
    });
  };

  const updateTenant = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingTenantId) {
      return;
    }

    setIsUpdatingTenant(true);
    setError(null);
    setMessage(null);
    try {
      await apiRequest(`/tenants/${editingTenantId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editForm.name.trim(),
          slug: editForm.slug.trim().toLowerCase(),
          timezone: editForm.timezone.trim(),
          currency: editForm.currency.trim().toUpperCase(),
          domain: editForm.domain.trim() || undefined
        })
      });
      setMessage('Tenant updated successfully.');
      await loadData();
      cancelTenantEdit();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to update tenant');
    } finally {
      setIsUpdatingTenant(false);
    }
  };

  const removeTenant = async (tenant: TenantRow) => {
    const confirmed = window.confirm(
      `Deactivate tenant "${tenant.name}" (${tenant.slug})? This will disable tenant access.`
    );
    if (!confirmed) {
      return;
    }

    setBusyTenantId(tenant.id);
    setError(null);
    setMessage(null);
    try {
      await apiRequest(`/tenants/${tenant.id}`, {
        method: 'DELETE'
      });
      if (editingTenantId === tenant.id) {
        cancelTenantEdit();
      }
      setMessage('Tenant deactivated.');
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to remove tenant');
    } finally {
      setBusyTenantId(null);
    }
  };

  return (
    <div className="space-y-6">
      {error ? <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}
      {message ? <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">{message}</p> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Tenants" value={tenantMetrics.total} />
        <MetricCard title="Active Tenants" value={tenantMetrics.active} />
        <MetricCard title="Suspended Tenants" value={tenantMetrics.suspended} />
        <MetricCard title="Without Plan" value={tenantMetrics.withoutPlan} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Create Tenant Workspace</CardTitle>
          <CardDescription>
            New tenants get default roles and settings automatically, and can optionally start with a plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={createTenant}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Business Name</label>
              <Input
                placeholder="Sunrise Mart"
                value={form.name}
                onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tenant Slug</label>
              <Input
                placeholder="sunrise-mart"
                value={form.slug}
                onChange={(event) => setForm((state) => ({ ...state, slug: event.target.value.trim().toLowerCase() }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Custom Domain (Optional)</label>
              <Input
                placeholder="shop.example.com"
                value={form.domain}
                onChange={(event) => setForm((state) => ({ ...state, domain: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Timezone</label>
              <Input
                placeholder="Asia/Kathmandu"
                value={form.timezone}
                onChange={(event) => setForm((state) => ({ ...state, timezone: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Currency</label>
              <Input
                placeholder="NPR"
                value={form.currency}
                onChange={(event) => setForm((state) => ({ ...state, currency: event.target.value.toUpperCase() }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Initial Plan (Optional)</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
            </div>
            <div className="md:col-span-3">
              <Button disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Tenant'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {editingTenantId ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Tenant Workspace</CardTitle>
            <CardDescription>Update tenant identity and regional profile settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-3" onSubmit={updateTenant}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Business Name</label>
                <Input
                  value={editForm.name}
                  onChange={(event) => setEditForm((state) => ({ ...state, name: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tenant Slug</label>
                <Input
                  value={editForm.slug}
                  onChange={(event) =>
                    setEditForm((state) => ({ ...state, slug: event.target.value.trim().toLowerCase() }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Custom Domain (Optional)</label>
                <Input
                  value={editForm.domain}
                  onChange={(event) => setEditForm((state) => ({ ...state, domain: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Timezone</label>
                <Input
                  value={editForm.timezone}
                  onChange={(event) => setEditForm((state) => ({ ...state, timezone: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Currency</label>
                <Input
                  value={editForm.currency}
                  onChange={(event) =>
                    setEditForm((state) => ({ ...state, currency: event.target.value.toUpperCase() }))
                  }
                  required
                />
              </div>
              <div className="flex items-end gap-2">
                <Button disabled={isUpdatingTenant}>
                  {isUpdatingTenant ? 'Saving...' : 'Save Tenant'}
                </Button>
                <Button type="button" variant="outline" onClick={cancelTenantEdit}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

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
                <Button size="sm" variant="outline" onClick={() => startEditTenant(tenant)}>
                  Edit
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
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyTenantId === tenant.id}
                  onClick={() => removeTenant(tenant)}
                >
                  {busyTenantId === tenant.id ? 'Removing...' : 'Delete'}
                </Button>
              </div>
            ])}
          />
        </CardContent>
      </Card>
    </div>
  );
}

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

type PlanFeature = {
  id: string;
  enabled: boolean;
  limitValue: number | null;
  feature: {
    key: string;
    name: string;
  };
};

type Plan = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  monthlyPrice: string;
  yearlyPrice?: string | null;
  maxProducts?: number | null;
  maxOrdersPerYear?: number | null;
  maxStaffAccounts?: number | null;
  hostingPackage: string;
  domainIncluded: boolean;
  maintenanceIncluded: boolean;
  planFeatures: PlanFeature[];
};

type FeatureCatalogItem = {
  id: string;
  key: string;
  name: string;
  category?: string | null;
  defaultLimit?: number | null;
};

type FeatureDraft = {
  enabled: boolean;
  limitValue: string;
};

export default function SuperAdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<FeatureCatalogItem[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [featureDrafts, setFeatureDrafts] = useState<Record<string, FeatureDraft>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    code: '',
    name: '',
    description: '',
    monthlyPrice: '',
    yearlyPrice: '',
    maxProducts: '',
    maxOrdersPerYear: '',
    maxStaffAccounts: '',
    hostingPackage: '',
    domainIncluded: true,
    maintenanceIncluded: true
  });

  const [createForm, setCreateForm] = useState({
    code: '',
    name: '',
    description: '',
    monthlyPrice: '0',
    yearlyPrice: '',
    maxProducts: '',
    maxOrdersPerYear: '',
    maxStaffAccounts: '',
    hostingPackage: '',
    domainIncluded: true,
    maintenanceIncluded: true
  });

  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === selectedPlanId) ?? null, [plans, selectedPlanId]);
  const metrics = useMemo(() => {
    const totalPlans = plans.length;
    const avgMonthlyPrice = totalPlans
      ? plans.reduce((sum, plan) => sum + Number(plan.monthlyPrice || 0), 0) / totalPlans
      : 0;
    const selectedEnabledFeatures = selectedPlan?.planFeatures.filter((feature) => feature.enabled).length ?? 0;
    const selectedTotalFeatures = selectedPlan?.planFeatures.length ?? 0;

    return { totalPlans, avgMonthlyPrice, selectedEnabledFeatures, selectedTotalFeatures };
  }, [plans, selectedPlan]);

  const featureStateByKey = useMemo(() => {
    if (!selectedPlan) {
      return new Map<string, PlanFeature>();
    }
    return new Map(selectedPlan.planFeatures.map((item) => [item.feature.key, item]));
  }, [selectedPlan]);

  const loadPlans = async () => {
    const data = await apiRequest<Plan[]>('/plans');
    setPlans(data);
    if (!selectedPlanId && data.length) {
      setSelectedPlanId(data[0].id);
    }
  };

  const loadFeatures = async () => {
    const data = await apiRequest<FeatureCatalogItem[]>('/plans/features');
    setFeatures(data);
  };

  const loadAll = async () => {
    try {
      await Promise.all([loadPlans(), loadFeatures()]);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load plans');
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!selectedPlan) {
      return;
    }

    setEditForm({
      code: selectedPlan.code,
      name: selectedPlan.name,
      description: selectedPlan.description ?? '',
      monthlyPrice: String(selectedPlan.monthlyPrice),
      yearlyPrice: selectedPlan.yearlyPrice ? String(selectedPlan.yearlyPrice) : '',
      maxProducts: selectedPlan.maxProducts ? String(selectedPlan.maxProducts) : '',
      maxOrdersPerYear: selectedPlan.maxOrdersPerYear ? String(selectedPlan.maxOrdersPerYear) : '',
      maxStaffAccounts: selectedPlan.maxStaffAccounts ? String(selectedPlan.maxStaffAccounts) : '',
      hostingPackage: selectedPlan.hostingPackage,
      domainIncluded: selectedPlan.domainIncluded,
      maintenanceIncluded: selectedPlan.maintenanceIncluded
    });
  }, [selectedPlan]);

  useEffect(() => {
    if (!selectedPlan) {
      return;
    }

    const nextDrafts: Record<string, FeatureDraft> = {};
    features.forEach((feature) => {
      const current = featureStateByKey.get(feature.key);
      nextDrafts[feature.key] = {
        enabled: current?.enabled ?? false,
        limitValue: current?.limitValue !== null && current?.limitValue !== undefined ? String(current.limitValue) : ''
      };
    });
    setFeatureDrafts(nextDrafts);
  }, [features, featureStateByKey, selectedPlan]);

  const updatePlan = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPlanId) {
      return;
    }

    try {
      await apiRequest(`/plans/${selectedPlanId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          code: editForm.code,
          name: editForm.name,
          description: editForm.description || undefined,
          monthlyPrice: Number(editForm.monthlyPrice),
          yearlyPrice: editForm.yearlyPrice ? Number(editForm.yearlyPrice) : undefined,
          maxProducts: editForm.maxProducts ? Number(editForm.maxProducts) : undefined,
          maxOrdersPerYear: editForm.maxOrdersPerYear ? Number(editForm.maxOrdersPerYear) : undefined,
          maxStaffAccounts: editForm.maxStaffAccounts ? Number(editForm.maxStaffAccounts) : undefined,
          hostingPackage: editForm.hostingPackage,
          domainIncluded: editForm.domainIncluded,
          maintenanceIncluded: editForm.maintenanceIncluded
        })
      });
      setMessage('Plan updated.');
      setError(null);
      await loadPlans();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to update plan');
    }
  };

  const createPlan = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const created = await apiRequest<Plan>('/plans', {
        method: 'POST',
        body: JSON.stringify({
          code: createForm.code,
          name: createForm.name,
          description: createForm.description || undefined,
          monthlyPrice: Number(createForm.monthlyPrice),
          yearlyPrice: createForm.yearlyPrice ? Number(createForm.yearlyPrice) : undefined,
          maxProducts: createForm.maxProducts ? Number(createForm.maxProducts) : undefined,
          maxOrdersPerYear: createForm.maxOrdersPerYear ? Number(createForm.maxOrdersPerYear) : undefined,
          maxStaffAccounts: createForm.maxStaffAccounts ? Number(createForm.maxStaffAccounts) : undefined,
          hostingPackage: createForm.hostingPackage,
          domainIncluded: createForm.domainIncluded,
          maintenanceIncluded: createForm.maintenanceIncluded
        })
      });
      setMessage('Plan created.');
      setError(null);
      setCreateForm({
        code: '',
        name: '',
        description: '',
        monthlyPrice: '0',
        yearlyPrice: '',
        maxProducts: '',
        maxOrdersPerYear: '',
        maxStaffAccounts: '',
        hostingPackage: '',
        domainIncluded: true,
        maintenanceIncluded: true
      });
      await loadPlans();
      setSelectedPlanId(created.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to create plan');
    }
  };

  const saveFeature = async (featureKey: string) => {
    if (!selectedPlanId) {
      return;
    }

    const draft = featureDrafts[featureKey];
    if (!draft) {
      return;
    }

    try {
      await apiRequest(`/plans/${selectedPlanId}/features`, {
        method: 'PATCH',
        body: JSON.stringify({
          featureKey,
          enabled: draft.enabled,
          limitValue: draft.limitValue ? Number(draft.limitValue) : undefined
        })
      });
      setMessage(`Feature ${featureKey} updated.`);
      setError(null);
      await loadPlans();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to update feature');
    }
  };

  return (
    <div className="space-y-6">
      {error ? <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}
      {message ? <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">{message}</p> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Plans" value={metrics.totalPlans} />
        <MetricCard title="Avg Monthly Price" value={formatCurrency(metrics.avgMonthlyPrice)} />
        <MetricCard title="Enabled Features (Selected)" value={metrics.selectedEnabledFeatures} />
        <MetricCard title="Total Features (Selected)" value={metrics.selectedTotalFeatures} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Plan Catalog</CardTitle>
          <CardDescription>Select a plan to edit pricing, limits, and package attributes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlanId(plan.id)}
                className={`rounded-xl border p-3 text-left transition hover:border-primary/60 ${
                  selectedPlanId === plan.id ? 'border-primary bg-primary/5' : 'bg-background'
                }`}
              >
                <p className="text-sm font-semibold">
                  {plan.name} ({plan.code})
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatCurrency(plan.monthlyPrice)} / month
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedPlan ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Plan</CardTitle>
            <CardDescription>Change commercial terms and package metadata for the selected plan.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-3" onSubmit={updatePlan}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Plan Code</label>
                <Input
                  value={editForm.code}
                  onChange={(event) => setEditForm((state) => ({ ...state, code: event.target.value.toUpperCase() }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Plan Name</label>
                <Input
                  value={editForm.name}
                  onChange={(event) => setEditForm((state) => ({ ...state, name: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Hosting Package</label>
                <Input
                  value={editForm.hostingPackage}
                  onChange={(event) => setEditForm((state) => ({ ...state, hostingPackage: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Description (Optional)</label>
                <Input
                  value={editForm.description}
                  onChange={(event) => setEditForm((state) => ({ ...state, description: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Monthly Price</label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={editForm.monthlyPrice}
                  onChange={(event) => setEditForm((state) => ({ ...state, monthlyPrice: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Yearly Price (Optional)</label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={editForm.yearlyPrice}
                  onChange={(event) => setEditForm((state) => ({ ...state, yearlyPrice: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Max Products (Optional)</label>
                <Input
                  type="number"
                  min={1}
                  value={editForm.maxProducts}
                  onChange={(event) => setEditForm((state) => ({ ...state, maxProducts: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Max Orders / Year (Optional)</label>
                <Input
                  type="number"
                  min={1}
                  value={editForm.maxOrdersPerYear}
                  onChange={(event) => setEditForm((state) => ({ ...state, maxOrdersPerYear: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Max Staff Accounts (Optional)</label>
                <Input
                  type="number"
                  min={1}
                  value={editForm.maxStaffAccounts}
                  onChange={(event) => setEditForm((state) => ({ ...state, maxStaffAccounts: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Domain Included</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={editForm.domainIncluded ? 'yes' : 'no'}
                  onChange={(event) =>
                    setEditForm((state) => ({ ...state, domainIncluded: event.target.value === 'yes' }))
                  }
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Maintenance Included</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={editForm.maintenanceIncluded ? 'yes' : 'no'}
                  onChange={(event) =>
                    setEditForm((state) => ({ ...state, maintenanceIncluded: event.target.value === 'yes' }))
                  }
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <Button>Save Plan Changes</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Feature Entitlements</CardTitle>
          <CardDescription>Toggle capabilities and per-feature limits for the selected plan.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={['Feature', 'Category', 'Enabled', 'Limit', 'Action']}
            rows={features.map((feature) => {
              const draft = featureDrafts[feature.key] ?? { enabled: false, limitValue: '' };
              return [
                <div key={`${feature.key}-title`} className="space-y-1">
                  <p className="font-medium">{feature.name}</p>
                  <p className="text-xs text-muted-foreground">{feature.key}</p>
                </div>,
                feature.category ?? 'general',
                <Badge key={`${feature.key}-enabled`} variant={draft.enabled ? 'default' : 'secondary'}>
                  {draft.enabled ? 'Enabled' : 'Disabled'}
                </Badge>,
                <div key={`${feature.key}-limit`} className="flex items-center gap-2">
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    value={draft.enabled ? 'enabled' : 'disabled'}
                    onChange={(event) =>
                      setFeatureDrafts((state) => ({
                        ...state,
                        [feature.key]: {
                          ...draft,
                          enabled: event.target.value === 'enabled'
                        }
                      }))
                    }
                  >
                    <option value="enabled">Enabled</option>
                    <option value="disabled">Disabled</option>
                  </select>
                  <Input
                    type="number"
                    min={0}
                    className="h-8 w-28"
                    placeholder={feature.defaultLimit ? String(feature.defaultLimit) : 'No limit'}
                    value={draft.limitValue}
                    onChange={(event) =>
                      setFeatureDrafts((state) => ({
                        ...state,
                        [feature.key]: {
                          ...draft,
                          limitValue: event.target.value
                        }
                      }))
                    }
                  />
                </div>,
                <Button key={`${feature.key}-save`} size="sm" onClick={() => saveFeature(feature.key)} disabled={!selectedPlanId}>
                  Save
                </Button>
              ];
            })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create New Plan</CardTitle>
          <CardDescription>Add a new package tier and then configure its features above.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={createPlan}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Plan Code</label>
              <Input
                placeholder="STARTUP"
                value={createForm.code}
                onChange={(event) =>
                  setCreateForm((state) => ({ ...state, code: event.target.value.toUpperCase() }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Plan Name</label>
              <Input
                placeholder="Startup"
                value={createForm.name}
                onChange={(event) => setCreateForm((state) => ({ ...state, name: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Hosting Package</label>
              <Input
                placeholder="Basic cloud"
                value={createForm.hostingPackage}
                onChange={(event) =>
                  setCreateForm((state) => ({ ...state, hostingPackage: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description (Optional)</label>
              <Input
                placeholder="Entry plan"
                value={createForm.description}
                onChange={(event) => setCreateForm((state) => ({ ...state, description: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Monthly Price</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={createForm.monthlyPrice}
                onChange={(event) => setCreateForm((state) => ({ ...state, monthlyPrice: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Yearly Price (Optional)</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={createForm.yearlyPrice}
                onChange={(event) => setCreateForm((state) => ({ ...state, yearlyPrice: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Max Products (Optional)</label>
              <Input
                type="number"
                min={1}
                value={createForm.maxProducts}
                onChange={(event) => setCreateForm((state) => ({ ...state, maxProducts: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Max Orders / Year (Optional)</label>
              <Input
                type="number"
                min={1}
                value={createForm.maxOrdersPerYear}
                onChange={(event) => setCreateForm((state) => ({ ...state, maxOrdersPerYear: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Max Staff Accounts (Optional)</label>
              <Input
                type="number"
                min={1}
                value={createForm.maxStaffAccounts}
                onChange={(event) => setCreateForm((state) => ({ ...state, maxStaffAccounts: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Domain Included</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={createForm.domainIncluded ? 'yes' : 'no'}
                onChange={(event) =>
                  setCreateForm((state) => ({ ...state, domainIncluded: event.target.value === 'yes' }))
                }
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Maintenance Included</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={createForm.maintenanceIncluded ? 'yes' : 'no'}
                onChange={(event) =>
                  setCreateForm((state) => ({ ...state, maintenanceIncluded: event.target.value === 'yes' }))
                }
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <Button>Create Plan</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

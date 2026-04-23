'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/layout/metric-card';
import { DataTable } from '@/components/layout/data-table';
import { apiRequest } from '@/lib/api/client';

type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'EXPIRED' | 'CANCELED';

type CurrentSubscription = {
  id: string;
  status: SubscriptionStatus;
  startsAt: string;
  endsAt?: string | null;
  trialEndsAt?: string | null;
  autoRenew: boolean;
  plan?: {
    id: string;
    code: string;
    name: string;
    monthlyPrice?: string | number | null;
    yearlyPrice?: string | number | null;
    domainIncluded?: boolean;
    hostingPackage?: string;
    maintenanceIncluded?: boolean;
    supportTier?: string;
  } | null;
};

type EntitlementsResponse = {
  tenantId: string;
  plan?: {
    id: string;
    code: string;
    name: string;
    maxProducts: number | null;
    maxOrdersPerYear: number | null;
    maxStaffAccounts: number | null;
  } | null;
  features: Record<string, { enabled: boolean; limitValue: number | null }>;
};

function parseApiError(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Failed to load subscription';
  }

  try {
    const parsed = JSON.parse(error.message) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) {
      return parsed.message.join(', ');
    }
    if (typeof parsed.message === 'string') {
      return parsed.message;
    }
  } catch {
    // Keep fallback.
  }

  return error.message || 'Failed to load subscription';
}

function formatFeatureKey(key: string) {
  return key
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) {
    return '-';
  }
  return `$${amount.toFixed(2)}`;
}

function toReadableDate(value?: string | null) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleDateString();
}

function statusBadgeVariant(status?: SubscriptionStatus) {
  if (!status) {
    return 'outline' as const;
  }

  if (status === 'ACTIVE' || status === 'TRIALING') {
    return 'default' as const;
  }

  return 'secondary' as const;
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [entitlements, setEntitlements] = useState<EntitlementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      apiRequest<CurrentSubscription>('/subscriptions/me/current').catch(() => null),
      apiRequest<EntitlementsResponse>('/plans/entitlements/me').catch(() => null)
    ])
      .then(([subscriptionRows, entitlementRows]) => {
        if (!active) {
          return;
        }
        setSubscription(subscriptionRows);
        setEntitlements(entitlementRows);
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }
        setError(parseApiError(requestError));
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const featureRows = useMemo(
    () =>
      Object.entries(entitlements?.features ?? {}).map(([featureKey, config]) => ({
        key: featureKey,
        label: formatFeatureKey(featureKey),
        enabled: config.enabled,
        limitValue: config.limitValue
      })),
    [entitlements?.features]
  );

  const enabledFeatures = useMemo(
    () => featureRows.filter((feature) => feature.enabled),
    [featureRows]
  );
  const disabledFeatures = useMemo(
    () => featureRows.filter((feature) => !feature.enabled),
    [featureRows]
  );

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading subscription details...</p>;
  }

  return (
    <div className="space-y-6">
      {error ? <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Current Subscription</CardTitle>
          <CardDescription>A clean view of your plan, billing cycle, and package benefits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{subscription.plan?.code ?? 'NO_PLAN'}</Badge>
                <Badge variant={statusBadgeVariant(subscription.status)}>{subscription.status}</Badge>
                <Badge variant={subscription.autoRenew ? 'default' : 'secondary'}>
                  {subscription.autoRenew ? 'Auto Renew On' : 'Auto Renew Off'}
                </Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="Plan" value={subscription.plan?.name ?? 'Not Assigned'} />
                <MetricCard title="Monthly Price" value={toCurrency(subscription.plan?.monthlyPrice)} />
                <MetricCard title="Yearly Price" value={toCurrency(subscription.plan?.yearlyPrice)} />
                <MetricCard title="Support Tier" value={subscription.plan?.supportTier ?? '-'} />
              </div>

              <div className="grid gap-2 rounded-lg border bg-background p-3 text-sm md:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Starts:</span> {toReadableDate(subscription.startsAt)}
                </p>
                <p>
                  <span className="text-muted-foreground">Ends:</span>{' '}
                  {subscription.endsAt ? toReadableDate(subscription.endsAt) : 'Auto-renew'}
                </p>
                <p>
                  <span className="text-muted-foreground">Trial Ends:</span>{' '}
                  {toReadableDate(subscription.trialEndsAt)}
                </p>
                <p>
                  <span className="text-muted-foreground">Hosting Package:</span>{' '}
                  {subscription.plan?.hostingPackage ?? '-'}
                </p>
                <p>
                  <span className="text-muted-foreground">Domain Included:</span>{' '}
                  {subscription.plan?.domainIncluded ? 'Yes' : 'No'}
                </p>
                <p>
                  <span className="text-muted-foreground">Maintenance Included:</span>{' '}
                  {subscription.plan?.maintenanceIncluded ? 'Yes' : 'No'}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No active subscription context found.</p>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard title="Max Products" value={entitlements?.plan?.maxProducts ?? 'Unlimited'} />
        <MetricCard title="Max Orders / Year" value={entitlements?.plan?.maxOrdersPerYear ?? 'Unlimited'} />
        <MetricCard title="Max Staff Accounts" value={entitlements?.plan?.maxStaffAccounts ?? 'Unlimited'} />
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Enabled Features</CardTitle>
            <CardDescription>Capabilities currently available in your plan.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {enabledFeatures.length ? (
              enabledFeatures.map((feature) => (
                <Badge key={feature.key} variant="default">
                  {feature.label}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No enabled features found.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Locked Features</CardTitle>
            <CardDescription>Upgrade plan to access these features.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {disabledFeatures.length ? (
              disabledFeatures.map((feature) => (
                <Badge key={feature.key} variant="secondary">
                  {feature.label}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No locked features.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feature Entitlement Details</CardTitle>
          <CardDescription>Full list of feature switches and plan-level caps.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={['Feature', 'Access', 'Limit']}
            rows={featureRows.map((feature) => [
              feature.label,
              feature.enabled ? (
                <Badge key={`${feature.key}-enabled`} variant="default">
                  Enabled
                </Badge>
              ) : (
                <Badge key={`${feature.key}-disabled`} variant="secondary">
                  Locked
                </Badge>
              ),
              feature.limitValue ?? '-'
            ])}
            emptyMessage="No feature flags mapped to current plan."
          />
        </CardContent>
      </Card>
    </div>
  );
}

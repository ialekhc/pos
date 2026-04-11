'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/layout/data-table';
import { apiRequest } from '@/lib/api/client';

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<any>(null);
  const [entitlements, setEntitlements] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiRequest('/subscriptions/me/current').catch(() => null),
      apiRequest('/plans/entitlements/me').catch(() => null)
    ])
      .then(([subscriptionRows, entitlementRows]) => {
        setSubscription(subscriptionRows);
        setEntitlements(entitlementRows);
      })
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : 'Failed to load subscription')
      );
  }, []);

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Visibility into active package, lifecycle dates, and billing status.</CardDescription>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="grid gap-2 text-sm">
              <p>
                Plan: <strong>{subscription.plan?.name ?? '-'}</strong>
              </p>
              <p>Status: {subscription.status}</p>
              <p>Starts: {new Date(subscription.startsAt).toLocaleDateString()}</p>
              <p>Ends: {subscription.endsAt ? new Date(subscription.endsAt).toLocaleDateString() : 'Auto-renew'}</p>
              <p>Auto-Renew: {subscription.autoRenew ? 'Yes' : 'No'}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active subscription context found.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entitlements</CardTitle>
          <CardDescription>Plan-level feature flags and limits currently effective for your tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={['Feature', 'Enabled', 'Limit']}
            rows={Object.entries(entitlements?.features ?? {}).map(([featureKey, config]) => [
              featureKey,
              (config as any).enabled ? 'Yes' : 'No',
              (config as any).limitValue ?? '-'
            ])}
            emptyMessage="No feature flags mapped to current plan."
          />
        </CardContent>
      </Card>
    </div>
  );
}

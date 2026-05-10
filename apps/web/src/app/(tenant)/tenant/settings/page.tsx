'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/api/client';
import { resolveCurrencyCode } from '@/lib/utils/currency';

type SettingsForm = {
  businessName: string;
  taxRate: number;
  currency: string;
  timezone: string;
  receiptFooter: string;
};

function parseRequestError(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Request failed';
  }

  const fallback = error.message || 'Request failed';
  try {
    const parsed = JSON.parse(error.message) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) {
      return parsed.message.join(', ');
    }
    if (typeof parsed.message === 'string') {
      return parsed.message;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsForm>({
    businessName: '',
    taxRate: 5,
    currency: 'NPR',
    timezone: 'UTC',
    receiptFooter: 'Thank you for shopping with us!'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiRequest<Partial<SettingsForm>>('/settings')
      .then((data) => {
        if (!data) {
          return;
        }

        setForm({
          businessName: data.businessName ?? '',
          taxRate: Number(data.taxRate ?? 0),
          currency: resolveCurrencyCode(data.currency),
          timezone: data.timezone ?? 'UTC',
          receiptFooter: data.receiptFooter ?? ''
        });
      })
      .catch((requestError) => {
        setError(parseRequestError(requestError));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiRequest('/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          ...form,
          currency: form.currency.trim().toUpperCase(),
          timezone: form.timezone.trim(),
          businessName: form.businessName.trim(),
          receiptFooter: form.receiptFooter.trim()
        })
      });

      setMessage('Settings saved successfully.');
    } catch (requestError) {
      setError(parseRequestError(requestError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading settings...</p>;
  }

  return (
    <div className="space-y-6">
      {error ? <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p> : null}
      {message ? <p className="rounded-md bg-primary/10 p-2 text-sm text-primary">{message}</p> : null}

      <form className="space-y-4" onSubmit={submit}>
        <Card>
          <CardHeader>
            <CardTitle>Business Profile</CardTitle>
            <CardDescription>Core business information shown across the workspace and receipts.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Business Name</label>
              <Input
                placeholder="Sunrise Mart"
                value={form.businessName}
                onChange={(event) =>
                  setForm((state) => ({ ...state, businessName: event.target.value }))
                }
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tax & Region</CardTitle>
            <CardDescription>Configure tax behavior, currency, and local time settings.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tax Rate (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={form.taxRate || ''}
                onChange={(event) =>
                  setForm((state) => ({ ...state, taxRate: Number(event.target.value || 0) }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Currency Code</label>
              <Input
                placeholder="NPR"
                value={form.currency}
                onChange={(event) =>
                  setForm((state) => ({ ...state, currency: event.target.value.toUpperCase() }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Timezone</label>
              <Input
                placeholder="UTC"
                value={form.timezone}
                onChange={(event) => setForm((state) => ({ ...state, timezone: event.target.value }))}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receipt Settings</CardTitle>
            <CardDescription>Customize what appears at the bottom of every printed receipt.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Receipt Footer</label>
              <Textarea
                rows={3}
                placeholder="Thank you for shopping with us!"
                value={form.receiptFooter}
                onChange={(event) =>
                  setForm((state) => ({ ...state, receiptFooter: event.target.value }))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Button disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button>
      </form>
    </div>
  );
}

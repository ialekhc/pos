'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/api/client';
import { resolveCurrencyCode } from '@/lib/utils/currency';

const FIXED_VAT_PERCENT = 13;

type SettingsForm = {
  businessName: string;
  taxRate: number;
  currency: string;
  timezone: string;
  receiptFooter: string;
  logoUrl: string;
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
  headerNote: string;
};

type SettingsResponse = {
  businessName?: string;
  taxRate?: number;
  currency?: string;
  timezone?: string;
  receiptFooter?: string;
  logoUrl?: string | null;
  receiptConfig?: Record<string, unknown> | null;
};

function readConfigString(config: Record<string, unknown> | null | undefined, key: string) {
  const value = config?.[key];
  return typeof value === 'string' ? value : '';
}

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
    taxRate: FIXED_VAT_PERCENT,
    currency: 'NPR',
    timezone: 'UTC',
    receiptFooter: 'Thank you for shopping with us!',
    logoUrl: '',
    contactPhone: '',
    contactEmail: '',
    contactAddress: '',
    headerNote: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiRequest<SettingsResponse>('/settings')
      .then((data) => {
        if (!data) {
          return;
        }

        const receiptConfig =
          data.receiptConfig && typeof data.receiptConfig === 'object' ? data.receiptConfig : null;

        setForm({
          businessName: data.businessName ?? '',
          taxRate: FIXED_VAT_PERCENT,
          currency: resolveCurrencyCode(data.currency),
          timezone: data.timezone ?? 'UTC',
          receiptFooter: data.receiptFooter ?? '',
          logoUrl: data.logoUrl ?? '',
          contactPhone: readConfigString(receiptConfig, 'contactPhone'),
          contactEmail: readConfigString(receiptConfig, 'contactEmail'),
          contactAddress: readConfigString(receiptConfig, 'contactAddress'),
          headerNote: readConfigString(receiptConfig, 'headerNote')
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
          taxRate: FIXED_VAT_PERCENT,
          currency: form.currency.trim().toUpperCase(),
          timezone: form.timezone.trim(),
          businessName: form.businessName.trim(),
          receiptFooter: form.receiptFooter.trim(),
          logoUrl: form.logoUrl.trim(),
          receiptConfig: {
            contactPhone: form.contactPhone.trim(),
            contactEmail: form.contactEmail.trim(),
            contactAddress: form.contactAddress.trim(),
            headerNote: form.headerNote.trim()
          }
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
              <label className="text-xs font-medium text-muted-foreground">VAT Rate (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={form.taxRate || ''}
                readOnly
                disabled
              />
              <p className="text-[11px] text-muted-foreground">
                VAT rate is fixed at 13%. During billing, you can choose With VAT or Without VAT per bill.
              </p>
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
            <CardDescription>Customize how your printed bills look for customers.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Logo URL</label>
              <Input
                placeholder="https://example.com/logo.png"
                value={form.logoUrl}
                onChange={(event) => setForm((state) => ({ ...state, logoUrl: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Header Note</label>
              <Input
                placeholder="Authorized dealer of genuine parts"
                value={form.headerNote}
                onChange={(event) => setForm((state) => ({ ...state, headerNote: event.target.value }))}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Contact Phone</label>
                <Input
                  placeholder="+977-98XXXXXXXX"
                  value={form.contactPhone}
                  onChange={(event) =>
                    setForm((state) => ({ ...state, contactPhone: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Contact Email</label>
                <Input
                  placeholder="support@yourstore.com"
                  value={form.contactEmail}
                  onChange={(event) =>
                    setForm((state) => ({ ...state, contactEmail: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Contact Address</label>
              <Textarea
                rows={2}
                placeholder="Kalanki, Kathmandu, Nepal"
                value={form.contactAddress}
                onChange={(event) =>
                  setForm((state) => ({ ...state, contactAddress: event.target.value }))
                }
              />
            </div>
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

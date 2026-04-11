'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/api/client';

export default function SettingsPage() {
  const [form, setForm] = useState({
    businessName: '',
    taxRate: 5,
    currency: 'USD',
    timezone: 'UTC',
    receiptFooter: 'Thank you for shopping with us!'
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<any>('/settings')
      .then((data) => {
        if (!data) {
          return;
        }

        setForm({
          businessName: data.businessName ?? '',
          taxRate: Number(data.taxRate ?? 0),
          currency: data.currency ?? 'USD',
          timezone: data.timezone ?? 'UTC',
          receiptFooter: data.receiptFooter ?? ''
        });
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : 'Failed to load settings');
      });
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    await apiRequest('/settings', {
      method: 'PATCH',
      body: JSON.stringify(form)
    });

    setMessage('Settings saved successfully.');
    setError(null);
  };

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="rounded-md bg-primary/10 p-2 text-sm text-primary">{message}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Business Settings</CardTitle>
          <CardDescription>Manage tax, receipt, currency, timezone, and brand defaults.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={submit}>
            <Input
              placeholder="Business name"
              value={form.businessName}
              onChange={(event) => setForm((state) => ({ ...state, businessName: event.target.value }))}
            />
            <Input
              type="number"
              placeholder="Tax rate"
              value={form.taxRate || ''}
              onChange={(event) => setForm((state) => ({ ...state, taxRate: Number(event.target.value || 0) }))}
            />
            <Input
              placeholder="Currency"
              value={form.currency}
              onChange={(event) => setForm((state) => ({ ...state, currency: event.target.value }))}
            />
            <Input
              placeholder="Timezone"
              value={form.timezone}
              onChange={(event) => setForm((state) => ({ ...state, timezone: event.target.value }))}
            />
            <div className="md:col-span-2">
              <Textarea
                placeholder="Receipt footer"
                value={form.receiptFooter}
                onChange={(event) => setForm((state) => ({ ...state, receiptFooter: event.target.value }))}
              />
            </div>
            <Button className="md:col-span-2">Save Settings</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

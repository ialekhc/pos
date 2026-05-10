'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/layout/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/api/client';
import { Party, PartyType } from '@/lib/types';
import { useSessionStore } from '@/lib/stores/use-session-store';

type PartyForm = {
  id?: string;
  type: PartyType;
  name: string;
  phone: string;
  email: string;
  address: string;
  taxId: string;
  defaultPercent: number;
  notes: string;
  isActive: boolean;
};

const EMPTY_FORM: PartyForm = {
  type: 'CLIENT',
  name: '',
  phone: '',
  email: '',
  address: '',
  taxId: '',
  defaultPercent: 0,
  notes: '',
  isActive: true
};

function errorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Request failed';
  }
  return error.message || 'Request failed';
}

function normalizeForm(form: PartyForm) {
  return {
    type: form.type,
    name: form.name.trim(),
    phone: form.phone.trim() || undefined,
    email: form.email.trim() || undefined,
    address: form.address.trim() || undefined,
    taxId: form.taxId.trim() || undefined,
    defaultPercent: form.defaultPercent,
    notes: form.notes.trim() || undefined,
    isActive: form.isActive
  };
}

export default function PartiesPage() {
  const role = useSessionStore((state) => state.user?.role);
  const canWrite = role === 'TENANT_ADMIN' || role === 'MANAGER';
  const canDelete = role === 'TENANT_ADMIN';

  const [parties, setParties] = useState<Party[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | PartyType>('ALL');
  const [form, setForm] = useState<PartyForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadParties = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rows = await apiRequest<Party[]>('/parties?includeInactive=true');
      setParties(rows);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadParties();
  }, []);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return parties
      .filter((party) => (filterType === 'ALL' ? true : party.type === filterType))
      .filter((party) => {
        if (!query) {
          return true;
        }

        return [party.name, party.phone || '', party.email || '', party.taxId || '']
          .some((value) => value.toLowerCase().includes(query));
      });
  }, [parties, search, filterType]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError('Party name is required.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      if (form.id) {
        await apiRequest(`/parties/${form.id}`, {
          method: 'PATCH',
          body: JSON.stringify(normalizeForm(form))
        });
        setNotice('Party updated successfully.');
      } else {
        await apiRequest('/parties', {
          method: 'POST',
          body: JSON.stringify(normalizeForm(form))
        });
        setNotice('Party created successfully.');
      }

      setForm(EMPTY_FORM);
      await loadParties();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (party: Party) => {
    setForm({
      id: party.id,
      type: party.type,
      name: party.name,
      phone: party.phone || '',
      email: party.email || '',
      address: party.address || '',
      taxId: party.taxId || '',
      defaultPercent: Number(party.defaultPercent || 0),
      notes: party.notes || '',
      isActive: party.isActive
    });
    setError(null);
    setNotice(`Editing ${party.name}`);
  };

  const removeParty = async (partyId: string) => {
    setError(null);
    setNotice(null);

    try {
      await apiRequest(`/parties/${partyId}`, {
        method: 'DELETE'
      });
      setNotice('Party removed successfully.');
      if (form.id === partyId) {
        setForm(EMPTY_FORM);
      }
      await loadParties();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>
      ) : null}
      {notice ? (
        <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">{notice}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{form.id ? 'Edit Party' : 'Create Vendor / Client'}</CardTitle>
          <CardDescription>
            Store vendor/client details and default percentage so POS and inventory can apply it every time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={submit}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.type}
                onChange={(event) => setForm((state) => ({ ...state, type: event.target.value as PartyType }))}
                disabled={!canWrite}
              >
                <option value="CLIENT">Client (Selling)</option>
                <option value="VENDOR">Vendor (Buying)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <Input
                value={form.name}
                onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
                disabled={!canWrite}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Phone</label>
              <Input
                value={form.phone}
                onChange={(event) => setForm((state) => ({ ...state, phone: event.target.value }))}
                disabled={!canWrite}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))}
                disabled={!canWrite}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tax ID / PAN / VAT</label>
              <Input
                value={form.taxId}
                onChange={(event) => setForm((state) => ({ ...state, taxId: event.target.value }))}
                disabled={!canWrite}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Default Percent (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={form.defaultPercent}
                onChange={(event) =>
                  setForm((state) => ({ ...state, defaultPercent: Number(event.target.value || 0) }))
                }
                disabled={!canWrite}
              />
            </div>

            <div className="space-y-1.5 xl:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Address</label>
              <Input
                value={form.address}
                onChange={(event) => setForm((state) => ({ ...state, address: event.target.value }))}
                disabled={!canWrite}
              />
            </div>

            <div className="space-y-1.5 xl:col-span-4">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(event) => setForm((state) => ({ ...state, notes: event.target.value }))}
                disabled={!canWrite}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.isActive ? 'ACTIVE' : 'INACTIVE'}
                onChange={(event) =>
                  setForm((state) => ({ ...state, isActive: event.target.value === 'ACTIVE' }))
                }
                disabled={!canWrite}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div className="md:col-span-2 xl:col-span-4 flex flex-wrap gap-2">
              <Button disabled={!canWrite || isSaving}>{isSaving ? 'Saving...' : form.id ? 'Update Party' : 'Create Party'}</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setForm(EMPTY_FORM)}
                disabled={!canWrite || isSaving}
              >
                Clear Form
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Party Directory</CardTitle>
          <CardDescription>Manage all vendors and clients used in billing and inventory.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Search</label>
              <Input
                placeholder="Name, phone, email, tax ID"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Type Filter</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={filterType}
                onChange={(event) => setFilterType(event.target.value as 'ALL' | PartyType)}
              >
                <option value="ALL">All</option>
                <option value="CLIENT">Client</option>
                <option value="VENDOR">Vendor</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => void loadParties()} disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Reload'}
              </Button>
            </div>
          </div>

          <DataTable
            headers={['Type', 'Name', 'Phone', 'Email', 'Tax ID', 'Default %', 'Status', 'Actions']}
            rows={visibleRows.map((party) => [
              party.type,
              party.name,
              party.phone || '-',
              party.email || '-',
              party.taxId || '-',
              `${Number(party.defaultPercent || 0).toFixed(2)}%`,
              <Badge key={`${party.id}-status`} variant={party.isActive ? 'default' : 'secondary'}>
                {party.isActive ? 'Active' : 'Inactive'}
              </Badge>,
              <div key={`${party.id}-actions`} className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(party)} disabled={!canWrite}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void removeParty(party.id)}
                  disabled={!canDelete}
                >
                  Delete
                </Button>
              </div>
            ])}
            emptyMessage="No party records found for the selected filters."
          />
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/layout/data-table';
import { apiRequest } from '@/lib/api/client';

type TenantOption = {
  id: string;
  name: string;
  slug: string;
};

type RoleOption = {
  id: string;
  code: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'MANAGER' | 'CASHIER';
  name: string;
  tenantId: string | null;
};

type UserRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  tenantId: string | null;
  isActive: boolean;
  role: {
    id: string;
    code: string;
    name: string;
  };
  tenant?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export default function SuperAdminUsersPage() {
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: 'Password@123',
    role: 'TENANT_ADMIN' as RoleOption['code']
  });

  const roleOptions = useMemo(() => {
    const seen = new Set<string>();
    return roles.filter((role) => {
      if (seen.has(role.code)) {
        return false;
      }
      seen.add(role.code);
      return true;
    });
  }, [roles]);

  const loadTenants = async () => {
    const rows = await apiRequest<TenantOption[]>('/tenants');
    setTenants(rows);
    if (rows.length && selectedTenantId === 'all') {
      setSelectedTenantId(rows[0].id);
    }
  };

  const loadUsers = async (tenantId: string) => {
    const query = tenantId === 'all' ? '' : `?tenantId=${tenantId}`;
    const rows = await apiRequest<UserRow[]>(`/users${query}`);
    setUsers(rows);
  };

  const loadRoles = async (tenantId: string) => {
    const query = tenantId === 'all' ? '' : `?tenantId=${tenantId}`;
    const rows = await apiRequest<RoleOption[]>(`/users/roles${query}`);
    setRoles(rows);
    if (!rows.find((row) => row.code === form.role)) {
      setForm((state) => ({ ...state, role: rows[0]?.code ?? 'TENANT_ADMIN' }));
    }
  };

  const loadAll = async (tenantId: string) => {
    try {
      await Promise.all([loadUsers(tenantId), loadRoles(tenantId)]);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load users');
    }
  };

  useEffect(() => {
    loadTenants().catch((requestError) =>
      setError(requestError instanceof Error ? requestError.message : 'Failed to load tenants')
    );
  }, []);

  useEffect(() => {
    loadAll(selectedTenantId);
  }, [selectedTenantId]);

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          role: form.role,
          tenantId: form.role === 'SUPER_ADMIN' || selectedTenantId === 'all' ? undefined : selectedTenantId
        })
      });

      setForm({
        firstName: '',
        lastName: '',
        email: '',
        password: 'Password@123',
        role: 'TENANT_ADMIN'
      });
      setMessage('User created.');
      await loadAll(selectedTenantId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (user: UserRow) => {
    try {
      await apiRequest(`/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !user.isActive })
      });
      setMessage(`User ${!user.isActive ? 'activated' : 'deactivated'}.`);
      setError(null);
      await loadAll(selectedTenantId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to update user');
    }
  };

  const resetPassword = async (user: UserRow) => {
    const nextPassword = window.prompt(`Set a new password for ${user.email}`, 'Password@123');
    if (!nextPassword) {
      return;
    }

    try {
      await apiRequest(`/users/${user.id}/reset-password`, {
        method: 'PATCH',
        body: JSON.stringify({ password: nextPassword })
      });
      setMessage('Password reset completed.');
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to reset password');
    }
  };

  return (
    <div className="space-y-6">
      {error ? <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}
      {message ? <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">{message}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>User Provisioning</CardTitle>
          <CardDescription>Create platform users or tenant staff with role-based access.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tenant Scope</p>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedTenantId}
                onChange={(event) => setSelectedTenantId(event.target.value)}
              >
                <option value="all">All tenants (global view)</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} ({tenant.slug})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <form className="grid gap-3 md:grid-cols-3" onSubmit={createUser}>
            <Input
              placeholder="First name"
              value={form.firstName}
              onChange={(event) => setForm((state) => ({ ...state, firstName: event.target.value }))}
              required
            />
            <Input
              placeholder="Last name"
              value={form.lastName}
              onChange={(event) => setForm((state) => ({ ...state, lastName: event.target.value }))}
              required
            />
            <Input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(event) => setForm((state) => ({ ...state, password: event.target.value }))}
              required
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.role}
              onChange={(event) => setForm((state) => ({ ...state, role: event.target.value as RoleOption['code'] }))}
            >
              {roleOptions.map((role) => (
                <option key={role.id} value={role.code}>
                  {role.name} ({role.code})
                </option>
              ))}
            </select>
            <Button disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create User'}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Activate/deactivate accounts and run operational resets quickly.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={['Name', 'Email', 'Role', 'Tenant', 'Status', 'Actions']}
            rows={users.map((user) => [
              `${user.firstName} ${user.lastName}`,
              user.email,
              user.role.name,
              user.tenant ? `${user.tenant.name} (${user.tenant.slug})` : 'Platform',
              <Badge key={`${user.id}-status`} variant={user.isActive ? 'default' : 'secondary'}>
                {user.isActive ? 'Active' : 'Inactive'}
              </Badge>,
              <div key={`${user.id}-actions`} className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => toggleActive(user)}>
                  {user.isActive ? 'Deactivate' : 'Activate'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => resetPassword(user)}>
                  Reset Password
                </Button>
              </div>
            ])}
          />
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/layout/data-table';
import { apiRequest } from '@/lib/api/client';

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  role: {
    code: string;
    name: string;
  };
};

export default function StaffPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: 'Password@123',
    role: 'CASHIER'
  });

  const loadUsers = async () => {
    try {
      const rows = await apiRequest<User[]>('/users');
      setUsers(rows);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load users');
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const createUser = async (event: FormEvent) => {
    event.preventDefault();

    await apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(form)
    });

    setForm({
      firstName: '',
      lastName: '',
      email: '',
      password: 'Password@123',
      role: 'CASHIER'
    });

    await loadUsers();
  };

  const deactivate = async (id: string) => {
    await apiRequest(`/users/${id}`, {
      method: 'DELETE'
    });
    await loadUsers();
  };

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Add Staff Member</CardTitle>
        </CardHeader>
        <CardContent>
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
              onChange={(event) => setForm((state) => ({ ...state, role: event.target.value }))}
            >
              <option value="TENANT_ADMIN">Tenant Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="CASHIER">Cashier</option>
            </select>
            <Button>Add User</Button>
          </form>
        </CardContent>
      </Card>

      <DataTable
        headers={['Name', 'Email', 'Role', 'Status', 'Actions']}
        rows={users.map((user) => [
          `${user.firstName} ${user.lastName}`,
          user.email,
          user.role.name,
          user.isActive ? 'Active' : 'Inactive',
          <Button key={`${user.id}-remove`} variant="outline" size="sm" onClick={() => deactivate(user.id)}>
            Deactivate
          </Button>
        ])}
      />
    </div>
  );
}

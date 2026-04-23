'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/layout/data-table';
import { apiRequest } from '@/lib/api/client';

type RoleOption = {
  id: string;
  code: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'MANAGER' | 'CASHIER';
  name: string;
};

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
  role: {
    id: string;
    code: string;
    name: string;
  };
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

export default function StaffPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: 'Password@123',
    role: 'CASHIER'
  });

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    roleId: '',
    isActive: true
  });

  const roleOptions = useMemo(
    () => roles.filter((role) => role.code !== 'SUPER_ADMIN'),
    [roles]
  );

  const loadUsers = async () => {
    const rows = await apiRequest<User[]>('/users');
    setUsers(rows);
  };

  const loadRoles = async () => {
    const rows = await apiRequest<RoleOption[]>('/users/roles');
    setRoles(rows);
  };

  const loadData = async () => {
    try {
      await Promise.all([loadUsers(), loadRoles()]);
      setError(null);
    } catch (requestError) {
      setError(parseRequestError(requestError));
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const createUser = async (event: FormEvent) => {
    event.preventDefault();

    setIsCreating(true);
    setError(null);
    setNotice(null);
    try {
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
      setNotice('Staff member created.');
    } catch (requestError) {
      setError(parseRequestError(requestError));
    } finally {
      setIsCreating(false);
    }
  };

  const startEdit = (user: User) => {
    setEditingUserId(user.id);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? '',
      roleId: user.role.id,
      isActive: user.isActive
    });
    setError(null);
    setNotice(null);
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setEditForm({
      firstName: '',
      lastName: '',
      phone: '',
      roleId: '',
      isActive: true
    });
  };

  const updateUser = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingUserId) {
      return;
    }

    setIsUpdating(true);
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/users/${editingUserId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: editForm.firstName.trim() || undefined,
          lastName: editForm.lastName.trim() || undefined,
          phone: editForm.phone.trim() || undefined,
          roleId: editForm.roleId || undefined,
          isActive: editForm.isActive
        })
      });
      await loadUsers();
      cancelEdit();
      setNotice('Staff member updated.');
    } catch (requestError) {
      setError(parseRequestError(requestError));
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleActive = async (user: User) => {
    setBusyUserId(user.id);
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          isActive: !user.isActive
        })
      });
      await loadUsers();
      setNotice(`Staff member ${!user.isActive ? 'activated' : 'deactivated'}.`);
    } catch (requestError) {
      setError(parseRequestError(requestError));
    } finally {
      setBusyUserId(null);
    }
  };

  const resetPassword = async (user: User) => {
    const nextPassword = window.prompt(`Set a new password for ${user.email}`, 'Password@123');
    if (!nextPassword) {
      return;
    }

    setBusyUserId(user.id);
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/users/${user.id}/reset-password`, {
        method: 'PATCH',
        body: JSON.stringify({ password: nextPassword })
      });
      setNotice('Password reset completed.');
    } catch (requestError) {
      setError(parseRequestError(requestError));
    } finally {
      setBusyUserId(null);
    }
  };

  const removeUser = async (user: User) => {
    const confirmed = window.confirm(`Remove staff account "${user.email}"?`);
    if (!confirmed) {
      return;
    }

    setBusyUserId(user.id);
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/users/${user.id}`, {
        method: 'DELETE'
      });
      await loadUsers();
      if (editingUserId === user.id) {
        cancelEdit();
      }
      setNotice('Staff member removed.');
    } catch (requestError) {
      setError(parseRequestError(requestError));
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      {error ? <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p> : null}
      {notice ? <p className="rounded-md bg-primary/10 p-2 text-sm text-primary">{notice}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Add Staff Member</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={createUser}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">First Name</label>
              <Input
                value={form.firstName}
                onChange={(event) => setForm((state) => ({ ...state, firstName: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Last Name</label>
              <Input
                value={form.lastName}
                onChange={(event) => setForm((state) => ({ ...state, lastName: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <Input
                type="password"
                value={form.password}
                onChange={(event) => setForm((state) => ({ ...state, password: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.role}
                onChange={(event) => setForm((state) => ({ ...state, role: event.target.value }))}
              >
                <option value="TENANT_ADMIN">Tenant Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="CASHIER">Cashier</option>
              </select>
            </div>
            <Button className="md:col-span-3" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Add User'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {editingUserId ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Staff Member</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-3" onSubmit={updateUser}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">First Name</label>
                <Input
                  value={editForm.firstName}
                  onChange={(event) =>
                    setEditForm((state) => ({ ...state, firstName: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Last Name</label>
                <Input
                  value={editForm.lastName}
                  onChange={(event) =>
                    setEditForm((state) => ({ ...state, lastName: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Phone (Optional)</label>
                <Input
                  value={editForm.phone}
                  onChange={(event) =>
                    setEditForm((state) => ({ ...state, phone: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={editForm.roleId}
                  onChange={(event) =>
                    setEditForm((state) => ({ ...state, roleId: event.target.value }))
                  }
                >
                  {roleOptions.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name} ({role.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={editForm.isActive ? 'active' : 'inactive'}
                  onChange={(event) =>
                    setEditForm((state) => ({ ...state, isActive: event.target.value === 'active' }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="md:col-span-3 flex flex-wrap gap-2">
                <Button disabled={isUpdating}>{isUpdating ? 'Saving...' : 'Save Changes'}</Button>
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Staff List</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={['Name', 'Email', 'Phone', 'Role', 'Status', 'Actions']}
            rows={users.map((user) => [
              `${user.firstName} ${user.lastName}`,
              user.email,
              user.phone ?? '-',
              user.role.name,
              user.isActive ? 'Active' : 'Inactive',
              <div key={`${user.id}-actions`} className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(user)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyUserId === user.id}
                  onClick={() => toggleActive(user)}
                >
                  {user.isActive ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyUserId === user.id}
                  onClick={() => resetPassword(user)}
                >
                  Reset Password
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyUserId === user.id}
                  onClick={() => removeUser(user)}
                >
                  Remove
                </Button>
              </div>
            ])}
          />
        </CardContent>
      </Card>
    </div>
  );
}

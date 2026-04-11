'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/lib/stores/use-session-store';
import { apiRequest } from '@/lib/api/client';
import { AuthPayload } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const setSession = useSessionStore((state) => state.setSession);

  const [email, setEmail] = useState('superadmin@platform.local');
  const [password, setPassword] = useState('SuperSecure123!');
  const [tenantSlug, setTenantSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSuperAdminDemo = () => {
    setEmail('superadmin@platform.local');
    setPassword('SuperSecure123!');
    setTenantSlug('');
  };

  const loadTenantDemo = () => {
    setEmail('admin@sunrise-mart.local');
    setPassword('Password@123');
    setTenantSlug('sunrise-mart');
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = await apiRequest<AuthPayload>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          tenantSlug: tenantSlug || undefined
        })
      });

      setSession(payload);

      if (payload.user.role === 'SUPER_ADMIN') {
        router.push('/super-admin/dashboard');
      } else {
        router.push('/tenant/dashboard');
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-white/60 bg-white/90 shadow-xl">
      <CardHeader>
        <CardTitle>POS Cloud Login</CardTitle>
        <CardDescription>
          Sign in with your super admin or tenant credentials to open your workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={loadSuperAdminDemo}>
            Use Super Admin
          </Button>
          <Button type="button" variant="outline" onClick={loadTenantDemo}>
            Use Tenant Admin
          </Button>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tenant Slug (optional for super admin)</label>
            <Input
              type="text"
              value={tenantSlug}
              onChange={(event) => setTenantSlug(event.target.value)}
              placeholder="sunrise-mart"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <div className="mt-4 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Demo credentials</p>
          <p>
            Super Admin: <code>superadmin@platform.local</code> / <code>SuperSecure123!</code>
          </p>
          <p>
            Tenant Admin: <code>admin@sunrise-mart.local</code> / <code>Password@123</code>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

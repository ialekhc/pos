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
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedTenantSlug = tenantSlug.trim().toLowerCase();
      const isLikelySuperAdmin = normalizedEmail.endsWith('@platform.local');

      const payload = await apiRequest<AuthPayload>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          tenantSlug: !isLikelySuperAdmin && normalizedTenantSlug ? normalizedTenantSlug : undefined
        })
      });

      setSession(payload);

      if (payload.user.role === 'SUPER_ADMIN') {
        router.push('/super-admin/dashboard');
      } else {
        router.push('/tenant/dashboard');
      }
    } catch (submitError) {
      if (submitError instanceof Error) {
        let message = submitError.message;
        try {
          const parsed = JSON.parse(submitError.message) as { message?: string | string[] };
          if (Array.isArray(parsed.message)) {
            message = parsed.message.join(', ');
          } else if (typeof parsed.message === 'string') {
            message = parsed.message;
          }
        } catch {
          // Keep original text when response is not JSON.
        }
        setError(message);
      } else {
        setError('Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-white/60 bg-white/90 shadow-xl">
      <CardHeader>
        <CardTitle>POS Cloud Login</CardTitle>
        <CardDescription>
          Sign in with your super admin or vendor credentials to open your workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={loadSuperAdminDemo}>
            Use Super Admin
          </Button>
          <Button type="button" variant="outline" onClick={loadTenantDemo}>
            Use Vendor Admin
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
            <label className="text-sm font-medium">Vendor Slug (optional for super admin)</label>
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
            Vendor Admin: <code>admin@sunrise-mart.local</code> / <code>Password@123</code>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

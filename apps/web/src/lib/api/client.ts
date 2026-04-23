'use client';

import { useSessionStore } from '@/lib/stores/use-session-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const state = useSessionStore.getState();
  const token = state.accessToken;
  const tenantId = state.user?.tenantId;

  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (tenantId) {
    headers.set('x-tenant-id', tenantId);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store'
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? '';
    let message = `Request failed: ${response.status}`;

    if (contentType.includes('application/json')) {
      const payload = (await response.json().catch(() => null)) as
        | { message?: string | string[]; error?: string }
        | null;

      if (payload) {
        if (Array.isArray(payload.message) && payload.message.length) {
          message = payload.message.join(', ');
        } else if (typeof payload.message === 'string' && payload.message.trim()) {
          message = payload.message;
        } else if (typeof payload.error === 'string' && payload.error.trim()) {
          message = payload.error;
        }
      }
    } else {
      const text = await response.text();
      if (text.trim()) {
        try {
          const parsed = JSON.parse(text) as { message?: string | string[]; error?: string };
          if (Array.isArray(parsed.message) && parsed.message.length) {
            message = parsed.message.join(', ');
          } else if (typeof parsed.message === 'string' && parsed.message.trim()) {
            message = parsed.message;
          } else if (typeof parsed.error === 'string' && parsed.error.trim()) {
            message = parsed.error;
          } else {
            message = text;
          }
        } catch {
          message = text;
        }
      }
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

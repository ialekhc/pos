'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SessionUser } from '@/lib/types';

type SessionState = {
  hasHydrated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  setHasHydrated: (value: boolean) => void;
  setSession: (payload: {
    accessToken: string;
    refreshToken: string;
    user: SessionUser;
  }) => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      accessToken: null,
      refreshToken: null,
      user: null,
      setHasHydrated: (value) =>
        set({
          hasHydrated: value
        }),
      setSession: ({ accessToken, refreshToken, user }) =>
        set({
          accessToken,
          refreshToken,
          user
        }),
      clearSession: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null
        })
    }),
    {
      name: 'pos-session-store',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);

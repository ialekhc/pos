'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useSessionStore } from '@/lib/stores/use-session-store';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3001';

type UseRealtimeSyncParams = {
  onInventoryUpdated?: (payload: unknown) => void;
  onSaleCreated?: (payload: unknown) => void;
  onDashboardMetrics?: (payload: unknown) => void;
};

export function useRealtimeSync(params: UseRealtimeSyncParams) {
  const accessToken = useSessionStore((state) => state.accessToken);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const socket = io(`${SOCKET_URL}/sync`, {
      auth: {
        token: accessToken
      },
      extraHeaders: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (params.onInventoryUpdated) {
      socket.on('inventory.updated', params.onInventoryUpdated);
    }

    if (params.onSaleCreated) {
      socket.on('sale.created', params.onSaleCreated);
    }

    if (params.onDashboardMetrics) {
      socket.on('dashboard.metrics', params.onDashboardMetrics);
    }

    return () => {
      socket.disconnect();
    };
  }, [accessToken, params.onInventoryUpdated, params.onSaleCreated, params.onDashboardMetrics]);
}

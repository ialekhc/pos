'use client';

import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type CartLine = {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
};

type HoldCartDraft = {
  id: string;
  name?: string;
  items: CartLine[];
  createdAt: string;
};

type OfflineCartState = {
  currentCart: CartLine[];
  heldCarts: HoldCartDraft[];
  addItem: (line: Omit<CartLine, 'quantity'>) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  holdCart: (name?: string) => void;
  resumeHold: (id: string) => void;
  clearHold: (id: string) => void;
};

const useOfflineCartStore = create<OfflineCartState>()(
  persist(
    (set, get) => ({
      currentCart: [],
      heldCarts: [],
      addItem: (line) =>
        set((state) => {
          const existing = state.currentCart.find((item) => item.productId === line.productId);
          if (existing) {
            return {
              currentCart: state.currentCart.map((item) =>
                item.productId === line.productId ? { ...item, quantity: item.quantity + 1 } : item
              )
            };
          }

          return {
            currentCart: [...state.currentCart, { ...line, quantity: 1 }]
          };
        }),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          currentCart: state.currentCart
            .map((item) => (item.productId === productId ? { ...item, quantity } : item))
            .filter((item) => item.quantity > 0)
        })),
      removeItem: (productId) =>
        set((state) => ({
          currentCart: state.currentCart.filter((item) => item.productId !== productId)
        })),
      clear: () => set({ currentCart: [] }),
      holdCart: (name) => {
        const currentCart = get().currentCart;
        if (!currentCart.length) {
          return;
        }

        set((state) => ({
          heldCarts: [
            {
              id: crypto.randomUUID(),
              name,
              items: currentCart,
              createdAt: new Date().toISOString()
            },
            ...state.heldCarts
          ],
          currentCart: []
        }));
      },
      resumeHold: (id) =>
        set((state) => {
          const hold = state.heldCarts.find((item) => item.id === id);
          if (!hold) {
            return state;
          }

          return {
            currentCart: hold.items,
            heldCarts: state.heldCarts.filter((item) => item.id !== id)
          };
        }),
      clearHold: (id) =>
        set((state) => ({
          heldCarts: state.heldCarts.filter((item) => item.id !== id)
        }))
    }),
    {
      name: 'pos-offline-cart'
    }
  )
);

export function useOfflineCart() {
  const state = useOfflineCartStore();

  const subtotal = useMemo(
    () => state.currentCart.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [state.currentCart]
  );
  const tax = useMemo(() => subtotal * 0.05, [subtotal]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  return {
    ...state,
    subtotal,
    tax,
    total
  };
}

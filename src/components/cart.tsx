'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type CartLine = {
  variantId: string;
  qty: number;
  // display snapshot only. The server always re-prices from the database.
  name: string;
  label: string;
  pricePaise: number;
  image: string | null;
  slug: string;
};

type CartCtx = {
  lines: CartLine[];
  count: number;
  ready: boolean;
  add: (line: Omit<CartLine, 'qty'>, qty?: number) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = 'raazwood.cart.v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartLine[];
        if (Array.isArray(parsed)) setLines(parsed.filter((l) => l && typeof l.variantId === 'string' && l.qty > 0));
      }
    } catch {
      /* storage unavailable or corrupt: start with an empty cart */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines, ready]);

  const add = useCallback<CartCtx['add']>((line, qty = 1) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.variantId === line.variantId);
      if (i === -1) return [...prev, { ...line, qty: Math.min(qty, 20) }];
      const next = [...prev];
      next[i] = { ...next[i], ...line, qty: Math.min(next[i].qty + qty, 20) };
      return next;
    });
  }, []);
  const setQty = useCallback((id: string, qty: number) => {
    setLines((prev) => (qty < 1 ? prev.filter((l) => l.variantId !== id) : prev.map((l) => (l.variantId === id ? { ...l, qty: Math.min(qty, 20) } : l))));
  }, []);
  const remove = useCallback((id: string) => setLines((p) => p.filter((l) => l.variantId !== id)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({ lines, ready, count: lines.reduce((s, l) => s + l.qty, 0), add, setQty, remove, clear }),
    [lines, ready, add, setQty, remove, clear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCart must be used inside CartProvider');
  return c;
}

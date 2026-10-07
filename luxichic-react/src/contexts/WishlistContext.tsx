import React, { createContext, useContext } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface WishlistContextValue {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => boolean;
  remove: (id: string) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: {children: React.ReactNode;}) {
  const [ids, setIds] = useLocalStorage<string[]>('lx_wishlist', []);

  const has = (id: string) => ids.includes(id);
  const toggle = (id: string) => {
    const adding = !ids.includes(id);
    setIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]);
    return adding;
  };

  return (
    <WishlistContext.Provider value={{ ids, has, toggle, remove: (id) => setIds((prev) => prev.filter((x) => x !== id)) }}>
      {children}
    </WishlistContext.Provider>);

}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
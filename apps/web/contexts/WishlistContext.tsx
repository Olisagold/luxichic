'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { setWishlisted, syncWishlist, type WishlistResult } from '@/lib/wishlist/actions';

interface WishlistContextValue {
  ids: string[];
  /** False until the wishlist has been loaded from the account. */
  ready: boolean;
  signedIn: boolean;
  has: (id: string) => boolean;
  /**
   * Guests can't save: the product is remembered and saved once they sign in. `loading` while the session is
   * still being checked (nothing changes).
   */
  toggle: (id: string) => 'added' | 'removed' | 'sign-in' | 'loading';
  remove: (id: string) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

/**
 * The wishlist is kept on the customer's account (lib/wishlist/actions.ts). Products a guest tries to save are
 * kept in local storage and added to the account when they sign in.
 */
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const [pending, setPending, pendingLoaded] = useLocalStorage<string[]>('lx_wishlist', []);
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const signedIn = !!user;

  // Bumped on every change, so a slower server reply never overwrites a newer change.
  const version = useRef(0);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  const apply = (res: WishlistResult, v: number) => {
    if (version.current !== v) return;
    setIds(res.ids);
    if (res.signedIn) setPending([]);
  };

  useEffect(() => {
    if (!authReady || !pendingLoaded) return;
    if (!user) {
      setIds([]);
      setReady(true);
      return;
    }
    const v = ++version.current;
    syncWishlist(pendingRef.current)
      .then((res) => apply(res, v))
      .catch(() => {})
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the signed-in customer changes
  }, [authReady, pendingLoaded, user?.id]);

  const save = (id: string, saved: boolean) => {
    const v = ++version.current;
    setIds((prev) => (saved ? [id, ...prev.filter((x) => x !== id)] : prev.filter((x) => x !== id)));
    setWishlisted(id, saved)
      .then((res) => {
        if (!res.ok) toast.error(res.error ?? 'We could not update your wishlist.');
        if (res.signedIn) apply(res, v);
      })
      .catch(() => {
        toast.error('We could not update your wishlist. Please check your connection and try again.');
        const again = ++version.current;
        void syncWishlist().then((res) => apply(res, again));
      });
  };

  const has = (id: string) => ids.includes(id);

  const toggle = (id: string) => {
    if (!authReady) return 'loading' as const;
    if (!signedIn) {
      setPending((prev) => (prev.includes(id) ? prev : [id, ...prev]));
      return 'sign-in' as const;
    }
    const adding = !has(id);
    save(id, adding);
    return adding ? ('added' as const) : ('removed' as const);
  };

  return (
    <WishlistContext.Provider value={{ ids, ready, signedIn, has, toggle, remove: (id) => save(id, false) }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}

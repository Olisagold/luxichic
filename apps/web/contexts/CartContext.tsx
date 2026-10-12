'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { CartItem } from '@/types/order';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { businessConfig } from '@/data/config';
import { clampQuantity, toCartLine } from '@/lib/cart/items';
import { addCartItem, clearCart, removeCartItem, syncCart, updateCartItem, type CartResult } from '@/lib/cart/actions';

interface CartContextValue {
  items: CartItem[];
  activeItems: CartItem[];
  savedItems: CartItem[];
  count: number;
  subtotal: number;
  promoCode: string | null;
  discount: number;
  lastAddedKey: string | null;
  addItem: (item: CartItem) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  toggleSaveForLater: (key: string) => void;
  applyPromo: (code: string) => boolean;
  removePromo: () => void;
  clearActive: () => void;
  /** Single item used by "Buy Now" — checked out without touching the cart. */
  buyNowItem: CartItem | null;
  setBuyNowItem: (item: CartItem | null) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function discountFor(subtotal: number, code: string | null): number {
  const promo = businessConfig.promoCodes.find((p) => p.code === code);
  if (!promo || subtotal < (promo.minSpend ?? 0)) return 0;
  if (promo.amount) return Math.min(subtotal, promo.amount);
  return Math.round((subtotal * promo.percent) / 100);
}

/** Applies the same change to a list of items, in the browser (guests) or ahead of the server (signed in). */
const local = {
  add: (item: CartItem) => (prev: CartItem[]) => {
    if (prev.some((i) => i.key === item.key)) {
      return prev.map((i) =>
        i.key === item.key ? { ...i, quantity: clampQuantity(i.quantity + item.quantity), savedForLater: false } : i,
      );
    }
    return [item, ...prev];
  },
  remove: (key: string) => (prev: CartItem[]) => prev.filter((i) => i.key !== key),
  quantity: (key: string, quantity: number) => (prev: CartItem[]) =>
    prev.map((i) => (i.key === key ? { ...i, quantity: clampQuantity(quantity) } : i)),
  toggleSaved: (key: string) => (prev: CartItem[]) =>
    prev.map((i) => (i.key === key ? { ...i, savedForLater: !i.savedForLater } : i)),
  clearActive: () => (prev: CartItem[]) => prev.filter((i) => i.savedForLater),
};

const removedMessage = (n: number) =>
  `${n === 1 ? 'An item' : `${n} items`} in your cart ${n === 1 ? 'is' : 'are'} no longer available and ${n === 1 ? 'was' : 'were'} removed.`;

/**
 * Guests keep the cart in local storage; signed-in customers keep it on their account (lib/cart/actions.ts).
 * On sign-in the guest cart merges into the account. Prices always come back from the server.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const [guestItems, setGuestItems, guestLoaded] = useLocalStorage<CartItem[]>('lx_cart', []);
  const [accountItems, setAccountItems] = useState<CartItem[] | null>(null);
  const [promoCode, setPromoCode] = useLocalStorage<string | null>('lx_promo', null);
  const [lastAddedKey, setLastAddedKey] = useState<string | null>(null);
  const [buyNowItem, setBuyNowItem] = useLocalStorage<CartItem | null>('lx_buynow', null);

  const signedIn = !!user;
  const items = useMemo(() => (signedIn ? (accountItems ?? []) : guestItems), [signedIn, accountItems, guestItems]);

  // Bumped on every change, so a slower server reply never overwrites a newer change.
  const version = useRef(0);
  const guestRef = useRef(guestItems);
  guestRef.current = guestItems;

  const apply = useCallback(
    (res: CartResult, v: number) => {
      if (version.current !== v) return;
      if (res.signedIn) {
        setAccountItems(res.items);
        setGuestItems([]);
      } else {
        setAccountItems(null);
        if (res.ok) setGuestItems(res.items);
      }
      if (res.removed) toast(removedMessage(res.removed));
    },
    [setGuestItems],
  );

  // Once the session is known: reprice the guest cart, or merge it into the account cart.
  useEffect(() => {
    if (!ready || !guestLoaded) return;
    const v = ++version.current;
    syncCart(guestRef.current.map(toCartLine))
      .then((res) => apply(res, v))
      .catch(() => {
        /* offline: keep what the browser has */
      });
  }, [ready, guestLoaded, user?.id, apply]);

  // After a failed save, show what the server actually has.
  const reload = () => {
    const v = ++version.current;
    syncCart([])
      .then((res) => apply(res, v))
      .catch(() => {});
  };

  const change = (next: (prev: CartItem[]) => CartItem[], save: () => Promise<CartResult>) => {
    const v = ++version.current;
    if (!signedIn) return setGuestItems(next);
    setAccountItems((prev) => next(prev ?? []));
    save()
      .then((res) => {
        if (res.ok) return apply(res, v);
        toast.error(res.error ?? 'We could not update your cart.');
        reload();
      })
      .catch(() => {
        toast.error('We could not update your cart. Please check your connection and try again.');
        reload();
      });
  };

  const activeItems = useMemo(() => items.filter((i) => !i.savedForLater), [items]);
  const savedItems = useMemo(() => items.filter((i) => i.savedForLater), [items]);
  const count = activeItems.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = activeItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const discount = discountFor(subtotal, promoCode);

  const addItem = (item: CartItem) => {
    change(local.add(item), () => addCartItem(toCartLine(item)));
    setLastAddedKey(item.key);
  };

  const removeItem = (key: string) => change(local.remove(key), () => removeCartItem(key));

  const updateQuantity = (key: string, quantity: number) =>
    change(local.quantity(key, quantity), () => updateCartItem(key, { quantity }));

  const toggleSaveForLater = (key: string) => {
    const saved = !items.find((i) => i.key === key)?.savedForLater;
    change(local.toggleSaved(key), () => updateCartItem(key, { savedForLater: saved }));
  };

  const applyPromo = (code: string) => {
    const match = businessConfig.promoCodes.find((p) => p.code === code.trim().toUpperCase());
    if (!match) return false;
    setPromoCode(match.code);
    return true;
  };

  const clearActive = () => {
    change(local.clearActive(), clearCart);
    setPromoCode(null);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        activeItems,
        savedItems,
        count,
        subtotal,
        promoCode,
        discount,
        lastAddedKey,
        addItem,
        removeItem,
        updateQuantity,
        toggleSaveForLater,
        applyPromo,
        removePromo: () => setPromoCode(null),
        clearActive,
        buyNowItem,
        setBuyNowItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

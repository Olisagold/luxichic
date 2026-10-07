import React, { createContext, useContext, useMemo, useState } from 'react';
import type { CartItem } from '../types/order';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { businessConfig } from '../data/config';

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
  return Math.round(subtotal * promo.percent / 100);
}

export function CartProvider({ children }: {children: React.ReactNode;}) {
  const [items, setItems] = useLocalStorage<CartItem[]>('lx_cart', []);
  const [promoCode, setPromoCode] = useLocalStorage<string | null>('lx_promo', null);
  const [lastAddedKey, setLastAddedKey] = useState<string | null>(null);
  const [buyNowItem, setBuyNowItem] = useLocalStorage<CartItem | null>('lx_buynow', null);

  const activeItems = useMemo(() => items.filter((i) => !i.savedForLater), [items]);
  const savedItems = useMemo(() => items.filter((i) => i.savedForLater), [items]);
  const count = activeItems.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = activeItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const discount = discountFor(subtotal, promoCode);

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.key === item.key);
      if (existing) {
        return prev.map((i) =>
        i.key === item.key ? { ...i, quantity: Math.min(99, i.quantity + item.quantity), savedForLater: false } : i
        );
      }
      return [item, ...prev];
    });
    setLastAddedKey(item.key);
  };

  const removeItem = (key: string) => setItems((prev) => prev.filter((i) => i.key !== key));

  const updateQuantity = (key: string, quantity: number) =>
  setItems((prev) => prev.map((i) => i.key === key ? { ...i, quantity: Math.max(1, Math.min(99, quantity)) } : i));

  const toggleSaveForLater = (key: string) =>
  setItems((prev) => prev.map((i) => i.key === key ? { ...i, savedForLater: !i.savedForLater } : i));

  const applyPromo = (code: string) => {
    const match = businessConfig.promoCodes.find((p) => p.code === code.trim().toUpperCase());
    if (!match) return false;
    setPromoCode(match.code);
    return true;
  };

  const clearActive = () => {
    setItems((prev) => prev.filter((i) => i.savedForLater));
    setPromoCode(null);
  };

  return (
    <CartContext.Provider
      value={{
        items, activeItems, savedItems, count, subtotal, promoCode, discount, lastAddedKey,
        addItem, removeItem, updateQuantity, toggleSaveForLater, applyPromo,
        removePromo: () => setPromoCode(null), clearActive, buyNowItem, setBuyNowItem
      }}>
      
      {children}
    </CartContext.Provider>);

}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
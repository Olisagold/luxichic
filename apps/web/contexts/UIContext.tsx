'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import type { Product } from '@/types/product';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface UIContextValue {
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  quickView: Product | null;
  setQuickView: (p: Product | null) => void;
  recentSearches: string[];
  addRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: {children: React.ReactNode;}) {
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickView, setQuickView] = useState<Product | null>(null);
  const [recentSearches, setRecent] = useLocalStorage<string[]>('lx_recent_searches', []);

  const addRecentSearch = useCallback(
    (q: string) => {
      const term = q.trim();
      if (!term) return;
      setRecent((prev) => [term, ...prev.filter((x) => x.toLowerCase() !== term.toLowerCase())].slice(0, 6));
    },
    [setRecent]
  );

  return (
    <UIContext.Provider
      value={{
        cartOpen,
        openCart: useCallback(() => setCartOpen(true), []),
        closeCart: useCallback(() => setCartOpen(false), []),
        searchOpen,
        openSearch: useCallback(() => setSearchOpen(true), []),
        closeSearch: useCallback(() => setSearchOpen(false), []),
        quickView,
        setQuickView,
        recentSearches,
        addRecentSearch,
        clearRecentSearches: () => setRecent([])
      }}>
      
      {children}
    </UIContext.Provider>);

}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
}
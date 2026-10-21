'use client';

import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { UIProvider } from '@/contexts/UIContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <UIProvider>{children}</UIProvider>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}

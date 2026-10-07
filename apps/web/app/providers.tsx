'use client';

import React, { Fragment, useEffect, useState } from 'react';
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { OrdersProvider } from '@/contexts/OrdersContext';
import { ReviewsProvider } from '@/contexts/ReviewsContext';
import { UIProvider } from '@/contexts/UIContext';
import { hydrateDb } from '@/lib/mock-db/db';

export function Providers({ children }: {children: React.ReactNode;}) {
  // The prototype store renders from seed data first; once the browser's saved copy
  // is loaded, remount the page so components reading the store directly pick it up.
  const [dbKey, setDbKey] = useState(0);
  useEffect(() => {
    if (hydrateDb()) setDbKey(1);
  }, []);

  return (
    <SettingsProvider value={{ payOnDeliveryEnabled: true }}>
      <AuthProvider>
        <OrdersProvider>
          <ReviewsProvider>
            <CartProvider>
              <WishlistProvider>
                <UIProvider>
                  <AdminAuthProvider>
                    <Fragment key={dbKey}>{children}</Fragment>
                  </AdminAuthProvider>
                </UIProvider>
              </WishlistProvider>
            </CartProvider>
          </ReviewsProvider>
        </OrdersProvider>
      </AuthProvider>
    </SettingsProvider>);

}

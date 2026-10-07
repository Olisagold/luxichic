'use client';

import React from 'react';
import { WishlistGrid } from '@/components/account/WishlistGrid';

export function AccountWishlist() {
  return (
    <div>
      <h1 className="font-display text-5xl text-ink">Wishlist</h1>
      <div className="mt-8">
        <WishlistGrid />
      </div>
    </div>
  );
}
